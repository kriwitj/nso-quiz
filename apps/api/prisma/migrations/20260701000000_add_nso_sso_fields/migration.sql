-- AlterTable: add NSO SSO fields to users
ALTER TABLE "users"
  ADD COLUMN "nso_sso_id"        TEXT,
  ADD COLUMN "nso_username"      TEXT,
  ADD COLUMN "nso_branch"        TEXT,
  ADD COLUMN "nso_department"    TEXT,
  ADD COLUMN "nso_province_code" TEXT,
  ADD COLUMN "nso_permissions"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex: unique constraint for nso_sso_id
CREATE UNIQUE INDEX "users_nso_sso_id_key" ON "users"("nso_sso_id");

-- CreateIndex: lookup index for nso_sso_id
CREATE INDEX "users_nso_sso_id_idx" ON "users"("nso_sso_id");
