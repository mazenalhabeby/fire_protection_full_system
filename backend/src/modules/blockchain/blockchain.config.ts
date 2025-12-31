import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BlockchainConfig {
  // Network
  chainId: number;
  rpcUrl: string;
  rpcUrlFallback?: string;

  // Token
  hbctTokenAddress: string;
  hbctDecimals: number;

  // Deposit
  depositWalletAddress: string;
  minConfirmations: number;

  // Withdrawal
  withdrawalPrivateKey: string;
  withdrawalWalletAddress: string;
  minWithdrawAmount: string;
  maxWithdrawAmount: string;
  withdrawFeePercent: number;
  withdrawFlatFee: string;
  withdrawalRequiresApproval: boolean;
  withdrawalApprovalThreshold: string;

  // Processing
  depositPollingInterval: number;
  withdrawalPollingInterval: number;
  maxRetries: number;

  // Gas
  maxGasPrice: string;
  gasLimit: number;
}

@Injectable()
export class BlockchainConfigService {
  private readonly logger = new Logger(BlockchainConfigService.name);
  private readonly config: BlockchainConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): BlockchainConfig {
    return {
      // Network configuration - Default to BSC Testnet for development
      chainId: parseInt(this.configService.get<string>('CHAIN_ID', '97'), 10), // BSC Testnet (use 56 for mainnet)
      rpcUrl: this.configService.get<string>('BSC_RPC_URL', 'https://data-seed-prebsc-1-s1.bnbchain.org:8545'),
      rpcUrlFallback: this.configService.get<string>('BSC_RPC_URL_FALLBACK', 'https://data-seed-prebsc-2-s1.bnbchain.org:8545'),

      // HBCT Token
      hbctTokenAddress: this.configService.get<string>(
        'HBCT_TOKEN_ADDRESS',
        '0x0000000000000000000000000000000000000000',
      ),
      hbctDecimals: parseInt(this.configService.get<string>('HBCT_DECIMALS', '18'), 10),

      // Deposit configuration
      depositWalletAddress: this.configService.get<string>(
        'DEPOSIT_WALLET_ADDRESS',
        '0x0000000000000000000000000000000000000000',
      ),
      minConfirmations: parseInt(this.configService.get<string>('MIN_CONFIRMATIONS', '3'), 10),

      // Withdrawal configuration
      withdrawalPrivateKey: this.configService.get<string>('WITHDRAWAL_PRIVATE_KEY', ''),
      withdrawalWalletAddress: this.configService.get<string>('WITHDRAWAL_WALLET_ADDRESS', ''),
      minWithdrawAmount: this.configService.get<string>('MIN_WITHDRAW_AMOUNT', '100'),
      maxWithdrawAmount: this.configService.get<string>('MAX_WITHDRAW_AMOUNT', '100000'),
      withdrawFeePercent: parseFloat(this.configService.get<string>('WITHDRAW_FEE_PERCENT', '0.1')),
      withdrawFlatFee: this.configService.get<string>('WITHDRAW_FLAT_FEE', '0'),
      withdrawalRequiresApproval: this.configService.get<string>('WITHDRAWAL_REQUIRES_APPROVAL', 'true') === 'true',
      withdrawalApprovalThreshold: this.configService.get<string>('WITHDRAWAL_APPROVAL_THRESHOLD', '10000'),

      // Processing intervals (milliseconds)
      depositPollingInterval: parseInt(
        this.configService.get<string>('DEPOSIT_POLLING_INTERVAL', '15000'),
        10,
      ),
      withdrawalPollingInterval: parseInt(
        this.configService.get<string>('WITHDRAWAL_POLLING_INTERVAL', '30000'),
        10,
      ),
      maxRetries: parseInt(this.configService.get<string>('MAX_WITHDRAWAL_RETRIES', '3'), 10),

      // Gas configuration
      maxGasPrice: this.configService.get<string>('MAX_GAS_PRICE', '10000000000'), // 10 gwei
      gasLimit: parseInt(this.configService.get<string>('GAS_LIMIT', '100000'), 10),
    };
  }

  private validateConfig(): void {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check critical addresses
    if (
      this.config.hbctTokenAddress === '0x0000000000000000000000000000000000000000' ||
      !this.config.hbctTokenAddress
    ) {
      warnings.push('HBCT_TOKEN_ADDRESS is not configured');
    }

    if (
      this.config.depositWalletAddress === '0x0000000000000000000000000000000000000000' ||
      !this.config.depositWalletAddress
    ) {
      warnings.push('DEPOSIT_WALLET_ADDRESS is not configured');
    }

    // Withdrawal wallet validation
    if (!this.config.withdrawalPrivateKey) {
      warnings.push('WITHDRAWAL_PRIVATE_KEY is not configured - withdrawals will be disabled');
    }

    // Log warnings
    warnings.forEach((w) => this.logger.warn(w));
    errors.forEach((e) => this.logger.error(e));

    if (errors.length > 0) {
      throw new Error(`Blockchain configuration errors: ${errors.join(', ')}`);
    }
  }

  get chainId(): number {
    return this.config.chainId;
  }

  get rpcUrl(): string {
    return this.config.rpcUrl;
  }

  get rpcUrlFallback(): string | undefined {
    return this.config.rpcUrlFallback;
  }

  get hbctTokenAddress(): string {
    return this.config.hbctTokenAddress;
  }

  get hbctDecimals(): number {
    return this.config.hbctDecimals;
  }

  get depositWalletAddress(): string {
    return this.config.depositWalletAddress;
  }

  get minConfirmations(): number {
    return this.config.minConfirmations;
  }

  get withdrawalPrivateKey(): string {
    return this.config.withdrawalPrivateKey;
  }

  get withdrawalWalletAddress(): string {
    return this.config.withdrawalWalletAddress;
  }

  get minWithdrawAmount(): string {
    return this.config.minWithdrawAmount;
  }

  get maxWithdrawAmount(): string {
    return this.config.maxWithdrawAmount;
  }

  get withdrawFeePercent(): number {
    return this.config.withdrawFeePercent;
  }

  get withdrawFlatFee(): string {
    return this.config.withdrawFlatFee;
  }

  get withdrawalRequiresApproval(): boolean {
    return this.config.withdrawalRequiresApproval;
  }

  get withdrawalApprovalThreshold(): string {
    return this.config.withdrawalApprovalThreshold;
  }

  get depositPollingInterval(): number {
    return this.config.depositPollingInterval;
  }

  get withdrawalPollingInterval(): number {
    return this.config.withdrawalPollingInterval;
  }

  get maxRetries(): number {
    return this.config.maxRetries;
  }

  get maxGasPrice(): string {
    return this.config.maxGasPrice;
  }

  get gasLimit(): number {
    return this.config.gasLimit;
  }

  isWithdrawalEnabled(): boolean {
    return !!this.config.withdrawalPrivateKey && !!this.config.withdrawalWalletAddress;
  }

  isDepositEnabled(): boolean {
    return (
      this.config.hbctTokenAddress !== '0x0000000000000000000000000000000000000000' &&
      this.config.depositWalletAddress !== '0x0000000000000000000000000000000000000000'
    );
  }
}
