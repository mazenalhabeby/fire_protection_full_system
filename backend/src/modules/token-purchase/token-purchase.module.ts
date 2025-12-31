import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TokenPurchaseController } from './token-purchase.controller';
import { PurchaseService } from './services/purchase.service';
import { PurchaseLimitsService } from './services/purchase-limits.service';
import { PriceService } from './services/price.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    WalletModule,  // For BalanceService
    BlockchainModule,  // For on-chain transfers
    NotificationsModule,  // For commission notifications
  ],
  controllers: [TokenPurchaseController],
  providers: [
    PurchaseService,
    PurchaseLimitsService,
    PriceService,
  ],
  exports: [
    PurchaseService,
    PurchaseLimitsService,
    PriceService,
  ],
})
export class TokenPurchaseModule {}
