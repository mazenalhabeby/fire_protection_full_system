import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PurchaseService } from './services/purchase.service';
import { PurchaseLimitsService } from './services/purchase-limits.service';
import { PriceService } from './services/price.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetQuoteDto,
  PurchaseOffChainDto,
  PurchaseOnChainDto,
  PurchaseHistoryQueryDto,
} from './dto';
import { Currency, TokenDeliveryMethod, TokenPurchaseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('Token Purchase')
@Controller('purchase')
export class TokenPurchaseController {
  constructor(
    private readonly purchaseService: PurchaseService,
    private readonly purchaseLimitsService: PurchaseLimitsService,
    private readonly priceService: PriceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get current HBCT token price (live from PancakeSwap)
   */
  @Public()
  @Get('price')
  @ApiOperation({ summary: 'Get current HBCT price' })
  async getPrice() {
    const [hbctPrice, bnbPrice] = await Promise.all([
      this.priceService.getHbctPriceUsd(),
      this.priceService.getBnbPriceUsd(),
    ]);

    return {
      hbctPriceUsd: hbctPrice.toString(),
      bnbPriceUsd: bnbPrice.toString(),
      usdtPriceUsd: '1',
      usdcPriceUsd: '1',
    };
  }

  /**
   * Get purchase quote
   */
  @Public()
  @Post('quote')
  @ApiOperation({ summary: 'Get purchase quote' })
  async getQuote(@Body() dto: GetQuoteDto) {
    const quote = await this.purchaseService.getQuote({
      paymentCurrency: dto.paymentCurrency,
      paymentAmount: dto.paymentAmount,
      hbctAmount: dto.hbctAmount,
      deliveryMethod: dto.deliveryMethod as TokenDeliveryMethod,
    });

    return quote;
  }

  /**
   * Purchase HBCT and store in platform wallet (off-chain)
   */
  @Post('off-chain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  @ApiOperation({ summary: 'Purchase HBCT and store in platform wallet' })
  async purchaseOffChain(
    @CurrentUser('id') userId: string,
    @Body() dto: PurchaseOffChainDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await this.purchaseService.purchaseOffChain({
      userId,
      paymentCurrency: dto.paymentCurrency as Currency,
      paymentAmount: new Decimal(dto.paymentAmount),
      referralCode: dto.referralCode,
      ipAddress,
      txHash: dto.txHash,
    });

    return result;
  }

  /**
   * Purchase HBCT and send to external wallet (on-chain)
   */
  @Post('on-chain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @ApiOperation({ summary: 'Purchase HBCT and send to external wallet' })
  async purchaseOnChain(
    @CurrentUser('id') userId: string,
    @Body() dto: PurchaseOnChainDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await this.purchaseService.purchaseOnChain({
      userId,
      paymentCurrency: dto.paymentCurrency as Currency,
      paymentAmount: new Decimal(dto.paymentAmount),
      destinationWalletId: dto.destinationWalletId,
      referralCode: dto.referralCode,
      ipAddress,
      txHash: dto.txHash,
    });

    return result;
  }

  /**
   * Get user purchase limits
   */
  @Get('limits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user purchase limits' })
  async getLimits(@CurrentUser('id') userId: string) {
    const limits = await this.purchaseLimitsService.getUserLimits(userId);
    return limits;
  }

  /**
   * Get purchase history
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get purchase history' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query() query: PurchaseHistoryQueryDto,
  ) {
    const history = await this.purchaseService.getPurchaseHistory(
      userId,
      query.page,
      query.limit,
      {
        deliveryMethod: query.deliveryMethod as TokenDeliveryMethod,
        status: query.status as TokenPurchaseStatus,
      },
    );

    return history;
  }

  /**
   * Get purchase by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get purchase details' })
  async getPurchase(
    @CurrentUser('id') userId: string,
    @Param('id') purchaseId: string,
  ) {
    const purchase = await this.purchaseService.getPurchaseById(purchaseId, userId);
    return purchase;
  }

  /**
   * Get linked wallets for on-chain delivery
   */
  @Get('wallets/linked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked wallets for on-chain delivery' })
  async getLinkedWallets(@CurrentUser('id') userId: string) {
    const allWallets = await this.prisma.userWallet.findMany({
      where: { userId },
      select: {
        id: true,
        walletAddress: true,
        label: true,
        isPrimary: true,
        verifiedAt: true,
        lastUsedAt: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    // Filter for verified wallets only
    const wallets = allWallets.filter((w) => w.verifiedAt !== null);

    return { wallets };
  }
}
