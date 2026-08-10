-- One verified account per roster identity (blocks impersonation/duplicates).
-- Postgres treats NULLs as distinct, so unmatched (PENDING) accounts are unaffected.
CREATE UNIQUE INDEX "RotaryInfo_matchedRosterId_key" ON "RotaryInfo"("matchedRosterId");
