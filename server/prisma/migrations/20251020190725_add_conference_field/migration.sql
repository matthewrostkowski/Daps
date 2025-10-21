-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_athleteId_fkey";

-- AlterTable
ALTER TABLE "Athlete" ADD COLUMN     "conference" TEXT;

-- CreateIndex
CREATE INDEX "Athlete_league_team_idx" ON "Athlete"("league", "team");

-- CreateIndex
CREATE INDEX "Athlete_conference_idx" ON "Athlete"("conference");

-- CreateIndex
CREATE INDEX "Message_offerId_idx" ON "Message"("offerId");

-- CreateIndex
CREATE INDEX "Offer_userId_idx" ON "Offer"("userId");

-- CreateIndex
CREATE INDEX "Offer_athleteId_idx" ON "Offer"("athleteId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_createdAt_idx" ON "Offer"("createdAt");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
