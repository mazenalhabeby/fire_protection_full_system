import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BalanceService } from '../../wallet/services/balance.service';
import { BlockchainClientService } from '../../blockchain/blockchain.client';
import { PriceService } from './price.service';
import { PurchaseLimitsService } from './purchase-limits.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  Currency,
  TokenDeliveryMethod,
  TokenPurchaseStatus,
  WalletTransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  GetPurchaseQuoteParams,
  PurchaseQuote,
  PurchaseOffChainParams,
  PurchaseOnChainParams,
  PurchaseResult,
  TokenPurchaseRecord,
  PaginatedPurchases,
} from '../interfaces/purchase.interfaces';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  // Quote validity duration (60 seconds)
  private readonly QUOTE_VALIDITY_MS = 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
    private readonly blockchainClient: BlockchainClientService,
    private readonly priceService: PriceService,
    private readonly purchaseLimitsService: PurchaseLimitsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get a quote for purchasing HBCT tokens
   */
  async getQuote(params: GetPurchaseQuoteParams): Promise<PurchaseQuote> {
    const { paymentCurrency, paymentAmount, hbctAmount, deliveryMethod } = params;

    // Must provide either paymentAmount or hbctAmount
    if (!paymentAmount && !hbctAmount) {
      throw new BadRequestException(
        'Either paymentAmount or hbctAmount must be provided',
      );
    }

    let finalPaymentAmount: Decimal;
    let finalHbctAmount: Decimal;
    let priceUsed: Decimal;
    let usdValue: Decimal;

    if (paymentAmount) {
      // Calculate HBCT from payment amount
      const result = await this.priceService.calculateHbctAmount(
        paymentCurrency,
        new Decimal(paymentAmount),
      );
      finalPaymentAmount = new Decimal(paymentAmount);
      finalHbctAmount = result.hbctAmount;
      priceUsed = result.priceUsed;
      usdValue = result.usdValue;
    } else {
      // Calculate payment from HBCT amount
      const result = await this.priceService.calculatePaymentAmount(
        new Decimal(hbctAmount!),
        paymentCurrency,
      );
      finalPaymentAmount = result.paymentAmount;
      finalHbctAmount = new Decimal(hbctAmount!);
      priceUsed = result.priceUsed;
      usdValue = result.usdValue;
    }

    // Calculate fees
    const platformFeePercent = this.priceService.getPlatformFeePercent();
    const platformFee = finalPaymentAmount.mul(platformFeePercent).div(100);

    // Network fee is charged for all purchases (both OFF_CHAIN and ON_CHAIN)
    // Users pay gas fees regardless of delivery method
    let networkFee = await this.priceService.getNetworkFeeUsd();
    // Convert network fee to payment currency
    const currencyPrice = await this.priceService.getCurrencyPriceUsd(paymentCurrency);
    networkFee = networkFee.div(currencyPrice);

    const totalCost = finalPaymentAmount.add(platformFee).add(networkFee);

    return {
      paymentCurrency,
      paymentAmount: finalPaymentAmount.toFixed(8),
      hbctAmount: finalHbctAmount.toFixed(8),
      tokenPrice: priceUsed.toFixed(8),
      platformFee: platformFee.toFixed(8),
      networkFee: networkFee.toFixed(8),
      totalCost: totalCost.toFixed(8),
      quoteExpiresAt: new Date(Date.now() + this.QUOTE_VALIDITY_MS),
    };
  }

  /**
   * Purchase HBCT tokens and store in platform wallet (OFF_CHAIN)
   */
  async purchaseOffChain(params: PurchaseOffChainParams): Promise<PurchaseResult> {
    const { userId, paymentCurrency, paymentAmount, referralCode, ipAddress, txHash } = params;

    this.logger.log(
      `Starting off-chain purchase for user ${userId}: ${paymentAmount} ${paymentCurrency}`,
    );

    // Require txHash for on-chain payment verification
    if (!txHash) {
      throw new BadRequestException('Transaction hash is required for purchase');
    }

    // Security: Check if this transaction hash has already been used (prevent replay attack)
    const existingPurchase = await this.prisma.tokenPurchase.findFirst({
      where: { txHash },
    });

    if (existingPurchase) {
      this.logger.warn(`Replay attack attempt: txHash ${txHash} already used by purchase ${existingPurchase.id}`);
      throw new BadRequestException('This transaction has already been used for a purchase');
    }

    // Calculate amounts
    const { hbctAmount, priceUsed, usdValue } = await this.priceService.calculateHbctAmount(
      paymentCurrency,
      paymentAmount,
    );

    this.logger.log(
      `Purchase calculation: ${paymentAmount} ${paymentCurrency} = $${usdValue.toFixed(2)} USD (HBCT price: $${priceUsed.toFixed(6)})`,
    );

    // Calculate fees (platform fee + network fee)
    const platformFeePercent = this.priceService.getPlatformFeePercent();
    const platformFee = paymentAmount.mul(platformFeePercent).div(100);

    // Network fee is charged for all purchases
    const networkFeeUsd = await this.priceService.getNetworkFeeUsd();
    const currencyPrice = await this.priceService.getCurrencyPriceUsd(paymentCurrency);
    const networkFee = networkFeeUsd.div(currencyPrice);

    const totalPayment = paymentAmount.add(platformFee).add(networkFee);

    // Validate against limits
    await this.purchaseLimitsService.validatePurchase(userId, usdValue);

    // Verify blockchain transaction
    const depositWallet = process.env.DEPOSIT_WALLET_ADDRESS;
    if (!depositWallet) {
      throw new BadRequestException('Deposit wallet not configured');
    }

    this.logger.log(`Verifying transaction ${txHash} for ${paymentAmount} ${paymentCurrency}`);

    const verification = await this.blockchainClient.verifyPaymentTransaction(
      txHash,
      depositWallet,
      paymentAmount.toString(),
      paymentCurrency as 'BNB' | 'USDT' | 'USDC',
    );

    if (!verification.valid) {
      this.logger.error(`Transaction verification failed: ${verification.error}`);
      throw new BadRequestException(verification.error || 'Payment verification failed');
    }

    this.logger.log(
      `Transaction verified: ${verification.amount} ${paymentCurrency} from ${verification.from} (${verification.confirmations} confirmations)`,
    );

    // Note: We allow purchases from any connected wallet, not just linked wallets
    // The payment source doesn't need to be linked - only the destination matters for on-chain delivery
    // This improves UX as users can pay from any wallet they control
    const senderAddress = verification.from?.toLowerCase();
    this.logger.log(
      `Processing purchase for user ${userId} with payment from wallet ${senderAddress}`,
    );

    // Execute purchase in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create purchase record with verified txHash
      const purchase = await tx.tokenPurchase.create({
        data: {
          userId,
          paymentCurrency,
          paymentAmount,
          hbctAmount,
          tokenPrice: priceUsed,
          deliveryMethod: TokenDeliveryMethod.OFF_CHAIN,
          platformFee,
          networkFee,
          status: TokenPurchaseStatus.PROCESSING,
          ipAddress,
          txHash, // Store the verified blockchain transaction hash
        },
      });

      // Payment was verified on-chain, no internal wallet debit needed
      const paymentResult = { success: true, transactionId: txHash };

      // 3. Credit HBCT to wallet
      const creditResult = await this.balanceService.creditBalance({
        userId,
        currency: Currency.HBCT,
        amount: hbctAmount,
        type: WalletTransactionType.TOKEN_PURCHASE,
        description: `Purchased ${hbctAmount.toFixed(4)} HBCT with ${paymentAmount.toFixed(4)} ${paymentCurrency}`,
        metadata: {
          purchaseId: purchase.id,
          paymentCurrency,
          paymentAmount: paymentAmount.toString(),
          deliveryMethod: 'OFF_CHAIN',
          txHash,
        },
        ipAddress,
      });

      if (!creditResult.success) {
        throw new BadRequestException(creditResult.error || 'Credit failed');
      }

      // 4. Update purchase with transaction IDs
      const completedPurchase = await tx.tokenPurchase.update({
        where: { id: purchase.id },
        data: {
          paymentTransactionId: paymentResult.transactionId,
          creditTransactionId: creditResult.transactionId,
          status: TokenPurchaseStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // 5. Record limit usage
      await this.purchaseLimitsService.recordPurchaseUsage(userId, usdValue);

      // 6. Handle affiliate commission (automatically uses user's referredById if no referralCode)
      await this.handleAffiliateCommission(
        tx,
        userId,
        hbctAmount,
        completedPurchase.id,
        ipAddress,
        referralCode,
      );

      return completedPurchase;
    });

    this.logger.log(
      `Completed off-chain purchase ${result.id} for user ${userId}: ${hbctAmount.toFixed(4)} HBCT`,
    );

    return {
      success: true,
      purchaseId: result.id,
      hbctAmount: hbctAmount.toFixed(8),
      paymentAmount: totalPayment.toFixed(8),
      paymentCurrency,
      deliveryMethod: TokenDeliveryMethod.OFF_CHAIN,
      message: 'Purchase completed successfully. HBCT has been added to your wallet.',
    };
  }

  /**
   * Purchase HBCT tokens and send to external wallet (ON_CHAIN)
   */
  async purchaseOnChain(params: PurchaseOnChainParams): Promise<PurchaseResult> {
    const {
      userId,
      paymentCurrency,
      paymentAmount,
      destinationWalletId,
      referralCode,
      ipAddress,
    } = params;

    this.logger.log(
      `Starting on-chain purchase for user ${userId}: ${paymentAmount} ${paymentCurrency}`,
    );

    // Verify linked wallet exists and is verified
    const linkedWallet = await this.prisma.userWallet.findFirst({
      where: {
        id: destinationWalletId,
        userId,
      },
    });

    if (!linkedWallet) {
      throw new ForbiddenException(
        'Invalid wallet. You can only send to wallets linked to your account.',
      );
    }

    if (!linkedWallet.verifiedAt) {
      throw new ForbiddenException(
        'Wallet not verified. Please verify wallet ownership first.',
      );
    }

    // Calculate amounts
    const { hbctAmount, priceUsed, usdValue } = await this.priceService.calculateHbctAmount(
      paymentCurrency,
      paymentAmount,
    );

    // Calculate fees
    const platformFeePercent = this.priceService.getPlatformFeePercent();
    const platformFee = paymentAmount.mul(platformFeePercent).div(100);
    const networkFeeUsd = await this.priceService.getNetworkFeeUsd();
    const currencyPrice = await this.priceService.getCurrencyPriceUsd(paymentCurrency);
    const networkFee = networkFeeUsd.div(currencyPrice);
    const totalPayment = paymentAmount.add(platformFee).add(networkFee);

    // Validate against limits
    await this.purchaseLimitsService.validatePurchase(userId, usdValue);

    // Check sufficient balance (disabled for testing - using on-chain wallet)
    // const hasBalance = await this.balanceService.hasSufficientBalance(
    //   userId,
    //   paymentCurrency,
    //   totalPayment,
    // );

    // if (!hasBalance) {
    //   throw new BadRequestException(
    //     `Insufficient ${paymentCurrency} balance. Required: ${totalPayment.toFixed(8)} (includes network fee)`,
    //   );
    // }

    // Execute purchase
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create purchase record
      const purchase = await tx.tokenPurchase.create({
        data: {
          userId,
          paymentCurrency,
          paymentAmount,
          hbctAmount,
          tokenPrice: priceUsed,
          deliveryMethod: TokenDeliveryMethod.ON_CHAIN,
          destinationWalletId,
          destinationAddress: linkedWallet.walletAddress,
          platformFee,
          networkFee,
          status: TokenPurchaseStatus.PROCESSING,
          ipAddress,
        },
      });

      // 2. Lock payment amount (disabled for testing - using on-chain wallet)
      // await this.balanceService.lockBalance(
      //   userId,
      //   paymentCurrency,
      //   totalPayment,
      // );

      return purchase;
    });

    // 3. Execute blockchain transfer (outside transaction for reliability)
    try {
      // TODO: Integrate with BlockchainClientService
      // For now, simulate successful transfer
      const txHash = await this.executeOnChainTransfer(
        linkedWallet.walletAddress,
        hbctAmount,
      );

      // 4. Complete the purchase
      await this.prisma.$transaction(async (tx) => {
        // Debit from locked balance (disabled for testing - using on-chain wallet)
        // await this.balanceService.debitFromLocked(
        //   userId,
        //   paymentCurrency,
        //   totalPayment,
        // );

        // Update purchase status
        await tx.tokenPurchase.update({
          where: { id: result.id },
          data: {
            status: TokenPurchaseStatus.COMPLETED,
            txHash,
            completedAt: new Date(),
          },
        });

        // Record limit usage
        await this.purchaseLimitsService.recordPurchaseUsage(userId, usdValue);

        // Handle affiliate commission (automatically uses user's referredById if no referralCode)
        await this.handleAffiliateCommission(
          tx,
          userId,
          hbctAmount,
          result.id,
          ipAddress,
          referralCode,
        );
      });

      this.logger.log(
        `Completed on-chain purchase ${result.id} for user ${userId}: ${hbctAmount.toFixed(4)} HBCT to ${linkedWallet.walletAddress}`,
      );

      return {
        success: true,
        purchaseId: result.id,
        hbctAmount: hbctAmount.toFixed(8),
        paymentAmount: totalPayment.toFixed(8),
        paymentCurrency,
        deliveryMethod: TokenDeliveryMethod.ON_CHAIN,
        txHash,
        message: `Purchase completed. ${hbctAmount.toFixed(4)} HBCT sent to ${linkedWallet.walletAddress}`,
      };
    } catch (error) {
      // Unlock balance on failure
      await this.balanceService.unlockBalance(
        userId,
        paymentCurrency,
        totalPayment,
      );

      // Update purchase status to failed
      await this.prisma.tokenPurchase.update({
        where: { id: result.id },
        data: {
          status: TokenPurchaseStatus.FAILED,
          failureReason: error.message,
        },
      });

      this.logger.error(
        `On-chain purchase failed for user ${userId}: ${error.message}`,
        error.stack,
      );

      throw new BadRequestException(
        `On-chain transfer failed: ${error.message}`,
      );
    }
  }

  /**
   * Execute on-chain HBCT transfer from treasury wallet
   */
  private async executeOnChainTransfer(
    toAddress: string,
    amount: Decimal,
  ): Promise<string> {
    this.logger.log(
      `Executing on-chain transfer: ${amount.toFixed(4)} HBCT to ${toAddress}`,
    );

    // Send HBCT from treasury wallet to user's external wallet
    const result = await this.blockchainClient.sendHbctTransfer(
      toAddress,
      amount.toString(),
    );

    if (!result.success) {
      throw new Error(result.error || 'Blockchain transfer failed');
    }

    this.logger.log(`On-chain transfer successful: ${result.txHash}`);
    return result.txHash!;
  }

  /**
   * Handle affiliate commission for purchase
   * Automatically uses the user's referredById if no referralCode is provided
   */
  private async handleAffiliateCommission(
    tx: any,
    userId: string,
    hbctAmount: Decimal,
    purchaseId: string,
    ipAddress?: string,
    referralCode?: string,
  ): Promise<void> {
    // Define affiliate type
    type AffiliateRecord = {
      id: string;
      userId: string;
      referralCode: string;
      commissionRate: Decimal;
      isActive: boolean;
    };

    let affiliate: AffiliateRecord | null = null;

    // First try to find affiliate by referral code if provided
    if (referralCode) {
      affiliate = await tx.affiliate.findUnique({
        where: { referralCode, isActive: true },
      });
    }

    // If no referral code or affiliate not found, check user's referredById
    if (!affiliate) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { referredById: true },
      });

      if (user?.referredById) {
        affiliate = await tx.affiliate.findUnique({
          where: { id: user.referredById, isActive: true },
        });
        if (affiliate) {
          this.logger.log(
            `Using user's referredById relationship for affiliate commission: ${user.referredById}`,
          );
        }
      }
    }

    if (!affiliate) {
      this.logger.log(`No affiliate found for user ${userId} - skipping commission`);
      return;
    }

    // Don't allow self-referral
    if (affiliate.userId === userId) {
      this.logger.log(`Self-referral detected for user ${userId} - skipping commission`);
      return;
    }

    const commissionAmount = hbctAmount.mul(affiliate.commissionRate);

    // Get the purchaser's username for the notification
    const purchaser = await tx.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // Credit commission to affiliate's HBCT balance
    await this.balanceService.creditBalance({
      userId: affiliate.userId,
      currency: Currency.HBCT,
      amount: commissionAmount,
      type: WalletTransactionType.AFFILIATE_COMMISSION,
      description: `Affiliate commission from purchase`,
      metadata: { purchaseId, referralCode: affiliate.referralCode },
      ipAddress,
    });

    // Update affiliate stats
    await tx.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalEarnings: { increment: commissionAmount },
      },
    });

    // Update purchase with affiliate info
    await tx.tokenPurchase.update({
      where: { id: purchaseId },
      data: {
        affiliateId: affiliate.id,
        commissionAmount,
      },
    });

    this.logger.log(
      `Credited affiliate commission: ${commissionAmount.toFixed(4)} HBCT to affiliate ${affiliate.id} (user: ${affiliate.userId})`,
    );

    // Send notification to affiliate about the earned commission
    // This is done outside the transaction to avoid blocking
    this.notificationsService
      .notifyCommissionEarned(
        affiliate.userId,
        commissionAmount.toFixed(2),
        hbctAmount.toFixed(2),
        purchaser?.username || undefined,
      )
      .catch((err) => {
        this.logger.error(`Failed to send commission notification: ${err.message}`);
      });
  }

  /**
   * Get purchase history for a user
   */
  async getPurchaseHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      deliveryMethod?: TokenDeliveryMethod;
      status?: TokenPurchaseStatus;
    },
  ): Promise<PaginatedPurchases> {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filters?.deliveryMethod) {
      where.deliveryMethod = filters.deliveryMethod;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const [purchases, total] = await Promise.all([
      this.prisma.tokenPurchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tokenPurchase.count({ where }),
    ]);

    return {
      purchases: purchases.map((p) => ({
        id: p.id,
        paymentCurrency: p.paymentCurrency,
        paymentAmount: p.paymentAmount.toString(),
        hbctAmount: p.hbctAmount.toString(),
        tokenPrice: p.tokenPrice.toString(),
        deliveryMethod: p.deliveryMethod,
        destinationAddress: p.destinationAddress,
        platformFee: p.platformFee.toString(),
        networkFee: p.networkFee?.toString() || null,
        status: p.status,
        txHash: p.txHash,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get purchase by ID
   */
  async getPurchaseById(
    purchaseId: string,
    userId: string,
  ): Promise<TokenPurchaseRecord> {
    const purchase = await this.prisma.tokenPurchase.findFirst({
      where: {
        id: purchaseId,
        userId,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    return {
      id: purchase.id,
      paymentCurrency: purchase.paymentCurrency,
      paymentAmount: purchase.paymentAmount.toString(),
      hbctAmount: purchase.hbctAmount.toString(),
      tokenPrice: purchase.tokenPrice.toString(),
      deliveryMethod: purchase.deliveryMethod,
      destinationAddress: purchase.destinationAddress,
      platformFee: purchase.platformFee.toString(),
      networkFee: purchase.networkFee?.toString() || null,
      status: purchase.status,
      txHash: purchase.txHash,
      createdAt: purchase.createdAt,
      completedAt: purchase.completedAt,
    };
  }
}
