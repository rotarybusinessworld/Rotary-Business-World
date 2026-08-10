import { db } from "@/backend/db";

export async function loadTaxonomy() {
  const [industries, categories] = await Promise.all([
    db.industry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, industryId: true },
    }),
  ]);
  return { industries, categories };
}
