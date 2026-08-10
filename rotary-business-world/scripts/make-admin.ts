/**
 * Promote a user to SUPER_ADMIN (bootstrap the first admin).
 *   npm run make-admin -- someone@example.com
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }
  const user = await db.user.update({
    where: { email },
    data: { role: "SUPER_ADMIN", status: "VERIFIED" },
  });
  console.log(`✓ ${user.email} is now SUPER_ADMIN (verified).`);
}

main()
  .catch((e) => {
    console.error("Failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
