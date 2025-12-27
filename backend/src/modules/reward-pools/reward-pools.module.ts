import { Module } from '@nestjs/common';
import { RewardPoolsController } from './reward-pools.controller';
import { RewardPoolsService } from './reward-pools.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RewardPoolsController],
  providers: [RewardPoolsService],
  exports: [RewardPoolsService],
})
export class RewardPoolsModule {}
