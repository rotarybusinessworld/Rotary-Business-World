"use server";

import { revalidatePath } from "next/cache";
import { getAdminScope } from "@/backend/auth-helpers";
import * as moderation from "@/backend/services/business-moderation";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for the listing moderation queue.
 * Domain logic lives in `@/backend/services/business-moderation`.
 *
 * Pattern mirrors `@/backend/actions/admin` (verification queue adapter):
 * - `getAdminScope()` resolves district scope server-side each request.
 * - `isAppError` catches domain errors silently (prevents leaking ids).
 * - Revalidates the admin listings path so the table refreshes.
 */

/** Approve a pending listing → APPROVED (searchable). */
export async function approveListing(listingId: string, _formData?: FormData) {
  const { user, managedDistrictId } = await getAdminScope();

  try {
    await moderation.approveListing(user, listingId, managedDistrictId);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }

  revalidatePath("/admin/listings");
  revalidatePath("/admin");
}

/** Reject a pending listing → REJECTED (owner can revise and resubmit). */
export async function rejectListing(listingId: string, formData?: FormData) {
  const { user, managedDistrictId } = await getAdminScope();
  const note = formData ? String(formData.get("note") ?? "") : "";

  try {
    await moderation.rejectListing(user, listingId, note, managedDistrictId);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }

  revalidatePath("/admin/listings");
  revalidatePath("/admin");
}
