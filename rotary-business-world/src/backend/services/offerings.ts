import type { TradeRole } from "@prisma/client";
import { db } from "@/backend/db";
import { GUARDRAILS } from "@/backend/config/guardrails";
import { ValidationError } from "@/backend/errors";
import type { OfferingInput } from "@/shared/validators";

// No `import "server-only"` here so this is unit-testable and reusable; it is
// only ever called from the business service (server-side).

export type BuiltOfferings = {
  rows: {
    categoryId: string;
    title: string;
    keywords: string[];
    tradeRoles: TradeRole[];
    minOrderQty: string | null;
    isActive: boolean;
  }[];
  tradeRoles: TradeRole[];
  offeringsText: string | null;
};

/**
 * Resolve offerings into DB rows plus the denormalized Business fields the search
 * layer and directory facet read (`tradeRoles` union, `offeringsText` search feed).
 *
 * Dedupes by category (one offering per category — mirrors the @@unique), caps at
 * MAX_OFFERINGS (anti-gaming, see docs/NEEDS-LEADS.md §3.1), and requires a
 * non-empty trade role on every offering (defense-in-depth beyond the zod check).
 */
export async function buildOfferings(
  offerings: OfferingInput[] | undefined,
): Promise<BuiltOfferings> {
  // Dedupe by categoryId, keeping the last occurrence, so the @@unique never trips.
  const byCat = new Map<string, OfferingInput>();
  for (const o of offerings ?? []) {
    if (!o.tradeRoles || o.tradeRoles.length === 0) {
      throw new ValidationError("Each offering needs at least one trade role", {
        offerings: ["Pick at least one trade role for every offering"],
      });
    }
    byCat.set(o.categoryId, o);
  }
  const deduped = [...byCat.values()].slice(0, GUARDRAILS.MAX_OFFERINGS);
  if (deduped.length === 0) {
    return { rows: [], tradeRoles: [], offeringsText: null };
  }

  // Fetch category names + synonyms for the search feed. Silently drops offerings
  // whose category no longer exists (stale form submit).
  const cats = await db.category.findMany({
    where: { id: { in: deduped.map((o) => o.categoryId) } },
    select: { id: true, name: true, synonyms: true },
  });
  const catMap = new Map(cats.map((c) => [c.id, c]));

  const rows = deduped
    .filter((o) => catMap.has(o.categoryId))
    .map((o) => ({
      categoryId: o.categoryId,
      title: o.title,
      keywords: (o.keywords ?? []).map((k) => k.toLowerCase()),
      tradeRoles: o.tradeRoles as TradeRole[],
      minOrderQty: o.minOrderQty ?? null,
      isActive: true,
    }));

  // Denormalized union of trade roles across all offerings (directory facet + search).
  const roleSet = new Set<TradeRole>();
  for (const r of rows) for (const tr of r.tradeRoles) roleSet.add(tr);

  // Search feed: offering titles + keywords + category names + synonyms. Generated
  // columns can't reference other tables, so this is materialized here and folded
  // into searchVector/searchText by prisma/sql/search.sql.
  const textParts: string[] = [];
  for (const r of rows) {
    textParts.push(r.title, r.keywords.join(" "));
    const c = catMap.get(r.categoryId);
    if (c) textParts.push(c.name, c.synonyms.join(" "));
  }
  const offeringsText = textParts.filter(Boolean).join(" ").slice(0, 8000) || null;

  return { rows, tradeRoles: [...roleSet], offeringsText };
}
