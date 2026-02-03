BEGIN;

-- LLM drafts are no longer used
DROP TABLE IF EXISTS "summary_drafts";

-- Remove LLM metadata from summaries
ALTER TABLE "summaries" DROP COLUMN IF EXISTS "model";
ALTER TABLE "summaries" DROP COLUMN IF EXISTS "promptVersion";
ALTER TABLE "summaries" DROP COLUMN IF EXISTS "sourceMessageCount";
ALTER TABLE "summaries" DROP COLUMN IF EXISTS "tokenUsage";

-- Normalize summary types and remove auto
UPDATE "summaries" SET "type" = 'manual' WHERE "type" = 'auto';
CREATE TYPE "SummaryType_new" AS ENUM ('manual');
ALTER TABLE "summaries" ALTER COLUMN "type" TYPE "SummaryType_new" USING ("type"::text::"SummaryType_new");
DROP TYPE "SummaryType";
ALTER TYPE "SummaryType_new" RENAME TO "SummaryType";

-- Remove obsolete job type before enum change
DELETE FROM "jobs" WHERE "type" = 'summary_draft';

-- Recreate JobType enum without summary_draft
CREATE TYPE "JobType_new" AS ENUM ('chatwork_rooms_sync', 'chatwork_messages_sync');
ALTER TABLE "jobs" ALTER COLUMN "type" TYPE "JobType_new" USING ("type"::text::"JobType_new");
DROP TYPE "JobType";
ALTER TYPE "JobType_new" RENAME TO "JobType";

COMMIT;
