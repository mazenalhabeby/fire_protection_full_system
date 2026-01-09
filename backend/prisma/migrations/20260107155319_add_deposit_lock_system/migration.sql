-- AlterEnum
ALTER TYPE "OnchainDepositStatus" ADD VALUE 'LOCKED';

-- AlterTable
ALTER TABLE "affiliates" ADD COLUMN     "tierId" TEXT,
ADD COLUMN     "totalVolume" DECIMAL(36,18) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "onchain_deposits" ADD COLUMN     "lockReason" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedByAdminId" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "releasedByAdminId" TEXT,
ADD COLUMN     "walletVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "canRecover" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionReason" TEXT,
ADD COLUMN     "deletionRequestedBy" TEXT,
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalEmail" TEXT,
ADD COLUMN     "retentionExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "affiliate_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL,
    "minReferrals" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_deletion_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalEmail" TEXT NOT NULL,
    "originalUsername" TEXT,
    "originalWalletAddress" TEXT,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "adminNotes" TEXT,
    "availableBalance" DECIMAL(36,18) NOT NULL,
    "lockedBalance" DECIMAL(36,18) NOT NULL,
    "pendingWithdrawals" INTEGER NOT NULL DEFAULT 0,
    "activeLocks" INTEGER NOT NULL DEFAULT 0,
    "gracePeriodEndsAt" TIMESTAMP(3) NOT NULL,
    "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
    "recoveredAt" TIMESTAMP(3),
    "recoveredBy" TEXT,
    "permanentlyPurgedAt" TIMESTAMP(3),
    "purgeJobId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_deletion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_tiers_name_key" ON "affiliate_tiers"("name");

-- CreateIndex
CREATE INDEX "account_deletion_logs_userId_idx" ON "account_deletion_logs"("userId");

-- CreateIndex
CREATE INDEX "account_deletion_logs_originalEmail_idx" ON "account_deletion_logs"("originalEmail");

-- CreateIndex
CREATE INDEX "account_deletion_logs_gracePeriodEndsAt_idx" ON "account_deletion_logs"("gracePeriodEndsAt");

-- CreateIndex
CREATE INDEX "account_deletion_logs_retentionExpiresAt_idx" ON "account_deletion_logs"("retentionExpiresAt");

-- CreateIndex
CREATE INDEX "affiliates_tierId_idx" ON "affiliates"("tierId");

-- CreateIndex
CREATE INDEX "onchain_deposits_lockedUntil_status_idx" ON "onchain_deposits"("lockedUntil", "status");

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "affiliate_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onchain_deposits" ADD CONSTRAINT "onchain_deposits_lockedByAdminId_fkey" FOREIGN KEY ("lockedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onchain_deposits" ADD CONSTRAINT "onchain_deposits_releasedByAdminId_fkey" FOREIGN KEY ("releasedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
