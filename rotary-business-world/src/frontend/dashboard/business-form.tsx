"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { BusinessFormState } from "@/backend/actions/business";
import { Button } from "@/frontend/ui/button";
import { Input, Label, Textarea } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";
import { ImageUpload, GalleryUpload } from "@/frontend/dashboard/image-upload";
import { cn } from "@/shared/utils";

type Taxonomy = {
  industries: { id: string; name: string }[];
  categories: { id: string; name: string; industryId: string }[];
};

export type BusinessDefaults = {
  name?: string;
  description?: string | null;
  industryId?: string | null;
  categoryId?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  addressLine?: string | null;
  city?: string | null;
  country?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  gallery?: string[];
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

const selectClass =
  "flex h-10 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BusinessForm({
  action,
  taxonomy,
  defaults = {},
  submitLabel = "Save business",
}: {
  action: (
    state: BusinessFormState,
    formData: FormData,
  ) => Promise<BusinessFormState>;
  taxonomy: Taxonomy;
  defaults?: BusinessDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(action, {});
  const [industryId, setIndustryId] = useState(defaults.industryId ?? "");
  const [logoUrl, setLogoUrl] = useState(defaults.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(defaults.coverUrl ?? "");
  const [gallery, setGallery] = useState<string[]>(defaults.gallery ?? []);

  const categories = useMemo(
    () => taxonomy.categories.filter((c) => c.industryId === industryId),
    [taxonomy.categories, industryId],
  );

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      {/* ── Photos ───────────────────────────────────────────── */}
      <div className="rounded-[var(--radius)] border border-border p-5">
        <h3 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Photos
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          A great cover + logo makes your listing stand out across the directory.
        </p>

        {/* Logo + Cover row */}
        <div className="mt-5 flex flex-wrap gap-6">
          <div>
            <Label>Logo</Label>
            <ImageUpload
              folder="logos"
              value={logoUrl}
              onChange={setLogoUrl}
              hint="Square, e.g. 400×400 px"
            />
          </div>
          <div className="min-w-[240px] flex-1">
            <Label>Cover image</Label>
            <ImageUpload
              folder="covers"
              value={coverUrl}
              onChange={setCoverUrl}
              aspect="wide"
              hint="Recommended ~1600×500 px"
            />
          </div>
        </div>

        {/* Gallery */}
        <div className="mt-5">
          <Label>
            Gallery{" "}
            <span className="font-normal text-muted-foreground">(up to 12)</span>
          </Label>
          <div className="mt-2">
            <GalleryUpload value={gallery} onChange={setGallery} />
          </div>
        </div>
      </div>

      {/* Core */}
      <div>
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" defaultValue={defaults.name} required />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaults.description ?? ""} rows={4} />
        <FieldError messages={state.fieldErrors?.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="industryId">Industry</Label>
          <select
            id="industryId"
            name="industryId"
            className={selectClass}
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
          >
            <option value="">Select industry…</option>
            {taxonomy.industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            name="categoryId"
            className={cn(selectClass, !industryId && "opacity-60")}
            defaultValue={defaults.categoryId ?? ""}
            disabled={!industryId}
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contact */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" defaultValue={defaults.website ?? ""} placeholder="https://" />
          <FieldError messages={state.fieldErrors?.website} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults.email ?? ""} />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={defaults.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" name="whatsapp" defaultValue={defaults.whatsapp ?? ""} />
        </div>
        <div>
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input id="linkedin" name="linkedin" defaultValue={defaults.linkedin ?? ""} placeholder="https://" />
          <FieldError messages={state.fieldErrors?.linkedin} />
        </div>
        <div>
          <Label htmlFor="instagram">Instagram</Label>
          <Input id="instagram" name="instagram" defaultValue={defaults.instagram ?? ""} />
        </div>
      </div>

      {/* Location */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Label htmlFor="addressLine">Address</Label>
          <Input id="addressLine" name="addressLine" defaultValue={defaults.addressLine ?? ""} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={defaults.city ?? ""} />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" defaultValue={defaults.country ?? ""} />
        </div>
      </div>

      {/* Hidden carriers for uploaded URLs */}
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="coverUrl" value={coverUrl} />
      <input type="hidden" name="galleryUrls" value={JSON.stringify(gallery)} />

      <SubmitButton label={submitLabel} />
    </form>
  );
}
