-- Create activity_logs table (idempotent)
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id"               TEXT NOT NULL,
  "action"           TEXT NOT NULL,
  "targetUserId"     TEXT,
  "targetUserName"   TEXT,
  "targetUserEmail"  TEXT,
  "adminId"          TEXT,
  "adminName"        TEXT,
  "details"          JSONB,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");
