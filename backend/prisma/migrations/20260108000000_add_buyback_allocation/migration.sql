-- CreateEnum
CREATE TYPE "BuybackStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "buyback_allocations" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT,
    "userId" TEXT,
    "amount" DECIMAL(36,18) NOT NULL,
    "currency" TEXT NOT NULL,
    "usdValue" DECIMAL(36,18) NOT NULL,
    "status" "BuybackStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "swapTxHash" TEXT,
    "liquidityTxHash" TEXT,
    "hbctBought" DECIMAL(36,18),
    "liquidityAdded" DECIMAL(36,18),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyback_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "buyback_allocations_status_createdAt_idx" ON "buyback_allocations"("status", "createdAt");

-- CreateIndex
CREATE INDEX "buyback_allocations_purchaseId_idx" ON "buyback_allocations"("purchaseId");

-- CreateIndex
CREATE INDEX "buyback_allocations_userId_idx" ON "buyback_allocations"("userId");

-- CreateIndex
CREATE INDEX "buyback_allocations_currency_status_idx" ON "buyback_allocations"("currency", "status");
