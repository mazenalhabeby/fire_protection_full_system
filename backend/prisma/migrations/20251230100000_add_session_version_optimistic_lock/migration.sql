-- AlterTable: Add version column for optimistic locking on token refresh
-- This prevents race conditions when multiple requests try to refresh tokens simultaneously
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
