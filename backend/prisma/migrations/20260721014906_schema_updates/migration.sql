/*
  Warnings:

  - The values [APPLIED] on the enum `EpStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `programme` on the `Ep` table. All the data in the column will be lost.
  - Added the required column `product` to the `Ep` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Product" AS ENUM ('GV', 'GTA', 'GTE');

-- AlterEnum
BEGIN;
CREATE TYPE "EpStatus_new" AS ENUM ('LEAD', 'CONTACTED', 'INTERESTED', 'APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED');
ALTER TABLE "public"."Ep" ALTER COLUMN "statusOnExpa" DROP DEFAULT;
ALTER TABLE "Ep" ALTER COLUMN "statusOnExpa" TYPE "EpStatus_new" USING ("statusOnExpa"::text::"EpStatus_new");
ALTER TABLE "StatusHistory" ALTER COLUMN "fromStatus" TYPE "EpStatus_new" USING ("fromStatus"::text::"EpStatus_new");
ALTER TABLE "StatusHistory" ALTER COLUMN "toStatus" TYPE "EpStatus_new" USING ("toStatus"::text::"EpStatus_new");
ALTER TYPE "EpStatus" RENAME TO "EpStatus_old";
ALTER TYPE "EpStatus_new" RENAME TO "EpStatus";
DROP TYPE "public"."EpStatus_old";
ALTER TABLE "Ep" ALTER COLUMN "statusOnExpa" SET DEFAULT 'LEAD';
COMMIT;

-- AlterTable
ALTER TABLE "ApprovedDetail" ADD COLUMN     "auditFolder" TEXT,
ADD COLUMN     "contractLink" TEXT;

-- AlterTable
ALTER TABLE "Ep" DROP COLUMN "programme",
ADD COLUMN     "product" "Product" NOT NULL;

-- DropEnum
DROP TYPE "Programme";

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "epId" TEXT NOT NULL,
    "fromStatus" "EpStatus" NOT NULL,
    "toStatus" "EpStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatusHistory_epId_idx" ON "StatusHistory"("epId");

-- CreateIndex
CREATE INDEX "StatusHistory_changedAt_idx" ON "StatusHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_epId_fkey" FOREIGN KEY ("epId") REFERENCES "Ep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
