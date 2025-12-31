-- Add referral tracking fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralSource" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCapturedAt" TIMESTAMP(3);

-- Create affiliate audit log table
CREATE TABLE IF NOT EXISTS "affiliate_audit_logs" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(36,18),
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "affiliate_audit_logs_affiliateId_createdAt_idx" ON "affiliate_audit_logs"("affiliateId", "createdAt");
CREATE INDEX IF NOT EXISTS "affiliate_audit_logs_action_idx" ON "affiliate_audit_logs"("action");

-- Add foreign key constraint
ALTER TABLE "affiliate_audit_logs" ADD CONSTRAINT "affiliate_audit_logs_affiliateId_fkey"
    FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comment for documentation
COMMENT ON TABLE "affiliate_audit_logs" IS 'Audit log for affiliate actions including registrations, commissions, claims, and withdrawals';
COMMENT ON COLUMN "users"."referralSource" IS 'Source of referral: direct_link, social_share, qr_code, email_campaign, partner';
COMMENT ON COLUMN "users"."referralCapturedAt" IS 'Timestamp when the referral code was first captured by the user';
