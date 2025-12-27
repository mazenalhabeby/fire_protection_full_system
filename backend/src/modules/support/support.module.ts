import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';

@Module({
  providers: [SupportService],
  controllers: [SupportController, SupportAdminController],
  exports: [SupportService],
})
export class SupportModule {}
