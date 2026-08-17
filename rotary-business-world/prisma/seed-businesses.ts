/**
 * Seed dummy Rotarian members + businesses so the directory and search can be
 * exercised end-to-end. Safe to re-run (upserts users, skips existing businesses).
 *
 * Run: node --env-file=.env --import tsx prisma/seed-businesses.ts
 */
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/shared/utils";

const db = new PrismaClient();

// ── Dummy members ─────────────────────────────────────────────────────────────
// All get status=VERIFIED so their businesses surface in search.
const MEMBERS = [
  { name: "Arjun Mehta",       email: "arjun@rbw.dev",    city: "Mumbai",     country: "India" },
  { name: "Priya Venkatesh",   email: "priya@rbw.dev",    city: "Chennai",    country: "India" },
  { name: "Rajesh Sharma",     email: "rajesh@rbw.dev",   city: "Delhi",      country: "India" },
  { name: "Sunita Agarwal",    email: "sunita@rbw.dev",   city: "Kolkata",    country: "India" },
  { name: "Vikram Nair",       email: "vikram@rbw.dev",   city: "Bangalore",  country: "India" },
  { name: "Deepa Krishnan",    email: "deepa@rbw.dev",    city: "Hyderabad",  country: "India" },
  { name: "Mohan Das",         email: "mohan@rbw.dev",    city: "Pune",       country: "India" },
  { name: "Anita Joshi",       email: "anita@rbw.dev",    city: "Ahmedabad",  country: "India" },
  { name: "Samuel Thomas",     email: "samuel@rbw.dev",   city: "Kochi",      country: "India" },
  { name: "Fatima Sheikh",     email: "fatima@rbw.dev",   city: "Coimbatore", country: "India" },
  { name: "Gopal Pillai",      email: "gopal@rbw.dev",    city: "Trichy",     country: "India" },
  { name: "Kavitha Rajan",     email: "kavitha@rbw.dev",  city: "Madurai",    country: "India" },
  // International members
  { name: "Ravi Subramaniam",  email: "ravi@rbw.dev",     city: "Singapore",  country: "Singapore" },
  { name: "Preethi Nair",      email: "preethi@rbw.dev",  city: "Dubai",      country: "UAE" },
  { name: "John Fernandes",    email: "john@rbw.dev",     city: "London",     country: "UK" },
];

