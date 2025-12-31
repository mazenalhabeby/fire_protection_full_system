-- Add unique constraint to txHash in token_purchases table
-- This prevents replay attacks where same transaction is used multiple times

-- First, remove any duplicate txHash values (keep the first one)
DELETE FROM "token_purchases" a USING "token_purchases" b
WHERE a.id > b.id AND a."txHash" = b."txHash" AND a."txHash" IS NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "token_purchases_txHash_key" ON "token_purchases"("txHash");
