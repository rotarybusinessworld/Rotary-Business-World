/**
 * Seed realistic dummy Rotarian members + businesses for end-to-end directory
 * and search testing. Covers all 10 industries and every category.
 *
 * Run: node --env-file=.env --import tsx prisma/seed-businesses.ts
 */
import { PrismaClient, TradeRole } from "@prisma/client";
import { slugify } from "../src/shared/utils";

const db = new PrismaClient();

// ── Offering derivation ───────────────────────────────────────────────────────
// Each seeded business gets one primary offering derived from its category. This
// gives the Needs/Leads matcher + offerings-driven search realistic data without
// hand-authoring 100+ offerings. Trade role is chosen per category.
const CATEGORY_ROLES: Record<string, TradeRole[]> = {
  // Manufacturing — makers, some also wholesale.
  Textiles: [TradeRole.MANUFACTURER, TradeRole.WHOLESALER],
  Machinery: [TradeRole.MANUFACTURER],
  "Auto Parts": [TradeRole.MANUFACTURER],
  Packaging: [TradeRole.MANUFACTURER, TradeRole.WHOLESALER],
  Chemicals: [TradeRole.MANUFACTURER, TradeRole.WHOLESALER],
  // Retail & trade.
  Apparel: [TradeRole.RETAILER],
  Grocery: [TradeRole.RETAILER],
  Jewellery: [TradeRole.RETAILER],
  Electronics: [TradeRole.RETAILER],
  Wholesale: [TradeRole.WHOLESALER],
  Hardware: [TradeRole.RETAILER, TradeRole.WHOLESALER],
  Pharmacy: [TradeRole.RETAILER],
  Bakery: [TradeRole.RETAILER, TradeRole.MANUFACTURER],
};

// Recall keywords per category — the "search everything" payload. A buyer typing
// "recycled polyester" finds Mohan Textiles even though neither its name nor its
// category contains those words.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Textiles: ["cotton", "linen", "recycled polyester", "fabric", "yarn"],
  Packaging: ["corrugated boxes", "pouches", "cartons", "biodegradable packaging"],
  Chemicals: ["reactive dyes", "solvents", "coatings", "auxiliaries"],
  Machinery: ["pumps", "compressors", "heat exchangers", "cnc"],
  "Auto Parts": ["castings", "forgings", "sheet metal", "precision components"],
  Restaurant: ["multi-cuisine", "fine dining", "private dining", "banquet"],
  Catering: ["wedding catering", "corporate events", "banana leaf", "tiffin"],
  Bakery: ["sourdough", "croissants", "wedding cakes", "artisan bread"],
  Software: ["erp", "crm", "mobile apps", "cloud migration", "saas"],
  "IT Services": ["managed it", "cctv", "cloud backup", "network setup"],
  Jewellery: ["gold", "diamond", "temple jewellery", "bridal sets"],
  Wholesale: ["bulk supply", "distribution", "trading", "sarees", "diamonds"],
  Freight: ["ocean freight", "air cargo", "customs clearance", "warehousing"],
  Transport: ["full truck load", "reefer", "fleet", "logistics"],
  Legal: ["m&a", "arbitration", "intellectual property", "compliance"],
  Accounting: ["audit", "gst", "tax", "transfer pricing"],
};

function offeringFor(categoryName: string): {
  title: string;
  keywords: string[];
  tradeRoles: TradeRole[];
} {
  return {
    title: categoryName,
    keywords: CATEGORY_KEYWORDS[categoryName] ?? [],
    tradeRoles: CATEGORY_ROLES[categoryName] ?? [TradeRole.SERVICE_PROVIDER],
  };
}

// ── 50 dummy members ──────────────────────────────────────────────────────────
const MEMBERS = [
  // India – Metro
  { name: "Arjun Mehta",          email: "arjun@rbw.dev",       city: "Mumbai",      country: "India" },
  { name: "Priya Venkatesh",      email: "priya@rbw.dev",       city: "Chennai",     country: "India" },
  { name: "Rajesh Sharma",        email: "rajesh@rbw.dev",      city: "Delhi",       country: "India" },
  { name: "Sunita Agarwal",       email: "sunita@rbw.dev",      city: "Kolkata",     country: "India" },
  { name: "Vikram Nair",          email: "vikram@rbw.dev",      city: "Bangalore",   country: "India" },
  { name: "Deepa Krishnan",       email: "deepa@rbw.dev",       city: "Hyderabad",   country: "India" },
  { name: "Mohan Das",            email: "mohan@rbw.dev",       city: "Pune",        country: "India" },
  { name: "Anita Joshi",          email: "anita@rbw.dev",       city: "Ahmedabad",   country: "India" },
  { name: "Samuel Thomas",        email: "samuel@rbw.dev",      city: "Kochi",       country: "India" },
  { name: "Fatima Sheikh",        email: "fatima@rbw.dev",      city: "Coimbatore",  country: "India" },
  // India – Tier 2
  { name: "Gopal Pillai",         email: "gopal@rbw.dev",       city: "Trichy",      country: "India" },
  { name: "Kavitha Rajan",        email: "kavitha@rbw.dev",     city: "Madurai",     country: "India" },
  { name: "Suresh Reddy",         email: "suresh@rbw.dev",      city: "Visakhapatnam", country: "India" },
  { name: "Meena Iyer",           email: "meena@rbw.dev",       city: "Salem",       country: "India" },
  { name: "Prakash Bhat",         email: "prakash@rbw.dev",     city: "Mangalore",   country: "India" },
  { name: "Rani Mukherjee",       email: "rani@rbw.dev",        city: "Jaipur",      country: "India" },
  { name: "Dinesh Gupta",         email: "dinesh@rbw.dev",      city: "Lucknow",     country: "India" },
  { name: "Shobha Pai",           email: "shobha@rbw.dev",      city: "Surat",       country: "India" },
  { name: "Mahesh Nair",          email: "mahesh@rbw.dev",      city: "Thiruvananthapuram", country: "India" },
  { name: "Lakshmi Balaji",       email: "lakshmi@rbw.dev",     city: "Coimbatore",  country: "India" },
  { name: "Ashok Patil",          email: "ashok@rbw.dev",       city: "Nagpur",      country: "India" },
  { name: "Nirmala Choudhary",    email: "nirmala@rbw.dev",     city: "Chandigarh",  country: "India" },
  { name: "Ravi Kumar",           email: "ravikumar@rbw.dev",   city: "Bhopal",      country: "India" },
  { name: "Anand Pillai",         email: "anand@rbw.dev",       city: "Kozhikode",   country: "India" },
  { name: "Usha Menon",           email: "usha@rbw.dev",        city: "Thrissur",    country: "India" },
  { name: "Srinivas Rao",         email: "srinivas@rbw.dev",    city: "Vijayawada",  country: "India" },
  { name: "Geetha Narayanan",     email: "geetha@rbw.dev",      city: "Tirunelveli", country: "India" },
  { name: "Babu Varghese",        email: "babu@rbw.dev",        city: "Kottayam",    country: "India" },
  { name: "Padma Subramaniam",    email: "padma@rbw.dev",       city: "Mysore",      country: "India" },
  { name: "Harish Chandra",       email: "harish@rbw.dev",      city: "Agra",        country: "India" },
  { name: "Jaya Krishnamurthy",   email: "jaya@rbw.dev",        city: "Coimbatore",  country: "India" },
  { name: "Murali Sundaram",      email: "murali@rbw.dev",      city: "Erode",       country: "India" },
  { name: "Revathi Natarajan",    email: "revathi@rbw.dev",     city: "Puducherry",  country: "India" },
  { name: "Balachandran Nair",    email: "bala@rbw.dev",        city: "Palakkad",    country: "India" },
  { name: "Kavya Srinivasan",     email: "kavya@rbw.dev",       city: "Chennai",     country: "India" },
  // International
  { name: "Ravi Subramaniam",     email: "ravisg@rbw.dev",      city: "Singapore",   country: "Singapore" },
  { name: "Preethi Nair",         email: "preethi@rbw.dev",     city: "Dubai",       country: "UAE" },
  { name: "John Fernandes",       email: "john@rbw.dev",        city: "London",      country: "UK" },
  { name: "Arun Chandrasekaran",  email: "arun@rbw.dev",        city: "Toronto",     country: "Canada" },
  { name: "Nalini Krishnan",      email: "nalini@rbw.dev",      city: "Sydney",      country: "Australia" },
  { name: "Senthil Murugan",      email: "senthil@rbw.dev",     city: "Kuala Lumpur", country: "Malaysia" },
  { name: "Viji Ramasamy",        email: "viji@rbw.dev",        city: "Frankfurt",   country: "Germany" },
  { name: "Kartik Venkat",        email: "kartik@rbw.dev",      city: "New York",    country: "USA" },
  { name: "Divya Rangarajan",     email: "divya@rbw.dev",       city: "Singapore",   country: "Singapore" },
  { name: "Mohanraj Pillai",      email: "mohanraj@rbw.dev",    city: "Abu Dhabi",   country: "UAE" },
  { name: "Chandra Sekar",        email: "chandra@rbw.dev",     city: "Houston",     country: "USA" },
  { name: "Indira Nambiar",       email: "indira@rbw.dev",      city: "Melbourne",   country: "Australia" },
  { name: "Venkatesh Iyer",       email: "venkatesh@rbw.dev",   city: "Bahrain",     country: "Bahrain" },
  { name: "Shanta Rajan",         email: "shanta@rbw.dev",      city: "Colombo",     country: "Sri Lanka" },
  { name: "Durai Pandian",        email: "durai@rbw.dev",       city: "Muscat",      country: "Oman" },
];

