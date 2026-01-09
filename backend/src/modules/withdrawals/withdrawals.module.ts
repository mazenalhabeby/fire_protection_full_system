import { Module, forwardRef } from '@nestjs/common';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsProcessorService } from './withdrawals.processor';
import { WalletModule } from '../wallet/wallet.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    WalletModule,
    EmailModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, WithdrawalsProcessorService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
