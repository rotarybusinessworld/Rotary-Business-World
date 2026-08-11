"use server";

import { revalidatePath } from "next/cache";
import { requireVerified } from "@/backend/auth-helpers";
import { reviewSchema } from "@/shared/validators";
import * as reviewService from "@/backend/services/review";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for the review service.
 *
 * Thin: auth gate → validate → service call → error → form state, revalidate.
 * Returns { ok: true } on success (inline confirmation, no redirect).
 */

export type ReviewFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitReviewAction(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const user = await requireVerified();

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { businessId, slug, body } = parsed.data;
  const rating = parsed.data.rating as number;

  try {
    await reviewService.createReview(user, {
      businessId,
      rating,
      body: body && body.trim() !== "" ? body.trim() : null,
    });
  } catch (err) {
    if (isAppError(err)) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }

  revalidatePath(`/business/${slug}`);
  return { ok: true };
}
