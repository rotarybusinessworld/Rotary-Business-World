import { db } from "@/backend/db";
import { normalizeDistrictCode, normalizeRotaryId } from "@/backend/roster";

export type VerificationOutcome = {
  status: "VERIFIED" | "PENDING";
  rosterMemberId: string | null;
  score: number; // 0..1 confidence
  reason: string;
};

// Above this trigram-name similarity (with a matching district) we auto-verify.
const FUZZY_AUTO_VERIFY = 0.55;

type RosterMatchRow = {
  id: string;
  fullName: string;
  rotaryId: string | null;
  districtCode: string | null;
  sim: number;
};

/**
 * Decide whether a signup matches the seeded official roster.
 *   1. Exact (normalized) Rotary ID  → VERIFIED.
 *   2. Strong fuzzy name match within the same district → VERIFIED.
 *   3. Otherwise → PENDING (goes to the admin queue).
 */
export async function verifyAgainstRoster(input: {
  rotaryId: string;
  fullName: string;
  districtCode: string;
}): Promise<VerificationOutcome> {
  const rid = normalizeRotaryId(input.rotaryId);
  const district = normalizeDistrictCode(input.districtCode);

  // 1. Exact Rotary ID match (normalized comparison done in SQL).
  if (rid.length >= 3) {
    const byId = await db.$queryRaw<RosterMatchRow[]>`
      SELECT id, "fullName", "rotaryId", "districtCode", 1::float8 AS sim
      FROM "RosterMember"
      WHERE upper(regexp_replace(coalesce("rotaryId", ''), '[^A-Za-z0-9]', '', 'g')) = ${rid}
      LIMIT 1
    `;
    if (byId.length > 0) {
      return {
        status: "VERIFIED",
        rosterMemberId: byId[0].id,
        score: 1,
        reason: "Exact Rotary ID match",
      };
    }
  }

  // 2. Fuzzy name match, preferring the same district.
  const fuzzy = await db.$queryRaw<RosterMatchRow[]>`
    SELECT id, "fullName", "rotaryId", "districtCode",
           similarity("fullName", ${input.fullName}) AS sim
    FROM "RosterMember"
    WHERE similarity("fullName", ${input.fullName}) > 0.3
    ORDER BY sim DESC
    LIMIT 5
  `;

  const best = fuzzy[0];
  if (best) {
    const sameDistrict =
      district.length > 0 &&
      normalizeDistrictCode(best.districtCode) === district;
    if (best.sim >= FUZZY_AUTO_VERIFY && sameDistrict) {
      return {
        status: "VERIFIED",
        rosterMemberId: best.id,
        score: best.sim,
        reason: `Strong name match (${best.sim.toFixed(2)}) in district ${district}`,
      };
    }
    return {
      status: "PENDING",
      rosterMemberId: best.id,
      score: best.sim,
      reason: sameDistrict
        ? `Name match too weak (${best.sim.toFixed(2)}) for auto-verify`
        : `Name matched but district differs — needs review`,
    };
  }

  // 3. No candidate at all.
  return {
    status: "PENDING",
    rosterMemberId: null,
    score: 0,
    reason: "No roster match found",
  };
}