// ── Businesses ────────────────────────────────────────────────────────────────
// Each entry maps to one of the MEMBERS above (by index 0–14).
const BUSINESSES: {
  ownerIdx: number;
  name: string;
  industryName: string;
  categoryName: string;
  city: string;
  country: string;
  description: string;
  website?: string;
  phone?: string;
  discountPercent?: number;
  discountNote?: string;
}[] = [
  // ── Food & Hospitality ────────────────────────────────────────────────────
  {
    ownerIdx: 0,
    name: "Mehta's Grand Restaurant",
    industryName: "Food & Hospitality",
    categoryName: "Restaurant",
    city: "Mumbai",
    country: "India",
    description:
      "Award-winning multi-cuisine restaurant serving authentic North Indian, Chinese, and Continental dishes since 2005. Private dining rooms available for corporate events.",
    website: "https://mehtasrestaurant.example.com",
    phone: "+91 98200 11111",
    discountPercent: 15,
    discountNote: "15% off for all Rotary members on weekdays",
  },
  {
    ownerIdx: 1,
    name: "Priya's Catering Services",
    industryName: "Food & Hospitality",
    categoryName: "Catering",
    city: "Chennai",
    country: "India",
    description:
      "Premium catering for weddings, corporate events, and Rotary club meets. Specialising in traditional South Indian cuisine with modern presentation.",
    phone: "+91 94440 22222",
    discountPercent: 10,
    discountNote: "10% off for Rotary club bookings",
  },
  {
    ownerIdx: 9,
    name: "The Coimbatore Bakehouse",
    industryName: "Food & Hospitality",
    categoryName: "Bakery",
    city: "Coimbatore",
    country: "India",
    description:
      "Artisan bakery offering sourdough breads, European pastries, and custom celebration cakes. Daily fresh batches from 7 AM.",
    phone: "+91 96550 33333",
  },
  {
    ownerIdx: 12,
    name: "Spice Route Restaurant",
    industryName: "Food & Hospitality",
    categoryName: "Restaurant",
    city: "Singapore",
    country: "Singapore",
    description:
      "Authentic Indian fine-dining experience in the heart of Singapore. Our chefs bring recipes from across India — from Kashmiri Wazwan to Chettinad delicacies.",
    website: "https://spiceroute.sg",
    phone: "+65 6123 4567",
    discountPercent: 20,
    discountNote: "Rotarian table gets a complimentary welcome drink and 20% off food",
  },

  // ── Technology & IT ───────────────────────────────────────────────────────
  {
    ownerIdx: 4,
    name: "NairTech Solutions",
    industryName: "Technology & IT",
    categoryName: "Software",
    city: "Bangalore",
    country: "India",
    description:
      "Custom enterprise software development — ERP, CRM, mobile apps, and cloud migration. ISO 27001 certified. 120+ engineers. Clients across India, USA, and the Middle East.",
    website: "https://nairtech.example.com",
    phone: "+91 80 4000 5000",
    discountPercent: 10,
    discountNote: "10% discount on project engagement for Rotary member referrals",
  },
  {
    ownerIdx: 4,
    name: "CloudPulse Analytics",
    industryName: "Technology & IT",
    categoryName: "Consulting",
    city: "Bangalore",
    country: "India",
    description:
      "Data engineering and business intelligence consultancy. We design data pipelines, dashboards, and AI-powered reporting solutions for mid-market companies.",
    website: "https://cloudpulse.example.io",
    phone: "+91 80 4000 5001",
  },
  {
    ownerIdx: 13,
    name: "Dubai Digital Agency",
    industryName: "Technology & IT",
    categoryName: "Web & App",
    city: "Dubai",
    country: "UAE",
    description:
      "Full-service digital agency specialising in e-commerce, brand strategy, and mobile-first web development. Serving businesses across the UAE and GCC.",
    website: "https://dubaidigital.example.ae",
    phone: "+971 4 123 4567",
    discountPercent: 12,
    discountNote: "Rotarian project discount — 12% off design and development",
  },

  // ── Healthcare ────────────────────────────────────────────────────────────
  {
    ownerIdx: 5,
    name: "Krishnan Wellness Clinic",
    industryName: "Healthcare",
    categoryName: "Clinic",
    city: "Hyderabad",
    country: "India",
    description:
      "Holistic health clinic combining modern medicine with Ayurveda and lifestyle medicine. Specialised OPDs for diabetes, cardiology, and stress management.",
    phone: "+91 40 2222 3333",
    discountPercent: 20,
    discountNote: "Free initial consultation for Rotary members, 20% off all diagnostic packages",
  },
  {
    ownerIdx: 11,
    name: "MedPlus Diagnostics Madurai",
    industryName: "Healthcare",
    categoryName: "Diagnostics",
    city: "Madurai",
    country: "India",
    description:
      "NABL-accredited diagnostic centre offering 1,200+ tests. Home sample collection available. Results within 6 hours for most panels.",
    phone: "+91 452 234 5678",
    discountPercent: 25,
    discountNote: "25% off all diagnostic packages for Rotary members and their families",
  },

  // ── Construction & Real Estate ────────────────────────────────────────────
  {
    ownerIdx: 2,
    name: "Sharma Builders & Developers",
    industryName: "Construction & Real Estate",
    categoryName: "Builder",
    city: "Delhi",
    country: "India",
    description:
      "Premium residential and commercial construction for 30 years. RERA registered. Specialising in green-certified buildings and luxury apartments across NCR.",
    website: "https://sharmabuilders.example.in",
    phone: "+91 11 4111 5555",
  },
  {
    ownerIdx: 7,
    name: "Designspace Interiors",
    industryName: "Construction & Real Estate",
    categoryName: "Interior Design",
    city: "Ahmedabad",
    country: "India",
    description:
      "Award-winning interior design studio transforming homes and offices. Contemporary, traditional, and fusion aesthetics. Budget planning and project management included.",
    phone: "+91 79 2600 7777",
    discountPercent: 10,
    discountNote: "10% off design fees for Rotary network referrals",
  },
  {
    ownerIdx: 14,
    name: "Fernandes Property London",
    industryName: "Construction & Real Estate",
    categoryName: "Property Agent",
    city: "London",
    country: "UK",
    description:
      "Specialist in Indian diaspora real estate investment in the UK. Buy-to-let, residential purchases, and NRI advisory. Regulated by RICS.",
    phone: "+44 20 7946 0000",
    website: "https://fernandespropertyuk.example.com",
    discountPercent: 5,
    discountNote: "Complimentary NRI investment consultation for Rotary members",
  },

  // ── Professional Services ─────────────────────────────────────────────────
  {
    ownerIdx: 3,
    name: "Agarwal & Associates",
    industryName: "Professional Services",
    categoryName: "Accounting",
    city: "Kolkata",
    country: "India",
    description:
      "Chartered accountancy firm providing audit, direct and indirect taxation, company law compliance, and NRI advisory services. Big-4 experienced partners.",
    phone: "+91 33 4000 8888",
    discountPercent: 15,
    discountNote: "15% off first-year engagement fees for fellow Rotarians",
  },
  {
    ownerIdx: 7,
    name: "Joshi Legal Partners",
    industryName: "Professional Services",
    categoryName: "Legal",
    city: "Ahmedabad",
    country: "India",
    description:
      "Full-service law firm specialising in corporate, M&A, IP, employment law, and arbitration. Licensed before the Supreme Court and Gujarat High Court.",
    phone: "+91 79 2600 9999",
  },
  {
    ownerIdx: 6,
    name: "BrandCraft Marketing",
    industryName: "Professional Services",
    categoryName: "Marketing",
    city: "Pune",
    country: "India",
    description:
      "360-degree marketing agency: brand strategy, digital campaigns, performance marketing, and PR. Worked with 80+ brands across FMCG, tech, and real estate.",
    website: "https://brandcraft.example.in",
    phone: "+91 20 4545 6666",
    discountPercent: 20,
    discountNote: "Free brand audit + 20% discount on first campaign for Rotary businesses",
  },

  // ── Manufacturing ─────────────────────────────────────────────────────────
  {
    ownerIdx: 6,
    name: "Mohan Textiles Pvt Ltd",
    industryName: "Manufacturing",
    categoryName: "Textiles",
    city: "Pune",
    country: "India",
    description:
      "Manufacturer and exporter of premium cotton and blended fabrics. BCI-certified sustainable cotton. Export to Europe, USA, and Japan. MOQ 500 metres.",
    phone: "+91 20 4545 7777",
  },

  // ── Retail & Trade ────────────────────────────────────────────────────────
  {
    ownerIdx: 8,
    name: "ThomasGold Jewellers",
    industryName: "Retail & Trade",
    categoryName: "Jewellery",
    city: "Kochi",
    country: "India",
    description:
      "Three generations of heritage jewellers. Specialising in traditional Kerala temple jewellery, diamond bridal collections, and custom-made fine jewellery. BIS hallmarked.",
    phone: "+91 484 234 5678",
    discountPercent: 5,
    discountNote: "Making-charge waived for Rotary members on all gold jewellery",
  },
  {
    ownerIdx: 3,
    name: "Sunrise Electronics Kolkata",
    industryName: "Retail & Trade",
    categoryName: "Electronics",
    city: "Kolkata",
    country: "India",
    description:
      "Authorised dealer for Samsung, LG, and Bosch. Consumer electronics, home appliances, and B2B procurement. Free installation and 3-year extended warranty.",
    phone: "+91 33 4000 9999",
    discountPercent: 8,
    discountNote: "8% off MRP for all Rotary members on display models and bulk orders",
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    ownerIdx: 10,
    name: "Pillai Capital Advisors",
    industryName: "Finance",
    categoryName: "Investments",
    city: "Trichy",
    country: "India",
    description:
      "SEBI-registered investment advisory. Mutual funds, PMS, NPS, and wealth planning for HNI clients. Specialisation in NRI portfolio management and repatriation advisory.",
    phone: "+91 431 234 5678",
    discountPercent: 0,
    discountNote: "Complimentary financial health check for Rotary members",
  },

  // ── Travel & Logistics ────────────────────────────────────────────────────
  {
    ownerIdx: 13,
    name: "GulfTrek Travel & Tourism",
    industryName: "Travel & Logistics",
    categoryName: "Travel Agency",
    city: "Dubai",
    country: "UAE",
    description:
      "Full-service travel agency specialising in inbound tourism to the UAE and Gulf region. IATA-accredited. Rotary club group tours, visa assistance, and corporate travel.",
    website: "https://gulftrek.example.ae",
    phone: "+971 4 234 5678",
    discountPercent: 10,
    discountNote: "10% off group bookings for Rotary clubs of 10+ members",
  },

  // ── Education & Training ──────────────────────────────────────────────────
  {
    ownerIdx: 5,
    name: "SkillForge Academy",
    industryName: "Education & Training",
    categoryName: "Skill Training",
    city: "Hyderabad",
    country: "India",
    description:
      "Vocational and soft-skills training for mid-career professionals and graduates. Courses in leadership, data literacy, business communication, and AI tools. Online + offline.",
    website: "https://skillforge.example.in",
    phone: "+91 40 2222 4444",
    discountPercent: 30,
    discountNote: "30% scholarship on all courses for Rotary member referrals",
  },
  {
    ownerIdx: 12,
    name: "Global Minds EdTech",
    industryName: "Education & Training",
    categoryName: "EdTech",
    city: "Singapore",
    country: "Singapore",
    description:
      "K-12 and professional upskilling platform with AI-adaptive learning. Covers coding, STEM, financial literacy, and English proficiency. Serving 40,000+ learners in Asia.",
    website: "https://globalminds.example.sg",
    discountPercent: 25,
    discountNote: "25% off annual family subscription for Rotary members",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function findOrCreateIndustry(name: string) {
  return db.industry.upsert({
    where: { name },
    update: {},
    create: { name, slug: slugify(name) },
  });
}

async function findOrCreateCategory(name: string, industryId: string) {
  const slug = slugify(`${industryId}-${name}`);
  return db.category.upsert({
    where: { slug },
    update: {},
    create: { name, slug, industryId },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Create verified members
  const users: { id: string }[] = [];
  for (const m of MEMBERS) {
    const user = await db.user.upsert({
      where: { email: m.email },
      update: { status: "VERIFIED" },
      create: {
        email: m.email,
        status: "VERIFIED",
        profile: {
          create: {
            fullName: m.name,
            city: m.city,
            country: m.country,
          },
        },
        rotaryInfo: {
          create: {
            rotaryId: `RID-DEMO-${String(users.length + 1).padStart(3, "0")}`,
          },
        },
      },
    });
    users.push(user);
    process.stdout.write(`  member: ${m.name} <${m.email}>\n`);
  }

  // Create businesses
  let created = 0;
  let skipped = 0;
  for (const b of BUSINESSES) {
    const owner = users[b.ownerIdx];
    const slug = slugify(b.name);

    const existing = await db.business.findUnique({ where: { slug } });
    if (existing) { skipped++; continue; }

    const industry = await findOrCreateIndustry(b.industryName);
    const category = await findOrCreateCategory(b.categoryName, industry.id);

    await db.business.create({
      data: {
        ownerId: owner.id,
        name: b.name,
        slug,
        description: b.description,
        industryId: industry.id,
        categoryId: category.id,
        industryName: b.industryName,
        categoryName: b.categoryName,
        city: b.city,
        country: b.country,
        website: b.website,
        phone: b.phone,
        discountPercent: b.discountPercent ?? null,
        discountNote: b.discountNote ?? null,
        status: "APPROVED",
      },
    });
    created++;
    process.stdout.write(`  business: ${b.name} (${b.city})\n`);
  }

  console.log(`\nDone — ${users.length} members, ${created} businesses created, ${skipped} skipped.`);
  console.log("Members sign in via magic-link email (no passwords).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
