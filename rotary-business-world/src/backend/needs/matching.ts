// NOTE: no `import "server-only"` here — this module runs in the BullMQ worker
// (a plain Node/tsx runtime, not Next), so it must avoid the server-only guard.
// It is still only ever imported server-side (worker + service.ts).
import { Prisma } from "@prisma/client";
import { db } from "@/backend/db";
import { GUARDRAILS } from "@/backend/config/guardrails";
import { INTENT_TO_ROLES, INTENT_EXACT_ROLE } from "@/backend/config/trade-matching";
import { logger } from "@/backend/logger";

/**
 * The matching engine. Runs in the `match-need` worker job — never inline in a
 * request. Two stages: a hard SQL filter, then a 0–100 score. Full spec in
 * docs/NEEDS-LEADS.md §6. Idempotent: safe to re-run on retry via
 * createMany({ skipDuplicates }) guarded by @@unique([needId, businessId]).
 */

type Candidate = {
  offering_id: string;
  businessId: string;
  cat_depth: number;
  cat_path: string;
  owner_verified: boolean;
  same_district: boolean;
  same_state: boolean;
  same_country: boolean;
  service_reach: string;
  avg_rating: number;
  photo_count: number;
  leads_7d: number;
  title: string | null;
  keywords: string[];
  trade_roles: string[];
};

const REACH_RANK: Record<string, number> = {
  DISTRICT: 0,
  STATE: 1,
  NATIONAL: 2,
  INTERNATIONAL: 3,
};

/** Parameters shared by the matcher and the live recipient estimate. */
export type MatchFilterParams = {
  tradeIntent: string;
  categoryPath: string;
  districtId: string;
  stateCode: string | null;
  country: string | null;
  reachWanted: string;
  excludeMemberId: string;
};

/** Build the Stage-1 hard-filter WHERE clause (shared by match + estimate). */
function buildFilterWhere(p: MatchFilterParams): Prisma.Sql {
  const allowedRoles = INTENT_TO_ROLES[p.tradeIntent as keyof typeof INTENT_TO_ROLES];
  const rolesSql = Prisma.sql`ARRAY[${Prisma.join(
    allowedRoles.map((r) => Prisma.sql`${r}`),
  )}]::text[]`;

  const reachRank = REACH_RANK[p.reachWanted] ?? 1;
  const geo: Prisma.Sql[] = [Prisma.sql`b."districtId" = ${p.districtId}`];
  if (reachRank >= REACH_RANK.STATE && p.stateCode) {
    geo.push(Prisma.sql`(b."serviceReach" >= 'STATE' AND b."stateCode" = ${p.stateCode})`);
  }
  if (reachRank >= REACH_RANK.NATIONAL && p.country) {
    geo.push(Prisma.sql`(b."serviceReach" >= 'NATIONAL' AND b."country" = ${p.country})`);
  }
  if (reachRank >= REACH_RANK.INTERNATIONAL) {
    geo.push(Prisma.sql`b."serviceReach" = 'INTERNATIONAL'`);
  }
  const geoSql = Prisma.join(geo, " OR ");

  return Prisma.sql`
        b."status" = 'APPROVED'
    AND b."receiveLeads" = true
    AND o."isActive" = true
    AND b."ownerId" <> ${p.excludeMemberId}
    AND c."path" LIKE ${p.categoryPath} || '%'
    AND o."tradeRoles"::text[] && ${rolesSql}
    AND (${geoSql})
  `;
}

/**
 * How many distinct businesses would receive this need. Powers the live
 * "about N businesses will see this" hint on the form (docs/NEEDS-LEADS.md §5).
 * Uses the same hard filter as matching, so the estimate can't drift from reality.
 */
