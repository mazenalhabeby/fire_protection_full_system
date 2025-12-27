-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY_WEBSITE', 'BUY_DEX', 'SELL_DEX', 'TRANSFER', 'LOCK', 'UNLOCK', 'REWARD_DISTRIBUTION', 'AIRDROP', 'AFFILIATE_BONUS', 'MARKETPLACE_PURCHASE', 'MARKETPLACE_REFUND', 'LIQUIDITY_ADD', 'FEE_CASHBACK', 'BUY', 'SELL', 'STAKE', 'UNSTAKE', 'REWARD', 'REFERRAL_BONUS');

-- CreateEnum
CREATE TYPE "StakeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LockStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AirdropStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "walletAddress" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referredById" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "lockedBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "totalBalance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "priceUsd" DECIMAL(18,8),
    "totalUsd" DECIMAL(18,8),
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "metadata" JSONB,
    "relatedLockId" TEXT,
    "relatedAirdropId" TEXT,
    "relatedOrderId" TEXT,
    "relatedSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "totalEarnings" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "saleId" TEXT,
    "amount" DECIMAL(36,18) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lock_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lockMonths" INTEGER NOT NULL,
    "bonusPercent" DECIMAL(5,2) NOT NULL,
    "feeDiscountPercent" DECIMAL(5,2) NOT NULL,
    "minAmount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lock_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_locks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lockTierId" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "status" "LockStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rewardAmount" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "claimedReward" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "lockTxHash" TEXT,
    "unlockTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_pools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allocation" DECIMAL(36,18) NOT NULL,
    "reserved" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "distributed" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lockId" TEXT,
    "stakeId" TEXT,
    "poolName" TEXT,
    "amount" DECIMAL(36,18) NOT NULL,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "claimTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_sales" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "affiliateId" TEXT,
    "amountHbct" DECIMAL(36,18) NOT NULL,
    "priceUsd" DECIMAL(18,8) NOT NULL,
    "totalUsd" DECIMAL(18,8) NOT NULL,
    "paymentToken" TEXT NOT NULL,
    "paymentAmount" DECIMAL(36,18) NOT NULL,
    "treasuryAmount" DECIMAL(36,18) NOT NULL,
    "liquidityAmount" DECIMAL(36,18) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "saleTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "token_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidity_events" (
    "id" TEXT NOT NULL,
    "sourceSaleId" TEXT,
    "amountUsd" DECIMAL(18,8) NOT NULL,
    "amountHbct" DECIMAL(36,18) NOT NULL,
    "amountBnb" DECIMAL(36,18) NOT NULL,
    "lpTokenAmount" DECIMAL(36,18),
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airdrop_campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "AirdropStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAllocation" DECIMAL(36,18) NOT NULL,
    "reserved" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "distributed" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "perUserAmount" DECIMAL(36,18),
    "maxParticipants" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "tasks" JSONB,
    "eligibility" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airdrop_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airdrop_entries" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(36,18) NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "isDistributed" BOOLEAN NOT NULL DEFAULT false,
    "distributionTxHash" TEXT,
    "tasksCompleted" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airdrop_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceHbct" DECIMAL(36,18) NOT NULL,
    "priceFiat" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_inventories" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "lowStock" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalHbct" DECIMAL(36,18) NOT NULL,
    "totalFiat" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" TEXT NOT NULL,
    "paymentTxHash" TEXT,
    "shippingName" TEXT,
    "shippingEmail" TEXT,
    "shippingPhone" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingZip" TEXT,
    "shippingCountry" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceHbct" DECIMAL(36,18) NOT NULL,
    "unitPriceFiat" DECIMAL(18,2),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stakes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "lockPeriod" INTEGER NOT NULL,
    "apy" DECIMAL(5,2) NOT NULL,
    "status" "StakeStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalRewards" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "claimedRewards" DECIMAL(36,18) NOT NULL DEFAULT 0,

    CONSTRAINT "stakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_config" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT 'HBCT',
    "name" TEXT NOT NULL DEFAULT 'HBC Fire Protection Token',
    "totalSupply" DECIMAL(36,0) NOT NULL,
    "currentPrice" DECIMAL(18,8) NOT NULL,
    "isPresale" BOOLEAN NOT NULL DEFAULT false,
    "presalePrice" DECIMAL(18,8),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "token_balances_userId_key" ON "token_balances"("userId");

-- CreateIndex
CREATE INDEX "transactions_userId_createdAt_idx" ON "transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_userId_key" ON "affiliates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_referralCode_key" ON "affiliates"("referralCode");

-- CreateIndex
CREATE INDEX "commissions_affiliateId_createdAt_idx" ON "commissions"("affiliateId", "createdAt");

-- CreateIndex
CREATE INDEX "commissions_isPaid_idx" ON "commissions"("isPaid");

-- CreateIndex
CREATE INDEX "token_locks_userId_status_idx" ON "token_locks"("userId", "status");

-- CreateIndex
CREATE INDEX "token_locks_endDate_idx" ON "token_locks"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "reward_pools_name_key" ON "reward_pools"("name");

-- CreateIndex
CREATE INDEX "rewards_userId_isClaimed_idx" ON "rewards"("userId", "isClaimed");

-- CreateIndex
CREATE INDEX "token_sales_userId_createdAt_idx" ON "token_sales"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "token_sales_status_idx" ON "token_sales"("status");

-- CreateIndex
CREATE INDEX "airdrop_campaigns_status_idx" ON "airdrop_campaigns"("status");

-- CreateIndex
CREATE INDEX "airdrop_entries_campaignId_isEligible_idx" ON "airdrop_entries"("campaignId", "isEligible");

-- CreateIndex
CREATE UNIQUE INDEX "airdrop_entries_campaignId_walletAddress_key" ON "airdrop_entries"("campaignId", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_isActive_idx" ON "products"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_inventories_productId_key" ON "product_inventories"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_orderNumber_key" ON "marketplace_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "marketplace_orders_userId_status_idx" ON "marketplace_orders"("userId", "status");

-- CreateIndex
CREATE INDEX "marketplace_orders_orderNumber_idx" ON "marketplace_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "stakes_userId_status_idx" ON "stakes"("userId", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_balances" ADD CONSTRAINT "token_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_relatedLockId_fkey" FOREIGN KEY ("relatedLockId") REFERENCES "token_locks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_relatedAirdropId_fkey" FOREIGN KEY ("relatedAirdropId") REFERENCES "airdrop_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_relatedOrderId_fkey" FOREIGN KEY ("relatedOrderId") REFERENCES "marketplace_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_relatedSaleId_fkey" FOREIGN KEY ("relatedSaleId") REFERENCES "token_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "token_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_locks" ADD CONSTRAINT "token_locks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_locks" ADD CONSTRAINT "token_locks_lockTierId_fkey" FOREIGN KEY ("lockTierId") REFERENCES "lock_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "token_locks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_stakeId_fkey" FOREIGN KEY ("stakeId") REFERENCES "stakes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_sales" ADD CONSTRAINT "token_sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_sales" ADD CONSTRAINT "token_sales_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidity_events" ADD CONSTRAINT "liquidity_events_sourceSaleId_fkey" FOREIGN KEY ("sourceSaleId") REFERENCES "token_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airdrop_entries" ADD CONSTRAINT "airdrop_entries_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "airdrop_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airdrop_entries" ADD CONSTRAINT "airdrop_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventories" ADD CONSTRAINT "product_inventories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketplace_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stakes" ADD CONSTRAINT "stakes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
