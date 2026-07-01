-- Add NSO SSO fields to users table (idempotent — safe to retry)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nso_sso_id"        TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nso_username"      TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nso_branch"        TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nso_department"    TEXT;
-- Rename province_code → province if old column exists, else add new column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='nso_province_code') THEN
    ALTER TABLE "users" RENAME COLUMN "nso_province_code" TO "nso_province";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='nso_province') THEN
    ALTER TABLE "users" ADD COLUMN "nso_province" TEXT;
  END IF;
END $$;

-- Array column with NOT NULL default needs DO block for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'nso_permissions'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "nso_permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_nso_sso_id_key" ON "users"("nso_sso_id");
CREATE INDEX        IF NOT EXISTS "users_nso_sso_id_idx"  ON "users"("nso_sso_id");
