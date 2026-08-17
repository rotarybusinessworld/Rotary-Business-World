-- New Google OAuth users are created by PrismaAdapter with schema defaults.
-- REGISTERED is the correct initial state for a user who has authenticated
-- but not yet completed their Rotary profile (name, district, club, phone).
-- Users who register via the form still land at PAYMENT_PENDING explicitly.
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'REGISTERED'::"UserStatus";
