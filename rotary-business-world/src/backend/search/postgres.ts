import { Prisma } from "@prisma/client";
import { db } from "@/backend/db";
import type {
  BusinessHit,
  Facet,
  SearchParams,
  SearchResult,
  SearchService,
  Suggestion,
} from "./types";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Postgres-backed search: weighted full-text (`searchVector`) combined with
 * trigram similarity on the name for typo tolerance, plus faceted filters.
 * Verified members are ranked above unverified ones.
 */
export class PostgresSearchService implements SearchService {
  async search(params: SearchParams): Promise<SearchResult> {
    const q = params.q?.trim() ?? "";
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, params.pageSize ?? DEFAULT_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    // Non-text filters shared by results, count and facets.
    const filters: Prisma.Sql[] = [Prisma.sql`b."status" = 'ACTIVE'`];
    if (params.industry)
      filters.push(Prisma.sql`b."industryName" = ${params.industry}`);
    if (params.category)
      filters.push(Prisma.sql`b."categoryName" = ${params.category}`);
    if (params.country)
      filters.push(Prisma.sql`b."country" = ${params.country}`);
    if (params.city) filters.push(Prisma.sql`b."city" = ${params.city}`);

    // Text predicate: FTS OR trigram-name match (typo tolerant).
    if (q) {
      filters.push(
        Prisma.sql`(b."searchVector" @@ websearch_to_tsquery('simple', ${q}) OR b."name" % ${q})`,
      );
    }
    const where = Prisma.join(filters, " AND ");

    // Ranking: verified first, then (when searching) FTS rank + name similarity,
    // then recency. Built dynamically so an empty query never emits a bare `0`
    // (Postgres would read a literal integer in ORDER BY as a column position).
    const order: Prisma.Sql[] = [Prisma.sql`(u."status" = 'VERIFIED') DESC`];
    if (q) {
      order.push(
        Prisma.sql`ts_rank_cd(b."searchVector", websearch_to_tsquery('simple', ${q})) DESC`,
      );
      order.push(Prisma.sql`similarity(b."name", ${q}) DESC`);
    }
    order.push(Prisma.sql`b."createdAt" DESC`);
    const orderBy = Prisma.join(order, ", ");

    const rows = await db.$queryRaw<BusinessHit[]>`
      SELECT b."id", b."name", b."slug", b."logoUrl", b."city", b."country",
             b."industryName", b."categoryName",
             u."status" = 'VERIFIED' AS "ownerVerified"
      FROM "Business" b
      JOIN "User" u ON u."id" = b."ownerId"
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const totalRows = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Business" b
      JOIN "User" u ON u."id" = b."ownerId"
      WHERE ${where}
    `;
    const total = Number(totalRows[0]?.count ?? 0);

    const [industry, country] = await Promise.all([
      this.facet("industryName", where),
      this.facet("country", where),
    ]);

    return {
      hits: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        logoUrl: r.logoUrl,
        city: r.city,
        country: r.country,
        industryName: r.industryName,
        categoryName: r.categoryName,
        ownerVerified: Boolean(r.ownerVerified),
      })),
      total,
      page,
      pageSize,
      facets: { industry, country },
    };
  }

  private async facet(
    column: "industryName" | "country",
    where: Prisma.Sql,
  ): Promise<Facet[]> {
    const col = Prisma.raw(`"${column}"`);
    const rows = await db.$queryRaw<{ value: string; count: bigint }[]>`
      SELECT b.${col} AS value, COUNT(*)::bigint AS count
      FROM "Business" b
      JOIN "User" u ON u."id" = b."ownerId"
      WHERE ${where} AND b.${col} IS NOT NULL AND b.${col} <> ''
      GROUP BY b.${col}
      ORDER BY count DESC, value ASC
      LIMIT 20
    `;
    return rows.map((r) => ({ value: r.value, count: Number(r.count) }));
  }

  async suggest(qRaw: string): Promise<Suggestion[]> {
    const q = qRaw.trim();
    if (q.length < 2) return [];
    const rows = await db.$queryRaw<{ label: string }[]>`
      SELECT b."name" AS label, MAX(similarity(b."name", ${q})) AS sim
      FROM "Business" b
      WHERE b."status" = 'ACTIVE'
        AND (b."name" ILIKE ${q + "%"} OR b."name" % ${q})
      GROUP BY b."name"
      ORDER BY sim DESC
      LIMIT 8
    `;
    return rows.map((r) => ({ label: r.label, type: "business" as const }));
  }
}
