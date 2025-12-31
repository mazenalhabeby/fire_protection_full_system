-- Add session security enhancement fields

-- Add new columns to sessions table
ALTER TABLE "sessions" ADD COLUMN "previousIpAddress" TEXT;
ALTER TABLE "sessions" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "sessions" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "sessions" ADD COLUMN "isTrusted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sessions" ADD COLUMN "trustedAt" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN "trustDeviceName" TEXT;

-- Add index on lastActivityAt for inactivity cleanup
CREATE INDEX "sessions_lastActivityAt_idx" ON "sessions"("lastActivityAt");

-- Create SessionActivity table for security audit logging
CREATE TABLE "session_activities" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_activities_pkey" PRIMARY KEY ("id")
);

-- Add indexes for session_activities
CREATE INDEX "session_activities_sessionId_idx" ON "session_activities"("sessionId");
CREATE INDEX "session_activities_userId_idx" ON "session_activities"("userId");
CREATE INDEX "session_activities_createdAt_idx" ON "session_activities"("createdAt");

-- Add foreign keys for session_activities
ALTER TABLE "session_activities" ADD CONSTRAINT "session_activities_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_activities" ADD CONSTRAINT "session_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
