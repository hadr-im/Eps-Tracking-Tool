-- DropIndex
DROP INDEX "Ep_departmentId_idx";

-- DropIndex
DROP INDEX "Ep_ownerId_idx";

-- CreateIndex
CREATE INDEX "Ep_departmentId_ownerId_createdAtExpa_idx" ON "Ep"("departmentId", "ownerId", "createdAtExpa");

-- CreateIndex
CREATE INDEX "Ep_departmentId_createdAtExpa_idx" ON "Ep"("departmentId", "createdAtExpa");

-- CreateIndex
CREATE INDEX "Ep_departmentId_statusOnExpa_idx" ON "Ep"("departmentId", "statusOnExpa");

-- CreateIndex
CREATE INDEX "Ep_ownerId_assignedAt_idx" ON "Ep"("ownerId", "assignedAt");