export async function estimateRecipients(p: MatchFilterParams): Promise<number> {
  const where = buildFilterWhere(p);
  const rows = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT o."businessId")::bigint AS count
    FROM   "BusinessOffering" o
    JOIN   "Business" b ON b."id" = o."businessId"
    JOIN   "Category" c ON c."id" = o."categoryId"
    WHERE  ${where}
  `;
  return Number(rows[0]?.count ?? 0);
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3),
  );
}

type ScoreBreakdown = {
  category: number;
  geo: number;
  keyword: number;
  quality: number;
  fairness: number;
};

/** Category precision: exact = 50, one level deeper = 40, two+ = 30. */
function categoryScore(needDepth: number, offeringDepth: number): number {
  const diff = Math.max(0, offeringDepth - needDepth);
  if (diff === 0) return 50;
  if (diff === 1) return 40;
  return 30;
}

/** Geography: best applicable tier. */
function geoScore(c: Candidate): number {
  if (c.same_district) return 30;
  if (c.same_state) return 20;
  if (c.same_country) return 12;
  return 6; // international
}

/** Keyword overlap 0–10 — recall only, never a substitute for a category match. */
function keywordScore(needText: string, c: Candidate): number {
  const need = tokens(needText);
  if (need.size === 0) return 0;
  const offer = tokens([c.title ?? "", c.keywords.join(" ")].join(" "));
  let shared = 0;
  for (const t of need) if (offer.has(t)) shared++;
  return Math.min(10, shared * 3);
}

/** Business quality 0–10. */
function qualityScore(c: Candidate): number {
  const rating = Math.min(7, c.avg_rating * 1.5);
  const photos = c.photo_count > 0 ? 2 : 0;
  const verified = c.owner_verified ? 1 : 0;
  return rating + photos + verified;
}

/**
 * Match a single need. Writes a NeedMatch row per candidate business (best
 * offering wins the rollup). Rows scoring ≥ NOTIFY_SCORE_MIN and inside the
 * recipient/fairness caps are marked delivered (sentAt set) and surface in the
 * owner's in-app leads inbox; the rest are recorded with sentAt null as the
 * tuning dataset — they cost nothing.
 */
export async function matchNeed(needId: string): Promise<{ delivered: number; recorded: number }> {
  if (process.env.LEADS_KILL_SWITCH === "1") {
    logger.warn({ needId }, "[match-need] kill switch active — skipping dispatch");
    return { delivered: 0, recorded: 0 };
  }

  const need = await db.need.findUnique({
    where: { id: needId },
    include: { category: { select: { path: true, depth: true } } },
  });
  if (!need || need.status !== "OPEN") {
    logger.info({ needId }, "[match-need] need missing or not OPEN — skipping");
    return { delivered: 0, recorded: 0 };
  }

  // ── Stage 1: hard filter (shared with the recipient estimate) ───────────────
  const where = buildFilterWhere({
    tradeIntent: need.tradeIntent,
    categoryPath: need.category.path,
    districtId: need.districtId,
    stateCode: need.stateCode,
    country: need.country,
    reachWanted: need.reachWanted,
    excludeMemberId: need.memberId,
  });

  const rows = await db.$queryRaw<Candidate[]>`
    SELECT o."id"          AS offering_id,
           o."businessId"  AS "businessId",
           c."depth"       AS cat_depth,
           c."path"        AS cat_path,
           (u."status" = 'VERIFIED')                       AS owner_verified,
           (b."districtId" = ${need.districtId})           AS same_district,
           (b."stateCode"  = ${need.stateCode})            AS same_state,
           (b."country"    = ${need.country})              AS same_country,
           b."serviceReach"::text                          AS service_reach,
           COALESCE(rs.avg_rating, 0)::float               AS avg_rating,
           COALESCE(img.cnt, 0)::int                       AS photo_count,
           COALESCE(l7.cnt, 0)::int                        AS leads_7d,
           o."title"                                       AS title,
           o."keywords"                                    AS keywords,
           o."tradeRoles"::text[]                          AS trade_roles
    FROM   "BusinessOffering" o
    JOIN   "Business" b ON b."id" = o."businessId"
    JOIN   "User"     u ON u."id" = b."ownerId"
    JOIN   "Category" c ON c."id" = o."categoryId"
    LEFT   JOIN (SELECT "businessId", AVG("rating") AS avg_rating FROM "Review" GROUP BY "businessId") rs
           ON rs."businessId" = b."id"
    LEFT   JOIN (SELECT "businessId", COUNT(*) AS cnt FROM "BusinessImage" GROUP BY "businessId") img
           ON img."businessId" = b."id"
    LEFT   JOIN (SELECT "businessId", COUNT(*) AS cnt FROM "NeedMatch"
                 WHERE "sentAt" > now() - interval '7 days' GROUP BY "businessId") l7
           ON l7."businessId" = b."id"
    WHERE  ${where}
  `;

  if (rows.length === 0) {
    logger.info({ needId }, "[match-need] no candidates");
    return { delivered: 0, recorded: 0 };
  }

  // ── Stage 2: score, rolling up to one row per business (best offering wins) ──
  const needText = [need.quantity ?? "", need.notes ?? ""].join(" ");
  const exactRole = INTENT_EXACT_ROLE[need.tradeIntent];

  type Scored = {
    businessId: string;
    offeringId: string;
    score: number;
    breakdown: ScoreBreakdown;
    leads7d: number;
  };
  const bestByBiz = new Map<string, Scored>();

  for (const c of rows) {
    const category = categoryScore(need.category.depth, c.cat_depth);
    const geoS = geoScore(c);
    const keyword = keywordScore(needText, c);
    const quality = qualityScore(c);
    const fairness = -Math.min(20, c.leads_7d * 4);
    // Small nudge so an exact-role seller outranks a widened one (e.g. a true
    // wholesaler above a manufacturer for a wholesale request).
    const roleBonus = c.trade_roles.includes(exactRole) ? 0 : -3;

    const raw = category + geoS + keyword + quality + fairness + roleBonus;
    const score = Math.max(0, Math.min(100, Math.round(raw)));
    const breakdown: ScoreBreakdown = { category, geo: geoS, keyword, quality, fairness };

    const prev = bestByBiz.get(c.businessId);
    if (!prev || score > prev.score) {
      bestByBiz.set(c.businessId, {
        businessId: c.businessId,
        offeringId: c.offering_id,
        score,
        breakdown,
        leads7d: c.leads_7d,
      });
    }
  }

  // ── Stage 3: thresholds + caps ──────────────────────────────────────────────
  const ranked = [...bestByBiz.values()].sort((a, b) => b.score - a.score);
  const now = new Date();
  let deliveredCount = 0;

  const data = ranked.map((s) => {
    const eligible =
      s.score >= GUARDRAILS.NOTIFY_SCORE_MIN &&
      s.leads7d < GUARDRAILS.MAX_LEADS_PER_BIZ_7D &&
      deliveredCount < GUARDRAILS.MAX_RECIPIENTS;
    const deliver = eligible;
    if (deliver) deliveredCount++;
    return {
      needId,
      businessId: s.businessId,
      offeringId: s.offeringId,
      score: s.score,
      scoreBreakdown: s.breakdown as unknown as Prisma.InputJsonValue,
      // sentAt marks a lead delivered to the owner (in-app now; email later).
      // Null rows are the tuning dataset — recorded, never surfaced.
      sentAt: deliver ? now : null,
      matchedAt: now,
    };
  });

  // Idempotent — a retry re-inserts nothing thanks to @@unique([needId, businessId]).
  await db.needMatch.createMany({ data, skipDuplicates: true });

  logger.info(
    { needId, candidates: rows.length, businesses: ranked.length, delivered: deliveredCount },
    "[match-need] complete",
  );
  return { delivered: deliveredCount, recorded: data.length };
}
