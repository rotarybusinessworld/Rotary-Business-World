"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { PlusCircle } from "lucide-react";
import {
  createDistrictAction,
  type DistrictFormState,
} from "@/backend/actions/admin";
import { Button } from "@/frontend/ui/button";
import { Input, Label } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingText="Creating…">
      <PlusCircle className="h-4 w-4" />
      Create district
    </Button>
  );
}

export function CreateDistrictForm() {
  const [state, formAction] = useActionState<DistrictFormState, FormData>(
    createDistrictAction,
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
          District created successfully.
        </div>
      )}

      <div>
        <Label htmlFor="dist-code">District code</Label>
        <Input
          id="dist-code"
          name="code"
          required
          autoComplete="off"
          placeholder="e.g. 3201"
        />
        <FieldError messages={state.fieldErrors?.code} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="dist-name">Name (optional)</Label>
          <Input
            id="dist-name"
            name="name"
            autoComplete="off"
            placeholder="e.g. District 3201"
          />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="dist-country">Country (optional)</Label>
          <Input
            id="dist-country"
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
