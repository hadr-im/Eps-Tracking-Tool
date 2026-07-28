-- CreateEnum
CREATE TYPE "EpStatus" AS ENUM ('LEAD', 'APPLIED', 'APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED');

-- CreateEnum
CREATE TYPE "Programme" AS ENUM ('GV', 'GTA', 'GTE');

-- CreateTable
CREATE TABLE "PasswordResetOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ep" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "university" TEXT,
    "fieldOfStudy" TEXT,
    "programme" "Programme" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "statusOnExpa" "EpStatus" NOT NULL DEFAULT 'LEAD',
    "createdAtExpa" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedDetail" (
    "id" TEXT NOT NULL,
    "epId" TEXT NOT NULL,
    "expaAppId" TEXT NOT NULL,
    "opportunityTitle" TEXT,
    "hostingMC" TEXT,
    "hostingLC" TEXT,
    "projectFees" DOUBLE PRECISION,
    "approvalDate" TIMESTAMP(3),
    "realizedDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "finishedDate" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovedDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetOtp_userId_idx" ON "PasswordResetOtp"("userId");

-- CreateIndex
CREATE INDEX "Ep_departmentId_idx" ON "Ep"("departmentId");

-- CreateIndex
CREATE INDEX "Ep_statusOnExpa_idx" ON "Ep"("statusOnExpa");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedDetail_epId_key" ON "ApprovedDetail"("epId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedDetail_expaAppId_key" ON "ApprovedDetail"("expaAppId");

-- AddForeignKey
ALTER TABLE "PasswordResetOtp" ADD CONSTRAINT "PasswordResetOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ep" ADD CONSTRAINT "Ep_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedDetail" ADD CONSTRAINT "ApprovedDetail_epId_fkey" FOREIGN KEY ("epId") REFERENCES "Ep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
