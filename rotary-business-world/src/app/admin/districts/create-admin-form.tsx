"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import {
  createDistrictAdminAction,
  type DistrictAdminFormState,
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

function districtLabel(d: DistrictOption): string {
  return [
    `District ${d.code}`,
    d.name,
    d.country ? `(${d.country})` : null,
  ]
    .filter(Boolean)
    .join(" — ");
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingText="Creating…">
      <UserPlus className="h-4 w-4" />
      Create district admin
    </Button>
  );
}

export function CreateAdminForm({ districts }: { districts: DistrictOption[] }) {
  const [state, formAction] = useActionState<DistrictAdminFormState, FormData>(
    createDistrictAdminAction,
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
          District admin created. Share the login with them.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required autoComplete="off" />
          <FieldError messages={state.fieldErrors?.fullName} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
          />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="password">Initial password</Label>
          <Input
            id="password"
            name="password"
            type="text"
            required
            autoComplete="off"
            placeholder="At least 8 characters"
          />
          <FieldError messages={state.fieldErrors?.password} />
        </div>
        <div>
          <Label htmlFor="districtId">District</Label>
          <Select id="districtId" name="districtId" required defaultValue="">
            <option value="" disabled>
              Select a district…
            </option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {districtLabel(d)}
              </option>
            ))}
          </Select>
          <FieldError messages={state.fieldErrors?.districtId} />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
