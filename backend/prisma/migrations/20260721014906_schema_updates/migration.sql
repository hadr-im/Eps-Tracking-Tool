
-- CreateEnum
CREATE TYPE "Product" AS ENUM ('GV', 'GTA', 'GTE');

-- CreateTable (must exist before AlterEnum references it)
CREATE TABLE IF NOT EXISTS "StatusHistory" (
    "id" TEXT NOT NULL,
    "epId" TEXT NOT NULL,
    "fromStatus" "EpStatus" NOT NULL,
    "toStatus" "EpStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

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
ALTER TABLE "ApprovedDetail" ADD COLUMN IF NOT EXISTS "auditFolder" TEXT,
ADD COLUMN IF NOT EXISTS "contractLink" TEXT;

-- AlterTable
ALTER TABLE "Ep" DROP COLUMN IF EXISTS "programme",
ADD COLUMN IF NOT EXISTS "product" "Product" NOT NULL DEFAULT 'GV';

-- DropEnum
DROP TYPE IF EXISTS "Programme";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatusHistory_epId_idx" ON "StatusHistory"("epId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatusHistory_changedAt_idx" ON "StatusHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_epId_fkey" FOREIGN KEY ("epId") REFERENCES "Ep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
