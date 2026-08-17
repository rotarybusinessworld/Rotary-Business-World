"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, googleSignInAction, type FormState } from "@/backend/actions/auth";
import { Button } from "@/frontend/ui/button";
import { Card, CardContent } from "@/frontend/ui/card";
import { Input, Label } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full"
      loading={pending}
      loadingText="Sending link…"
    >
      Send sign-in link
    </Button>
  );
}

export function LoginForm({
  next,
  registered,
  emailLoginEnabled,
}: {
  next: string;
  registered?: boolean;
  emailLoginEnabled?: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Member portal
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Welcome back
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a sign-in link.
        </p>

        {registered && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
            Account created! Sign in with Google below to continue.
          </div>
        )}

        <form action={googleSignInAction}>
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        {/* New-user notice — shown when Resend is off (no email fallback visible) */}
        {!emailLoginEnabled && !registered && (
          <div className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">New here?</span> Google sign-in is for
            existing members only. You need to{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              create an account
            </Link>{" "}
            first so we can verify your Rotary membership.
          </div>
        )}

        {emailLoginEnabled && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or sign in with email</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form action={action} className="space-y-4">
              {next && <input type="hidden" name="next" value={next} />}

              <FormError message={state.error} />

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
                <FieldError messages={state.fieldErrors?.email} />
              </div>

              <SubmitButton />
            </form>
          </>
        )}

        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-sm text-muted-foreground">
            New to My Rotary Business World?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
