"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/backend/auth";
import { registerSchema, loginSchema } from "@/shared/validators";
import { registerMember } from "@/backend/services/registration";
import { isAppError } from "@/backend/errors";
import { checkRateLimit } from "@/backend/rate-limit";

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

  // 3 registration attempts per email per 5 minutes — prevents re-submitting
  // the same address in a tight loop (e.g. double-tap on mobile).
  const { allowed } = await checkRateLimit(
    `register:${data.email.toLowerCase()}`,
    3,
    300,
  );
  if (!allowed) {
    return { error: "Too many signup attempts. Please try again later." };
  }

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

  // Registration complete. Redirect to login with a success flag so the login
  // page can show a "sign in with Google" prompt. redirect() throws internally
  // so no return is needed after it.
  redirect("/login?registered=1");
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  const rawNext = formData.get("next");
  const next =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/dashboard";
  await signIn("google", { redirectTo: next });
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // 5 attempts per email per 60 s — prevents magic-link spam.
  const { allowed: loginAllowed } = await checkRateLimit(
    `login:${parsed.data.email.toLowerCase()}`,
    5,
    60,
  );
  if (!loginAllowed) {
    return { error: "Too many sign-in attempts. Please wait a minute." };
  }

  // Safe relative-URL redirect: only honour same-origin paths. Reject
  // protocol-relative (`//evil.com`) and backslash (`/\evil.com`) forms that
  // pass a naive startsWith("/") check but navigate off-origin.
  const rawNext = formData.get("next");
  const next =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : null;

  try {
    await signIn("resend", {
      email: parsed.data.email.toLowerCase(),
      redirectTo: next ?? "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Could not send sign-in link. Please try again." };
    }
    throw err;
  }
  return { ok: true };
}
