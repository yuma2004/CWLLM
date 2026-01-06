-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'sales', 'ops', 'readonly');
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'done', 'cancelled');
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'paused', 'closed');
CREATE TYPE "WholesaleStatus" AS ENUM ('active', 'paused', 'closed');
CREATE TYPE "TargetType" AS ENUM ('company', 'project', 'wholesale');
CREATE TYPE "SummaryType" AS ENUM ('manual', 'auto');
CREATE TYPE "JobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed', 'canceled');
CREATE TYPE "JobType" AS ENUM ('chatwork_rooms_sync', 'chatwork_messages_sync', 'summary_draft');

-- AlterTable: Drop defaults first, then alter type, then set new defaults
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'readonly';

ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "status" TYPE "ProjectStatus" USING "status"::"ProjectStatus";
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'active';

ALTER TABLE "wholesales" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "wholesales" ALTER COLUMN "status" TYPE "WholesaleStatus" USING "status"::"WholesaleStatus";
ALTER TABLE "wholesales" ALTER COLUMN "status" SET DEFAULT 'active';

ALTER TABLE "tasks" ALTER COLUMN "targetType" TYPE "TargetType" USING "targetType"::"TargetType";
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus" USING "status"::"TaskStatus";
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'todo';

ALTER TABLE "summaries" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "summaries" ALTER COLUMN "type" TYPE "SummaryType" USING "type"::"SummaryType";
ALTER TABLE "summaries" ALTER COLUMN "type" SET DEFAULT 'manual';

ALTER TABLE "audit_logs" ALTER COLUMN "changes" TYPE JSONB USING "changes"::jsonb;

ALTER TABLE "contacts" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "summaries" ADD COLUMN "model" TEXT;
ALTER TABLE "summaries" ADD COLUMN "promptVersion" TEXT;
ALTER TABLE "summaries" ADD COLUMN "sourceMessageCount" INTEGER;
ALTER TABLE "summaries" ADD COLUMN "tokenUsage" JSONB;

-- CreateTable
CREATE TABLE "summary_drafts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "sourceLinks" TEXT[] NOT NULL,
    "model" TEXT,
    "promptVersion" TEXT,
    "sourceMessageCount" INTEGER,
    "tokenUsage" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summary_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" JSONB,
    "userId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_companyId_idx" ON "projects"("companyId");
CREATE INDEX "wholesales_companyId_projectId_idx" ON "wholesales"("companyId", "projectId");
CREATE INDEX "tasks_dueDate_status_idx" ON "tasks"("dueDate", "status");
CREATE INDEX "contacts_companyId_sortOrder_idx" ON "contacts"("companyId", "sortOrder");
CREATE INDEX "summary_drafts_companyId_periodStart_periodEnd_idx" ON "summary_drafts"("companyId", "periodStart", "periodEnd");
CREATE UNIQUE INDEX "summary_drafts_companyId_periodStart_periodEnd_key" ON "summary_drafts"("companyId", "periodStart", "periodEnd");
CREATE INDEX "jobs_type_status_idx" ON "jobs"("type", "status");
CREATE INDEX "jobs_createdAt_idx" ON "jobs"("createdAt");

-- Full text index for message search
CREATE INDEX "messages_body_search_idx" ON "messages" USING GIN (to_tsvector('simple', "body"));

-- AddForeignKey
ALTER TABLE "summary_drafts" ADD CONSTRAINT "summary_drafts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
