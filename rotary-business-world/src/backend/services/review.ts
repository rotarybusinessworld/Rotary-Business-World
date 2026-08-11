import "server-only";
import { db } from "@/backend/db";
import { assertVerified, type Actor } from "@/backend/actor";
import { ForbiddenError, NotFoundError } from "@/backend/errors";
import { recordAudit } from "@/backend/audit";

/**
 * Review service — verified member → business, one review per member.
 *
 * Upsert semantics: a member can edit their own review by submitting again.
 * Owners may not review their own business.
 */

export type CreateReviewInput = {
  businessId: string;
  rating: number; // 1–5, already validated
  body: string | null;
};

export type ReviewWithReviewer = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  reviewer: {
    id: string;
    fullName: string;
    photoUrl: string | null;
  };
};

export type ReviewsSummary = {
  count: number;
  average: number | null;
  reviews: ReviewWithReviewer[];
};

export async function createReview(
  actor: Actor,
  input: CreateReviewInput,
): Promise<void> {
  assertVerified(actor);

  const business = await db.business.findUnique({
    where: { id: input.businessId },
    select: { ownerId: true },
  });
  if (!business) throw new NotFoundError("Business not found");
  if (business.ownerId === actor.id) {
    throw new ForbiddenError("You cannot review your own business");
  }

  // Upsert: create on first review, update on subsequent ones.
  await db.review.upsert({
    where: {
      businessId_reviewerId: {
        businessId: input.businessId,
        reviewerId: actor.id,
      },
    },
    create: {
      businessId: input.businessId,
      reviewerId: actor.id,
      rating: input.rating,
      body: input.body,
    },
    update: {
      rating: input.rating,
      body: input.body,
    },
  });

  void recordAudit({
    actorId: actor.id,
    action: "review.created",
    targetType: "Business",
    targetId: input.businessId,
  });
}

export async function listReviewsForBusiness(
  businessId: string,
): Promise<ReviewsSummary> {
  const rows = await db.review.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: {
        include: { profile: { select: { fullName: true, photoUrl: true } } },
      },
    },
  });

  const reviews: ReviewWithReviewer[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    createdAt: r.createdAt,
    reviewer: {
      id: r.reviewer.id,
      fullName: r.reviewer.profile?.fullName ?? r.reviewer.email,
      photoUrl: r.reviewer.profile?.photoUrl ?? null,
    },
  }));

  const count = reviews.length;
  const average =
    count === 0
      ? null
      : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) /
        10;

  return { count, average, reviews };
}

/** Fetch a single reviewer's review for a given business (for pre-filling edit form). */
export async function getMyReview(
  actorId: string,
  businessId: string,
): Promise<{ rating: number; body: string | null } | null> {
  const row = await db.review.findUnique({
    where: {
      businessId_reviewerId: { businessId, reviewerId: actorId },
    },
    select: { rating: true, body: true },
  });
  return row ?? null;
}
