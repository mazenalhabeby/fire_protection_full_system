-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'AWAITING_REPLY', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL', 'TECHNICAL', 'BILLING', 'ACCOUNT', 'TOKEN_PURCHASE', 'LOCKING', 'MARKETPLACE', 'AFFILIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIALS', 'WALLET', 'GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('HBCT', 'BNB', 'USDT', 'USDC');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INTERNAL_TRANSFER_SEND', 'INTERNAL_TRANSFER_RECEIVE', 'TOKEN_PURCHASE', 'TOKEN_SALE', 'LOCK', 'UNLOCK', 'REWARD', 'AIRDROP', 'AFFILIATE_COMMISSION', 'FEE', 'REFUND');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING_CONFIRMATION', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferMethod" AS ENUM ('USERNAME', 'EMAIL', 'WALLET_ADDRESS', 'USER_ID', 'QR_CODE');

-- CreateEnum
CREATE TYPE "TokenDeliveryMethod" AS ENUM ('OFF_CHAIN', 'ON_CHAIN');

-- CreateEnum
CREATE TYPE "TokenPurchaseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRANSACTION', 'SECURITY', 'LOCKING', 'SYSTEM', 'MARKETING');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "OnchainDepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CREDITED', 'FAILED', 'UNMAPPED');

-- CreateEnum
CREATE TYPE "WithdrawalRequestStatus" AS ENUM ('PENDING_CONFIRMATION', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS',
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "walletNonce" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "user_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "verificationSig" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "linkedIp" TEXT,
    "linkedDevice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenFamily" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceType" TEXT,
    "deviceName" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "ipAddress" TEXT,
    "country" TEXT,
    "city" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "secretIv" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "recoveryCodesHash" TEXT,
    "recoveryCodesCount" INTEGER NOT NULL DEFAULT 0,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "two_factor_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "notHelpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "subject" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderType" "SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isReplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "availableBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "lockedBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "fee" DECIMAL(36,18),
    "netAmount" DECIMAL(36,18) NOT NULL,
    "balanceBefore" DECIMAL(36,18) NOT NULL,
    "balanceAfter" DECIMAL(36,18) NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "relatedTransferId" TEXT,
    "externalTxHash" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_transfers" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "fee" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "transferMethod" "TransferMethod" NOT NULL,
    "recipientIdentifier" TEXT NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "confirmationCode" TEXT,
    "confirmationExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "note" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "internal_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_limits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "singleTransferMax" DECIMAL(36,18) NOT NULL DEFAULT 10000,
    "dailyLimit" DECIMAL(36,18) NOT NULL DEFAULT 50000,
    "dailyUsed" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "dailyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weeklyLimit" DECIMAL(36,18) NOT NULL DEFAULT 250000,
    "weeklyUsed" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "weeklyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_qr_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" "Currency",
    "amount" DECIMAL(36,18),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "address" TEXT NOT NULL,
    "totalDeposited" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "lastDepositAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "fee" DECIMAL(36,18) NOT NULL,
    "netAmount" DECIMAL(36,18) NOT NULL,
    "toAddress" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "confirmationCode" TEXT,
    "confirmationExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_whitelist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onchain_deposits" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockTimestamp" TIMESTAMP(3),
    "chainId" INTEGER NOT NULL DEFAULT 56,
    "status" "OnchainDepositStatus" NOT NULL DEFAULT 'PENDING',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "creditedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onchain_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_blockchain_events" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 56,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_blockchain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'HBCT',
    "amount" DECIMAL(36,18) NOT NULL,
    "feeAmount" DECIMAL(36,18) NOT NULL,
    "netAmount" DECIMAL(36,18) NOT NULL,
    "toAddress" TEXT NOT NULL,
    "status" "WithdrawalRequestStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "confirmationCode" TEXT,
    "confirmationExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "txHash" TEXT,
    "gasUsed" BIGINT,
    "gasPrice" BIGINT,
    "blockNumber" BIGINT,
    "processingStartedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_processing_logs" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "txHash" TEXT,
    "details" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentCurrency" "Currency" NOT NULL,
    "paymentAmount" DECIMAL(36,18) NOT NULL,
    "hbctAmount" DECIMAL(36,18) NOT NULL,
    "tokenPrice" DECIMAL(18,8) NOT NULL,
    "deliveryMethod" "TokenDeliveryMethod" NOT NULL,
    "destinationWalletId" TEXT,
    "destinationAddress" TEXT,
    "platformFee" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "networkFee" DECIMAL(36,18),
    "status" "TokenPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "txHash" TEXT,
    "paymentTransactionId" TEXT,
    "creditTransactionId" TEXT,
    "affiliateId" TEXT,
    "commissionAmount" DECIMAL(36,18),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "token_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_limits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minPurchaseUsd" DECIMAL(18,2) NOT NULL DEFAULT 10,
    "maxPurchaseUsd" DECIMAL(18,2) NOT NULL DEFAULT 10000,
    "dailyLimitUsd" DECIMAL(18,2) NOT NULL DEFAULT 50000,
    "dailyUsedUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dailyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthlyLimitUsd" DECIMAL(18,2) NOT NULL DEFAULT 500000,
    "monthlyUsedUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "monthlyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionChannel" "NotificationChannel" NOT NULL DEFAULT 'BOTH',
    "securityChannel" "NotificationChannel" NOT NULL DEFAULT 'BOTH',
    "lockingChannel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "systemChannel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "marketingChannel" "NotificationChannel" NOT NULL DEFAULT 'NONE',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailDigest" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_wallets_userId_isPrimary_idx" ON "user_wallets"("userId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_walletAddress_key" ON "user_wallets"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_userId_walletAddress_key" ON "user_wallets"("userId", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_isValid_idx" ON "sessions"("userId", "isValid");

-- CreateIndex
CREATE INDEX "sessions_refreshToken_idx" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_tokenFamily_idx" ON "sessions"("tokenFamily");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expiresAt_idx" ON "email_verification_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "oauth_accounts_userId_idx" ON "oauth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_providerAccountId_key" ON "oauth_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "login_history_userId_createdAt_idx" ON "login_history"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "login_history_ipAddress_createdAt_idx" ON "login_history"("ipAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_auth_userId_key" ON "two_factor_auth"("userId");

-- CreateIndex
CREATE INDEX "two_factor_audit_logs_userId_createdAt_idx" ON "two_factor_audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "two_factor_audit_logs_event_createdAt_idx" ON "two_factor_audit_logs"("event", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "faq_categories_slug_key" ON "faq_categories"("slug");

-- CreateIndex
CREATE INDEX "faq_items_categoryId_isActive_idx" ON "faq_items"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_userId_status_idx" ON "support_tickets"("userId", "status");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_idx" ON "support_tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "support_tickets_ticketNumber_idx" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "ticket_messages_ticketId_createdAt_idx" ON "ticket_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_submissions_isRead_createdAt_idx" ON "contact_submissions"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_balances_userId_idx" ON "wallet_balances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_balances_userId_currency_key" ON "wallet_balances"("userId", "currency");

-- CreateIndex
CREATE INDEX "wallet_transactions_userId_createdAt_idx" ON "wallet_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_transactions_userId_currency_idx" ON "wallet_transactions"("userId", "currency");

-- CreateIndex
CREATE INDEX "wallet_transactions_type_status_idx" ON "wallet_transactions"("type", "status");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_createdAt_idx" ON "wallet_transactions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "internal_transfers_senderId_createdAt_idx" ON "internal_transfers"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_transfers_receiverId_createdAt_idx" ON "internal_transfers"("receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_transfers_status_idx" ON "internal_transfers"("status");

-- CreateIndex
CREATE INDEX "internal_transfers_confirmationCode_idx" ON "internal_transfers"("confirmationCode");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_limits_userId_key" ON "transfer_limits"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_qr_codes_code_key" ON "transfer_qr_codes"("code");

-- CreateIndex
CREATE INDEX "transfer_qr_codes_userId_idx" ON "transfer_qr_codes"("userId");

-- CreateIndex
CREATE INDEX "transfer_qr_codes_code_idx" ON "transfer_qr_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_addresses_address_key" ON "deposit_addresses"("address");

-- CreateIndex
CREATE INDEX "deposit_addresses_address_idx" ON "deposit_addresses"("address");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_addresses_userId_currency_key" ON "deposit_addresses"("userId", "currency");

-- CreateIndex
CREATE INDEX "withdrawal_requests_userId_status_idx" ON "withdrawal_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_createdAt_idx" ON "withdrawal_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "withdrawal_whitelist_userId_idx" ON "withdrawal_whitelist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_whitelist_userId_address_key" ON "withdrawal_whitelist"("userId", "address");

-- CreateIndex
CREATE INDEX "wallet_audit_logs_userId_createdAt_idx" ON "wallet_audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_audit_logs_entityType_entityId_idx" ON "wallet_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "wallet_audit_logs_action_createdAt_idx" ON "wallet_audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "onchain_deposits_userId_status_idx" ON "onchain_deposits"("userId", "status");

-- CreateIndex
CREATE INDEX "onchain_deposits_fromAddress_idx" ON "onchain_deposits"("fromAddress");

-- CreateIndex
CREATE INDEX "onchain_deposits_status_createdAt_idx" ON "onchain_deposits"("status", "createdAt");

-- CreateIndex
CREATE INDEX "onchain_deposits_blockNumber_idx" ON "onchain_deposits"("blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "onchain_deposits_txHash_logIndex_key" ON "onchain_deposits"("txHash", "logIndex");

-- CreateIndex
CREATE INDEX "processed_blockchain_events_eventType_createdAt_idx" ON "processed_blockchain_events"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "processed_blockchain_events_txHash_logIndex_eventType_chain_key" ON "processed_blockchain_events"("txHash", "logIndex", "eventType", "chainId");

-- CreateIndex
CREATE INDEX "withdrawals_userId_status_idx" ON "withdrawals"("userId", "status");

-- CreateIndex
CREATE INDEX "withdrawals_status_createdAt_idx" ON "withdrawals"("status", "createdAt");

-- CreateIndex
CREATE INDEX "withdrawals_toAddress_idx" ON "withdrawals"("toAddress");

-- CreateIndex
CREATE INDEX "withdrawals_txHash_idx" ON "withdrawals"("txHash");

-- CreateIndex
CREATE INDEX "withdrawal_processing_logs_withdrawalId_createdAt_idx" ON "withdrawal_processing_logs"("withdrawalId", "createdAt");

-- CreateIndex
CREATE INDEX "token_purchases_userId_createdAt_idx" ON "token_purchases"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "token_purchases_status_idx" ON "token_purchases"("status");

-- CreateIndex
CREATE INDEX "token_purchases_deliveryMethod_status_idx" ON "token_purchases"("deliveryMethod", "status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_limits_userId_key" ON "purchase_limits"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_type_createdAt_idx" ON "notifications"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_auth" ADD CONSTRAINT "two_factor_auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "faq_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_balances" ADD CONSTRAINT "wallet_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_relatedTransferId_fkey" FOREIGN KEY ("relatedTransferId") REFERENCES "internal_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_transfers" ADD CONSTRAINT "internal_transfers_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_limits" ADD CONSTRAINT "transfer_limits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_qr_codes" ADD CONSTRAINT "transfer_qr_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_addresses" ADD CONSTRAINT "deposit_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_whitelist" ADD CONSTRAINT "withdrawal_whitelist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onchain_deposits" ADD CONSTRAINT "onchain_deposits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_limits" ADD CONSTRAINT "purchase_limits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