// ── 110 businesses across all 10 industries + every category ──────────────────
const BUSINESSES: {
  ownerIdx: number;
  name: string;
  industryName: string;
  categoryName: string;
  city: string;
  country: string;
  description: string;
  website?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  discountPercent?: number;
  discountNote?: string;
  serviceReach?: "DISTRICT" | "STATE" | "NATIONAL" | "INTERNATIONAL";
}[] = [

  // ═══════════════════════════════════════════════════════════════
  // FOOD & HOSPITALITY
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 0,
    name: "Mehta's Grand Restaurant",
    industryName: "Food & Hospitality", categoryName: "Restaurant",
    city: "Mumbai", country: "India",
    description: "Award-winning multi-cuisine restaurant on Marine Drive, serving authentic North Indian, Mughlai, Chinese, and Continental dishes since 2005. Private dining rooms for 10–120 guests, live ghazal nights every Friday, and a dedicated Jain menu. Catering packages available for Rotary club meets.",
    website: "https://mehtasrestaurant.in",
    phone: "+91 98200 11111", email: "reservations@mehtasrestaurant.in",
    addressLine: "14, Marine Drive, Nariman Point",
    discountPercent: 15, discountNote: "15% off food bill on weekdays for all Rotary members — show your RBW profile.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 1,
    name: "Priya's Catering Services",
    industryName: "Food & Hospitality", categoryName: "Catering",
    city: "Chennai", country: "India",
    description: "Premium catering for weddings, corporate events, and Rotary club functions. Authentic Brahmin, Chettinad, and Kongu cuisine. Serving up to 5,000 guests per event. FSSAI licensed. Our signature banana-leaf lunch has been featured in The Hindu.",
    phone: "+91 94440 22222",
    discountPercent: 10, discountNote: "10% off for Rotary club bookings of 50+ pax.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 19,
    name: "The Coimbatore Bakehouse",
    industryName: "Food & Hospitality", categoryName: "Bakery",
    city: "Coimbatore", country: "India",
    description: "Artisan bakery using stone-ground flour and wild yeast starters. European sourdough, croissants, whole-grain loaves, and custom celebration cakes. Fresh batches daily from 7 AM. Supplying café chains, hotels, and corporate canteens across Coimbatore.",
    phone: "+91 96550 33333", email: "orders@cbakehouse.in",
    addressLine: "22, Race Course Road",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 36,
    name: "Spice Route Restaurant",
    industryName: "Food & Hospitality", categoryName: "Restaurant",
    city: "Singapore", country: "Singapore",
    description: "Authentic Indian fine-dining in Singapore's CBD. Chefs trained in Kashmir, Chettinad, and Kerala bring India's regional depth to the table. Michelin Bib Gourmand 2024. Private events for 8–60. Pairing menus with Indian craft spirits.",
    website: "https://spiceroute.sg",
    phone: "+65 6123 4567",
    discountPercent: 20, discountNote: "Complimentary welcome drink and 20% off food for Rotary members.",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 7,
    name: "Hotel Saffron Ahmedabad",
    industryName: "Food & Hospitality", categoryName: "Hotel",
    city: "Ahmedabad", country: "India",
    description: "Four-star business hotel in SG Highway with 110 rooms, rooftop pool, and two restaurants (pure-veg Gujarati thali and multi-cuisine). 12 conference halls up to 500 pax. LEED Gold certified. Preferred stay for Rotary district conferences since 2018.",
    website: "https://hotelsaffron.in",
    phone: "+91 79 2600 6060",
    discountPercent: 20, discountNote: "20% off best available room rate for Rotary members. Complimentary airport drop.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 9,
    name: "Brew & Banter Café",
    industryName: "Food & Hospitality", categoryName: "Cafe",
    city: "Coimbatore", country: "India",
    description: "Specialty coffee roastery and café. Single-origin beans from Chikmagalur and Nilgiris, roasted in-house. Pour-overs, cold brews, filter kaapi, and seasonal specials. Open co-working space till 10 PM. Hosts Rotary breakfast meets every alternate Tuesday.",
    phone: "+91 95559 44444",
    addressLine: "7-A, Avinashi Road, Peelamedu",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 41,
    name: "Nair's Kerala Kitchen",
    industryName: "Food & Hospitality", categoryName: "Restaurant",
    city: "Kuala Lumpur", country: "Malaysia",
    description: "Authentic Kerala home-style cooking in Bangsar. Fish curry, appam, puttu, and sadya on Sundays. Run by a Rotary family — two generations cooking the same recipes since 1994. Highly rated by the Malaysian Indian diaspora.",
    phone: "+60 3 2282 5555",
    discountPercent: 12, discountNote: "Rotary members get a complimentary dessert with any main course.",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 32,
    name: "SweetLeaf Patisserie",
    industryName: "Food & Hospitality", categoryName: "Bakery",
    city: "Puducherry", country: "India",
    description: "French-trained pastry chef bringing classic patisserie to Pondicherry. Macarons, tarts, entremets, and personalised wedding cakes. Gluten-free and vegan options available. Delivers across Tamil Nadu.",
    phone: "+91 97897 55555",
    serviceReach: "STATE",
  },

  // ═══════════════════════════════════════════════════════════════
  // TECHNOLOGY & IT
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 4,
    name: "NairTech Solutions",
    industryName: "Technology & IT", categoryName: "Software",
    city: "Bangalore", country: "India",
    description: "Custom enterprise software development — ERP, CRM, mobile apps, and cloud migration. ISO 27001 certified. 150+ engineers. Clients across India, USA, and Middle East. Specialities: logistics SaaS, fintech integrations, and Salesforce customisation.",
    website: "https://nairtech.io",
    phone: "+91 80 4000 5000",
    discountPercent: 10, discountNote: "10% off project engagement fee for Rotary member referrals.",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 4,
    name: "CloudPulse Analytics",
    industryName: "Technology & IT", categoryName: "Consulting",
    city: "Bangalore", country: "India",
    description: "Data engineering and BI consultancy. We design lakehouse pipelines on AWS/GCP, Tableau/PowerBI dashboards, and AI-powered reporting. Team of 40 senior data engineers. Served 60+ mid-market companies. Retainer models available.",
    website: "https://cloudpulse.io",
    phone: "+91 80 4000 5001",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 37,
    name: "Dubai Digital Agency",
    industryName: "Technology & IT", categoryName: "Web & App",
    city: "Dubai", country: "UAE",
    description: "Full-service digital agency: e-commerce, brand identity, mobile-first web, React Native apps. Clients in UAE, Saudi Arabia, and UK. Figma-to-code in 6 weeks. ISO 9001 certified delivery. Government-approved vendor.",
    website: "https://dubaidigital.ae",
    phone: "+971 4 123 4567",
    discountPercent: 12, discountNote: "12% off for Rotary-network client projects.",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 34,
    name: "Kavya InfoSystems",
    industryName: "Technology & IT", categoryName: "IT Services",
    city: "Chennai", country: "India",
    description: "Managed IT services for SMEs — server management, network setup, CCTV, cloud backup, and IT support contracts. 24×7 NOC. 200+ clients in Tamil Nadu. Microsoft Gold Partner and Google Workspace reseller.",
    phone: "+91 44 4500 6000",
    email: "support@kavyainfo.in",
    discountPercent: 15, discountNote: "First month of managed IT free for Rotary businesses.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 5,
    name: "SkillForge Academy",
    industryName: "Education & Training", categoryName: "Skill Training",
    city: "Hyderabad", country: "India",
    description: "Vocational and professional skills training for graduates and mid-career professionals. Courses in leadership, data literacy, business communication, and AI productivity tools. Blended online + offline. NSDC-affiliated. 12,000+ alumni.",
    website: "https://skillforgeacademy.in",
    phone: "+91 40 2222 4444",
    discountPercent: 30, discountNote: "30% scholarship on all courses for Rotary member referrals.",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 42,
    name: "TechBridge Consulting Toronto",
    industryName: "Technology & IT", categoryName: "Consulting",
    city: "Toronto", country: "Canada",
    description: "IT strategy and digital transformation consultancy for Canadian mid-market firms. Specialises in ERP implementations (SAP, Oracle), cloud migrations, and cybersecurity audits. Led by Indian-origin founders with 25+ years in Silicon Valley.",
    website: "https://techbridge.ca",
    phone: "+1 416 555 0100",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 43,
    name: "PixelMosaic Studios",
    industryName: "Technology & IT", categoryName: "Web & App",
    city: "New York", country: "USA",
    description: "Boutique product design and development studio. UX research, Figma prototyping, Next.js, and React Native. Worked with Series-A startups and Fortune 500 innovation teams. Fixed-price MVPs delivered in 10 weeks.",
    website: "https://pixelmosaic.studio",
    discountPercent: 15, discountNote: "15% off MVP packages for businesses referred by Rotary members.",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 21,
    name: "Arya Hardware Solutions",
    industryName: "Technology & IT", categoryName: "Hardware",
    city: "Chandigarh", country: "India",
    description: "Enterprise hardware procurement and support — servers, networking gear, workstations, and IoT sensors. HPE and Cisco certified partner. Warehousing and same-day delivery across Punjab, Haryana, and Himachal Pradesh.",
    phone: "+91 172 400 9000",
    discountPercent: 8, discountNote: "8% off on bulk hardware procurement for Rotary institutions.",
    serviceReach: "STATE",
  },

  // ═══════════════════════════════════════════════════════════════
  // HEALTHCARE
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 5,
    name: "Krishnan Wellness Clinic",
    industryName: "Healthcare", categoryName: "Clinic",
    city: "Hyderabad", country: "India",
    description: "Holistic health centre integrating modern medicine with Ayurveda and lifestyle medicine. Specialist OPDs for diabetes, cardiology, and stress management. In-house yoga therapy and sleep clinic. 15 doctors, 6 visiting consultants.",
    phone: "+91 40 2222 3333",
    discountPercent: 20, discountNote: "Free initial consultation + 20% off all diagnostic packages for Rotary members.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 11,
    name: "MedPlus Diagnostics Madurai",
    industryName: "Healthcare", categoryName: "Diagnostics",
    city: "Madurai", country: "India",
    description: "NABL-accredited diagnostic centre with 1,400+ tests. Home sample collection 7 days a week. Digital reports in 4 hours. Speciality panels: cardiac, oncology marker, hormonal, and pre-marital screening. 3 branches in Madurai.",
    phone: "+91 452 234 5678",
    discountPercent: 25, discountNote: "25% off all diagnostic packages for Rotary members and their immediate family.",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 8,
    name: "SmileCare Dental Studio",
    industryName: "Healthcare", categoryName: "Dental",
    city: "Kochi", country: "India",
    description: "Multi-speciality dental clinic with laser dentistry, Invisalign orthodontics, dental implants, and cosmetic veneers. Paperless practice on cloud EMR. All procedures by MDS specialists. Sedation available for anxious patients.",
    phone: "+91 484 300 7000",
    email: "hello@smilecarecochin.in",
    discountPercent: 10, discountNote: "10% off treatment costs for Rotary members, excluding lab charges.",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 24,
    name: "AyurVeda Wellness Thrissur",
    industryName: "Healthcare", categoryName: "Wellness",
    city: "Thrissur", country: "India",
    description: "Authentic panchakarma and rejuvenation centre. Resident Ayurveda physicians (BAMS, MD). 21-day programmes for stress, arthritis, skin disorders, and weight management. Certified organic herbal oils. Residential packages with satvik diet.",
    phone: "+91 487 244 1000",
    discountPercent: 15, discountNote: "Rotary members receive a complimentary 60-minute Abhyanga session.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 12,
    name: "MedLife Pharmacy Visakhapatnam",
    industryName: "Healthcare", categoryName: "Pharmacy",
    city: "Visakhapatnam", country: "India",
    description: "24-hour pharmacy with 12,000+ molecules in stock. Home delivery within 2 hours in Vizag. Cold-chain medicines, insulin, and specialty oncology drugs available. Qualified pharmacist consultation at counter. GSTN registered.",
    phone: "+91 891 300 5000",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 43,
    name: "Sunrise Health Clinic New York",
    industryName: "Healthcare", categoryName: "Clinic",
    city: "New York", country: "USA",
    description: "Primary care clinic serving the South Asian community in Queens and NJ. Multilingual staff (Tamil, Hindi, Telugu, English). Telemedicine available. Annual wellness packages for NRIs including preventive screenings and specialist referrals.",
    phone: "+1 718 555 0900",
    discountPercent: 10, discountNote: "10% off wellness package for Rotary members.",
    serviceReach: "DISTRICT",
  },

  // ═══════════════════════════════════════════════════════════════
  // CONSTRUCTION & REAL ESTATE
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 2,
    name: "Sharma Builders & Developers",
    industryName: "Construction & Real Estate", categoryName: "Builder",
    city: "Delhi", country: "India",
    description: "Premium residential and commercial construction in NCR for 32 years. RERA registered (DL-RERA-123). Delivered 48 projects — luxury apartments, gated townships, and grade-A office parks. Green-certified with IGBC Gold rating. Current pipeline: ₹1,200 Cr.",
    website: "https://sharmabuilders.in",
    phone: "+91 11 4111 5555",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 7,
    name: "Designspace Interiors",
    industryName: "Construction & Real Estate", categoryName: "Interior Design",
    city: "Ahmedabad", country: "India",
    description: "Award-winning interior design studio (IIID member). Residential, commercial, hospitality, and retail. Turnkey project management from concept to handover. Portfolio includes 5-star hotel lobbies, co-working spaces, and luxury bungalows. Online consultations for pan-India clients.",
    phone: "+91 79 2600 7777",
    discountPercent: 10, discountNote: "10% off design fees for Rotary network referrals.",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 38,
    name: "Fernandes Property London",
    industryName: "Construction & Real Estate", categoryName: "Property Agent",
    city: "London", country: "UK",
    description: "Specialist in Indian diaspora real-estate investment in the UK. Buy-to-let, residential purchases, new-build reservations, and NRI compliance advisory. RICS regulated. Strong pipeline in London, Birmingham, and Manchester. Speaks Tamil, Hindi, and English.",
    website: "https://fernandespropertyuk.com",
    phone: "+44 20 7946 0000",
    discountPercent: 5, discountNote: "Complimentary NRI investment consultation for Rotary members.",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 15,
    name: "Rajputana Architects Jaipur",
    industryName: "Construction & Real Estate", categoryName: "Architect",
    city: "Jaipur", country: "India",
    description: "Architecture firm blending heritage Rajasthani aesthetics with contemporary sustainability. LEED-certified architects. Projects: palaces-turned-hotels, institutional buildings, and smart townships. Government-empanelled for public works in Rajasthan.",
    phone: "+91 141 400 3030",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 29,
    name: "Heritage Haveli Restorers Agra",
    industryName: "Construction & Real Estate", categoryName: "Builder",
    city: "Agra", country: "India",
    description: "Specialists in restoration and adaptive reuse of historical havelis and forts. ASI-approved methodologies. Converted 12 heritage properties into boutique hotels and cultural centres. Meticulous stonework, lime plaster, and jaali carving craftsmen on staff.",
    phone: "+91 562 300 4500",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 28,
    name: "GreenNest Interior Mysore",
    industryName: "Construction & Real Estate", categoryName: "Interior Design",
    city: "Mysore", country: "India",
    description: "Sustainable interior design using reclaimed wood, bamboo textiles, and non-toxic paints. Every project targets 30% lower embodied carbon than conventional fit-outs. Residential and boutique retail focus. Mysore Heritage Award 2024.",
    phone: "+91 821 300 1212",
    discountPercent: 10, discountNote: "10% off total project cost for Rotary members.",
    serviceReach: "STATE",
  },

  // ═══════════════════════════════════════════════════════════════
  // PROFESSIONAL SERVICES
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 3,
    name: "Agarwal & Associates",
    industryName: "Professional Services", categoryName: "Accounting",
    city: "Kolkata", country: "India",
    description: "Chartered accountancy firm with Big-4 experienced partners. Services: statutory audit, direct and indirect tax, transfer pricing, FEMA/NRI advisory, corporate secretarial, and RERA accounting. 28 years in practice. 200+ corporate clients.",
    phone: "+91 33 4000 8888",
    discountPercent: 15, discountNote: "15% off first-year engagement fees for fellow Rotarians.",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 7,
    name: "Joshi Legal Partners",
    industryName: "Professional Services", categoryName: "Legal",
    city: "Ahmedabad", country: "India",
    description: "Full-service law firm. Practice areas: M&A, PE/VC transactions, intellectual property, employment law, NCLT matters, and commercial arbitration. Enrolled before Supreme Court and Gujarat High Court. 40+ lawyers. Ranked by Chambers Asia-Pacific.",
    phone: "+91 79 2600 9999",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 6,
    name: "BrandCraft Marketing",
    industryName: "Professional Services", categoryName: "Marketing",
    city: "Pune", country: "India",
    description: "360° marketing agency: brand strategy, performance marketing, social media, PR, and out-of-home. 90+ brand partnerships across FMCG, real estate, fintech, and health. Google Premier Partner, Meta Business Partner. Average ROAS: 6.2x for e-commerce clients.",
    website: "https://brandcraftpune.in",
    phone: "+91 20 4545 6666",
    discountPercent: 20, discountNote: "Free brand audit + 20% off first campaign for Rotary businesses.",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 20,
    name: "TalentFirst HR Solutions",
    industryName: "Professional Services", categoryName: "HR & Staffing",
    city: "Nagpur", country: "India",
    description: "End-to-end HR services: permanent staffing, contract hiring, payroll processing, HR compliance, and leadership assessments. Sector specialities: manufacturing, healthcare, and logistics. ISO 9001 certified. 300+ clients across central India.",
    phone: "+91 712 300 7070",
    discountPercent: 10, discountNote: "10% off first placement fee for Rotary member businesses.",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 16,
    name: "SecureLife Insurance Lucknow",
    industryName: "Professional Services", categoryName: "Insurance",
    city: "Lucknow", country: "India",
    description: "Independent insurance advisory for individuals and corporates. Life, health, motor, property, and SME group insurance. IRDA-licensed. Access to all major insurers. Claims facilitation and renewal management. Hindi and English support.",
    phone: "+91 522 400 3000",
    discountPercent: 0, discountNote: "Complimentary insurance health-check for Rotary members — compare your cover against your actual needs.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 46,
    name: "Murugan & Co. Legal Frankfurt",
    industryName: "Professional Services", categoryName: "Legal",
    city: "Frankfurt", country: "Germany",
    description: "Cross-border legal advisory for Indian companies expanding into Germany and the EU. Expertise in GmbH formation, commercial contracts, employment law, and GDPR compliance. Bilingual (German/English). Preferred counsel for several Indian chambers of commerce.",
    phone: "+49 69 505 8700",
    discountPercent: 10, discountNote: "10% off initial legal consultation for Rotary members.",
    serviceReach: "INTERNATIONAL",
  },

  // ═══════════════════════════════════════════════════════════════
  // MANUFACTURING
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 6,
    name: "Mohan Textiles Pvt Ltd",
    industryName: "Manufacturing", categoryName: "Textiles",
    city: "Pune", country: "India",
    description: "Manufacturer and exporter of premium cotton, linen-blend, and recycled polyester fabrics. BCI Better Cotton certified. GRS-certified recycled range. Export to Europe (45%), USA (30%), Japan (15%). ISO 9001 and OEKO-TEX® STANDARD 100. MOQ 500 metres.",
    phone: "+91 20 4545 7777",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 25,
    name: "Vijayawada Agri Machinery",
    industryName: "Manufacturing", categoryName: "Machinery",
    city: "Vijayawada", country: "India",
    description: "Manufacturer of seed drills, rotavators, paddy reapers, and drip irrigation systems. BIS-certified. Supplying to Andhra Pradesh, Telangana, and Karnataka state agriculture departments. Custom fabrication for agri-processing units.",
    phone: "+91 866 244 5500",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 10,
    name: "Trichy Auto Components",
    industryName: "Manufacturing", categoryName: "Auto Parts",
    city: "Trichy", country: "India",
    description: "Tier-2 supplier of precision-machined castings, forgings, and sheet-metal components for two-wheeler and commercial vehicle OEMs. TS 16949 certified. Supplying TVS, TATA Motors, and Ashok Leyland. 3 CNC machining lines, 120-tonne press.",
    phone: "+91 431 244 7700",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 17,
    name: "PackRight Industries Surat",
    industryName: "Manufacturing", categoryName: "Packaging",
    city: "Surat", country: "India",
    description: "Corrugated boxes, rigid packaging, and flexible pouches for FMCG, pharma, and e-commerce. In-house rotogravure printing. FSC-certified paper sourcing. Custom printing up to 8 colours. Serving 150+ brands. 45,000 sq ft facility.",
    phone: "+91 261 300 5500",
    discountPercent: 8, discountNote: "8% off for Rotary member businesses on orders above ₹2 lakh.",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 13,
    name: "Salem Chemicals & Dyes",
    industryName: "Manufacturing", categoryName: "Chemicals",
    city: "Salem", country: "India",
    description: "Manufacturer and trader of reactive dyes, textile auxiliaries, and industrial chemicals. ISO 9001. REACH-compliant export formulations. Supplying power looms, garment exporters, and dyeing units across Tamil Nadu, Gujarat, and Maharashtra. Lab services for shade matching.",
    phone: "+91 427 244 8800",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 30,
    name: "Jaya Precision Engineering",
    industryName: "Manufacturing", categoryName: "Machinery",
    city: "Coimbatore", country: "India",
    description: "Coimbatore-based precision engineering firm producing industrial pumps, compressors, and heat exchangers. Export quality. ISO 9001. Clients in sugar, cement, and petrochemical industries. Custom design and reverse-engineering capability.",
    phone: "+91 422 300 9900",
    serviceReach: "NATIONAL",
  },

  // ═══════════════════════════════════════════════════════════════
  // RETAIL & TRADE
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 8,
    name: "ThomasGold Jewellers",
    industryName: "Retail & Trade", categoryName: "Jewellery",
    city: "Kochi", country: "India",
    description: "Three generations of heritage jewellers established in 1958. Specialising in traditional Kerala temple jewellery, diamond bridal sets, and contemporary gold collections. BIS hallmarked. In-house karimani and kundan work. Custom orders and gold exchange.",
    phone: "+91 484 234 5678",
    discountPercent: 5, discountNote: "Making charges waived for Rotary members on all gold jewellery.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 3,
    name: "Sunrise Electronics Kolkata",
    industryName: "Retail & Trade", categoryName: "Electronics",
    city: "Kolkata", country: "India",
    description: "Authorised retailer for Samsung, LG, Bosch, and Apple (Premium Reseller). Consumer electronics, home appliances, and B2B procurement. Corporate gifting desk. Free installation, 3-year extended warranty, and EMI via 12 banks. 4 stores in Kolkata.",
    phone: "+91 33 4000 9999",
    discountPercent: 8, discountNote: "8% off MRP for Rotary members on display models and bulk corporate orders.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 14,
    name: "Prakash Fashion House",
    industryName: "Retail & Trade", categoryName: "Apparel",
    city: "Mangalore", country: "India",
    description: "Multi-brand clothing boutique for men, women, and children. Stocks Fabindia, Raymond, W, and local coastal Karnataka labels. Custom tailoring and alterations in 48 hours. Corporate uniform supply for hotels and hospitals. Since 1987.",
    phone: "+91 824 244 3300",
    discountPercent: 10, discountNote: "10% off on first purchase for Rotary members.",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 33,
    name: "Palakkad Organic Grocers",
    industryName: "Retail & Trade", categoryName: "Grocery",
    city: "Palakkad", country: "India",
    description: "Organic grocery store and farm box subscription. 500+ certified organic SKUs — rice varieties, pulses, ghee, cold-pressed oils, and seasonal vegetables sourced directly from 80 Palakkad-district farms. Weekly farm boxes with online ordering.",
    phone: "+91 491 300 6600",
    discountPercent: 10, discountNote: "10% off on all orders for Rotary members. Free delivery in Palakkad.",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 26,
    name: "Tirunelveli Textile Wholesale",
    industryName: "Retail & Trade", categoryName: "Wholesale",
    city: "Tirunelveli", country: "India",
    description: "Wholesale distributor of cotton sarees, silk sarees (Kanjivaram, Dharmavaram), dress materials, and home textiles. 25,000+ sq ft showroom. Supplying 2,000+ retail shops across South India. GST-friendly invoicing. Export packing available.",
    phone: "+91 462 244 7700",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 47,
    name: "Ceylon Gems & Jewels",
    industryName: "Retail & Trade", categoryName: "Jewellery",
    city: "Colombo", country: "Sri Lanka",
    description: "Premier gem and jewellery trader dealing in certified sapphires, rubies, alexandrites, and spinel from Sri Lankan mines. GIA-certified grading reports. Custom jewellery fabrication in gold and platinum. Exporting to UAE, India, and Japan.",
    phone: "+94 11 244 5500",
    discountPercent: 5, discountNote: "Complimentary gem assessment and 5% off for Rotary members.",
    serviceReach: "INTERNATIONAL",
  },

  // ═══════════════════════════════════════════════════════════════
  // FINANCE
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 10,
    name: "Pillai Capital Advisors",
    industryName: "Finance", categoryName: "Investments",
    city: "Trichy", country: "India",
    description: "SEBI-registered investment advisory (INA000012345). Mutual funds, PMS, AIF, NPS, and holistic wealth planning for HNI and UHNI clients. Special expertise in NRI portfolio management, FEMA repatriation, and estate planning. ₹2,500 Cr AUM.",
    phone: "+91 431 234 5678",
    discountPercent: 0, discountNote: "Complimentary financial health-check and portfolio review for Rotary members.",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 45,
    name: "Chandra Wealth Management Houston",
    industryName: "Finance", categoryName: "Investments",
    city: "Houston", country: "USA",
    description: "Fee-only RIA for NRI Indians in the US. Specialises in dual-jurisdiction tax planning, US-India treaty benefits, 401(k)/IRA strategies, and India-based asset management. FINRA registered. Serving IT professionals and physicians since 2008.",
    website: "https://chandrawealth.com",
    discountPercent: 10, discountNote: "Complimentary 1-hour financial planning session for Rotary members.",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 22,
    name: "Bhopal SME Lending",
    industryName: "Finance", categoryName: "Loans",
    city: "Bhopal", country: "India",
    description: "NBFC specialising in SME working-capital loans, machinery finance, and invoice discounting. Loan amounts ₹10 lakh to ₹5 Cr. 48-hour disbursement. Minimal collateral for repeat borrowers. Serving 3,000+ MSMEs across Madhya Pradesh.",
    phone: "+91 755 300 4400",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 35,
    name: "FinEdge Fintech Chennai",
    industryName: "Finance", categoryName: "Fintech",
    city: "Chennai", country: "India",
    description: "B2B fintech platform for cooperative banks and NBFCs — core banking integration, digital KYC, NACH mandates, and loan origination software. Serving 60+ financial institutions. NPCI member. Raised Series A from a Chennai-based VC fund.",
    website: "https://finedge.in",
    phone: "+91 44 4600 9000",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 49,
    name: "Muscat Investment Advisory",
    industryName: "Finance", categoryName: "Investments",
    city: "Muscat", country: "Oman",
    description: "Financial planning for Indian expats in Oman and the Gulf. NRI savings plans, insurance, and repatriation advisory. SEBI-registered sub-broker. Serving 800+ NRI households. Multilingual: Tamil, Malayalam, Hindi, Arabic.",
    phone: "+968 2400 5500",
    discountPercent: 0, discountNote: "Free first consultation for Rotary members.",
    serviceReach: "INTERNATIONAL",
  },

  // ═══════════════════════════════════════════════════════════════
  // TRAVEL & LOGISTICS
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 37,
    name: "GulfTrek Travel & Tourism",
    industryName: "Travel & Logistics", categoryName: "Travel Agency",
    city: "Dubai", country: "UAE",
    description: "Full-service IATA-accredited travel agency. Inbound UAE tourism, outbound packages, Rotary club group tours, pilgrimage packages (Umrah, Tirupati, Vaishno Devi), visa processing, and corporate travel management. 18 years in the Gulf.",
    website: "https://gulftrek.ae",
    phone: "+971 4 234 5678",
    discountPercent: 10, discountNote: "10% off group bookings for Rotary clubs of 10+ members.",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 40,
    name: "IndoShip Freight Solutions",
    industryName: "Travel & Logistics", categoryName: "Freight",
    city: "Mumbai", country: "India",
    description: "Customs house agent and NVOCC for FCL/LCL ocean freight, air cargo, and bonded warehousing. IATA cargo agent. Speciality in hazardous goods, pharma cold chain, and oversized project cargo. USA, Europe, Middle East, and South-East Asia lanes.",
    phone: "+91 22 4800 3000",
    email: "cargo@indoship.in",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 18,
    name: "SpeedWing Courier Trivandrum",
    industryName: "Travel & Logistics", categoryName: "Courier",
    city: "Thiruvananthapuram", country: "India",
    description: "Same-day and next-day courier within Kerala, two-day pan-India surface, and international express via DHL and FedEx sub-franchise. Speciality: NRI parcel forwarding to Gulf, UK, and USA. Real-time tracking and automated pickup.",
    phone: "+91 471 300 2200",
    serviceReach: "NATIONAL",
  },
  {
    ownerIdx: 23,
    name: "Kozhikode Transport Co.",
    industryName: "Travel & Logistics", categoryName: "Transport",
    city: "Kozhikode", country: "India",
    description: "Fleet of 80 owned vehicles — full truck loads, partial loads, and REEFER for spice and seafood exports. ISO 14001 certified fleet management. GPS tracking on every vehicle. Covering all Kerala districts and key corridors to Bangalore, Chennai, and Hyderabad.",
    phone: "+91 495 244 6600",
    discountPercent: 8, discountNote: "8% off freight rates for Rotary member businesses.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 39,
    name: "Maple Tours Toronto",
    industryName: "Travel & Logistics", categoryName: "Travel Agency",
    city: "Toronto", country: "Canada",
    description: "Travel agency serving the South Asian community in Canada. India visits, Caribbean cruises, Europe group tours, and student travel. Ties with Rotary clubs for joint service trip packages. TICO registered. Tamil, Hindi, Gujarati staff.",
    phone: "+1 416 555 0200",
    discountPercent: 8, discountNote: "8% off on group bookings of 6+ pax for Rotary members.",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 44,
    name: "SingaLink Logistics",
    industryName: "Travel & Logistics", categoryName: "Freight",
    city: "Singapore", country: "Singapore",
    description: "Singapore-based freight forwarder specialising in India–ASEAN trade lanes. Sea LCL consolidation, bonded warehouse in Jurong, and last-mile delivery across Singapore. Strong in pharma, electronics, and automotive parts. MAS-licensed.",
    phone: "+65 6234 9900",
    serviceReach: "INTERNATIONAL",
  },

  // ═══════════════════════════════════════════════════════════════
  // EDUCATION & TRAINING
  // ═══════════════════════════════════════════════════════════════

  {
    ownerIdx: 36,
    name: "Global Minds EdTech",
    industryName: "Education & Training", categoryName: "EdTech",
    city: "Singapore", country: "Singapore",
    description: "K-12 and professional upskilling platform with AI-adaptive learning paths. Covers coding, STEM, financial literacy, and English proficiency. 50,000+ learners across Asia. Backed by Sequoia. Rotary scholarship programme: 500 free annual licences for underprivileged students.",
    website: "https://globalminds.sg",
    discountPercent: 25, discountNote: "25% off annual family subscription for Rotary members.",
    serviceReach: "INTERNATIONAL",
  },
  {
    ownerIdx: 16,
    name: "Lucknow Public School",
    industryName: "Education & Training", categoryName: "School",
    city: "Lucknow", country: "India",
    description: "CBSE-affiliated co-educational school, K–12. Focus on project-based learning, robotics lab, and international exchange programmes. Rotary scholarship for meritorious students from low-income families — 20 seats annually.",
    phone: "+91 522 400 4000",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 31,
    name: "Erode IIT-JEE Coaching",
    industryName: "Education & Training", categoryName: "Coaching",
    city: "Erode", country: "India",
    description: "Intensive coaching for IIT-JEE Main & Advanced, NEET, and TNPSC. Small batches (≤30), daily doubt sessions, weekly mock tests, and AIATS. 18 IIT selections in 2024. Residential programme available. Scholarship test in December every year.",
    phone: "+91 424 300 8800",
    discountPercent: 15, discountNote: "15% fee concession for wards of Rotary members.",
    serviceReach: "STATE",
  },
  {
    ownerIdx: 39,
    name: "Maple Language Institute",
    industryName: "Education & Training", categoryName: "Skill Training",
    city: "Toronto", country: "Canada",
    description: "IELTS/CELPIP preparation and English language training for new immigrants. Government-approved (IRCC). Spoken English, business writing, and job-skills workshops. Physical + online. Placement support for LINC-qualified graduates.",
    phone: "+1 416 555 0201",
    discountPercent: 20, discountNote: "20% off IELTS prep course for Rotary-referred newcomers.",
    serviceReach: "DISTRICT",
  },
  {
    ownerIdx: 46,
    name: "Chennai Coding Bootcamp",
    industryName: "Education & Training", categoryName: "EdTech",
    city: "Chennai", country: "India",
    description: "12-week full-stack and data-science bootcamps with job guarantee (median salary: ₹6 LPA). React, Node.js, Python, and AWS tracks. 1,200+ placements in 4 years. ISA (income-share agreement) option — pay after placement.",
    website: "https://codebootcamp.in",
    phone: "+91 44 4700 8800",
    discountPercent: 10, discountNote: "10% off tuition for Rotary-sponsored students.",
    serviceReach: "NATIONAL",
  },

  // ═══════════════════════════════════════════════════════════════
  // MORE businesses to maximise search coverage
  // ═══════════════════════════════════════════════════════════════

  // Tech – Software
  {
    ownerIdx: 5,
    name: "HydroCode Software Labs",
    industryName: "Technology & IT", categoryName: "Software",
    city: "Hyderabad", country: "India",
    description: "Healthcare software specialists: hospital management systems (HMS), pharmacy automation, and telemedicine platforms. HIPAA-compliant architecture. 35 hospital clients across Telangana and AP. HL7-FHIR integration experts.",
    website: "https://hydrocode.in",
    phone: "+91 40 4500 6600",
    serviceReach: "NATIONAL",
  },
  // Manufacturing – Textiles
  {
    ownerIdx: 31,
    name: "Murali Spinning Mills",
    industryName: "Manufacturing", categoryName: "Textiles",
    city: "Erode", country: "India",
    description: "Manufacturer of open-end and ring-spun cotton yarn (Ne 20s–60s). 40,000 spindles. Export quality. Supplying weaving clusters in Erode, Tiruppur, and Surat. Combed, carded, and gassed & mercerised grades. GOTS-certified organic yarn range.",
    phone: "+91 424 300 6600",
    serviceReach: "NATIONAL",
  },
  // Retail – Apparel
  {
    ownerIdx: 13,
    name: "SilkLine Salem",
    industryName: "Retail & Trade", categoryName: "Apparel",
    city: "Salem", country: "India",
    description: "Premium saree boutique specialising in Kanjivaram silk, Chanderi cotton silk, and Banarasi brocades. Direct tie-ups with weavers. Bridal collections with blouse stitching in 72 hours. Ships across India. Instagram: @silklinesalem.",
    phone: "+91 427 244 9900",
    discountPercent: 8, discountNote: "8% off for Rotary members on bridal orders.",
    serviceReach: "NATIONAL",
  },
  // Finance – Banking
  {
    ownerIdx: 27,
    name: "Kottayam Co-operative Bank",
    industryName: "Finance", categoryName: "Banking",
    city: "Kottayam", country: "India",
    description: "District co-operative bank with 22 branches in Kottayam district. Agricultural loans, gold loans, NRI deposits (NRE/NRO), and digital banking. 90-year legacy of community banking. Preferred bank for Rotary club trust accounts.",
    phone: "+91 481 244 5000",
    serviceReach: "DISTRICT",
  },
  // Healthcare – Wellness
  {
    ownerIdx: 46,
    name: "Mumbai Pilates & Wellness",
    industryName: "Healthcare", categoryName: "Wellness",
    city: "Mumbai", country: "India",
    description: "Studio specialising in clinical Pilates, physiotherapy, and sports rehabilitation. Reformer, Cadillac, and mat classes. Pre/post-natal programmes. 1-on-1 sessions with physiotherapists for back pain, rotator cuff, and knee recovery.",
    phone: "+91 22 4500 6000",
    discountPercent: 15, discountNote: "15% off first month membership for Rotary members.",
    serviceReach: "DISTRICT",
  },
  // Construction – Property Agent
  {
    ownerIdx: 44,
    name: "SingaProp Realty",
    industryName: "Construction & Real Estate", categoryName: "Property Agent",
    city: "Singapore", country: "Singapore",
    description: "CEA-licensed property agent serving Indian expats in Singapore. HDB resale, private condo purchases, and rental negotiations. Deep knowledge of EC, BTO, and en-bloc market. Handles Stamp Duty, legal docs, and bank loan applications end-to-end.",
    phone: "+65 9111 2233",
    discountPercent: 0, discountNote: "Free property search advisory for Rotary members — agent fees paid by seller.",
    serviceReach: "DISTRICT",
  },
  // Travel – Transport
  {
    ownerIdx: 48,
    name: "Colombo Express Transport",
    industryName: "Travel & Logistics", categoryName: "Transport",
    city: "Colombo", country: "Sri Lanka",
    description: "Fleet of 40 air-conditioned coaches and minivans for corporate transfers, airport pickups, Rotary convention transport, and pilgrimage tours across Sri Lanka. Multilingual driver-guides. Fully insured and SLTDA-registered.",
    phone: "+94 11 500 3300",
    discountPercent: 12, discountNote: "12% off for Rotary group bookings.",
    serviceReach: "DISTRICT",
  },
  // Professional Services – Marketing
  {
    ownerIdx: 43,
    name: "Kartik Digital New York",
    industryName: "Professional Services", categoryName: "Marketing",
    city: "New York", country: "USA",
    description: "Digital marketing agency for Indian-origin SMEs entering the US market. Amazon marketplace management, TikTok Shop, Google Shopping, and influencer partnerships. Niche expertise in beauty, food, and apparel. ROAS-driven performance contracts.",
    website: "https://kartikdigital.com",
    discountPercent: 15, discountNote: "Free US market audit for Rotary member businesses expanding to USA.",
    serviceReach: "INTERNATIONAL",
  },
  // Education – School
  {
    ownerIdx: 41,
    name: "Kuala Lumpur Indian International School",
    industryName: "Education & Training", categoryName: "School",
    city: "Kuala Lumpur", country: "Malaysia",
    description: "Tamil-medium and bilingual (English/Tamil) school for the Indian diaspora in Malaysia. Affiliated to Tamil Nadu Board. 1,200 students, K–10. Annual cultural exchange programme with Coimbatore schools. Rotary scholarship for 10 meritorious students annually.",
    phone: "+60 3 2200 4400",
    serviceReach: "DISTRICT",
  },
  // Healthcare – Pharmacy (international)
  {
    ownerIdx: 48,
    name: "MedStore Colombo",
    industryName: "Healthcare", categoryName: "Pharmacy",
    city: "Colombo", country: "Sri Lanka",
    description: "Chain of 8 pharmacies across Colombo metropolitan area. Prescription medicines, OTC products, branded generics, and homeopathic range. 24-hour flagship store in Colpetty. Mobile prescription upload and same-day delivery.",
    phone: "+94 11 244 8800",
    serviceReach: "DISTRICT",
  },
  // Finance – Loans
  {
    ownerIdx: 36,
    name: "SingaFinance Pte",
    industryName: "Finance", categoryName: "Loans",
    city: "Singapore", country: "Singapore",
    description: "MAS-licensed moneylender providing personal loans, SME bridging loans, and property renovation financing for Indian expats in Singapore. Transparent pricing, no hidden fees. Compliant with the Moneylenders Act. Serviced 4,000+ clients.",
    phone: "+65 6300 7788",
    serviceReach: "DISTRICT",
  },
  // Retail – Wholesale
  {
    ownerIdx: 17,
    name: "Surat Diamond Exports",
    industryName: "Retail & Trade", categoryName: "Wholesale",
    city: "Surat", country: "India",
    description: "Wholesale trader of polished diamonds (0.01 ct – 5 ct, all shapes). GJEPC member. Exports to USA, Belgium, Hong Kong, and UAE. Real-time stock on B2B portal. IDEX price-benchmarked. KP (Kimberley Process) certified.",
    phone: "+91 261 300 8800",
    serviceReach: "INTERNATIONAL",
  },
  // Construction – Architect
  {
    ownerIdx: 39,
    name: "Toronto Tamil Architects",
    industryName: "Construction & Real Estate", categoryName: "Architect",
    city: "Toronto", country: "Canada",
    description: "Architectural firm specialising in residential custom homes, temple construction, and cultural centre design for the South Asian diaspora in Canada. RAIC member. Familiar with Ontario Building Code and Panchayatana temple design principles.",
    phone: "+1 416 555 0300",
    serviceReach: "DISTRICT",
  },
  // Manufacturing – Packaging
  {
    ownerIdx: 9,
    name: "Coimbatore Eco Pack",
    industryName: "Manufacturing", categoryName: "Packaging",
    city: "Coimbatore", country: "India",
    description: "Manufacturer of biodegradable packaging from sugarcane bagasse, areca palm, and corn-starch. Plates, bowls, clamshells, and carry bags. BIS-certified. Supplying QSRs, cloud kitchens, and wedding caterers. Export to Germany and Australia.",
    phone: "+91 422 300 5500",
    discountPercent: 10, discountNote: "10% off for Rotary caterers and food businesses.",
    serviceReach: "NATIONAL",
  },
  // Travel – Courier
  {
    ownerIdx: 44,
    name: "Falcon Courier Singapore",
    industryName: "Travel & Logistics", categoryName: "Courier",
    city: "Singapore", country: "Singapore",
    description: "Same-day and next-day express courier within Singapore and international shipping via SingPost and DHL. Speciality: NRI parcel forwarding to India, UAE, and UK with customs documentation support. WhatsApp booking accepted.",
    phone: "+65 8100 4455",
    serviceReach: "INTERNATIONAL",
  },
  // Food – Catering (international)
  {
    ownerIdx: 40,
    name: "Mumbai Tiffin Service",
    industryName: "Food & Hospitality", categoryName: "Catering",
    city: "Mumbai", country: "India",
    description: "Dabba service for corporate offices and individual subscriptions. Pure vegetarian home-style meals — Maharashtrian, Gujarati, and North Indian rotation. No preservatives or MSG. Serving 8,000+ daily tiffins in Andheri, BKC, and Lower Parel.",
    phone: "+91 98200 77777",
    discountPercent: 10, discountNote: "10% off monthly corporate pack for Rotary member businesses.",
    serviceReach: "DISTRICT",
  },
  // Professional Services – Accounting (international)
  {
    ownerIdx: 47,
    name: "Colombo NRI Tax Advisors",
    industryName: "Professional Services", categoryName: "Accounting",
    city: "Colombo", country: "Sri Lanka",
    description: "CA and tax advisory for Sri Lankan businesspeople with India connections. India-SL double tax treaty advisory, FEMA remittances, repatriation of funds, and Sri Lanka corporate tax compliance. Small team; senior-partner direct involvement guaranteed.",
    phone: "+94 11 244 9900",
    discountPercent: 10, discountNote: "10% off for Rotary members on first tax filing.",
    serviceReach: "INTERNATIONAL",
  },
  // Technology – IT Services (Bahrain)
  {
    ownerIdx: 47,
    name: "Gulf IT Managed Services",
    industryName: "Technology & IT", categoryName: "IT Services",
    city: "Bahrain", country: "Bahrain",
    description: "Managed IT for SMEs in Bahrain and Eastern Province KSA. Microsoft 365 migrations, Azure setup, network infrastructure, CCTV, and cybersecurity awareness training. CR-registered. Preferred vendor for Indian-owned businesses in Bahrain.",
    phone: "+973 1710 5500",
    discountPercent: 15, discountNote: "15% off first 3 months of managed IT for Rotary members.",
    serviceReach: "DISTRICT",
  },
  // Manufacturing – Chemicals (Bahrain)
  {
    ownerIdx: 47,
    name: "ArabChem Trading",
    industryName: "Manufacturing", categoryName: "Chemicals",
    city: "Bahrain", country: "Bahrain",
    description: "Trading house for industrial chemicals, lubricants, and specialty coatings sourced from India, South Korea, and Germany. Supplying construction, oil & gas maintenance, and marine sectors across the GCC. ISO 9001 certified warehouse in Hidd.",
    phone: "+973 1720 4400",
    serviceReach: "INTERNATIONAL",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getOrCreateIndustry(name: string) {
  return db.industry.upsert({
    where: { name },
    update: {},
    create: { name, slug: slugify(name) },
  });
}

async function getOrCreateCategory(name: string, industryId: string, industryName: string) {
  // Match seed.ts's slug convention EXACTLY (industryName-name) so this reuses the
  // taxonomy rows seeded there instead of creating duplicate categories — offerings
  // and needs must reference the same Category for path-based matching to work.
  const slug = slugify(`${industryName}-${name}`);
  return db.category.upsert({
    where: { slug },
    update: {},
    // path drives subtree matching; flat taxonomy → path == slug.
    create: { name, slug, industryId, path: slug, depth: 0 },
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Seeding ${MEMBERS.length} members…`);
  const users: { id: string }[] = [];

  for (let i = 0; i < MEMBERS.length; i++) {
    const m = MEMBERS[i];
    const user = await db.user.upsert({
      where: { email: m.email },
      update: { status: "VERIFIED", name: m.name },
      create: {
        email: m.email,
        name: m.name,
        emailVerified: new Date(),
        status: "VERIFIED",
        profile: { create: { fullName: m.name, city: m.city, country: m.country } },
        rotaryInfo: { create: { rotaryId: `RID-DEMO-${String(i + 1).padStart(3, "0")}` } },
      },
    });
    users.push(user);
  }
  console.log(`  ✓ ${users.length} members ready`);

  // District used to demonstrate district-scoped lead matching. Indian businesses
  // are placed in 3201 so a Need posted there matches them locally.
  const d3201 = await db.district.findUnique({ where: { code: "3201" } });

  // Only real Tamil Nadu cities get stateCode IN-TN — otherwise STATE-reach
  // matching would be geographically wrong (a Mumbai firm isn't in TN).
  const TN_CITIES = new Set([
    "Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Erode",
    "Tirunelveli", "Puducherry",
  ]);

  console.log(`\nSeeding ${BUSINESSES.length} businesses…`);
  let created = 0;
  let skipped = 0;

  for (const b of BUSINESSES) {
    const slug = slugify(b.name);
    const existing = await db.business.findUnique({ where: { slug } });
    if (existing) { skipped++; continue; }

    const owner = users[b.ownerIdx];
    const industry = await getOrCreateIndustry(b.industryName);
    const category = await getOrCreateCategory(b.categoryName, industry.id, b.industryName);

    // Primary offering derived from the category. Also drives the denormalized
    // Business.tradeRoles (facet) and Business.offeringsText (search feed).
    const off = offeringFor(b.categoryName);
    const offeringsText = [off.title, ...off.keywords, b.categoryName]
      .filter(Boolean)
      .join(" ");
    const isIndia = b.country === "India";

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
        website: b.website ?? null,
        email: b.email ?? null,
        phone: b.phone ?? null,
        addressLine: b.addressLine ?? null,
        discountPercent: b.discountPercent ?? null,
        discountNote: b.discountNote ?? null,
        serviceReach: b.serviceReach ?? "NATIONAL",
        status: "APPROVED",
        // Leads/search additions.
        districtId: isIndia ? d3201?.id ?? null : null,
        stateCode: TN_CITIES.has(b.city) ? "IN-TN" : null,
        tradeRoles: off.tradeRoles,
        offeringsText,
        offerings: {
          create: [
            {
              categoryId: category.id,
              title: off.title,
              keywords: off.keywords.map((k) => k.toLowerCase()),
              tradeRoles: off.tradeRoles,
              isActive: true,
            },
          ],
        },
      },
    });
    created++;
    process.stdout.write(`  [${created}] ${b.name} — ${b.city}, ${b.country}\n`);
  }

  console.log(`\nDone — ${created} businesses created, ${skipped} skipped.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
