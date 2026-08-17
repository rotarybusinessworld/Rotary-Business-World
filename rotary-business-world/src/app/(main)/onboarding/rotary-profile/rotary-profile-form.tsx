"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { completeRotaryProfileAction } from "@/backend/actions/onboarding";
import type { FormState } from "@/backend/actions/auth";
import { Button } from "@/frontend/ui/button";
import { Card, CardContent } from "@/frontend/ui/card";
import { Input, Label, Select } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";

type District = { id: string; code: string; name: string | null; country: string | null };
type Club = { id: string; name: string; districtId: string };

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
    <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Saving…">
      Continue to payment
    </Button>
  );
}

export function RotaryProfileForm({
  districts,
  clubs,
  googleName,
}: {
  districts: District[];
  clubs: Club[];
  googleName: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(completeRotaryProfileAction, {});
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const districtClubs = clubs.filter((c) => c.districtId === selectedDistrictId);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
      {/* Step indicator */}
      <ol className="mb-8 flex items-center justify-center gap-2.5 text-[11px] font-medium sm:text-xs">
        <li className="flex items-center gap-1.5 text-success">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/15">
            <Check className="h-2.5 w-2.5" />
          </span>
          Account
        </li>
        <span className="h-px w-5 bg-border sm:w-6" aria-hidden />
        <li className="flex items-center gap-1.5 text-rotary-gold-dark">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rotary-gold/20 text-rotary-gold-dark ring-1 ring-rotary-gold/40">
            <span className="h-1.5 w-1.5 rounded-full bg-rotary-gold-dark" />
          </span>
          Rotary details
        </li>
        <span className="h-px w-5 bg-border sm:w-6" aria-hidden />
        <li className="flex items-center gap-1.5 text-muted-foreground/60">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border" />
          Payment
        </li>
        <span className="h-px w-5 bg-border sm:w-6" aria-hidden />
        <li className="flex items-center gap-1.5 text-muted-foreground/60">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border" />
          Verified
        </li>
      </ol>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Step 2 of 4
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            Your Rotary membership
          </h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            We verify every member against the official Rotary roster. Your
            district admin will review and approve your account.
          </p>

          <form action={action} className="space-y-5">
            <FormError message={state.error} />

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
                  defaultValue={googleName}
                  required
                />
                <FieldError messages={state.fieldErrors?.fullName} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    required
                  />
                  <FieldError messages={state.fieldErrors?.phone} />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select id="country" name="country" defaultValue="">
                    <option value="">Select a country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                  <FieldError messages={state.fieldErrors?.country} />
                </div>
              </div>
            </div>

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
                    <option value="" disabled>Select a district…</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code}{d.name ? ` — ${d.name}` : ""}{d.country ? ` (${d.country})` : ""}
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
                    <option value="" disabled>Select your club…</option>
                    {districtClubs.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id="clubName"
                    name="clubName"
                    required
                    placeholder={selectedDistrictId ? "Enter your club name" : "Select a district first"}
                    disabled={!selectedDistrictId}
                  />
                )}
                <FieldError messages={state.fieldErrors?.clubName} />
              </div>
            </div>

            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
