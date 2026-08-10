import "server-only";
import { db } from "@/backend/db";
import { hashPassword } from "@/backend/password";
import { verifyAgainstRoster } from "@/backend/verification";
import { ConflictError } from "@/backend/errors";

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
  password: string;
  rotaryId: string;
  clubName: string;
  districtCode: string;
  phone: string;
  country?: string;
};

export type RegisterMemberResult = {
  userId: string;
  email: string;
  status: "VERIFIED" | "PENDING";
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

  // Decide verification status by matching the official roster.
  const outcome = await verifyAgainstRoster({
    rotaryId: input.rotaryId,
    fullName: input.fullName,
    districtCode: input.districtCode,
  });

  // Guard against one roster identity being claimed by multiple verified
  // accounts (impersonation / duplicates). Enforced at the DB level via @@unique.
  if (outcome.status === "VERIFIED" && outcome.rosterMemberId) {
    const alreadyClaimed = await db.rotaryInfo.findFirst({
      where: { matchedRosterId: outcome.rosterMemberId },
    });
    if (alreadyClaimed) {
      throw new ConflictError("This Rotary ID is already registered", {
        rotaryId: [
          "This Rotary ID is already registered. If this is you, log in or contact support.",
        ],
      });
    }
  }

  const passwordHash = await hashPassword(input.password);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      status: outcome.status,
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
          // Only claim the roster identity when actually verified; a fuzzy
          // PENDING candidate must not consume the unique slot.
          matchedRosterId:
            outcome.status === "VERIFIED" ? outcome.rosterMemberId : null,
        },
      },
      // Unmatched signups go to the admin review queue.
      ...(outcome.status === "PENDING"
        ? {
            verificationRequests: {
              create: {
                submittedInfo: {
                  rotaryId: input.rotaryId,
                  clubName: input.clubName,
                  districtCode: input.districtCode,
                  score: outcome.score,
                  reason: outcome.reason,
                },
              },
            },
          }
        : {}),
    },
  });

  return { userId: user.id, email, status: outcome.status };
}
