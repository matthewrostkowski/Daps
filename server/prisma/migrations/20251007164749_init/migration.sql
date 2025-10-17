/*
  Warnings:

  - You are about to drop the column `sentAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `expDesc` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `expType` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `gameDesc` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `offered` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `paymentLast4` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `Offer` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[verifyToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resetToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `team` on table `Athlete` required. This step will fail if there are existing NULL values in that column.
  - Made the column `league` on table `Athlete` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `amount` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Offer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_offerId_fkey";

-- AlterTable
ALTER TABLE "Athlete" ALTER COLUMN "team" SET NOT NULL,
ALTER COLUMN "league" SET NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "sentAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "offerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "customerEmail",
DROP COLUMN "customerName",
DROP COLUMN "customerPhone",
DROP COLUMN "expDesc",
DROP COLUMN "expType",
DROP COLUMN "gameDesc",
DROP COLUMN "offered",
DROP COLUMN "paymentLast4",
DROP COLUMN "paymentMethod",
DROP COLUMN "submittedAt",
ADD COLUMN     "amount" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "gameId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "verifyToken" TEXT;

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "opponent" TEXT NOT NULL,
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Game_athleteId_date_idx" ON "Game"("athleteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "User_verifyToken_key" ON "User"("verifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
