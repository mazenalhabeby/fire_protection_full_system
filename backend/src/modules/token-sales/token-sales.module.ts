import { Module } from '@nestjs/common';
import { TokenSalesController } from './token-sales.controller';
import { TokenSalesService } from './token-sales.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TokenSalesController],
  providers: [TokenSalesService],
  exports: [TokenSalesService],
})
export class TokenSalesModule {}
