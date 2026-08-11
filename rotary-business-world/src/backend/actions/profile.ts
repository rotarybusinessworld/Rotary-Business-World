"use server";

import { revalidatePath } from "next/cache";
import { requireVerified } from "@/backend/auth-helpers";
import { updateProfileSchema } from "@/shared/validators";
import * as profileService from "@/backend/services/profile";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for the profile service.
 *
 * Thin: auth gate → validate → call service → error → form state, revalidate.
 * Returns { ok: true } on success so the client shows an inline confirmation
 * without a redirect (this is an edit form, not a create form).
 */

export type ProfileFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function orNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireVerified();

  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await profileService.updateProfile(user, {
      fullName: parsed.data.fullName,
      photoUrl: orNull(formData.get("photoUrl")),
      bio: orNull(formData.get("bio")),
      phone: orNull(formData.get("phone")),
      whatsapp: orNull(formData.get("whatsapp")),
      city: orNull(formData.get("city")),
      country: orNull(formData.get("country")),
      website: orNull(formData.get("website")),
      linkedin: orNull(formData.get("linkedin")),
      instagram: orNull(formData.get("instagram")),
    });
  } catch (err) {
    if (isAppError(err)) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/member/${user.id}`);
  return { ok: true };
}
