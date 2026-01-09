import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  createPublicClient,
  createWalletClient,
  http,
  fallback,
  PublicClient,
  WalletClient,
  parseAbi,
  parseUnits,
  formatUnits,
  Log,
  TransactionReceipt,
  Address,
  Hex,
  Chain,
} from 'viem';
import { privateKeyToAccount, Account } from 'viem/accounts';
import { bsc, bscTestnet } from 'viem/chains';
import { BlockchainConfigService } from './blockchain.config';

// Rate limiting configuration
const RATE_LIMIT_DELAY_MS = 1000; // Minimum delay between RPC calls
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Base delay for exponential backoff

// ERC20 ABI for Transfer events and basic functions
const ERC20_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

export interface TransferEvent {
  txHash: string;
  logIndex: number;
  from: string;
  to: string;
  value: bigint;
  blockNumber: bigint;
  blockTimestamp?: Date;
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  blockNumber?: bigint;
  gasUsed?: bigint;
  error?: string;
}

@Injectable()
export class BlockchainClientService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainClientService.name);
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;
  private withdrawalAccount: Account | null = null;
  private chain: Chain;
  private lastRpcCallTime = 0;

  constructor(private readonly config: BlockchainConfigService) {
    this.chain = this.config.chainId === 56 ? bsc : bscTestnet;
  }

  /**
   * Rate limit helper - ensures minimum delay between RPC calls
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastRpcCallTime;
    if (timeSinceLastCall < RATE_LIMIT_DELAY_MS) {
      await this.sleep(RATE_LIMIT_DELAY_MS - timeSinceLastCall);
    }
    this.lastRpcCallTime = Date.now();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = MAX_RETRIES,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.rateLimit();
        return await operation();
      } catch (error: any) {
        lastError = error;
        const isRateLimit =
          error.message?.includes('limit') ||
          error.message?.includes('rate') ||
          error.message?.includes('429') ||
          error.message?.includes('exceeded');

        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
          this.logger.warn(
            `${operationName}: Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await this.sleep(delay);
        } else if (!isRateLimit) {
          // Non-rate-limit error, don't retry
          throw error;
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
  }

  async onModuleInit(): Promise<void> {
    await this.initializeClients();
  }

  private async initializeClients(): Promise<void> {
    // Build list of RPC URLs for fallback
    const rpcUrls = [this.config.rpcUrl];
    if (this.config.rpcUrlFallback) {
      rpcUrls.push(this.config.rpcUrlFallback);
    }

    // Add additional public testnet RPCs for redundancy
    if (this.config.chainId === 97) {
      // BSC Testnet additional public RPCs (updated Jan 2026)
      const additionalTestnetRpcs = [
        'https://bsc-testnet-rpc.publicnode.com',
        'https://data-seed-prebsc-1-s2.bnbchain.org:8545',
        'https://data-seed-prebsc-2-s2.bnbchain.org:8545',
        'https://data-seed-prebsc-1-s3.bnbchain.org:8545',
        'https://data-seed-prebsc-2-s3.bnbchain.org:8545',
      ];
      rpcUrls.push(...additionalTestnetRpcs);
    } else {
      // BSC Mainnet additional public RPCs
      const additionalMainnetRpcs = [
        'https://bsc-rpc.publicnode.com',
        'https://bsc-dataseed1.bnbchain.org',
        'https://bsc-dataseed2.bnbchain.org',
        'https://bsc-dataseed3.binance.org',
        'https://bsc-dataseed4.binance.org',
      ];
      rpcUrls.push(...additionalMainnetRpcs);
    }

    // Create transports with individual configuration
    const transports = rpcUrls.map((url) =>
      http(url, {
        retryCount: 2,
        retryDelay: 500,
        timeout: 10000,
      }),
    );

    // Create public client with fallback transport
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: fallback(transports, {
        rank: true,
        retryCount: 2,
      }),
    });

    // Verify connection
    try {
      const blockNumber = await this.publicClient.getBlockNumber();
      this.logger.log(`========================================`);
      this.logger.log(`BLOCKCHAIN CLIENT INITIALIZED`);
      this.logger.log(`Chain: ${this.chain.name} (ID: ${this.config.chainId})`);
      this.logger.log(`Primary RPC: ${this.config.rpcUrl}`);
      this.logger.log(`Fallback RPCs: ${rpcUrls.length - 1} configured`);
      this.logger.log(`Current block: ${blockNumber}`);
      this.logger.log(`========================================`);
    } catch (error) {
      this.logger.error(`Failed to connect to blockchain: ${error.message}`);
      throw error;
    }

    // Create wallet client for withdrawals if private key is configured
    if (this.config.withdrawalPrivateKey) {
      try {
        this.withdrawalAccount = privateKeyToAccount(this.config.withdrawalPrivateKey as Hex);
        this.walletClient = createWalletClient({
          account: this.withdrawalAccount,
          chain: this.chain,
          transport: http(this.config.rpcUrl),
        });
        this.logger.log(`Withdrawal wallet initialized: ${this.withdrawalAccount.address}`);
      } catch (error) {
        this.logger.error(`Failed to initialize withdrawal wallet: ${error.message}`);
      }
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  /**
   * Get block by number
   */
  async getBlock(blockNumber: bigint): Promise<{ timestamp: bigint } | null> {
    try {
      return await this.publicClient.getBlock({ blockNumber });
    } catch {
      return null;
    }
  }

  /**
   * Get HBCT transfer events from a specific block range
   * Uses retry logic with exponential backoff for rate-limited RPCs
   */
  async getTransferEvents(fromBlock: bigint, toBlock: bigint): Promise<TransferEvent[]> {
    const tokenAddress = this.config.hbctTokenAddress as Address;
    const depositAddress = this.config.depositWalletAddress.toLowerCase();

    return this.retryWithBackoff(
      async () => {
        const logs = await this.publicClient.getLogs({
          address: tokenAddress,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { type: 'address', indexed: true, name: 'from' },
              { type: 'address', indexed: true, name: 'to' },
              { type: 'uint256', indexed: false, name: 'value' },
            ],
          },
          fromBlock,
          toBlock,
        });

        // Filter for transfers TO the deposit address
        const depositLogs = logs.filter(
          (log) => log.args.to?.toLowerCase() === depositAddress,
        );

        const events: TransferEvent[] = [];

        for (const log of depositLogs) {
          let blockTimestamp: Date | undefined;

          // Get block timestamp with rate limiting
          try {
            await this.rateLimit();
            const block = await this.publicClient.getBlock({
              blockNumber: log.blockNumber,
            });
            blockTimestamp = new Date(Number(block.timestamp) * 1000);
          } catch {
            // Continue without timestamp
          }

          events.push({
            txHash: log.transactionHash,
            logIndex: log.logIndex,
            from: log.args.from as string,
            to: log.args.to as string,
            value: log.args.value as bigint,
            blockNumber: log.blockNumber,
            blockTimestamp,
          });
        }

        return events;
      },
      'getTransferEvents',
    );
  }

  /**
   * Get transfer events by transaction hash
   * More efficient for checking specific deposits
   */
  async getTransferEventByTxHash(txHash: string): Promise<TransferEvent | null> {
    const tokenAddress = this.config.hbctTokenAddress as Address;
    const depositAddress = this.config.depositWalletAddress.toLowerCase();

    return this.retryWithBackoff(
      async () => {
        const receipt = await this.publicClient.getTransactionReceipt({
          hash: txHash as Hex,
        });

        if (!receipt || receipt.status !== 'success') {
          return null;
        }

        // Find Transfer event in logs
        const transferLog = receipt.logs.find(
          (log) =>
            log.address.toLowerCase() === tokenAddress.toLowerCase() &&
            log.topics[0] ===
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
        );

        if (!transferLog) {
          return null;
        }

        // Decode Transfer event
        const from = '0x' + transferLog.topics[1]?.slice(26);
        const to = '0x' + transferLog.topics[2]?.slice(26);

        // Check if it's a deposit to our address
        if (to.toLowerCase() !== depositAddress) {
          return null;
        }

        const value = BigInt(transferLog.data);

        // Get block timestamp
        let blockTimestamp: Date | undefined;
        try {
          await this.rateLimit();
          const block = await this.publicClient.getBlock({
            blockNumber: receipt.blockNumber,
          });
          blockTimestamp = new Date(Number(block.timestamp) * 1000);
        } catch {
          // Continue without timestamp
        }

        return {
          txHash: receipt.transactionHash,
          logIndex: transferLog.logIndex,
          from,
          to,
          value,
          blockNumber: receipt.blockNumber,
          blockTimestamp,
        };
      },
      'getTransferEventByTxHash',
    );
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    try {
      return await this.publicClient.getTransactionReceipt({
        hash: txHash as Hex,
      });
    } catch {
      return null;
    }
  }

  /**
   * Get number of confirmations for a transaction
   */
  async getConfirmations(blockNumber: bigint): Promise<number> {
    const currentBlock = await this.getCurrentBlockNumber();
    return Number(currentBlock - blockNumber);
  }

  /**
   * Verify a payment transaction (BNB or ERC-20 token)
   * Returns verification result with details
   *
   * Security measures:
   * - Requires minimum confirmations to prevent reorg attacks
   * - Validates recipient address
   * - Validates amount with small tolerance
   * - Returns sender address for ownership verification
   */
  async verifyPaymentTransaction(
    txHash: string,
    expectedTo: string,
    expectedAmount: string,
    currency: 'BNB' | 'USDT' | 'USDC',
    options?: {
      minConfirmations?: number;
      maxAgeMinutes?: number;
    },
  ): Promise<{
    valid: boolean;
    from?: string;
    to?: string;
    amount?: string;
    confirmations?: number;
    blockTimestamp?: Date;
    error?: string;
  }> {
    // Security: Require minimum confirmations (default 3 for BSC ~9 seconds)
    const MIN_CONFIRMATIONS = options?.minConfirmations ?? 3;
    // Security: Transaction must be recent (default 30 minutes)
    const MAX_AGE_MINUTES = options?.maxAgeMinutes ?? 30;

    try {
      this.logger.log(`========================================`);
      this.logger.log(`VERIFYING PAYMENT TRANSACTION`);
      this.logger.log(`TX Hash: ${txHash}`);
      this.logger.log(`Chain: ${this.chain.name} (ID: ${this.chain.id})`);
      this.logger.log(`RPC: ${this.config.rpcUrl}`);
      this.logger.log(`Expected To: ${expectedTo}`);
      this.logger.log(`Expected Amount: ${expectedAmount} ${currency}`);
      this.logger.log(`========================================`);

      // Best practice: Wait for transaction to be mined and confirmed
      // Poll for up to 60 seconds (BSC block time ~3s, so this covers ~20 blocks)
      const MAX_WAIT_MS = 60000;
      const POLL_INTERVAL_MS = 3000;
      const startTime = Date.now();

      let receipt: TransactionReceipt | null = null;
      let confirmations = 0;

      while (Date.now() - startTime < MAX_WAIT_MS) {
        receipt = await this.getTransactionReceipt(txHash);

        if (receipt) {
          // Transaction found, now wait for confirmations
          confirmations = await this.getConfirmations(receipt.blockNumber);
          this.logger.log(`Transaction ${txHash}: ${confirmations}/${MIN_CONFIRMATIONS} confirmations`);

          if (confirmations >= MIN_CONFIRMATIONS) {
            break; // We have enough confirmations
          }
        } else {
          this.logger.log(`Waiting for transaction ${txHash} to be mined...`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      // Final check after waiting
      if (!receipt) {
        this.logger.error(`Transaction ${txHash} not found after ${MAX_WAIT_MS / 1000}s. Chain: ${this.chain.name}`);
        return { valid: false, error: 'Transaction not found. Please check the transaction hash and try again.' };
      }

      if (receipt.status !== 'success') {
        this.logger.error(`Transaction ${txHash} failed on chain`);
        return { valid: false, error: 'Transaction failed on chain' };
      }

      // Get final confirmation count
      confirmations = await this.getConfirmations(receipt.blockNumber);

      if (confirmations < MIN_CONFIRMATIONS) {
        this.logger.warn(`Transaction ${txHash} has only ${confirmations}/${MIN_CONFIRMATIONS} confirmations after timeout`);
        return {
          valid: false,
          confirmations,
          error: `Transaction needs more confirmations. Got: ${confirmations}, Required: ${MIN_CONFIRMATIONS}. Please wait a moment and try again.`,
        };
      }

      this.logger.log(`Transaction ${txHash} verified with ${confirmations} confirmations`);

      // Security: Get block timestamp to check transaction age
      const block = await this.publicClient.getBlock({ blockNumber: receipt.blockNumber });
      const blockTimestamp = new Date(Number(block.timestamp) * 1000);
      const ageMinutes = (Date.now() - blockTimestamp.getTime()) / (1000 * 60);

      if (ageMinutes > MAX_AGE_MINUTES) {
        return {
          valid: false,
          blockTimestamp,
          error: `Transaction too old. Must be within ${MAX_AGE_MINUTES} minutes. Transaction age: ${Math.round(ageMinutes)} minutes.`,
        };
      }

      // For BNB native transfers
      if (currency === 'BNB') {
        const tx = await this.publicClient.getTransaction({
          hash: txHash as Hex,
        });

        if (!tx) {
          return { valid: false, error: 'Transaction not found' };
        }

        const toAddress = tx.to?.toLowerCase();
        const expectedToLower = expectedTo.toLowerCase();

        if (toAddress !== expectedToLower) {
          return {
            valid: false,
            from: tx.from,
            to: tx.to || undefined,
            error: `Transaction sent to wrong address. Expected: ${expectedTo}, Got: ${tx.to}`,
          };
        }

        const sentAmount = formatUnits(tx.value, 18);
        const expectedAmountNum = parseFloat(expectedAmount);
        const sentAmountNum = parseFloat(sentAmount);

        // Security: Allow only 0.1% tolerance for rounding (not 1%)
        if (sentAmountNum < expectedAmountNum * 0.999) {
          return {
            valid: false,
            from: tx.from,
            to: tx.to || undefined,
            amount: sentAmount,
            confirmations,
            blockTimestamp,
            error: `Insufficient amount. Expected: ${expectedAmount}, Got: ${sentAmount}`,
          };
        }

        return {
          valid: true,
          from: tx.from,
          to: tx.to || undefined,
          amount: sentAmount,
          confirmations,
          blockTimestamp,
        };
      }

      // For ERC-20 tokens (USDT/USDC)
      // Use testnet addresses if on BSC Testnet (chain ID 97)
      const isTestnet = this.config.chainId === 97;
      const tokenAddress =
        currency === 'USDT'
          ? isTestnet
            ? '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd' // Testnet USDT
            : '0x55d398326f99059fF775485246999027B3197955' // Mainnet USDT
          : isTestnet
            ? '0x64544969ed7EBf5f083679233325356EbE738930' // Testnet USDC
            : '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'; // Mainnet USDC

      // Find Transfer event in logs
      const transferLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === tokenAddress.toLowerCase() &&
          log.topics[0] ===
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event signature
      );

      if (!transferLog) {
        return { valid: false, error: 'No token transfer found in transaction' };
      }

      // Decode Transfer event
      const from = '0x' + transferLog.topics[1]?.slice(26);
      const to = '0x' + transferLog.topics[2]?.slice(26);
      const amount = formatUnits(BigInt(transferLog.data), 18); // BSC USDT/USDC have 18 decimals

      if (to.toLowerCase() !== expectedTo.toLowerCase()) {
        return {
          valid: false,
          from,
          to,
          amount,
          error: `Token sent to wrong address. Expected: ${expectedTo}, Got: ${to}`,
        };
      }

      const sentAmountNum = parseFloat(amount);
      const expectedAmountNum = parseFloat(expectedAmount);

      // Security: Allow only 0.1% tolerance for rounding (not 1%)
      if (sentAmountNum < expectedAmountNum * 0.999) {
        return {
          valid: false,
          from,
          to,
          amount,
          confirmations,
          blockTimestamp,
          error: `Insufficient amount. Expected: ${expectedAmount}, Got: ${amount}`,
        };
      }

      return {
        valid: true,
        from,
        to,
        amount,
        confirmations,
        blockTimestamp,
      };
    } catch (error) {
      this.logger.error(`Failed to verify payment transaction: ${error.message}`);
      return { valid: false, error: `Verification failed: ${error.message}` };
    }
  }

  /**
   * Get HBCT balance of an address
   */
  async getHbctBalance(address: string): Promise<string> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.config.hbctTokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as Address],
      });
      return formatUnits(balance as bigint, this.config.hbctDecimals);
    } catch (error) {
      this.logger.error(`Failed to get HBCT balance: ${error.message}`);
      return '0';
    }
  }

  /**
   * Get withdrawal wallet HBCT balance
   */
  async getWithdrawalWalletBalance(): Promise<string> {
    if (!this.config.withdrawalWalletAddress) {
      return '0';
    }
    return this.getHbctBalance(this.config.withdrawalWalletAddress);
  }

  /**
   * Get withdrawal wallet BNB balance (for gas)
   */
  async getWithdrawalWalletBnbBalance(): Promise<string> {
    if (!this.config.withdrawalWalletAddress) {
      return '0';
    }
    try {
      const balance = await this.publicClient.getBalance({
        address: this.config.withdrawalWalletAddress as Address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      this.logger.error(`Failed to get BNB balance: ${error.message}`);
      return '0';
    }
  }

  /**
   * Send HBCT tokens for withdrawal
   */
  async sendHbctTransfer(toAddress: string, amount: string): Promise<TransferResult> {
    if (!this.walletClient || !this.withdrawalAccount) {
      return { success: false, error: 'Withdrawal wallet not configured' };
    }

    this.logger.log(`========================================`);
    this.logger.log(`SEND HBCT TRANSFER DEBUG`);
    this.logger.log(`To Address: ${toAddress}`);
    this.logger.log(`Amount (string): ${amount}`);
    this.logger.log(`Token Decimals: ${this.config.hbctDecimals}`);

    const amountInWei = parseUnits(amount, this.config.hbctDecimals);
    const tokenAddress = this.config.hbctTokenAddress as Address;

    this.logger.log(`Amount in Wei: ${amountInWei.toString()}`);
    this.logger.log(`Token Address: ${tokenAddress}`);
    this.logger.log(`========================================`);

    try {
      // Check withdrawal wallet balance first
      const balance = await this.getWithdrawalWalletBalance();
      if (parseFloat(balance) < parseFloat(amount)) {
        return { success: false, error: 'Insufficient HBCT balance in withdrawal wallet' };
      }

      // Check gas balance
      const bnbBalance = await this.getWithdrawalWalletBnbBalance();
      if (parseFloat(bnbBalance) < 0.001) {
        return { success: false, error: 'Insufficient BNB for gas in withdrawal wallet' };
      }

      // Get current gas price
      const gasPrice = await this.publicClient.getGasPrice();
      const maxGasPrice = BigInt(this.config.maxGasPrice);

      if (gasPrice > maxGasPrice) {
        return {
          success: false,
          error: `Gas price too high: ${formatUnits(gasPrice, 9)} gwei (max: ${formatUnits(maxGasPrice, 9)} gwei)`,
        };
      }

      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [toAddress as Address, amountInWei],
        account: this.withdrawalAccount,
      });

      // Send transaction
      const txHash = await this.walletClient.writeContract(request);

      this.logger.log(`Withdrawal transaction sent: ${txHash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status === 'success') {
        return {
          success: true,
          txHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
        };
      } else {
        return {
          success: false,
          txHash,
          error: 'Transaction reverted',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to send HBCT transfer: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Validate Ethereum/BSC address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Format amount with decimals
   */
  formatAmount(amount: bigint): string {
    return formatUnits(amount, this.config.hbctDecimals);
  }

  /**
   * Parse amount to wei
   */
  parseAmount(amount: string): bigint {
    return parseUnits(amount, this.config.hbctDecimals);
  }

  /**
   * Get chain name
   */
  getChainName(): string {
    return this.chain.name;
  }

  /**
   * Get block explorer URL for a transaction
   */
  getExplorerTxUrl(txHash: string): string {
    const baseUrl = this.chain.blockExplorers?.default?.url || 'https://bscscan.com';
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Get block explorer URL for an address
   */
  getExplorerAddressUrl(address: string): string {
    const baseUrl = this.chain.blockExplorers?.default?.url || 'https://bscscan.com';
    return `${baseUrl}/address/${address}`;
  }
}
