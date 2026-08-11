"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { BusinessFormState } from "@/backend/actions/business";
import { Button } from "@/frontend/ui/button";
import { Input, Label, Select, Textarea } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";
import { ImageUpload, GalleryUpload } from "@/frontend/dashboard/image-upload";

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
  discountPercent?: number | null;
  discountNote?: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} loadingText="Saving…">
      {label}
    </Button>
  );
}

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
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />

      {/* ── Photos & branding ───────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Photos &amp; branding
        </p>
        <p className="text-sm text-muted-foreground">
          A great cover and logo make your listing stand out across the directory.
        </p>

        {/* Logo + Cover side by side */}
        <div className="flex flex-wrap gap-6">
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
        <div>
          <Label>
            Gallery{" "}
            <span className="font-normal text-muted-foreground">(up to 12)</span>
          </Label>
          <div className="mt-2">
            <GalleryUpload value={gallery} onChange={setGallery} />
          </div>
        </div>
      </div>

      {/* ── Business details ────────────────────────────────────── */}
      <div className="space-y-4 border-t border-border pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Business details
        </p>

        <div>
          <Label htmlFor="name">Business name</Label>
          <Input id="name" name="name" defaultValue={defaults.name} required />
          <FieldError messages={state.fieldErrors?.name} />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaults.description ?? ""}
            rows={4}
          />
          <FieldError messages={state.fieldErrors?.description} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="industryId">Industry</Label>
            <Select
              id="industryId"
              name="industryId"
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
            >
              <option value="">Select industry…</option>
              {taxonomy.industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="categoryId">Category</Label>
            <Select
              id="categoryId"
              name="categoryId"
              defaultValue={defaults.categoryId ?? ""}
              disabled={!industryId}
            >
              <option value="">
                {industryId ? "Select category…" : "Select an industry first"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* ── Contact ─────────────────────────────────────────────── */}
      <div className="space-y-4 border-t border-border pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Contact
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              defaultValue={defaults.website ?? ""}
              placeholder="https://"
            />
            <FieldError messages={state.fieldErrors?.website} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults.email ?? ""}
            />
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
            <Input
              id="linkedin"
              name="linkedin"
              defaultValue={defaults.linkedin ?? ""}
              placeholder="https://"
            />
            <FieldError messages={state.fieldErrors?.linkedin} />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              name="instagram"
              defaultValue={defaults.instagram ?? ""}
            />
          </div>
        </div>
      </div>

      {/* ── Location ────────────────────────────────────────────── */}
      <div className="space-y-4 border-t border-border pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Location
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label htmlFor="addressLine">Address</Label>
            <Input
              id="addressLine"
              name="addressLine"
              defaultValue={defaults.addressLine ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={defaults.city ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={defaults.country ?? ""} />
          </div>
        </div>
      </div>

      {/* ── Rotarian discount ───────────────────────────────────── */}
      <div className="space-y-4 border-t border-border pt-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Rotarian discount
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Show fellow Rotarians the exclusive discount you offer them.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div>
            <Label htmlFor="discountPercent">
              Discount{" "}
              <span className="font-normal text-muted-foreground">(% off)</span>
            </Label>
            <div className="relative">
              <Input
                id="discountPercent"
                name="discountPercent"
                type="number"
                min={1}
                max={100}
                defaultValue={defaults.discountPercent ?? ""}
                placeholder="e.g. 15"
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <FieldError messages={state.fieldErrors?.discountPercent} />
          </div>
          <div>
            <Label htmlFor="discountNote">
              Short note{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="discountNote"
              name="discountNote"
              defaultValue={defaults.discountNote ?? ""}
              placeholder="e.g. on all services, first visit free…"
              maxLength={120}
            />
            <FieldError messages={state.fieldErrors?.discountNote} />
          </div>
        </div>
      </div>

      {/* Hidden carriers for uploaded URLs */}
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="coverUrl" value={coverUrl} />
      <input type="hidden" name="galleryUrls" value={JSON.stringify(gallery)} />

      <div className="border-t border-border pt-5">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
