import { Module, Global } from '@nestjs/common';
import { BlockchainConfigService } from './blockchain.config';
import { BlockchainClientService } from './blockchain.client';

@Global()
@Module({
  providers: [BlockchainConfigService, BlockchainClientService],
  exports: [BlockchainConfigService, BlockchainClientService],
})
export class BlockchainModule {}
