ALTER TABLE "contacts" ADD COLUMN "sortKey" TEXT NOT NULL DEFAULT '';

UPDATE "contacts"
SET "sortKey" = LPAD("sortOrder"::text, 10, '0') || '-' || "id";

CREATE INDEX "contacts_companyId_sortKey_idx" ON "contacts"("companyId", "sortKey");

DROP INDEX IF EXISTS "contacts_companyId_sortOrder_idx";