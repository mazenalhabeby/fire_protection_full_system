-- Add admin step-up authentication fields to Session table
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "adminVerifiedAt" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "adminVerifiedIp" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "adminVerifiedUntil" TIMESTAMP(3);
