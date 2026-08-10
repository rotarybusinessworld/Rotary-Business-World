"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireVerified } from "@/backend/auth-helpers";
import { businessSchema } from "@/shared/validators";
import * as businessService from "@/backend/services/business";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for the business service.
 *
 * Responsibilities stop at: FormData → typed input, service call, error → form
 * state, cache revalidation + redirect. All domain logic lives in
 * `@/backend/services/business`.
 */

export type BusinessFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function orNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

function parseGallery(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(String(raw));
    return Array.isArray(arr) ? arr.filter((u) => typeof u === "string") : [];
  } catch {
    return [];
  }
}

/** FormData → the service's typed input. */
function toInput(
  formData: FormData,
  parsed: { name: string },
): businessService.BusinessInput {
  return {
    name: parsed.name,
    description: orNull(formData.get("description")),
    industryId: orNull(formData.get("industryId")),
    categoryId: orNull(formData.get("categoryId")),
    logoUrl: orNull(formData.get("logoUrl")),
    coverUrl: orNull(formData.get("coverUrl")),
    website: orNull(formData.get("website")),
    email: orNull(formData.get("email")),
    phone: orNull(formData.get("phone")),
    whatsapp: orNull(formData.get("whatsapp")),
    addressLine: orNull(formData.get("addressLine")),
    city: orNull(formData.get("city")),
    country: orNull(formData.get("country")),
    linkedin: orNull(formData.get("linkedin")),
    instagram: orNull(formData.get("instagram")),
    gallery: parseGallery(formData.get("galleryUrls")),
  };
}

export async function createBusiness(
  _prev: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const user = await requireVerified();

  const parsed = businessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let slug: string;
  try {
    const business = await businessService.createBusiness(
      user,
      toInput(formData, parsed.data),
    );
    slug = business.slug;
  } catch (err) {
    if (isAppError(err)) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }

  revalidatePath("/directory");
  redirect(`/business/${slug}`); // outside the try — redirect() signals via throw
}

export async function updateBusiness(
  id: string,
  _prev: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const user = await requireVerified();

  const parsed = businessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let slug: string;
  try {
    const business = await businessService.updateBusiness(
      user,
      id,
      toInput(formData, parsed.data),
    );
    slug = business.slug;
  } catch (err) {
    if (isAppError(err)) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }

  revalidatePath("/directory");
  revalidatePath(`/business/${slug}`);
  redirect(`/business/${slug}`);
}

export async function deleteBusiness(id: string) {
  const user = await requireVerified();

  try {
    await businessService.deleteBusiness(user, id);
  } catch (err) {
    if (isAppError(err)) redirect("/dashboard");
    throw err;
  }

  revalidatePath("/directory");
  redirect("/dashboard");
}
