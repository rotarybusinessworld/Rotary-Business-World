/**
 * Wipe ALL user accounts and related data, then seed a fresh management account.
 * Reference data (districts, clubs, roster members, taxonomy) is left untouched.
 *
 *   npm run reset-accounts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const EMAIL = "sanjayvanan03@gmail.com";
const FULL_NAME = "Sanjay Vanan";

async function main() {
  console.log("Wiping all user accounts and related data…");

  // Audit logs first (actorId is SetNull on delete; clear them for a clean slate)
  await db.auditLog.deleteMany({});

  // Webhook events
  await db.webhookEvent.deleteMany({});

  // Users — cascade deletes Profile, RotaryInfo, Business + BusinessImage,
  // Review, Payment, EmailVerificationToken, Conversation, Message, Block,
  // VerificationRequest
  const { count } = await db.user.deleteMany({});
  console.log(`  Deleted ${count} user(s).`);

  // Seed the management account (sign-in via magic-link email)
  const user = await db.user.create({
    data: {
      email: EMAIL,
      role: "MANAGEMENT",
      status: "VERIFIED",
      profile: { create: { fullName: FULL_NAME } },
    },
    select: { id: true, email: true, role: true, status: true },
  });

  console.log("\nManagement account created:");
  console.log(`  Email: ${user.email} (sign in via magic-link)`);
  console.log(`  Role:  ${user.role}`);
  console.log(`  Status:   ${user.status}`);
  console.log(`  ID:       ${user.id}`);
}

main()
  .catch((e) => {
    console.error("Failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
