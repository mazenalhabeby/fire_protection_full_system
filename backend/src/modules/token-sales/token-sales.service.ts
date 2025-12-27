import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BuyTokensDto, GetQuoteDto } from './dto';

@Injectable()
export class TokenSalesService {
  private readonly currentPrice: number;
  private readonly tokenSymbol: string;
  private readonly treasuryPercent = 0.9; // 90% to treasury
  private readonly liquidityPercent = 0.1; // 10% to liquidity

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.currentPrice = parseFloat(
      configService.get<string>('TOKEN_CURRENT_PRICE') ||
        configService.get<string>('TOKEN_PRESALE_PRICE') ||
        '0.03',
    );
    this.tokenSymbol = configService.get<string>('TOKEN_SYMBOL') || 'HBCT';
  }

  async getPrice() {
    const tokenConfig = await this.prisma.tokenConfig.findFirst();
    const price = tokenConfig
      ? tokenConfig.currentPrice.toString()
      : this.currentPrice.toString();

    return {
      price,
      symbol: this.tokenSymbol,
      isPresale: tokenConfig?.isPresale ?? true,
    };
  }

  async getQuote(quoteDto: GetQuoteDto) {
    const { amountUsd, tokenPrice } = quoteDto;

    // Use price from frontend
    const price = tokenPrice;

    const tokensToReceive = amountUsd / price;
    const treasuryAllocation = amountUsd * this.treasuryPercent;
    const liquidityAllocation = amountUsd * this.liquidityPercent;

    return {
      amountUsd: amountUsd.toString(),
      tokensToReceive: tokensToReceive.toFixed(8),
      pricePerToken: price.toString(),
      liquidityAllocation: liquidityAllocation.toFixed(2),
      treasuryAllocation: treasuryAllocation.toFixed(2),
    };
  }

  async buyTokens(userId: string, buyDto: BuyTokensDto) {
    const { amountUsd, tokenPrice, paymentToken = 'BNB', referralCode } = buyDto;

    // Use price from frontend
    const price = tokenPrice;

    // Calculate tokens and allocations
    const tokensToReceive = amountUsd / price;
    const treasuryAmount = amountUsd * this.treasuryPercent;
    const liquidityAmount = amountUsd * this.liquidityPercent;

    // Handle affiliate if referral code provided
    let affiliateId: string | null = null;
    let commissionAmount = 0;

    if (referralCode) {
      const affiliate = await this.prisma.affiliate.findUnique({
        where: { referralCode, isActive: true },
      });

      if (affiliate) {
        affiliateId = affiliate.id;
        commissionAmount =
          tokensToReceive * parseFloat(affiliate.commissionRate.toString());
      }
    }

    // Execute transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create TokenSale record
      const sale = await tx.tokenSale.create({
        data: {
          userId,
          affiliateId,
          amountHbct: new Prisma.Decimal(tokensToReceive),
          priceUsd: new Prisma.Decimal(price),
          totalUsd: new Prisma.Decimal(amountUsd),
          paymentToken,
          paymentAmount: new Prisma.Decimal(amountUsd), // Simplified: assuming 1:1 for now
          treasuryAmount: new Prisma.Decimal(treasuryAmount),
          liquidityAmount: new Prisma.Decimal(liquidityAmount),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Create LiquidityEvent for the 10% allocation
      await tx.liquidityEvent.create({
        data: {
          sourceSaleId: sale.id,
          amountUsd: new Prisma.Decimal(liquidityAmount),
          amountHbct: new Prisma.Decimal(tokensToReceive * this.liquidityPercent),
          amountBnb: new Prisma.Decimal(liquidityAmount / 300), // Simplified BNB calculation
        },
      });

      // Create Transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.BUY_WEBSITE,
          amount: new Prisma.Decimal(tokensToReceive),
          priceUsd: new Prisma.Decimal(price),
          totalUsd: new Prisma.Decimal(amountUsd),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
          relatedSaleId: sale.id,
          metadata: referralCode ? { referralCode } : undefined,
        },
      });

      // Update user's token balance
      await tx.tokenBalance.upsert({
        where: { userId },
        create: {
          userId,
          availableBalance: new Prisma.Decimal(tokensToReceive),
          lockedBalance: new Prisma.Decimal(0),
          totalBalance: new Prisma.Decimal(tokensToReceive),
        },
        update: {
          availableBalance: { increment: new Prisma.Decimal(tokensToReceive) },
          totalBalance: { increment: new Prisma.Decimal(tokensToReceive) },
        },
      });

      // Handle affiliate commission
      if (affiliateId && commissionAmount > 0) {
        // Create commission record
        await tx.commission.create({
          data: {
            affiliateId,
            transactionId: transaction.id,
            saleId: sale.id,
            amount: new Prisma.Decimal(commissionAmount),
          },
        });

        // Update affiliate earnings
        await tx.affiliate.update({
          where: { id: affiliateId },
          data: {
            totalEarnings: { increment: new Prisma.Decimal(commissionAmount) },
          },
        });

        // Get affiliate user and add commission tokens
        const affiliate = await tx.affiliate.findUnique({
          where: { id: affiliateId },
        });

        if (affiliate) {
          // Create affiliate bonus transaction
          await tx.transaction.create({
            data: {
              userId: affiliate.userId,
              type: TransactionType.AFFILIATE_BONUS,
              amount: new Prisma.Decimal(commissionAmount),
              priceUsd: new Prisma.Decimal(price),
              totalUsd: new Prisma.Decimal(commissionAmount * price),
              status: TransactionStatus.COMPLETED,
              completedAt: new Date(),
              relatedSaleId: sale.id,
              metadata: { referredUserId: userId },
            },
          });

          // Add commission tokens to affiliate's balance
          await tx.tokenBalance.upsert({
            where: { userId: affiliate.userId },
            create: {
              userId: affiliate.userId,
              availableBalance: new Prisma.Decimal(commissionAmount),
              lockedBalance: new Prisma.Decimal(0),
              totalBalance: new Prisma.Decimal(commissionAmount),
            },
            update: {
              availableBalance: {
                increment: new Prisma.Decimal(commissionAmount),
              },
              totalBalance: { increment: new Prisma.Decimal(commissionAmount) },
            },
          });
        }
      }

      return { sale, transaction };
    });

    return {
      saleId: result.sale.id,
      transactionId: result.transaction.id,
      tokensReceived: tokensToReceive.toFixed(8),
      pricePerToken: price.toString(),
      totalPaidUsd: amountUsd.toString(),
      treasuryAmount: treasuryAmount.toFixed(2),
      liquidityAmount: liquidityAmount.toFixed(2),
      status: result.sale.status,
    };
  }

  async getSaleHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      this.prisma.tokenSale.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tokenSale.count({ where: { userId } }),
    ]);

    return {
      sales: sales.map((sale) => ({
        id: sale.id,
        amountHbct: sale.amountHbct.toString(),
        priceUsd: sale.priceUsd.toString(),
        totalUsd: sale.totalUsd.toString(),
        paymentToken: sale.paymentToken,
        status: sale.status,
        createdAt: sale.createdAt,
        completedAt: sale.completedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSalesStats() {
    // Aggregate sales statistics
    const salesAggregation = await this.prisma.tokenSale.aggregate({
      where: { status: TransactionStatus.COMPLETED },
      _sum: {
        totalUsd: true,
        amountHbct: true,
        liquidityAmount: true,
      },
      _count: true,
    });

    // Count unique buyers
    const uniqueBuyers = await this.prisma.tokenSale.groupBy({
      by: ['userId'],
      where: { status: TransactionStatus.COMPLETED },
    });

    return {
      totalSalesUsd: salesAggregation._sum.totalUsd?.toString() ?? '0',
      totalTokensSold: salesAggregation._sum.amountHbct?.toString() ?? '0',
      totalLiquidityAdded: salesAggregation._sum.liquidityAmount?.toString() ?? '0',
      totalTransactions: salesAggregation._count,
      uniqueBuyers: uniqueBuyers.length,
    };
  }

  async getSaleById(saleId: string, userId?: string) {
    const where: Prisma.TokenSaleWhereInput = { id: saleId };
    if (userId) {
      where.userId = userId;
    }

    const sale = await this.prisma.tokenSale.findFirst({
      where,
      include: {
        transactions: true,
        liquidityEvents: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return {
      id: sale.id,
      amountHbct: sale.amountHbct.toString(),
      priceUsd: sale.priceUsd.toString(),
      totalUsd: sale.totalUsd.toString(),
      paymentToken: sale.paymentToken,
      treasuryAmount: sale.treasuryAmount.toString(),
      liquidityAmount: sale.liquidityAmount.toString(),
      status: sale.status,
      createdAt: sale.createdAt,
      completedAt: sale.completedAt,
      transactions: sale.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount.toString(),
        status: tx.status,
      })),
      liquidityEvents: sale.liquidityEvents.map((event) => ({
        id: event.id,
        amountUsd: event.amountUsd.toString(),
        amountHbct: event.amountHbct.toString(),
      })),
    };
  }
}
