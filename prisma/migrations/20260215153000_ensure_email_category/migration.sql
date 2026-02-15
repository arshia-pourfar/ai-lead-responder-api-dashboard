-- Ensure the Email.category column exists and has a safe default category.
ALTER TABLE "Email"
ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';

-- Normalize default for new rows.
ALTER TABLE "Email"
ALTER COLUMN "category" SET DEFAULT 'general';

-- Backfill unexpected empty values.
UPDATE "Email"
SET "category" = 'general'
WHERE TRIM(COALESCE("category", '')) = '';

