"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/backend/auth-helpers";
import * as queue from "@/backend/services/verification-queue";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for the admin verification queue.
 * Domain logic lives in `@/backend/services/verification-queue`.
 */

/** Approve a pending member. No-ops if the request is gone or already reviewed. */
export async function approveVerification(requestId: string, _formData?: FormData) {
  const admin = await requireAdmin();

  try {
    await queue.approveVerification(admin, requestId);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }

  revalidatePath("/admin/verifications");
}

/** Reject a pending member. No-ops if the request is gone or already reviewed. */
export async function rejectVerification(requestId: string, formData?: FormData) {
  const admin = await requireAdmin();
  const note = formData ? String(formData.get("note") ?? "") : "";

  try {
    await queue.rejectVerification(admin, requestId, note);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }

  revalidatePath("/admin/verifications");
}
