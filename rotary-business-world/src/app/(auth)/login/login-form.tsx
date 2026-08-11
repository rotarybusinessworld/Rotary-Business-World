"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type FormState } from "@/backend/actions/auth";
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
      loadingText="Signing in…"
    >
      Log in
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
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
          Log in to manage your business listings.
        </p>

        <form action={action} className="space-y-4">
          {/* Pass the original destination so the action can redirect back */}
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

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <FieldError messages={state.fieldErrors?.password} />
          </div>

          <SubmitButton />
        </form>

        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-sm text-muted-foreground">
            New to Rotary Business World?{" "}
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
