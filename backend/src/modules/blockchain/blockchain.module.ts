import { Module, Global } from '@nestjs/common';
import { BlockchainConfigService } from './blockchain.config';
import { BlockchainClientService } from './blockchain.client';
import { PancakeSwapService } from './pancakeswap.service';
import { BuybackService } from './buyback.service';

@Global()
@Module({
  providers: [
    BlockchainConfigService,
    BlockchainClientService,
    PancakeSwapService,
    BuybackService,
  ],
  exports: [
    BlockchainConfigService,
    BlockchainClientService,
    PancakeSwapService,
    BuybackService,
  ],
})
export class BlockchainModule {}
