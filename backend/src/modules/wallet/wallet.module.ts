import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { BalanceService, TransferService, LimitsService, HistoryService } from './services';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [EmailModule, forwardRef(() => NotificationsModule), forwardRef(() => AuthModule)],
  controllers: [WalletController],
  providers: [BalanceService, TransferService, LimitsService, HistoryService],
  exports: [BalanceService, TransferService, LimitsService, HistoryService],
})
export class WalletModule {}
