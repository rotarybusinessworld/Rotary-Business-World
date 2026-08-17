-- PrismaAdapter requires these three fields on the User model to call createUser,
-- getUserByEmail, and updateUser correctly for OAuth providers (Google).
-- Without them, createUser throws "Unknown argument 'name'" and the auth handler 500s.
ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ADD COLUMN "image" TEXT;
ALTER TABLE "User" RENAME COLUMN "emailVerifiedAt" TO "emailVerified";
