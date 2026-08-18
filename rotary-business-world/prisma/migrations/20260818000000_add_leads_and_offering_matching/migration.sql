-- CreateEnum
CREATE TYPE "TradeRole" AS ENUM ('MANUFACTURER', 'WHOLESALER', 'RETAILER', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "TradeIntent" AS ENUM ('BUY_RETAIL', 'BUY_WHOLESALE', 'MANUFACTURING', 'HIRE_SERVICE');

-- CreateEnum
CREATE TYPE "NeedStatus" AS ENUM ('OPEN', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NeedUrgency" AS ENUM ('STANDARD', 'URGENT');

-- CreateEnum
CREATE TYPE "MatchFeedback" AS ENUM ('RELEVANT', 'NOT_RELEVANT');

-- DropIndex
DROP INDEX "BusinessOffering_categoryId_idx";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "offeringsText" TEXT,
ADD COLUMN     "tradeRoles" "TradeRole"[];

-- AlterTable
ALTER TABLE "BusinessOffering" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minOrderQty" TEXT,
ADD COLUMN     "tradeRoles" "TradeRole"[];

-- CreateTable
CREATE TABLE "Need" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "tradeIntent" "TradeIntent" NOT NULL,
    "districtId" TEXT NOT NULL,
    "stateCode" TEXT,
    "country" TEXT,
    "reachWanted" "ServiceReach" NOT NULL DEFAULT 'STATE',
    "quantity" TEXT,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "notes" TEXT,
    "urgency" "NeedUrgency" NOT NULL DEFAULT 'STANDARD',
    "status" "NeedStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Need_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedMatch" (
    "id" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "offeringId" TEXT,
    "score" INTEGER NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "digestedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "feedback" "MatchFeedback",
    "feedbackAt" TIMESTAMP(3),

    CONSTRAINT "NeedMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Need_status_categoryId_districtId_idx" ON "Need"("status", "categoryId", "districtId");

-- CreateIndex
CREATE INDEX "Need_status_expiresAt_idx" ON "Need"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Need_memberId_createdAt_idx" ON "Need"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "NeedMatch_businessId_viewedAt_idx" ON "NeedMatch"("businessId", "viewedAt");

-- CreateIndex
CREATE INDEX "NeedMatch_businessId_matchedAt_idx" ON "NeedMatch"("businessId", "matchedAt");

-- CreateIndex
CREATE INDEX "NeedMatch_businessId_sentAt_idx" ON "NeedMatch"("businessId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "NeedMatch_needId_businessId_key" ON "NeedMatch"("needId", "businessId");

-- CreateIndex
CREATE INDEX "BusinessOffering_categoryId_isActive_idx" ON "BusinessOffering"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessOffering_businessId_categoryId_key" ON "BusinessOffering"("businessId", "categoryId");

-- AddForeignKey
ALTER TABLE "Need" ADD CONSTRAINT "Need_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Need" ADD CONSTRAINT "Need_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Need" ADD CONSTRAINT "Need_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedMatch" ADD CONSTRAINT "NeedMatch_needId_fkey" FOREIGN KEY ("needId") REFERENCES "Need"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedMatch" ADD CONSTRAINT "NeedMatch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedMatch" ADD CONSTRAINT "NeedMatch_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "BusinessOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

