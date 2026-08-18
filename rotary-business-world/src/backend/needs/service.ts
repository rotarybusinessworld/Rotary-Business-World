import "server-only";
import type { Need, MatchFeedback } from "@prisma/client";
import { db } from "@/backend/db";
import { assertVerified, type Actor } from "@/backend/actor";
import { ValidationError, NotFoundError } from "@/backend/errors";
import { GUARDRAILS } from "@/backend/config/guardrails";
import { enqueueMatchNeed } from "@/backend/jobs";
import { estimateRecipients } from "./matching";

/** Days a need stays OPEN before it expires. */
const NEED_TTL_DAYS = 14;

export type NeedInput = {
  categoryId: string;
  tradeIntent: "BUY_RETAIL" | "BUY_WHOLESALE" | "MANUFACTURING" | "HIRE_SERVICE";
  reachWanted: "DISTRICT" | "STATE" | "NATIONAL" | "INTERNATIONAL";
  quantity?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  notes?: string | null;
  urgent?: boolean;
};

/** Resolve the poster's geography once — district is mandatory for matching. */
async function resolveGeography(actorId: string) {
  const [rotary, profile] = await Promise.all([
    db.rotaryInfo.findUnique({ where: { userId: actorId }, select: { districtId: true } }),
    db.profile.findUnique({ where: { userId: actorId }, select: { country: true } }),
  ]);
  if (!rotary?.districtId) {
    throw new ValidationError(
      "Add your Rotary district to your profile before posting a need — matching is district-aware.",
    );
  }
  return { districtId: rotary.districtId, country: profile?.country ?? null };
}

/**
 * Post a Need. Inserts OPEN with an explicit expiresAt, then enqueues the
 * `match-need` worker job. **No matching inline** (docs/NEEDS-LEADS.md §5).
 */
