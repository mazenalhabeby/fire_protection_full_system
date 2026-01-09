import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DepositsService } from './deposits.service';
import { BlockchainConfigService } from '../blockchain/blockchain.config';

@Injectable()
export class DepositsListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DepositsListenerService.name);
  private depositInterval: NodeJS.Timeout | null = null;
  private confirmationInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly depositsService: DepositsService,
    private readonly blockchainConfig: BlockchainConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Automatic polling disabled - users trigger deposit checks manually via the deposit page
    // This prevents RPC rate limit errors from constant polling
    this.logger.log('Deposit listener initialized (manual mode - no automatic polling)');
  }

  onModuleDestroy(): void {
    this.stopListening();
  }

  /**
   * Start the deposit listener
   */
  startListening(): void {
    if (this.isRunning) {
      this.logger.warn('Deposit listener already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting deposit listener...');

    // Process new deposits periodically
    this.depositInterval = setInterval(
      () => this.processDeposits(),
      this.blockchainConfig.depositPollingInterval,
    );

    // Confirm pending deposits periodically
    this.confirmationInterval = setInterval(
      () => this.confirmDeposits(),
      this.blockchainConfig.depositPollingInterval * 2,
    );

    // Run initial processing
    this.processDeposits();

    this.logger.log(
      `Deposit listener started - polling every ${this.blockchainConfig.depositPollingInterval}ms`,
    );
  }

  /**
   * Stop the deposit listener
   */
  stopListening(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.depositInterval) {
      clearInterval(this.depositInterval);
      this.depositInterval = null;
    }

    if (this.confirmationInterval) {
      clearInterval(this.confirmationInterval);
      this.confirmationInterval = null;
    }

    this.logger.log('Deposit listener stopped');
  }

  /**
   * Process new deposits from blockchain
   */
  private async processDeposits(): Promise<void> {
    try {
      const count = await this.depositsService.processNewDeposits();
      if (count > 0) {
        this.logger.log(`Processed ${count} new deposits`);
      }
    } catch (error) {
      this.logger.error(`Error processing deposits: ${error.message}`);
    }
  }

  /**
   * Confirm pending deposits
   */
  private async confirmDeposits(): Promise<void> {
    try {
      const count = await this.depositsService.confirmPendingDeposits();
      if (count > 0) {
        this.logger.log(`Confirmed ${count} pending deposits`);
      }
    } catch (error) {
      this.logger.error(`Error confirming deposits: ${error.message}`);
    }
  }

  /**
   * Get listener status
   */
  getStatus(): {
    isRunning: boolean;
    pollingInterval: number;
  } {
    return {
      isRunning: this.isRunning,
      pollingInterval: this.blockchainConfig.depositPollingInterval,
    };
  }

  /**
   * Auto-release expired locked deposits (runs every 5 minutes)
   * This ensures locked deposits are released promptly after their 24h lock period
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoReleaseExpiredDeposits(): Promise<void> {
    try {
      const count = await this.depositsService.releaseExpiredDeposits();
      if (count > 0) {
        this.logger.log(`Auto-released ${count} expired locked deposits`);
      }
    } catch (error) {
      this.logger.error(`Error auto-releasing deposits: ${error.message}`);
    }
  }
}
