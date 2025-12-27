import { Module, forwardRef } from '@nestjs/common';
import { DepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';
import { DepositsListenerService } from './deposits.listener';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WalletModule, forwardRef(() => NotificationsModule)],
  controllers: [DepositsController],
  providers: [DepositsService, DepositsListenerService],
  exports: [DepositsService],
})
export class DepositsModule {}
