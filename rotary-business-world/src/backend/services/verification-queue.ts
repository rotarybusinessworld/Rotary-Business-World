import "server-only";
import { db } from "@/backend/db";
import { verifyAgainstRoster } from "@/backend/verification";
import { assertAdmin, type Actor } from "@/backend/actor";
import { NotFoundError } from "@/backend/errors";

/** Admin review queue for signups the roster match couldn't auto-verify. */

type SubmittedInfo = {
  rotaryId?: string;
  clubName?: string;
  districtCode?: string;
};

/**
 * Approve a pending member: mark VERIFIED and link a roster identity if free.
 * Throws `NotFoundError` if the request is missing or already reviewed.
 */
export async function approveVerification(
  actor: Actor,
  requestId: string,
): Promise<void> {
  const admin = assertAdmin(actor);

  const request = await db.verificationRequest.findUnique({
    where: { id: requestId },
    include: { user: { include: { profile: true, rotaryInfo: true } } },
  });
  if (!request || request.status !== "PENDING") {
    throw new NotFoundError("No pending verification request with that id");
  }

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
 * Throws `NotFoundError` if the request is missing or already reviewed.
 */
export async function rejectVerification(
  actor: Actor,
  requestId: string,
  note?: string,
): Promise<void> {
  const admin = assertAdmin(actor);

  const request = await db.verificationRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING") {
    throw new NotFoundError("No pending verification request with that id");
  }

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
