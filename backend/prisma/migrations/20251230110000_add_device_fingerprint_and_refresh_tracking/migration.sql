-- AlterTable: Add device fingerprint for token binding security
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "deviceFingerprint" TEXT;

-- AlterTable: Add refresh failure tracking for suspicious activity detection
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "refreshFailureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "lastRefreshFailureAt" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "lastRefreshIp" TEXT;
