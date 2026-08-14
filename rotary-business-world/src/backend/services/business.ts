import "server-only";
import type { Business } from "@prisma/client";
import { db } from "@/backend/db";
import { slugify } from "@/shared/utils";
import { assertVerified, type Actor } from "@/backend/actor";
import { NotFoundError } from "@/backend/errors";

/**
 * Business listing domain logic.
 *
 * Transport-agnostic on purpose: takes an `Actor` plus already-validated input,
 * returns the affected record, throws `AppError` on failure. Adapters (server
 * actions today, REST/mobile later) own parsing, redirects and cache
 * revalidation.
 */

/** Already-validated listing fields. Schema validation happens in the adapter. */
export type BusinessInput = {
  name: string;
  description?: string | null;
  industryId?: string | null;
  categoryId?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  addressLine?: string | null;
  city?: string | null;
  country?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  /** Rotarian-member discount. */
  discountPercent?: number | null;
  discountNote?: string | null;
  /** Ordered gallery image URLs; replaces the existing gallery on update. */
  gallery?: string[];
};

const MAX_GALLERY = 12;

/** Resolve taxonomy IDs to names (denormalized onto Business to feed the search vector). */
async function resolveTaxonomy(
  industryId: string | null | undefined,
  categoryId: string | null | undefined,
) {
  const [industry, category] = await Promise.all([
    industryId ? db.industry.findUnique({ where: { id: industryId } }) : null,
    categoryId ? db.category.findUnique({ where: { id: categoryId } }) : null,
  ]);
  return {
    industryId: industry?.id ?? null,
    industryName: industry?.name ?? null,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
  };
}

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "business";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const existing = await db.business.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Scalar columns shared by create and update. */
function scalarFields(input: BusinessInput) {
  return {
    name: input.name,
    description: input.description ?? null,
    logoUrl: input.logoUrl ?? null,
    coverUrl: input.coverUrl ?? null,
    website: input.website ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    whatsapp: input.whatsapp ?? null,
    addressLine: input.addressLine ?? null,
    city: input.city ?? null,
    country: input.country ?? null,
    linkedin: input.linkedin ?? null,
    instagram: input.instagram ?? null,
    discountPercent: input.discountPercent ?? null,
    discountNote: input.discountNote ?? null,
  };
}

function galleryRows(gallery: string[] | undefined) {
  return (gallery ?? [])
    .slice(0, MAX_GALLERY)
    .map((url, sortOrder) => ({ url, sortOrder }));
}

/** Create a listing owned by the actor. Requires a VERIFIED member.
 *  New listings start as PENDING — invisible in search until a district admin
 *  approves them (pillar 3). The search layer already filters status = 'APPROVED'.
 */
export async function createBusiness(
  actor: Actor,
  input: BusinessInput,
): Promise<Business> {
  assertVerified(actor);

  const taxonomy = await resolveTaxonomy(input.industryId, input.categoryId);
  const slug = await uniqueSlug(input.name);

  return db.business.create({
    data: {
      ownerId: actor.id,
      slug,
      status: "PENDING", // explicit — never rely on schema default for new listings
      ...scalarFields(input),
      ...taxonomy,
      images: { create: galleryRows(input.gallery) },
    },
  });
}

/**
 * Update a listing the actor owns.
 * Throws `NotFoundError` when it doesn't exist *or* isn't theirs — we don't
 * leak the difference.
 *
 * **Re-moderation rule:** editing a *material* field (name, description,
 * industry/category, photos, address) on an already-APPROVED listing re-enters it
 * as PENDING so the district admin can re-review. This prevents the
 * "moderate-then-swap" bypass. Cosmetic-only changes (discount fields) leave
 * an APPROVED listing live.
 *
 * PENDING/DRAFT/REJECTED listings that are edited stay PENDING — they still need approval.
 * SUSPENDED listings cannot be edited by the owner (admins use business-moderation).
 */
export async function updateBusiness(
  actor: Actor,
  id: string,
  input: BusinessInput,
): Promise<Business> {
  assertVerified(actor);

  const owned = await db.business.findFirst({ where: { id, ownerId: actor.id } });
  if (!owned) throw new NotFoundError("Business not found");

  // Suspended listings are locked — owner must contact the admin.
  if (owned.status === "SUSPENDED") {
    throw new NotFoundError("Business not found");
  }

  const taxonomy = await resolveTaxonomy(input.industryId, input.categoryId);
  const slug = await uniqueSlug(input.name, id);

  // Detect material changes that warrant re-moderation.
  const materialChanged =
    input.name !== owned.name ||
    (input.description ?? null) !== owned.description ||
    (input.industryId ?? null) !== owned.industryId ||
    (input.categoryId ?? null) !== owned.categoryId ||
    (input.logoUrl ?? null) !== owned.logoUrl ||
    (input.coverUrl ?? null) !== owned.coverUrl ||
    (input.addressLine ?? null) !== owned.addressLine ||
    (input.city ?? null) !== owned.city ||
    (input.country ?? null) !== owned.country ||
    // Gallery changes count as material (photo swap bypass)
    JSON.stringify(input.gallery ?? []) !== JSON.stringify(
      (await db.businessImage.findMany({
        where: { businessId: id },
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      })).map((img) => img.url),
    );

  // APPROVED: re-enter moderation on material changes (prevents "moderate-then-swap").
  // REJECTED: always re-enter moderation on any save (owner is resubmitting).
  // PENDING/DRAFT: stay as-is until approved.
  const nextStatus =
    (owned.status === "APPROVED" && materialChanged) || owned.status === "REJECTED"
      ? "PENDING"
      : owned.status;

  return db.business.update({
    where: { id },
    data: {
      slug,
      status: nextStatus,
      ...scalarFields(input),
      ...taxonomy,
      images: { deleteMany: {}, create: galleryRows(input.gallery) },
    },
  });
}

/** Delete a listing the actor owns. Returns the deleted record. */
export async function deleteBusiness(actor: Actor, id: string): Promise<Business> {
  assertVerified(actor);

  const owned = await db.business.findFirst({ where: { id, ownerId: actor.id } });
  if (!owned) throw new NotFoundError("Business not found");

  return db.business.delete({ where: { id } });
}
