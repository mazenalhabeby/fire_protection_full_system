import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  createPublicClient,
  createWalletClient,
  http,
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

  constructor(private readonly config: BlockchainConfigService) {
    this.chain = this.config.chainId === 56 ? bsc : bscTestnet;
  }

  async onModuleInit(): Promise<void> {
    await this.initializeClients();
  }

  private async initializeClients(): Promise<void> {
    // Create public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.config.rpcUrl, {
        retryCount: 3,
        retryDelay: 1000,
      }),
    });

    // Verify connection
    try {
      const blockNumber = await this.publicClient.getBlockNumber();
      this.logger.log(`Connected to ${this.chain.name}. Current block: ${blockNumber}`);
    } catch (error) {
      this.logger.error(`Failed to connect to blockchain: ${error.message}`);
      // Try fallback RPC if available
      if (this.config.rpcUrlFallback) {
        this.logger.log('Trying fallback RPC...');
        this.publicClient = createPublicClient({
          chain: this.chain,
          transport: http(this.config.rpcUrlFallback),
        });
        const blockNumber = await this.publicClient.getBlockNumber();
        this.logger.log(`Connected to fallback RPC. Current block: ${blockNumber}`);
      }
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
   */
  async getTransferEvents(fromBlock: bigint, toBlock: bigint): Promise<TransferEvent[]> {
    const tokenAddress = this.config.hbctTokenAddress as Address;
    const depositAddress = this.config.depositWalletAddress.toLowerCase();

    try {
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

        // Get block timestamp
        try {
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
    } catch (error) {
      this.logger.error(`Failed to get transfer events: ${error.message}`);
      throw error;
    }
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

    const amountInWei = parseUnits(amount, this.config.hbctDecimals);
    const tokenAddress = this.config.hbctTokenAddress as Address;

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
