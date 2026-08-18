import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/shared/utils";

const db = new PrismaClient();

// Recall synonyms per category — fed into the search vector (via offeringsText)
// and available to the category picker. Only the notable ones; the rest default [].
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  Textiles: ["fabric", "cloth", "yarn", "garments"],
  Packaging: ["boxes", "cartons", "pouches", "corrugated"],
  Chemicals: ["dyes", "solvents", "industrial chemicals", "coatings"],
  Machinery: ["equipment", "industrial machines", "fabrication"],
  "Auto Parts": ["components", "castings", "forgings", "spare parts"],
  Restaurant: ["dining", "food", "eatery"],
  Catering: ["caterer", "banquet", "events food"],
  Bakery: ["bakes", "cakes", "bread", "patisserie"],
  Software: ["development", "apps", "saas", "programming"],
  "IT Services": ["managed it", "support", "networking"],
  Jewellery: ["gold", "jewelry", "diamonds", "ornaments"],
  Wholesale: ["bulk", "distributor", "trading", "supplier"],
  Legal: ["law", "advocate", "attorney", "compliance"],
  Accounting: ["ca", "audit", "tax", "bookkeeping"],
  Freight: ["shipping", "cargo", "forwarding", "logistics"],
  Transport: ["trucking", "haulage", "fleet"],
};

// A compact, sensible industry → category taxonomy for the directory + facets.
const TAXONOMY: Record<string, string[]> = {
  "Food & Hospitality": ["Restaurant", "Catering", "Hotel", "Bakery", "Cafe"],
  "Retail & Trade": ["Apparel", "Grocery", "Jewellery", "Electronics", "Wholesale"],
  "Construction & Real Estate": ["Builder", "Architect", "Interior Design", "Property Agent"],
  "Healthcare": ["Clinic", "Pharmacy", "Diagnostics", "Dental", "Wellness"],
  "Technology & IT": ["Software", "IT Services", "Web & App", "Consulting", "Hardware"],
  "Manufacturing": ["Textiles", "Machinery", "Auto Parts", "Packaging", "Chemicals"],
  "Professional Services": ["Legal", "Accounting", "Marketing", "HR & Staffing", "Insurance"],
  "Education & Training": ["School", "Coaching", "Skill Training", "EdTech"],
  "Finance": ["Banking", "Investments", "Loans", "Fintech"],
  "Travel & Logistics": ["Travel Agency", "Freight", "Courier", "Transport"],
};

// A small starter set of Rotary reference data + roster rows so verification
// works out of the box. Replace with the real global roster via import-roster.
const DISTRICTS = [
  { code: "3201", name: "District 3201", country: "India" },
  { code: "3202", name: "District 3202", country: "India" },
];

const CLUBS = [
  { name: "RC Coimbatore North", districtCode: "3201", city: "Coimbatore", country: "India" },
  { name: "RC Coimbatore Central", districtCode: "3201", city: "Coimbatore", country: "India" },
  { name: "RC Trichy Fort", districtCode: "3202", city: "Trichy", country: "India" },
];

const ROSTER = [
  { rotaryId: "RID-1001", fullName: "Ravichandran Palanisamy", clubName: "RC Coimbatore North", districtCode: "3201" },
  { rotaryId: "RID-1002", fullName: "Suresh Kumar", clubName: "RC Coimbatore Central", districtCode: "3201" },
  { rotaryId: "RID-2001", fullName: "Anitha Rajendran", clubName: "RC Trichy Fort", districtCode: "3202" },
];

async function main() {
  // Taxonomy
  for (const [industryName, categories] of Object.entries(TAXONOMY)) {
    const industry = await db.industry.upsert({
      where: { name: industryName },
      update: {},
      create: { name: industryName, slug: slugify(industryName) },
    });
    for (const categoryName of categories) {
      const slug = slugify(`${industryName}-${categoryName}`);
      const synonyms = CATEGORY_SYNONYMS[categoryName] ?? [];
      await db.category.upsert({
        where: { slug },
        // Backfill path/synonyms on existing rows too, so reseeds stay consistent.
        update: { path: slug, depth: 0, synonyms },
        // path is the materialized ancestry key used for subtree matching
        // (WHERE path LIKE :prefix || '%'). Flat taxonomy → path == slug.
        create: { name: categoryName, slug, industryId: industry.id, path: slug, depth: 0, synonyms },
      });
    }
  }

  // Districts + clubs
  for (const d of DISTRICTS) {
    await db.district.upsert({
      where: { code: d.code },
      update: { name: d.name, country: d.country },
      create: d,
    });
  }
  for (const c of CLUBS) {
    const district = await db.district.findUnique({ where: { code: c.districtCode } });
    if (!district) continue;
    await db.club.upsert({
      where: { name_districtId: { name: c.name, districtId: district.id } },
      update: { city: c.city, country: c.country },
      create: { name: c.name, districtId: district.id, city: c.city, country: c.country },
    });
  }

  // Roster
  for (const r of ROSTER) {
    const district = await db.district.findUnique({ where: { code: r.districtCode } });
    const club = district
      ? await db.club.findFirst({ where: { name: r.clubName, districtId: district.id } })
      : null;
    const existing = await db.rosterMember.findFirst({ where: { rotaryId: r.rotaryId } });
    if (existing) continue;
    await db.rosterMember.create({
      data: {
        rotaryId: r.rotaryId,
        fullName: r.fullName,
        clubName: r.clubName,
        districtCode: r.districtCode,
        clubId: club?.id ?? null,
        districtId: district?.id ?? null,
        source: "seed",
      },
    });
  }

  const counts = {
    industries: await db.industry.count(),
    categories: await db.category.count(),
    districts: await db.district.count(),
    clubs: await db.club.count(),
    roster: await db.rosterMember.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
