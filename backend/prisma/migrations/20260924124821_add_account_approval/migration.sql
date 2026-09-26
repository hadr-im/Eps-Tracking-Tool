-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestedDepartmentId" TEXT,
ADD COLUMN     "requestedIsDispatcher" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestedRole" "UserRole",
ADD COLUMN     "requestedTeamLeaderId" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every account that existed before approval was introduced is already
-- trusted, so mark it ACTIVE. Without this the new PENDING default would lock
-- out every existing user, including the only VP.
UPDATE "User" SET "status" = 'ACTIVE';

-- Data fix: the dispatcher is a Team Leader responsibility. Clear the flag from
-- any non-TL account so the one-dispatcher-per-department index below can be
-- created (dpt-gv currently has both a VP and a TL flagged as dispatcher).
UPDATE "User" SET "isDispatcher" = false WHERE "role" <> 'TEAM_LEADER';

-- Business rules enforced in the database, not just in application code.
-- Partial unique indexes cannot be expressed in the Prisma schema, so they are
-- declared here by hand. Both exclude disabled accounts so that a departing VP
-- or dispatcher does not permanently occupy the slot during a handover.
-- NULL departmentId rows are exempt: Postgres treats NULLs as distinct, which
-- is what lets many unapproved (department-less) accounts coexist.
CREATE UNIQUE INDEX "one_dispatcher_per_department"
  ON "User"("departmentId")
  WHERE "isDispatcher" = true AND "isDisabled" = false;

CREATE UNIQUE INDEX "one_vp_per_department"
  ON "User"("departmentId")
  WHERE "role" = 'VP' AND "isDisabled" = false;
