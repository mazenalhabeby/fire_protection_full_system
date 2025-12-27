import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BuyTokenDto, SellTokenDto, TransactionQueryDto } from './dto';

@Injectable()
export class TokensService {
  private readonly presalePrice: number;
  private readonly tokenSymbol: string;
  private readonly tokenName: string;
  private readonly totalSupply: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.presalePrice =
      parseFloat(configService.get<string>('TOKEN_PRESALE_PRICE') || '0.03');
    this.tokenSymbol = configService.get<string>('TOKEN_SYMBOL') || 'HBCT';
    this.tokenName =
      configService.get<string>('TOKEN_NAME') || 'HBC Fire Protection Token';
    this.totalSupply =
      parseInt(configService.get<string>('TOKEN_TOTAL_SUPPLY') || '250000000');
  }

  async getTokenInfo() {
    // Try to get from database first, otherwise use config
    const tokenConfig = await this.prisma.tokenConfig.findFirst();

    if (tokenConfig) {
      return {
        symbol: tokenConfig.symbol,
        name: tokenConfig.name,
        totalSupply: tokenConfig.totalSupply.toString(),
        currentPrice: tokenConfig.currentPrice.toString(),
        isPresale: tokenConfig.isPresale,
        presalePrice: tokenConfig.presalePrice?.toString() ?? this.presalePrice.toString(),
      };
    }

    return {
      symbol: this.tokenSymbol,
      name: this.tokenName,
      totalSupply: this.totalSupply.toString(),
      currentPrice: this.presalePrice.toString(),
      isPresale: true,
      presalePrice: this.presalePrice.toString(),
    };
  }

  async getPrice() {
    const tokenConfig = await this.prisma.tokenConfig.findFirst();
    const price = tokenConfig
      ? tokenConfig.currentPrice.toString()
      : this.presalePrice.toString();

    return { price, symbol: this.tokenSymbol };
  }

  async getBalance(userId: string) {
    const balance = await this.prisma.tokenBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      return {
        availableBalance: '0',
        lockedBalance: '0',
        totalBalance: '0',
      };
    }

    return {
      availableBalance: balance.availableBalance.toString(),
      lockedBalance: balance.lockedBalance.toString(),
      totalBalance: balance.totalBalance.toString(),
    };
  }

  async buyTokens(userId: string, buyTokenDto: BuyTokenDto) {
    const { amountUsd, referralCode } = buyTokenDto;

    // Calculate tokens to receive
    const tokensToReceive = amountUsd / this.presalePrice;

    // Handle affiliate commission if referral code provided
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
      // Create the buy transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.BUY,
          amount: new Prisma.Decimal(tokensToReceive),
          priceUsd: new Prisma.Decimal(this.presalePrice),
          totalUsd: new Prisma.Decimal(amountUsd),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
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

        // Create referral bonus transaction for affiliate
        const affiliate = await tx.affiliate.findUnique({
          where: { id: affiliateId },
        });

        if (affiliate) {
          await tx.transaction.create({
            data: {
              userId: affiliate.userId,
              type: TransactionType.REFERRAL_BONUS,
              amount: new Prisma.Decimal(commissionAmount),
              priceUsd: new Prisma.Decimal(this.presalePrice),
              totalUsd: new Prisma.Decimal(
                commissionAmount * this.presalePrice,
              ),
              status: TransactionStatus.COMPLETED,
              completedAt: new Date(),
              metadata: { referredUserId: userId, sourceTransactionId: transaction.id },
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

      return transaction;
    });

    return {
      transactionId: result.id,
      tokensReceived: tokensToReceive.toString(),
      pricePerToken: this.presalePrice.toString(),
      totalPaid: amountUsd.toString(),
      status: result.status,
    };
  }

  async sellTokens(userId: string, sellTokenDto: SellTokenDto) {
    const { amount } = sellTokenDto;

    // Check user's available balance
    const balance = await this.prisma.tokenBalance.findUnique({
      where: { userId },
    });

    if (
      !balance ||
      parseFloat(balance.availableBalance.toString()) < amount
    ) {
      throw new BadRequestException('Insufficient token balance');
    }

    // Calculate USD value
    const usdValue = amount * this.presalePrice;

    // Execute transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the sell transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.SELL,
          amount: new Prisma.Decimal(amount),
          priceUsd: new Prisma.Decimal(this.presalePrice),
          totalUsd: new Prisma.Decimal(usdValue),
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Update user's token balance
      await tx.tokenBalance.update({
        where: { userId },
        data: {
          availableBalance: { decrement: new Prisma.Decimal(amount) },
          totalBalance: { decrement: new Prisma.Decimal(amount) },
        },
      });

      return transaction;
    });

    return {
      transactionId: result.id,
      tokensSold: amount.toString(),
      pricePerToken: this.presalePrice.toString(),
      totalReceived: usdValue.toString(),
      status: result.status,
    };
  }

  async getTransactions(userId: string, query: TransactionQueryDto) {
    const { page = 1, limit = 10, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = { userId };
    if (type) {
      where.type = type as TransactionType;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          amount: true,
          priceUsd: true,
          totalUsd: true,
          status: true,
          txHash: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((tx) => ({
        ...tx,
        amount: tx.amount.toString(),
        priceUsd: tx.priceUsd?.toString() ?? '0',
        totalUsd: tx.totalUsd?.toString() ?? '0',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransaction(userId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      ...transaction,
      amount: transaction.amount.toString(),
      priceUsd: transaction.priceUsd?.toString() ?? '0',
      totalUsd: transaction.totalUsd?.toString() ?? '0',
    };
  }
}
