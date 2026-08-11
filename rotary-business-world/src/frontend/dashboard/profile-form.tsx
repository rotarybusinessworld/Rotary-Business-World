"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import {
  updateProfileAction,
  type ProfileFormState,
} from "@/backend/actions/profile";
import { Button } from "@/frontend/ui/button";
import { Input, Label, Textarea } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";
import { ImageUpload } from "@/frontend/dashboard/image-upload";

export type ProfileDefaults = {
  fullName: string;
  photoUrl?: string | null;
  bio?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingText="Saving…">
      Save profile
    </Button>
  );
}

export function ProfileForm({ profile }: { profile: ProfileDefaults }) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    {},
  );
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl ?? "");

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />
      {state.ok && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-success/30 bg-[color-mix(in_srgb,var(--color-success)_8%,white)] px-3 py-2 text-sm text-success">
          <Check className="h-4 w-4 shrink-0" />
          Profile saved successfully.
        </div>
      )}

      {/* ── Profile photo ─────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Profile photo
        </p>
        <div className="flex items-start gap-6">
          <ImageUpload
            folder="avatars"
            value={photoUrl}
            onChange={setPhotoUrl}
            aspect="square"
            hint="JPG / PNG / WebP, up to 5 MB"
          />
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
            Your photo is visible to verified members on your profile page and
            in direct messages.
          </p>
        </div>
        {/* Hidden carrier — ImageUpload updates photoUrl state, this ships it in FormData */}
        <input type="hidden" name="photoUrl" value={photoUrl} />
      </div>

      {/* ── About you ─────────────────────────────────────────── */}
      <div className="space-y-4 border-t border-border pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          About you
        </p>
        <div>
          <Label htmlFor="profile-fullName">Full name</Label>
          <Input
            id="profile-fullName"
            name="fullName"
            required
            defaultValue={profile.fullName}
            placeholder="Your full name"
            autoComplete="name"
          />
          <FieldError messages={state.fieldErrors?.fullName} />
        </div>
        <div>
          <Label htmlFor="profile-bio">Bio (optional)</Label>
          <Textarea
            id="profile-bio"
            name="bio"
            defaultValue={profile.bio ?? ""}
            placeholder="Tell other Rotarians a bit about yourself…"
            className="min-h-[112px]"
          />
          <FieldError messages={state.fieldErrors?.bio} />
        </div>
      </div>

      {/* ── Contact ───────────────────────────────────────────── */}
      <div className="space-y-4 border-t border-border pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Contact
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-phone">Phone (optional)</Label>
            <Input
              id="profile-phone"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ""}
              placeholder="+1 555 000 0000"
              autoComplete="tel"
            />
            <FieldError messages={state.fieldErrors?.phone} />
          </div>
          <div>
            <Label htmlFor="profile-whatsapp">WhatsApp (optional)</Label>
            <Input
              id="profile-whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={profile.whatsapp ?? ""}
              placeholder="+1 555 000 0000"
            />
            <FieldError messages={state.fieldErrors?.whatsapp} />
          </div>
          <div>
            <Label htmlFor="profile-website">Website (optional)</Label>
            <Input
              id="profile-website"
              name="website"
              type="url"
              defaultValue={profile.website ?? ""}
              placeholder="https://yoursite.com"
              autoComplete="url"
            />
            <FieldError messages={state.fieldErrors?.website} />
          </div>
          <div>
            <Label htmlFor="profile-linkedin">LinkedIn (optional)</Label>
            <Input
              id="profile-linkedin"
              name="linkedin"
              type="url"
              defaultValue={profile.linkedin ?? ""}
              placeholder="https://linkedin.com/in/yourname"
            />
            <FieldError messages={state.fieldErrors?.linkedin} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="profile-instagram">Instagram (optional)</Label>
            <Input
              id="profile-instagram"
              name="instagram"
              defaultValue={profile.instagram ?? ""}
              placeholder="@yourhandle or full URL"
            />
            <FieldError messages={state.fieldErrors?.instagram} />
          </div>
        </div>
      </div>

      {/* ── Location ──────────────────────────────────────────── */}
      <div className="space-y-4 border-t border-border pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Location
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-city">City (optional)</Label>
            <Input
              id="profile-city"
              name="city"
              defaultValue={profile.city ?? ""}
              placeholder="e.g. Singapore"
              autoComplete="address-level2"
            />
            <FieldError messages={state.fieldErrors?.city} />
          </div>
          <div>
            <Label htmlFor="profile-country">Country (optional)</Label>
            <Input
              id="profile-country"
              name="country"
              defaultValue={profile.country ?? ""}
              placeholder="e.g. Singapore"
              autoComplete="country-name"
            />
            <FieldError messages={state.fieldErrors?.country} />
          </div>
        </div>
      </div>

      {/* ── Submit ────────────────────────────────────────────── */}
      <div className="border-t border-border pt-5">
        <SubmitButton />
      </div>
    </form>
  );
}
