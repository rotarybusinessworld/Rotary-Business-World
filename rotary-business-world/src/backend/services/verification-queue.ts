import "server-only";
import { db } from "@/backend/db";
import { verifyAgainstRoster } from "@/backend/verification";
import { assertAdmin, type Actor } from "@/backend/actor";
import { ForbiddenError, NotFoundError } from "@/backend/errors";

/** Admin review queue for signups the roster match couldn't auto-verify. */

type SubmittedInfo = {
  rotaryId?: string;
  clubName?: string;
  districtCode?: string;
};

/**
 * Assert that the admin is allowed to act on a request belonging to `targetDistrictId`.
 *
 * - SUPER_ADMIN (managedDistrictId === null) → always allowed.
 * - CLUB_ADMIN → only if their managedDistrictId matches the target's district.
 *
 * Throws ForbiddenError on mismatch (prevents IDOR: a club admin guessing another
 * district's request id).
 */
function assertDistrictScope(
  managedDistrictId: string | null,
  targetDistrictId: string | null | undefined,
  requestId: string,
): void {
  if (managedDistrictId === null) return; // SUPER_ADMIN — sees all
  if (!targetDistrictId || targetDistrictId !== managedDistrictId) {
    throw new ForbiddenError(
      `Request ${requestId} does not belong to your managed district`,
    );
  }
}

/**
 * Approve a pending member: mark VERIFIED and link a roster identity if free.
 *
 * @param managedDistrictId  null → caller is SUPER_ADMIN (no scoping).
 *                           string → caller is CLUB_ADMIN and must match target's district.
 */
export async function approveVerification(
  actor: Actor,
  requestId: string,
  managedDistrictId: string | null = null,
): Promise<void> {
  const admin = assertAdmin(actor);

  const request = await db.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        include: {
          profile: true,
          rotaryInfo: { select: { matchedRosterId: true, districtId: true } },
        },
      },
    },
  });
  if (!request || request.status !== "PENDING") {
    throw new NotFoundError("No pending verification request with that id");
  }

  // Scope check — must happen AFTER load so we treat missing == not-found (no info leak).
  assertDistrictScope(
    managedDistrictId,
    request.user.rotaryInfo?.districtId,
    requestId,
  );

  const info = (request.submittedInfo ?? {}) as SubmittedInfo;

  // Try to reserve the roster identity so it can't be claimed twice — but only
  // if a confident candidate exists and isn't already taken.
  let matchedRosterId: string | null = request.user.rotaryInfo?.matchedRosterId ?? null;
  if (!matchedRosterId && info.rotaryId) {
    const outcome = await verifyAgainstRoster({
      rotaryId: info.rotaryId,
      fullName: request.user.profile?.fullName ?? "",
      districtCode: info.districtCode ?? "",
    });
    if (outcome.rosterMemberId) {
      const claimed = await db.rotaryInfo.findFirst({
        where: { matchedRosterId: outcome.rosterMemberId },
      });
      if (!claimed) matchedRosterId = outcome.rosterMemberId;
    }
  }

  await db.$transaction([
    db.user.update({
      where: { id: request.userId },
      data: { status: "VERIFIED" },
    }),
    ...(matchedRosterId && request.user.rotaryInfo
      ? [
          db.rotaryInfo.update({
            where: { userId: request.userId },
            data: { matchedRosterId },
          }),
        ]
      : []),
    db.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    }),
  ]);
}

/**
 * Reject a pending member.
 *
 * @param managedDistrictId  null → SUPER_ADMIN (no scoping). string → CLUB_ADMIN, must match.
 */
export async function rejectVerification(
  actor: Actor,
  requestId: string,
  note?: string,
  managedDistrictId: string | null = null,
): Promise<void> {
  const admin = assertAdmin(actor);

  const request = await db.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: { rotaryInfo: { select: { districtId: true } } },
      },
    },
  });
  if (!request || request.status !== "PENDING") {
    throw new NotFoundError("No pending verification request with that id");
  }

  // Scope check.
  assertDistrictScope(
    managedDistrictId,
    request.user.rotaryInfo?.districtId,
    requestId,
  );

  await db.$transaction([
    db.user.update({
      where: { id: request.userId },
      data: { status: "REJECTED" },
    }),
    db.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        note: note?.trim() || null,
      },
    }),
  ]);
}
