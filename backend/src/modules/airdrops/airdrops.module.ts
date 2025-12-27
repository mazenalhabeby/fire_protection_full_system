import { Module } from '@nestjs/common';
import { AirdropsController } from './airdrops.controller';
import { AirdropsService } from './airdrops.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AirdropsController],
  providers: [AirdropsService],
  exports: [AirdropsService],
})
export class AirdropsModule {}
