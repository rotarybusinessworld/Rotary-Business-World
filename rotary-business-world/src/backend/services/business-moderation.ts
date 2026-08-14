import "server-only";
import { db } from "@/backend/db";
import { assertAdmin, type Actor } from "@/backend/actor";
import { auditCreate } from "@/backend/audit";
import { ForbiddenError, NotFoundError } from "@/backend/errors";

/**
 * District-admin moderation queue for business listings.
 *
 * Mirrors the district-scope guard pattern from verification-queue.ts:
 * load the record first, then scope-check — so a missing/wrong-district
 * id reads as "not found" rather than "forbidden" (no info leak).
 */

/**
 * Assert that the admin is allowed to act on a listing whose owner belongs to
 * `ownerDistrictId`.
 *
 * - MANAGEMENT (managedDistrictId === null) → always allowed.
 * - DISTRICT_ADMIN → only if their district matches the owner's district.
 */
function assertListingScope(
  managedDistrictId: string | null,
  ownerDistrictId: string | null | undefined,
  listingId: string,
): void {
  if (managedDistrictId === null) return; // MANAGEMENT — sees all
  if (!ownerDistrictId || ownerDistrictId !== managedDistrictId) {
    throw new ForbiddenError(
      `Listing ${listingId} does not belong to your managed district`,
    );
  }
}

/**
 * Approve a pending listing: set status → APPROVED so it becomes searchable.
 *
 * @param managedDistrictId  null → caller is MANAGEMENT. string → DISTRICT_ADMIN.
 */
export async function approveListing(
  actor: Actor,
  listingId: string,
  managedDistrictId: string | null = null,
): Promise<void> {
  const admin = assertAdmin(actor);

  const listing = await db.business.findUnique({
    where: { id: listingId },
    include: {
      owner: {
        select: { rotaryInfo: { select: { districtId: true } } },
      },
    },
  });

  // Treat wrong-district or non-pending the same as not-found (no info leak).
  if (!listing || listing.status !== "PENDING") {
    throw new NotFoundError("No pending listing with that id");
  }

  assertListingScope(
    managedDistrictId,
    listing.owner.rotaryInfo?.districtId,
    listingId,
  );

  await db.$transaction([
    db.business.update({
      where: { id: listingId },
      data: { status: "APPROVED" },
    }),
    auditCreate(db, {
      actorId: admin.id,
      action: "listing.approved",
      targetType: "Business",
      targetId: listingId,
      metadata: { managedDistrictId },
    }),
  ]);
}

/**
 * Reject a pending listing: set status → REJECTED so the owner can revise and
 * resubmit (which sets PENDING again).
 *
 * @param managedDistrictId  null → MANAGEMENT. string → DISTRICT_ADMIN.
 */
export async function rejectListing(
  actor: Actor,
  listingId: string,
  note?: string,
  managedDistrictId: string | null = null,
): Promise<void> {
  const admin = assertAdmin(actor);

  const listing = await db.business.findUnique({
    where: { id: listingId },
    include: {
      owner: {
        select: { rotaryInfo: { select: { districtId: true } } },
      },
    },
  });

  if (!listing || listing.status !== "PENDING") {
    throw new NotFoundError("No pending listing with that id");
  }

  assertListingScope(
    managedDistrictId,
    listing.owner.rotaryInfo?.districtId,
    listingId,
  );

  await db.$transaction([
    db.business.update({
      where: { id: listingId },
      data: { status: "REJECTED" },
    }),
    auditCreate(db, {
      actorId: admin.id,
      action: "listing.rejected",
      targetType: "Business",
      targetId: listingId,
      metadata: { managedDistrictId, note: note?.trim() || null },
    }),
  ]);
}
