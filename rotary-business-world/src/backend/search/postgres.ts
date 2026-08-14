import { Prisma } from "@prisma/client";
import { db } from "@/backend/db";
import { toPrefixTsquery } from "./query";
import type {
  BusinessHit,
  Facet,
  SearchParams,
  SearchResult,
  SearchService,
  Suggestion,
} from "./types";

const DEFAULT_PAGE_SIZE = 20;

// Minimum trigram similarity to qualify as a "did you mean" candidate.
const DYM_THRESHOLD = 0.25;

/**
 * Postgres-backed search: weighted full-text (`searchVector`) combined with
 * multi-field word-similarity (`searchText` via the <% operator) and trigram
 * similarity on name for typo tolerance across every field.
 *
 * Key column dependencies (both managed by prisma/sql/search.sql):
 *   searchVector — weighted tsvector (GIN index) for full-text search.
 *   searchText   — concatenated plain text (GIN trigram index) for fuzzy matching.
 *
 * Verified owners are ranked above unverified ones.
 */
export class PostgresSearchService implements SearchService {
  // ── Public API ─────────────────────────────────────────────────────────────

  async search(params: SearchParams): Promise<SearchResult> {
    const result = await this._coreSearch(params);

    // Did-you-mean: only fires when the result set is empty, a query was given,
    // and the caller has not explicitly opted out (forceOriginal=true).
    const q = params.q?.trim() ?? "";
    if (result.total === 0 && q && !params.forceOriginal) {
      const corrected = await this._didYouMean(q);
      if (corrected && corrected.toLowerCase() !== q.toLowerCase()) {
        const correctedResult = await this._coreSearch({ ...params, q: corrected });
        if (correctedResult.total > 0) {
          return { ...correctedResult, didYouMean: { corrected, original: q } };
        }
      }
    }

    return result;
  }

