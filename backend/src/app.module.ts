import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { StakingModule } from './modules/staking/staking.module';
import { TokenSalesModule } from './modules/token-sales/token-sales.module';
import { LockingModule } from './modules/locking/locking.module';
import { RewardPoolsModule } from './modules/reward-pools/reward-pools.module';
import { AirdropsModule } from './modules/airdrops/airdrops.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmailModule } from './modules/email/email.module';
import { SupportModule } from './modules/support/support.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';
import { TokenPurchaseModule } from './modules/token-purchase/token-purchase.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DatabaseMaintenanceModule } from './modules/database-maintenance/database-maintenance.module';
import { HealthModule } from './modules/health/health.module';
import { RolesModule } from './modules/roles/roles.module';
import { UploadModule } from './modules/upload/upload.module';
import { JwtAuthGuard } from './modules/auth/guards';
import { RequestLoggerMiddleware } from './common/middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting - default 100 requests per 60 seconds
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    // Scheduled tasks (session cleanup, etc.)
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    TokensModule,
    AffiliatesModule,
    StakingModule,
    // New modules
    TokenSalesModule,
    LockingModule,
    RewardPoolsModule,
    AirdropsModule,
    MarketplaceModule,
    AdminModule,
    EmailModule,
    SupportModule,
    WalletModule,
    BlockchainModule,
    DepositsModule,
    WithdrawalsModule,
    TokenPurchaseModule,
    NotificationsModule,
    DatabaseMaintenanceModule,
    HealthModule,
    RolesModule,
    UploadModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
