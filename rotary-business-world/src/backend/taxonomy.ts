import { db } from "@/backend/db";

type TaxonomyResult = Awaited<ReturnType<typeof fetchFromDb>>;

async function fetchFromDb() {
  const [industries, categories] = await Promise.all([
    db.industry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        industryId: true,
        parentId: true,
        path: true,
        depth: true,
      },
    }),
  ]);
  return { industries, categories };
}

// Module-level cache — taxonomy changes only when the DB is re-seeded,
// so one fetch per process lifetime is correct.
let _cache: TaxonomyResult | null = null;

export async function loadTaxonomy(): Promise<TaxonomyResult> {
  if (_cache) return _cache;
  _cache = await fetchFromDb();
  return _cache;
}