  async suggest(qRaw: string): Promise<Suggestion[]> {
    const q = qRaw.trim();
    if (q.length < 2) return [];

    const likeQ = q + "%";

    // UNION ALL across four sources, each limited to its own bucket.
    // Parenthesised subqueries let Postgres apply per-bucket LIMITs before
    // the outer ORDER BY + global LIMIT.
    const rows = await db.$queryRaw<{ label: string; type: string; sim: number }[]>`
      SELECT label, type, sim FROM (
        (
          SELECT b."name"                          AS label,
                 'business'::text                  AS type,
                 MAX(similarity(b."name", ${q}))   AS sim
          FROM   "Business" b
          WHERE  b."status" = 'APPROVED'
            AND  (b."name" ILIKE ${likeQ} OR b."name" % ${q})
          GROUP  BY b."name"
          ORDER  BY 3 DESC
          LIMIT  6
        )
        UNION ALL
        (
          SELECT i."name"                        AS label,
                 'industry'::text               AS type,
                 similarity(i."name", ${q})     AS sim
          FROM   "Industry" i
          WHERE  i."name" ILIKE ${likeQ} OR i."name" % ${q}
          ORDER  BY 3 DESC
          LIMIT  3
        )
        UNION ALL
        (
          SELECT c."name"                        AS label,
                 'category'::text               AS type,
                 similarity(c."name", ${q})     AS sim
          FROM   "Category" c
          WHERE  c."name" ILIKE ${likeQ} OR c."name" % ${q}
          ORDER  BY 3 DESC
          LIMIT  3
        )
        UNION ALL
        (
          SELECT b."city"                          AS label,
                 'city'::text                      AS type,
                 MAX(similarity(b."city", ${q}))   AS sim
          FROM   "Business" b
          WHERE  b."status" = 'APPROVED'
            AND  b."city"  IS NOT NULL
            AND  b."city"  <> ''
            AND  (b."city" ILIKE ${likeQ} OR b."city" % ${q})
          GROUP  BY b."city"
          ORDER  BY 3 DESC
          LIMIT  3
        )
      ) combined
      ORDER BY sim DESC
      LIMIT 12
    `;

    return rows.map((r) => ({
      label: r.label,
      type: r.type as Suggestion["type"],
    }));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Core search query — no did-you-mean logic so it can be called recursively.
   */
  private async _coreSearch(params: SearchParams): Promise<SearchResult> {
    const q = params.q?.trim() ?? "";
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(50, params.pageSize ?? DEFAULT_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    // Sanitized prefix tsquery — null when q is empty or all non-alphanumeric.
    const prefixQ = q ? toPrefixTsquery(q) : null;

    // ── WHERE ──────────────────────────────────────────────────────────────
    const filters: Prisma.Sql[] = [Prisma.sql`b."status" = 'APPROVED'`];
    if (params.industry)
      filters.push(Prisma.sql`b."industryName" = ${params.industry}`);
    if (params.category)
      filters.push(Prisma.sql`b."categoryName" = ${params.category}`);
    if (params.country)
      filters.push(Prisma.sql`b."country" = ${params.country}`);
    if (params.city)
      filters.push(Prisma.sql`b."city" = ${params.city}`);

    if (q) {
      if (prefixQ) {
        // Three-pronged text predicate:
        //   1. FTS (prefix tsquery) — exact token + as-you-type suffix match.
        //   2. <% word-similarity across ALL fields (searchText, GIN-indexed).
        //   3. % trigram on name — catches close misspellings of the business name.
        filters.push(Prisma.sql`(
          b."searchVector" @@ to_tsquery('simple', ${prefixQ})
          OR ${q} <% b."searchText"
          OR b."name" % ${q}
        )`);
      } else {
        // q has no alphanumeric tokens (e.g. "+++") — fall back to fuzzy only.
        filters.push(Prisma.sql`(
          ${q} <% b."searchText"
          OR b."name" % ${q}
        )`);
      }
    }

    const where = Prisma.join(filters, " AND ");

    // ── ORDER BY ───────────────────────────────────────────────────────────
    // Verified owners always surface first. When a query is present, add FTS
    // rank and combined name/field similarity so relevance survives typos.
    const order: Prisma.Sql[] = [
      Prisma.sql`(u."status" = 'VERIFIED') DESC`,
    ];
    if (q) {
      if (prefixQ) {
        order.push(
          Prisma.sql`ts_rank_cd(b."searchVector", to_tsquery('simple', ${prefixQ})) DESC`,
        );
      }
      order.push(
        Prisma.sql`GREATEST(similarity(b."name", ${q}), word_similarity(${q}, b."searchText")) DESC`,
      );
    }
    order.push(Prisma.sql`b."createdAt" DESC`);
    const orderBy = Prisma.join(order, ", ");

    // ── Queries ─────────────────────────────────────────────────────────────
    const rows = await db.$queryRaw<BusinessHit[]>`
      SELECT b."id", b."name", b."slug", b."logoUrl", b."city", b."country",
             b."industryName", b."categoryName",
             u."status" = 'VERIFIED' AS "ownerVerified"
      FROM   "Business" b
      JOIN   "User"     u ON u."id" = b."ownerId"
      WHERE  ${where}
      ORDER  BY ${orderBy}
      LIMIT  ${pageSize} OFFSET ${offset}
    `;

    const totalRows = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM   "Business" b
      JOIN   "User"     u ON u."id" = b."ownerId"
      WHERE  ${where}
    `;
    const total = Number(totalRows[0]?.count ?? 0);

    const [industry, country] = await Promise.all([
      this._facet("industryName", where),
      this._facet("country", where),
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

  /**
   * Find the nearest spelling correction for a zero-result query.
   * Searches business names, industry names, category names, and distinct cities.
   * Returns null when nothing is close enough.
   */
  private async _didYouMean(q: string): Promise<string | null> {
    const rows = await db.$queryRaw<{ term: string; sim: number }[]>`
      SELECT t.term, similarity(t.term, ${q}) AS sim
      FROM (
        SELECT "name" AS term FROM "Business"  WHERE "status" = 'APPROVED' AND "name" IS NOT NULL
        UNION
        SELECT "name"          FROM "Industry" WHERE "name" IS NOT NULL
        UNION
        SELECT "name"          FROM "Category" WHERE "name" IS NOT NULL
        UNION
        SELECT DISTINCT "city" FROM "Business" WHERE "status" = 'APPROVED' AND "city" IS NOT NULL
      ) t
      WHERE similarity(t.term, ${q}) > ${DYM_THRESHOLD}
      ORDER BY sim DESC
      LIMIT 1
    `;
    return rows[0]?.term ?? null;
  }

  private async _facet(
    column: "industryName" | "country",
    where: Prisma.Sql,
  ): Promise<Facet[]> {
    const col = Prisma.raw(`"${column}"`);
    const rows = await db.$queryRaw<{ value: string; count: bigint }[]>`
      SELECT b.${col} AS value, COUNT(*)::bigint AS count
      FROM   "Business" b
      JOIN   "User"     u ON u."id" = b."ownerId"
      WHERE  ${where} AND b.${col} IS NOT NULL AND b.${col} <> ''
      GROUP  BY b.${col}
      ORDER  BY count DESC, value ASC
      LIMIT  20
    `;
    return rows.map((r) => ({ value: r.value, count: Number(r.count) }));
  }
}
