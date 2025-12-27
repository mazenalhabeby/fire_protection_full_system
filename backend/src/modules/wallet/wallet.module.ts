import { Module, forwardRef } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { BalanceService, TransferService, LimitsService, HistoryService } from './services';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EmailModule, forwardRef(() => NotificationsModule)],
  controllers: [WalletController],
  providers: [BalanceService, TransferService, LimitsService, HistoryService],
  exports: [BalanceService, TransferService, LimitsService, HistoryService],
})
export class WalletModule {}
