/**
 * Import the official global Rotary roster into RosterMember (+ District/Club).
 *
 * Usage:
 *   npm run db:import-roster -- <path-to-roster.csv>
 *
 * Re-runnable: rows are upserted by (normalized) Rotary ID when present,
 * otherwise by (fullName + districtCode). Districts and clubs are upserted so
 * signups can be matched and displayed.
 *
 * Column mapping: set env vars to point at your CSV's headers, or rely on the
 * common defaults below (case-insensitive, trimmed).
 *   COL_ROTARY_ID   (default: "rotary_id","member_id","id","rid")
 *   COL_NAME        (default: "full_name","name","member_name")
 *   COL_EMAIL       (default: "email")
 *   COL_PHONE       (default: "phone","mobile")
 *   COL_CLUB        (default: "club","club_name")
 *   COL_DISTRICT    (default: "district","district_code")
 *   COL_COUNTRY     (default: "country")
 *   COL_CITY        (default: "city")
 */
import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";
import { normalizeDistrictCode } from "../src/backend/roster";

const db = new PrismaClient();

type Row = Record<string, string>;

const DEFAULTS = {
  rotaryId: ["rotary_id", "member_id", "id", "rid"],
  name: ["full_name", "name", "member_name"],
  email: ["email"],
  phone: ["phone", "mobile"],
  club: ["club", "club_name"],
  district: ["district", "district_code"],
  country: ["country"],
  city: ["city"],
};

function pick(row: Row, envKey: string, defaults: string[]): string | null {
  const configured = process.env[envKey];
  const candidates = configured ? [configured] : defaults;
  const lowerMap = new Map(
    Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]),
  );
  for (const c of candidates) {
    const v = lowerMap.get(c.toLowerCase());
    if (v && v.trim()) return v.trim();
  }
  return null;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run db:import-roster -- <path-to-roster.csv>");
    process.exit(1);
  }

  const csv = readFileSync(file, "utf8");
  const parsed = Papa.parse<Row>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    console.warn(`CSV parse warnings: ${parsed.errors.length} (continuing)`);
  }

  const districtCache = new Map<string, string>(); // code -> id
  const clubCache = new Map<string, string>(); // `${code}::${name}` -> id
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const fullName = pick(row, "COL_NAME", DEFAULTS.name);
    if (!fullName) {
      skipped++;
      continue;
    }
    const rotaryId = pick(row, "COL_ROTARY_ID", DEFAULTS.rotaryId);
    const districtRaw = pick(row, "COL_DISTRICT", DEFAULTS.district);
    const districtCode = districtRaw ? normalizeDistrictCode(districtRaw) : null;
    const clubName = pick(row, "COL_CLUB", DEFAULTS.club);
    const country = pick(row, "COL_COUNTRY", DEFAULTS.country);
    const city = pick(row, "COL_CITY", DEFAULTS.city);

    // Upsert district
    let districtId: string | null = null;
    if (districtCode) {
      districtId = districtCache.get(districtCode) ?? null;
      if (!districtId) {
        const d = await db.district.upsert({
          where: { code: districtCode },
          update: { country: country ?? undefined },
          create: { code: districtCode, country },
        });
        districtId = d.id;
        districtCache.set(districtCode, districtId);
      }
    }

    // Upsert club (needs a district)
    let clubId: string | null = null;
    if (clubName && districtId) {
      const key = `${districtCode}::${clubName}`;
      clubId = clubCache.get(key) ?? null;
      if (!clubId) {
        const c = await db.club.upsert({
          where: { name_districtId: { name: clubName, districtId } },
          update: { city: city ?? undefined, country: country ?? undefined },
          create: { name: clubName, districtId, city, country },
        });
        clubId = c.id;
        clubCache.set(key, clubId);
      }
    }

    // Upsert roster member (dedupe by rotaryId, else name+district)
    const existing = rotaryId
      ? await db.rosterMember.findFirst({ where: { rotaryId } })
      : await db.rosterMember.findFirst({ where: { fullName, districtCode } });

    const data = {
      rotaryId,
      fullName,
      email: pick(row, "COL_EMAIL", DEFAULTS.email),
      phone: pick(row, "COL_PHONE", DEFAULTS.phone),
      clubName,
      districtCode,
      clubId,
      districtId,
      source: "import",
    };

    if (existing) {
      await db.rosterMember.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await db.rosterMember.create({ data });
      inserted++;
    }
  }

  console.log(
    `Roster import complete. inserted=${inserted} updated=${updated} skipped=${skipped}`,
  );
  console.log(
    `Districts=${districtCache.size} Clubs=${clubCache.size} (this run)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
