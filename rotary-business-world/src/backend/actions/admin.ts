"use server";

import { revalidatePath } from "next/cache";
import { getAdminScope } from "@/backend/auth-helpers";
import * as queue from "@/backend/services/verification-queue";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for the admin verification queue.
 * Domain logic lives in `@/backend/services/verification-queue`.
 *
 * `getAdminScope()` resolves the admin's managed district server-side each request
 * so scope is never stale after a reassignment.
 */

/** Approve a pending member. No-ops if the request is gone or already reviewed. */
export async function approveVerification(requestId: string, _formData?: FormData) {
  const { user, managedDistrictId } = await getAdminScope();

  try {
    await queue.approveVerification(user, requestId, managedDistrictId);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }

  revalidatePath("/admin/verifications");
}

/** Reject a pending member. No-ops if the request is gone or already reviewed. */
export async function rejectVerification(requestId: string, formData?: FormData) {
  const { user, managedDistrictId } = await getAdminScope();
  const note = formData ? String(formData.get("note") ?? "") : "";

  try {
    await queue.rejectVerification(user, requestId, note, managedDistrictId);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }

  revalidatePath("/admin/verifications");
}
