"use server";

import { revalidatePath } from "next/cache";
import { getAdminScope, requireSuperAdmin } from "@/backend/auth-helpers";
import * as queue from "@/backend/services/verification-queue";
import * as adminMgmt from "@/backend/services/admin-management";
import { createDistrictAdminSchema } from "@/shared/validators";
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

// ---------------------------------------------------------------------------
// District-admin management (SUPER_ADMIN only)
// ---------------------------------------------------------------------------

export type DistrictAdminFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

/** Create a new district-admin account. */
export async function createDistrictAdminAction(
  _prev: DistrictAdminFormState,
  formData: FormData,
): Promise<DistrictAdminFormState> {
  const user = await requireSuperAdmin();

  const parsed = createDistrictAdminSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await adminMgmt.createDistrictAdmin(user, parsed.data);
  } catch (err) {
    if (isAppError(err)) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }

  revalidatePath("/admin/districts");
  return { ok: true };
}

/** Demote a district admin back to member. Bound-arg like approveVerification. */
export async function revokeDistrictAdminAction(
  userId: string,
  _formData?: FormData,
) {
  const user = await requireSuperAdmin();

  try {
    await adminMgmt.revokeDistrictAdmin(user, userId);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }

  revalidatePath("/admin/districts");
}

/** Move a district admin to another district. */
export async function reassignDistrictAdminAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const districtId = String(formData.get("districtId") ?? "");

  try {
    await adminMgmt.reassignDistrictAdmin(user, userId, districtId);
  } catch (err) {
    if (isAppError(err)) return;
    throw err;
  }

  revalidatePath("/admin/districts");
}
