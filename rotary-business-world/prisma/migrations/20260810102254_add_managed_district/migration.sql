-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managedDistrictId" TEXT;

-- CreateIndex
CREATE INDEX "User_managedDistrictId_idx" ON "User"("managedDistrictId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managedDistrictId_fkey" FOREIGN KEY ("managedDistrictId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
