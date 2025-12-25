-- AlterTable
ALTER TABLE "chatwork_rooms" ADD COLUMN     "lastErrorAt" TIMESTAMP(3),
ADD COLUMN     "lastErrorMessage" TEXT,
ADD COLUMN     "lastErrorStatus" INTEGER;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "labels" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "messages_companyId_sentAt_idx" ON "messages"("companyId", "sentAt");
