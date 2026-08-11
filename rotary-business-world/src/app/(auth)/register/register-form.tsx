"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction, type FormState } from "@/backend/actions/auth";
import { Button } from "@/frontend/ui/button";
import { Card, CardContent } from "@/frontend/ui/card";
import { Input, Label, Select } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";

type District = {
  id: string;
  code: string;
  name: string | null;
  country: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full"
      loading={pending}
      loadingText="Creating your account…"
    >
      Create account
    </Button>
  );
}

export function RegisterForm({ districts }: { districts: District[] }) {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Join the network
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Create your account
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          We verify every member against the official Rotary roster.
        </p>

        <form action={action} className="space-y-5">
          <FormError message={state.error} />

          {/* ── Personal details ────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Personal details
            </p>

            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                required
              />
              <FieldError messages={state.fieldErrors?.fullName} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  required
                />
                <FieldError messages={state.fieldErrors?.phone} />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              <FieldError messages={state.fieldErrors?.password} />
            </div>
          </div>

          {/* ── Rotary membership ───────────────────────────────── */}
          <div className="space-y-4 border-t border-border pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Rotary membership
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rotaryId">Rotary / member ID</Label>
                <Input id="rotaryId" name="rotaryId" required />
                <FieldError messages={state.fieldErrors?.rotaryId} />
              </div>
              <div>
                <Label htmlFor="districtId">Your district</Label>
                <Select
                  id="districtId"
                  name="districtId"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a district…
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code}
                      {d.name ? ` — ${d.name}` : ""}
                      {d.country ? ` (${d.country})` : ""}
                    </option>
                  ))}
                </Select>
                <FieldError messages={state.fieldErrors?.districtId} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="clubName">Rotary club</Label>
                <Input id="clubName" name="clubName" required />
                <FieldError messages={state.fieldErrors?.clubName} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  autoComplete="country-name"
                />
                <FieldError messages={state.fieldErrors?.country} />
              </div>
            </div>
          </div>

          <SubmitButton />
        </form>

        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-sm text-muted-foreground">
            Already a member?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
