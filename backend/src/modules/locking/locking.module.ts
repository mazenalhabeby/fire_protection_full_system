import { Module, forwardRef } from '@nestjs/common';
import { LockingController } from './locking.controller';
import { LockingService } from './locking.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, forwardRef(() => NotificationsModule)],
  controllers: [LockingController],
  providers: [LockingService],
  exports: [LockingService],
})
export class LockingModule {}