export async function createNeed(actor: Actor, input: NeedInput): Promise<Need> {
  assertVerified(actor);

  // Rate limits (guardrails, not schema defaults).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayCount = await db.need.count({
    where: { memberId: actor.id, createdAt: { gte: since } },
  });
  if (todayCount >= GUARDRAILS.MAX_NEEDS_PER_MEMBER_DAY) {
    throw new ValidationError(
      `You can post up to ${GUARDRAILS.MAX_NEEDS_PER_MEMBER_DAY} needs a day. Try again tomorrow.`,
    );
  }

  if (input.urgent) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const urgentCount = await db.need.count({
      where: { memberId: actor.id, urgency: "URGENT", createdAt: { gte: weekAgo } },
    });
    if (urgentCount >= GUARDRAILS.MAX_URGENT_PER_WEEK) {
      throw new ValidationError(
        "You've used your urgent need this week. Post it as a standard need instead.",
      );
    }
  }

  const category = await db.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) throw new ValidationError("Pick a valid category");

  const { districtId, country } = await resolveGeography(actor.id);

  const need = await db.need.create({
    data: {
      memberId: actor.id,
      categoryId: input.categoryId,
      tradeIntent: input.tradeIntent,
      reachWanted: input.reachWanted,
      districtId,
      country,
      stateCode: null,
      quantity: input.quantity ?? null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      notes: input.notes ?? null,
      urgency: input.urgent ? "URGENT" : "STANDARD",
      status: "OPEN",
      // Explicit — never rely on a schema default for a lifecycle field.
      expiresAt: new Date(Date.now() + NEED_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await enqueueMatchNeed({ needId: need.id });
  return need;
}

/**
 * Live recipient estimate for the need form. Returns 0 (not an error) if the
 * member has no district yet — the form surfaces the district nudge separately.
 */
export async function estimateNeedRecipients(
  actor: Actor,
  input: Pick<NeedInput, "categoryId" | "tradeIntent" | "reachWanted">,
): Promise<number> {
  assertVerified(actor);
  const category = await db.category.findUnique({
    where: { id: input.categoryId },
    select: { path: true },
  });
  if (!category) return 0;

  const rotary = await db.rotaryInfo.findUnique({
    where: { userId: actor.id },
    select: { districtId: true },
  });
  const profile = await db.profile.findUnique({
    where: { userId: actor.id },
    select: { country: true },
  });
  if (!rotary?.districtId) return 0;

  return estimateRecipients({
    tradeIntent: input.tradeIntent,
    categoryPath: category.path,
    districtId: rotary.districtId,
    stateCode: null,
    country: profile?.country ?? null,
    reachWanted: input.reachWanted,
    excludeMemberId: actor.id,
  });
}

// ── Buyer side: my posted needs ───────────────────────────────────────────────

export type MyNeedDTO = {
  id: string;
  category: string;
  tradeIntent: string;
  reachWanted: string;
  quantity: string | null;
  status: string;
  createdAt: Date;
  matchCount: number; // businesses notified
};

/** The actor's own posted needs, newest first, with a delivered-match count. */
export async function listNeedsForMember(actor: Actor): Promise<MyNeedDTO[]> {
  const rows = await db.need.findMany({
    where: { memberId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      category: { select: { name: true } },
      _count: { select: { matches: { where: { sentAt: { not: null } } } } },
    },
  });
  return rows.map((n) => ({
    id: n.id,
    category: n.category.name,
    tradeIntent: n.tradeIntent,
    reachWanted: n.reachWanted,
    quantity: n.quantity,
    status: n.status,
    createdAt: n.createdAt,
    matchCount: n._count.matches,
  }));
}

// ── Leads inbox (seller side) ─────────────────────────────────────────────────

export type LeadDTO = {
  id: string;
  score: number;
  matchedAt: Date;
  viewedAt: Date | null;
  feedback: MatchFeedback | null;
  business: { name: string; slug: string };
  offeringTitle: string | null;
  buyerId: string;
  buyerDistrict: string | null;
  category: string;
  tradeIntent: string;
  quantity: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  notes: string | null;
  postedAt: Date;
  needStatus: string;
};

/** Delivered leads for every business the actor owns, newest first. */
export async function listLeadsForOwner(actor: Actor): Promise<LeadDTO[]> {
  const rows = await db.needMatch.findMany({
    where: { sentAt: { not: null }, business: { ownerId: actor.id } },
    orderBy: { matchedAt: "desc" },
    take: 100,
    include: {
      business: { select: { name: true, slug: true } },
      offering: { select: { title: true } },
      need: {
        select: {
          memberId: true,
          tradeIntent: true,
          quantity: true,
          budgetMin: true,
          budgetMax: true,
          notes: true,
          createdAt: true,
          status: true,
          category: { select: { name: true } },
          district: { select: { name: true, code: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    score: r.score,
    matchedAt: r.matchedAt,
    viewedAt: r.viewedAt,
    feedback: r.feedback,
    business: r.business,
    offeringTitle: r.offering?.title ?? null,
    buyerId: r.need.memberId,
    buyerDistrict: r.need.district?.name ?? r.need.district?.code ?? null,
    category: r.need.category.name,
    tradeIntent: r.need.tradeIntent,
    quantity: r.need.quantity,
    budgetMin: r.need.budgetMin,
    budgetMax: r.need.budgetMax,
    notes: r.need.notes,
    postedAt: r.need.createdAt,
    needStatus: r.need.status,
  }));
}

/** Count of delivered-but-unopened leads — drives the notification bell badge. */
export async function countUnviewedLeads(actor: Actor): Promise<number> {
  return db.needMatch.count({
    where: { sentAt: { not: null }, viewedAt: null, business: { ownerId: actor.id } },
  });
}

/** Mark every unviewed lead for this owner as seen (called when the inbox opens). */
export async function markAllLeadsViewed(actor: Actor): Promise<void> {
  await db.needMatch.updateMany({
    where: { sentAt: { not: null }, viewedAt: null, business: { ownerId: actor.id } },
    data: { viewedAt: new Date() },
  });
}

/** One-click feedback from the inbox. Ownership-guarded via the business join. */
export async function recordLeadFeedback(
  actor: Actor,
  matchId: string,
  feedback: MatchFeedback,
): Promise<void> {
  const match = await db.needMatch.findFirst({
    where: { id: matchId, business: { ownerId: actor.id } },
    select: { id: true },
  });
  if (!match) throw new NotFoundError("Lead not found");
  await db.needMatch.update({
    where: { id: matchId },
    data: { feedback, feedbackAt: new Date() },
  });
}

/**
 * Resolve the buyer to contact for a lead ("I can help"). Ownership-guarded.
 * Returns the buyer's user id; the caller opens a messaging thread — buyer
 * contact details are never exposed directly.
 */
export async function getLeadBuyer(actor: Actor, matchId: string): Promise<string> {
  const match = await db.needMatch.findFirst({
    where: { id: matchId, business: { ownerId: actor.id } },
    select: { need: { select: { memberId: true } }, viewedAt: true, id: true },
  });
  if (!match) throw new NotFoundError("Lead not found");
  // Opening the conversation counts as viewing the lead.
  if (!match.viewedAt) {
    await db.needMatch.update({ where: { id: matchId }, data: { viewedAt: new Date() } });
  }
  return match.need.memberId;
}
