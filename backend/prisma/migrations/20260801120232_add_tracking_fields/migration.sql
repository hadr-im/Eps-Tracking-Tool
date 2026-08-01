/*
  Warnings:

  - Added the required column `product` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Ep` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TrackingPhase" AS ENUM ('WAITING_FOR_ANSWER', 'EP_NOT_RESPONDING', 'EXPLAINING_AIESEC', 'LOOKING_FOR_OPPORTUNITIES', 'HAVING_INTERVIEW', 'WILL_SIGN_CONTRACT', 'CONTRACT_SIGNED', 'WAITING_FOR_CV', 'NOT_INTERESTED_ANYMORE');

-- CreateEnum
CREATE TYPE "Duration" AS ENUM ('LONG', 'MID', 'SHORT');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('THIS_SUMMER', 'THIS_WINTER', 'NEXT_SUMMER', 'NEXT_WINTER');

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "product" "Product" NOT NULL;

-- AlterTable
ALTER TABLE "Ep" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "availability" "Availability",
ADD COLUMN     "contacted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactedAt" TIMESTAMP(3),
ADD COLUMN     "cvLink" TEXT,
ADD COLUMN     "duration" "Duration",
ADD COLUMN     "interested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "trackingPhase" "TrackingPhase",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "yearOfStudy" INTEGER,
ALTER COLUMN "product" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StatusHistory" ADD COLUMN     "changedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;

-- CreateTable
CREATE TABLE "TransitionHistory" (
    "id" TEXT NOT NULL,
    "epId" TEXT NOT NULL,
    "triggeredById" TEXT,
    "fromProduct" "Product",
    "toProduct" "Product",
    "fromDepartment" TEXT,
    "toDepartment" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransitionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "epId" TEXT NOT NULL,
    "authorId" TEXT,
    "fieldName" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransitionHistory_epId_idx" ON "TransitionHistory"("epId");

-- CreateIndex
CREATE INDEX "Comment_epId_idx" ON "Comment"("epId");

-- CreateIndex
CREATE INDEX "Ep_ownerId_idx" ON "Ep"("ownerId");

-- AddForeignKey
ALTER TABLE "Ep" ADD CONSTRAINT "Ep_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitionHistory" ADD CONSTRAINT "TransitionHistory_epId_fkey" FOREIGN KEY ("epId") REFERENCES "Ep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitionHistory" ADD CONSTRAINT "TransitionHistory_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_epId_fkey" FOREIGN KEY ("epId") REFERENCES "Ep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
