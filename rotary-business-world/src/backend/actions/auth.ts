"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/backend/auth";
import { registerSchema, loginSchema } from "@/shared/validators";
import { registerMember } from "@/backend/services/registration";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for registration/login.
 *
 * Account creation + roster verification live in
 * `@/backend/services/registration`; only the cookie-session `signIn` handshake
 * stays here, since that's Auth.js-specific.
 */

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

  // Sign the user in; PENDING users can log in but see a "pending" state.
  // signIn throws a redirect on success (re-thrown) and AuthError on failure.
  try {
    await signIn("credentials", {
      email: data.email.toLowerCase(),
      password: data.password,
      redirectTo: "/dashboard",
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

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw err;
  }
  return { ok: true };
}
