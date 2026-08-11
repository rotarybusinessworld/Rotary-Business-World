"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
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

type Club = {
  id: string;
  name: string;
  districtId: string;
};

// Comprehensive country list for the dropdown.
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Bolivia", "Brazil", "Canada", "Chile", "China",
  "Colombia", "Costa Rica", "Croatia", "Czech Republic", "Denmark", "Ecuador",
  "Egypt", "El Salvador", "Ethiopia", "Finland", "France", "Germany", "Ghana",
  "Greece", "Guatemala", "Honduras", "Hong Kong", "Hungary", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica",
  "Japan", "Jordan", "Kenya", "South Korea", "Kuwait", "Lebanon", "Malaysia",
  "Mexico", "Morocco", "Myanmar", "Nepal", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Pakistan", "Panama", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Senegal",
  "Singapore", "South Africa", "Spain", "Sri Lanka", "Sweden", "Switzerland",
  "Taiwan", "Tanzania", "Thailand", "Turkey", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Venezuela", "Vietnam", "Zimbabwe",
];

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

export function RegisterForm({
  districts,
  clubs,
}: {
  districts: District[];
  clubs: Club[];
}) {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  const [selectedDistrictId, setSelectedDistrictId] = useState("");

  const districtClubs = clubs.filter((c) => c.districtId === selectedDistrictId);

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

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div>
                <Label htmlFor="country">Country</Label>
                <Select id="country" name="country" defaultValue="">
                  <option value="">Select a country…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                <FieldError messages={state.fieldErrors?.country} />
              </div>
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
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
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

            <div>
              <Label htmlFor="clubName">Rotary club</Label>
              {districtClubs.length > 0 ? (
                <Select id="clubName" name="clubName" required defaultValue="">
                  <option value="" disabled>
                    Select your club…
                  </option>
                  {districtClubs.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="clubName"
                  name="clubName"
                  required
                  placeholder={
                    selectedDistrictId
                      ? "Enter your club name"
                      : "Select a district first"
                  }
                  disabled={!selectedDistrictId}
                />
              )}
              <FieldError messages={state.fieldErrors?.clubName} />
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
