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

export default function LoginPage() {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Welcome back
        </h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Log in to manage your business listings.
        </p>

        <form action={action} className="space-y-4">
          <FormError message={state.error} />

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
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

        <p className="mt-5 text-center text-sm text-muted-foreground">
          New to Rotary Business World?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
