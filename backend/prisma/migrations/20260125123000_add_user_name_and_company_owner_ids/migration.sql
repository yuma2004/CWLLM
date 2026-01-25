-- Add user name and company owners (multi)
ALTER TABLE "users" ADD COLUMN "name" TEXT;

ALTER TABLE "companies" ADD COLUMN "ownerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "companies"
SET "ownerIds" = ARRAY["ownerId"]
WHERE "ownerId" IS NOT NULL;

ALTER TABLE "companies" DROP COLUMN "ownerId";
