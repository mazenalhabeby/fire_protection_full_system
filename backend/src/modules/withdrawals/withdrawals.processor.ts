import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { BlockchainConfigService } from '../blockchain/blockchain.config';

@Injectable()
export class WithdrawalsProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WithdrawalsProcessorService.name);
  private processingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;

  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    private readonly blockchainConfig: BlockchainConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.blockchainConfig.isWithdrawalEnabled()) {
      this.logger.warn('Withdrawal processor disabled - configuration incomplete');
      return;
    }

    this.startProcessing();
  }

  onModuleDestroy(): void {
    this.stopProcessing();
  }

  /**
   * Start the withdrawal processor
   */
  startProcessing(): void {
    if (this.isRunning) {
      this.logger.warn('Withdrawal processor already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting withdrawal processor...');

    // Process withdrawals periodically
    this.processingInterval = setInterval(
      () => this.processWithdrawals(),
      this.blockchainConfig.withdrawalPollingInterval,
    );

    this.logger.log(
      `Withdrawal processor started - polling every ${this.blockchainConfig.withdrawalPollingInterval}ms`,
    );
  }

  /**
   * Stop the withdrawal processor
   */
  stopProcessing(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.logger.log('Withdrawal processor stopped');
  }

  /**
   * Process pending withdrawals
   */
  private async processWithdrawals(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Withdrawal processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      // Get approved withdrawals ready for processing
      const pendingWithdrawals = await this.withdrawalsService.getPendingWithdrawals();

      if (pendingWithdrawals.length === 0) {
        return;
      }

      this.logger.log(`Processing ${pendingWithdrawals.length} pending withdrawals`);

      // Process one at a time to avoid nonce issues
      for (const withdrawal of pendingWithdrawals) {
        try {
          await this.withdrawalsService.processWithdrawal(withdrawal.id);
          this.logger.log(`Successfully processed withdrawal ${withdrawal.id}`);

          // Small delay between transactions
          await this.delay(2000);
        } catch (error) {
          this.logger.error(
            `Failed to process withdrawal ${withdrawal.id}: ${error.message}`,
          );
          // Continue with next withdrawal
        }
      }
    } catch (error) {
      this.logger.error(`Error in withdrawal processor: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get processor status
   */
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    pollingInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      pollingInterval: this.blockchainConfig.withdrawalPollingInterval,
    };
  }

  /**
   * Manually trigger processing
   */
  async triggerProcessing(): Promise<number> {
    const pendingWithdrawals = await this.withdrawalsService.getPendingWithdrawals();
    let processed = 0;

    for (const withdrawal of pendingWithdrawals) {
      try {
        await this.withdrawalsService.processWithdrawal(withdrawal.id);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to process withdrawal ${withdrawal.id}: ${error.message}`,
        );
      }
    }

    return processed;
  }
}
