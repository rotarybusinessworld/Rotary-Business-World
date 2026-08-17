import "server-only";
import { db } from "@/backend/db";
import { verifyAgainstRoster } from "@/backend/verification";
import { ConflictError, NotFoundError } from "@/backend/errors";

/**
 * Account creation + roster verification.
 *
 * Signing the user in is deliberately NOT here: `signIn` is an Auth.js/cookie
 * concern that belongs to the web adapter. A mobile adapter would call
 * `registerMember` and then mint a token instead.
 */

export type RegisterMemberInput = {
  fullName: string;
  email: string;
  rotaryId: string;
  clubName: string;
  /** FK to District.id — the picker submits this; we resolve the code for roster matching. */
  districtId: string;
  phone: string;
  country?: string;
};

export type RegisterMemberResult = {
  userId: string;
  email: string;
  status: "VERIFIED" | "PAYMENT_PENDING";
};

export async function registerMember(
  input: RegisterMemberInput,
): Promise<RegisterMemberResult> {
  const email = input.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists", {
      email: ["An account with this email already exists"],
    });
  }

  // Resolve the district record to get its roster-match code.
  const district = await db.district.findUnique({
    where: { id: input.districtId },
  });
  if (!district) {
    throw new NotFoundError("Selected district not found — please choose again");
  }

  // Run the roster check to capture match score + reason for the admin queue.
  // Every member registers as PAYMENT_PENDING regardless of the outcome — only a
  // district admin can grant VERIFIED via /admin/verifications (pillars 1 & 2).
  const outcome = await verifyAgainstRoster({
    rotaryId: input.rotaryId,
    fullName: input.fullName,
    districtCode: district.code,
  });

  // Note: the "already claimed" duplicate guard is intentionally NOT run here.
  // Registration no longer sets matchedRosterId, so there is nothing to claim.
  // Duplicate-identity protection is enforced at admin approval time by
  // verification-queue.ts + the @@unique(matchedRosterId) DB constraint.

  const user = await db.user.create({
    data: {
      email,
      // PAYMENT_PENDING: registered, email confirmed, ready to pay.
      // (REGISTERED → PAYMENT_PENDING email-confirm step is Week 2 / magic-link.)
      status: "PAYMENT_PENDING",
      profile: {
        create: {
          fullName: input.fullName,
          phone: input.phone,
          country: input.country ?? null,
        },
      },
      rotaryInfo: {
        create: {
          rotaryId: input.rotaryId,
          classification: null,
          // Home district set at registration so the admin scope query can filter
          // this member to the right district even before approval.
          districtId: input.districtId,
          // Never claim the roster identity at registration — the approval step
          // re-derives the best candidate and reserves it atomically.
          matchedRosterId: null,
        },
      },
      // Always create a VerificationRequest so the admin queue has full context.
      // It appears in /admin/verifications once the member reaches PENDING_VERIFICATION.
      verificationRequests: {
        create: {
          submittedInfo: {
            rotaryId: input.rotaryId,
            clubName: input.clubName,
            districtCode: district.code,
            score: outcome.score,
            reason: outcome.reason,
          },
        },
      },
    },
  });

  return { userId: user.id, email, status: "PAYMENT_PENDING" };
}
