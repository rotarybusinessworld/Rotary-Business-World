/**
 * Promote a user to an admin role.
 *
 * Without --district: promote to MANAGEMENT (platform-wide access).
 *   npm run make-admin -- someone@example.com
 *
 * With --district <code>: promote to DISTRICT_ADMIN scoped to that district.
 *   npm run make-admin -- someone@example.com --district 3201
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0]?.toLowerCase();
  if (!email || email.startsWith("--")) {
    console.error(
      "Usage: npm run make-admin -- <email> [--district <code>]",
    );
    process.exit(1);
  }

  // Parse optional --district <code>
  const districtFlagIdx = args.indexOf("--district");
  const districtCode = districtFlagIdx >= 0 ? args[districtFlagIdx + 1] : null;

  let managedDistrictId: string | null = null;

  if (districtCode) {
    const district = await db.district.findUnique({
      where: { code: districtCode },
    });
    if (!district) {
      console.error(
        `District with code "${districtCode}" not found. Run db:seed or db:import-roster first.`,
      );
      process.exit(1);
    }
    managedDistrictId = district.id;
  }

  const user = await db.user.update({
    where: { email },
    data: {
      role: districtCode ? "DISTRICT_ADMIN" : "MANAGEMENT",
      status: "VERIFIED",
      hasPaid: true,
      managedDistrictId,
    },
  });

  if (districtCode) {
    console.log(
      `✓ ${user.email} is now DISTRICT_ADMIN for district ${districtCode} (verified).`,
    );
  } else {
    console.log(`✓ ${user.email} is now MANAGEMENT (verified).`);
  }
}

main()
  .catch((e) => {
    console.error("Failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
