"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/backend/auth";
import { registerSchema, loginSchema } from "@/shared/validators";
import { registerMember } from "@/backend/services/registration";
import { isAppError } from "@/backend/errors";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  try {
    await registerMember(data);
  } catch (err) {
    if (isAppError(err)) {
      return err.fieldErrors
        ? { fieldErrors: err.fieldErrors }
        : { error: err.message };
    }
    throw err;
  }

  // Registration complete — redirect to the membership payment step.
  try {
    await signIn("credentials", {
      email: data.email.toLowerCase(),
      password: data.password,
      redirectTo: "/onboarding/payment",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in." };
    }
    throw err;
  }
  return { ok: true };
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Safe relative-URL redirect: only honour paths that start with `/`
  const rawNext = formData.get("next");
  const next =
    typeof rawNext === "string" && rawNext.startsWith("/") ? rawNext : null;

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: next ?? "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw err;
  }
  return { ok: true };
}
