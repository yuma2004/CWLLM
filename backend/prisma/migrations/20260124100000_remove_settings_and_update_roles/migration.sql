-- Drop obsolete settings table
DROP TABLE IF EXISTS "app_settings";

-- Update UserRole enum to admin/employee and map existing values
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('admin', 'employee');

ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole"
USING (
  CASE
    WHEN "role"::text = 'admin' THEN 'admin'
    ELSE 'employee'
  END
)::"UserRole";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee';

DROP TYPE "UserRole_old";