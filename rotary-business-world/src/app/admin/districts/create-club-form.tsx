"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Building2 } from "lucide-react";
import {
  createClubAction,
  type ClubFormState,
} from "@/backend/actions/admin";
import { Button } from "@/frontend/ui/button";
import { Input, Label, Select } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";

export type DistrictOption = {
  id: string;
  code: string;
  name: string | null;
  country: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingText="Creating…">
      <Building2 className="h-4 w-4" />
      Create club
    </Button>
  );
}

export function CreateClubForm({ districts }: { districts: DistrictOption[] }) {
  const [state, formAction] = useActionState<ClubFormState, FormData>(
    createClubAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <FormError message={state.error} />
      {state.ok && (
        <div className="rounded-[var(--radius)] border border-success/30 bg-[color-mix(in_srgb,var(--color-success)_8%,white)] px-3 py-2 text-sm text-success">
          Club created successfully.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="club-name">Club name</Label>
          <Input
            id="club-name"
            name="name"
            required
            autoComplete="off"
            placeholder="e.g. RC Coimbatore North"
          />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="club-district">District</Label>
          <Select
            id="club-district"
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
          <Label htmlFor="club-city">City (optional)</Label>
          <Input
            id="club-city"
            name="city"
            autoComplete="off"
            placeholder="e.g. Coimbatore"
          />
          <FieldError messages={state.fieldErrors?.city} />
        </div>
        <div>
          <Label htmlFor="club-country">Country (optional)</Label>
          <Input
            id="club-country"
            name="country"
            autoComplete="off"
            placeholder="e.g. India"
          />
          <FieldError messages={state.fieldErrors?.country} />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
