-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM (
  'pre_contact',
  'contacting',
  'negotiating',
  'agreed',
  'preparing_publish',
  'publishing',
  'stopped',
  'dropped'
);

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM (
  'negotiation',
  'request',
  'report',
  'confirmation',
  'other'
);

-- AlterTable
ALTER TABLE "wholesales"
ADD COLUMN "dealStatus" "DealStatus" NOT NULL DEFAULT 'pre_contact',
ADD COLUMN "proposedUnitPrice" DOUBLE PRECISION,
ADD COLUMN "agreedUnitPrice" DOUBLE PRECISION,
ADD COLUMN "nextActionAt" TIMESTAMP(3),
ADD COLUMN "specialConditions" TEXT;

-- CreateTable
CREATE TABLE "deal_negotiations" (
    "id" TEXT NOT NULL,
    "wholesaleId" TEXT NOT NULL,
    "actorId" TEXT,
    "offeredUnitPrice" DOUBLE PRECISION,
    "agreedUnitPrice" DOUBLE PRECISION,
    "note" TEXT,
    "actionAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "type" "NoteType" NOT NULL DEFAULT 'other',
    "content" TEXT NOT NULL,
    "companyId" TEXT,
    "projectId" TEXT,
    "wholesaleId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_negotiations_wholesaleId_actionAt_idx"
ON "deal_negotiations"("wholesaleId", "actionAt");

-- CreateIndex
CREATE INDEX "deal_negotiations_actorId_idx" ON "deal_negotiations"("actorId");

-- CreateIndex
CREATE INDEX "notes_companyId_createdAt_idx" ON "notes"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "notes_projectId_createdAt_idx" ON "notes"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "notes_wholesaleId_createdAt_idx" ON "notes"("wholesaleId", "createdAt");

-- CreateIndex
CREATE INDEX "notes_authorId_createdAt_idx" ON "notes"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "deal_negotiations"
ADD CONSTRAINT "deal_negotiations_wholesaleId_fkey"
FOREIGN KEY ("wholesaleId") REFERENCES "wholesales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_negotiations"
ADD CONSTRAINT "deal_negotiations_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes"
ADD CONSTRAINT "notes_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes"
ADD CONSTRAINT "notes_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes"
ADD CONSTRAINT "notes_wholesaleId_fkey"
FOREIGN KEY ("wholesaleId") REFERENCES "wholesales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes"
ADD CONSTRAINT "notes_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
