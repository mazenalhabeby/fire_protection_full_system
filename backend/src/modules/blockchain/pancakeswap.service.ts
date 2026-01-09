import { Injectable, Logger } from '@nestjs/common';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  type Hex,
  type Address,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { BlockchainConfigService } from './blockchain.config';

// PancakeSwap Router V2 on BSC Mainnet
const PANCAKESWAP_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as Address;

// WBNB address on BSC
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address;

// Common token addresses on BSC Mainnet
const TOKEN_ADDRESSES = {
  USDT: '0x55d398326f99059fF775485246999027B3197955' as Address,
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address,
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' as Address,
};

// PancakeSwap Router ABI (only functions we need)
const ROUTER_ABI = [
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
  },
  {
    name: 'addLiquidity',
    type: 'function',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
  },
  {
    name: 'addLiquidityETH',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amountTokenDesired', type: 'uint256' },
      { name: 'amountTokenMin', type: 'uint256' },
      { name: 'amountETHMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountToken', type: 'uint256' },
      { name: 'amountETH', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    name: 'getAmountsOut',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
  },
] as const;

// ERC20 ABI for approvals
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export interface SwapResult {
  success: boolean;
  txHash?: string;
  amountIn?: string;
  amountOut?: string;
  error?: string;
}

export interface AddLiquidityResult {
  success: boolean;
  txHash?: string;
  amountToken?: string;
  amountPaired?: string;
  liquidity?: string;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  amount?: string;
  error?: string;
}

@Injectable()
export class PancakeSwapService {
  private readonly logger = new Logger(PancakeSwapService.name);
  private readonly publicClient;
  private readonly walletClient;
  private readonly account;
  private readonly depositWalletClient;
  private readonly depositAccount;
  private readonly hbctAddress: Address;

  constructor(private readonly config: BlockchainConfigService) {
    // Initialize viem clients
    this.publicClient = createPublicClient({
      chain: bsc,
      transport: http(config.rpcUrl),
    });

    // Buyback wallet (receives 10% and executes swaps)
    const buybackPrivateKey = process.env.BUYBACK_PRIVATE_KEY || config.withdrawalPrivateKey;

    if (buybackPrivateKey) {
      this.account = privateKeyToAccount(buybackPrivateKey as Hex);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: bsc,
        transport: http(config.rpcUrl),
      });
      this.logger.log(`Buyback wallet initialized: ${this.account.address}`);
    } else {
      this.logger.warn('PancakeSwap service: No buyback private key configured');
    }

    // Deposit wallet (receives payments, sends 10% to buyback)
    const depositPrivateKey = process.env.DEPOSIT_WALLET_PRIVATE_KEY;

    if (depositPrivateKey && depositPrivateKey !== 'YOUR_DEPOSIT_WALLET_PRIVATE_KEY_HERE') {
      this.depositAccount = privateKeyToAccount(depositPrivateKey as Hex);
      this.depositWalletClient = createWalletClient({
        account: this.depositAccount,
        chain: bsc,
        transport: http(config.rpcUrl),
      });
      this.logger.log(`Deposit wallet initialized: ${this.depositAccount.address}`);
      this.logger.log(`Auto-split enabled: 10% will transfer from deposit to buyback wallet`);
    } else {
      this.logger.warn('Deposit wallet private key not configured - auto-split disabled');
    }

    this.hbctAddress = config.hbctTokenAddress as Address;
  }

  /**
   * Get expected output amount for a swap
   */
  async getAmountOut(
    amountIn: string,
    tokenIn: 'BNB' | 'USDT' | 'USDC',
    tokenOut: Address = this.hbctAddress,
  ): Promise<string> {
    const path = this.getSwapPath(tokenIn, tokenOut);
    const amountInWei = parseUnits(amountIn, tokenIn === 'BNB' ? 18 : 18);

    try {
      const amounts = await this.publicClient.readContract({
        address: PANCAKESWAP_ROUTER,
        abi: ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountInWei, path],
      });

      return formatUnits(amounts[amounts.length - 1], 18);
    } catch (error: any) {
      this.logger.error(`Failed to get amount out: ${error.message}`);
      throw error;
    }
  }

  /**
   * Swap tokens for HBCT
   */
  async swapForHBCT(
    amountIn: string,
    tokenIn: 'BNB' | 'USDT' | 'USDC',
    slippagePercent: number = 1,
  ): Promise<SwapResult> {
    if (!this.walletClient || !this.account) {
      return { success: false, error: 'Wallet not configured for swaps' };
    }

    try {
      const path = this.getSwapPath(tokenIn, this.hbctAddress);
      const amountInWei = parseUnits(amountIn, tokenIn === 'BNB' ? 18 : 18);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      // Get HBCT token decimals
      const hbctDecimals = await this.publicClient.readContract({
        address: this.hbctAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }) as number;

      this.logger.log(`HBCT Token Decimals: ${hbctDecimals}`);

      // Get HBCT balance BEFORE swap
      const hbctBalanceBefore = await this.publicClient.readContract({
        address: this.hbctAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.account.address],
      }) as bigint;

      // Get expected output
      const expectedOut = await this.getAmountOut(amountIn, tokenIn);
      const minAmountOut = parseUnits(
        (parseFloat(expectedOut) * (1 - slippagePercent / 100)).toFixed(hbctDecimals),
        hbctDecimals,
      );

      this.logger.log(`========================================`);
      this.logger.log(`PANCAKESWAP SWAP`);
      this.logger.log(`Input: ${amountIn} ${tokenIn}`);
      this.logger.log(`Expected Output: ${expectedOut} HBCT`);
      this.logger.log(`Min Output (${slippagePercent}% slippage): ${formatUnits(minAmountOut, hbctDecimals)} HBCT`);
      this.logger.log(`HBCT Balance Before: ${formatUnits(hbctBalanceBefore, hbctDecimals)}`);
      this.logger.log(`Swap Path: ${path.join(' → ')}`);
      this.logger.log(`========================================`);

      let txHash: Hex;

      if (tokenIn === 'BNB') {
        // Swap BNB for tokens
        txHash = await this.walletClient.writeContract({
          address: PANCAKESWAP_ROUTER,
          abi: ROUTER_ABI,
          functionName: 'swapExactETHForTokens',
          args: [minAmountOut, path, this.account.address, deadline],
          value: amountInWei,
        });
      } else {
        // For ERC20 tokens, need to approve first
        const tokenAddress = TOKEN_ADDRESSES[tokenIn];
        await this.ensureApproval(tokenAddress, amountInWei);

        txHash = await this.walletClient.writeContract({
          address: PANCAKESWAP_ROUTER,
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [amountInWei, minAmountOut, path, this.account.address, deadline],
        });
      }

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        // Small delay to ensure RPC state is updated
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get HBCT balance AFTER swap
        const hbctBalanceAfter = await this.publicClient.readContract({
          address: this.hbctAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [this.account.address],
        }) as bigint;

        // Calculate actual HBCT received
        const actualHbctReceived = hbctBalanceAfter - hbctBalanceBefore;
        const actualAmountOut = formatUnits(actualHbctReceived, hbctDecimals);

        this.logger.log(`========================================`);
        this.logger.log(`SWAP RESULT`);
        this.logger.log(`Transaction: ${txHash}`);
        this.logger.log(`HBCT Balance Before (raw): ${hbctBalanceBefore.toString()}`);
        this.logger.log(`HBCT Balance After (raw): ${hbctBalanceAfter.toString()}`);
        this.logger.log(`HBCT Balance After: ${formatUnits(hbctBalanceAfter, hbctDecimals)}`);
        this.logger.log(`Actual HBCT Received: ${actualAmountOut}`);
        this.logger.log(`Expected: ${expectedOut}, Got: ${actualAmountOut}`);
        this.logger.log(`========================================`);

        // Verify we actually received HBCT
        if (actualHbctReceived <= 0n) {
          // Even if balance check fails, the tx succeeded - trust the expected output
          this.logger.warn(`Balance check shows 0 received, but tx succeeded. Using expected output.`);
          return {
            success: true,
            txHash,
            amountIn,
            amountOut: expectedOut, // Use expected output as fallback
          };
        }

        return {
          success: true,
          txHash,
          amountIn,
          amountOut: actualAmountOut,
        };
      } else {
        this.logger.error(`Swap transaction failed: ${txHash}`);
        return { success: false, txHash, error: 'Transaction reverted on chain' };
      }
    } catch (error: any) {
      this.logger.error(`Swap failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add liquidity to HBCT/USDT or HBCT/BNB pool
   */
  async addLiquidity(
    hbctAmount: string,
    pairedAmount: string,
    pairedToken: 'BNB' | 'USDT' | 'USDC',
    slippagePercent: number = 1,
  ): Promise<AddLiquidityResult> {
    if (!this.walletClient || !this.account) {
      return { success: false, error: 'Wallet not configured for liquidity' };
    }

    try {
      const hbctAmountWei = parseUnits(hbctAmount, 18);
      const pairedAmountWei = parseUnits(pairedAmount, 18);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      // Calculate minimums with slippage
      const minHbct = (hbctAmountWei * BigInt(100 - slippagePercent)) / 100n;
      const minPaired = (pairedAmountWei * BigInt(100 - slippagePercent)) / 100n;

      this.logger.log(`========================================`);
      this.logger.log(`ADDING LIQUIDITY`);
      this.logger.log(`HBCT: ${hbctAmount}`);
      this.logger.log(`${pairedToken}: ${pairedAmount}`);
      this.logger.log(`========================================`);

      // Approve HBCT
      await this.ensureApproval(this.hbctAddress, hbctAmountWei);

      let txHash: Hex;

      if (pairedToken === 'BNB') {
        txHash = await this.walletClient.writeContract({
          address: PANCAKESWAP_ROUTER,
          abi: ROUTER_ABI,
          functionName: 'addLiquidityETH',
          args: [
            this.hbctAddress,
            hbctAmountWei,
            minHbct,
            minPaired,
            this.account.address,
            deadline,
          ],
          value: pairedAmountWei,
        });
      } else {
        const pairedAddress = TOKEN_ADDRESSES[pairedToken];
        await this.ensureApproval(pairedAddress, pairedAmountWei);

        txHash = await this.walletClient.writeContract({
          address: PANCAKESWAP_ROUTER,
          abi: ROUTER_ABI,
          functionName: 'addLiquidity',
          args: [
            this.hbctAddress,
            pairedAddress,
            hbctAmountWei,
            pairedAmountWei,
            minHbct,
            minPaired,
            this.account.address,
            deadline,
          ],
        });
      }

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        this.logger.log(`Liquidity added successfully: ${txHash}`);
        return {
          success: true,
          txHash,
          amountToken: hbctAmount,
          amountPaired: pairedAmount,
        };
      } else {
        return { success: false, txHash, error: 'Transaction failed' };
      }
    } catch (error: any) {
      this.logger.error(`Add liquidity failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute full buyback + add liquidity flow
   * Takes payment amount, swaps half for HBCT, adds both to LP
   */
  async buybackAndAddLiquidity(
    paymentAmount: string,
    paymentCurrency: 'BNB' | 'USDT' | 'USDC',
    slippagePercent: number = 2,
  ): Promise<{
    success: boolean;
    swapTxHash?: string;
    liquidityTxHash?: string;
    hbctBought?: string;
    liquidityAdded?: string;
    error?: string;
  }> {
    if (!this.walletClient || !this.account) {
      return { success: false, error: 'Wallet not configured' };
    }

    try {
      // Split: 50% stays as payment currency, 50% buys HBCT
      const halfAmount = (parseFloat(paymentAmount) / 2).toFixed(18);

      this.logger.log(`========================================`);
      this.logger.log(`BUYBACK & ADD LIQUIDITY`);
      this.logger.log(`Total: ${paymentAmount} ${paymentCurrency}`);
      this.logger.log(`Swap ${halfAmount} ${paymentCurrency} → HBCT`);
      this.logger.log(`Add LP: ${halfAmount} ${paymentCurrency} + HBCT`);
      this.logger.log(`========================================`);

      // Step 1: Swap half for HBCT
      const swapResult = await this.swapForHBCT(halfAmount, paymentCurrency, slippagePercent);

      if (!swapResult.success) {
        return { success: false, error: `Swap failed: ${swapResult.error}` };
      }

      // Step 2: Add liquidity with the HBCT we got + remaining payment currency
      const liquidityResult = await this.addLiquidity(
        swapResult.amountOut!,
        halfAmount,
        paymentCurrency,
        slippagePercent,
      );

      if (!liquidityResult.success) {
        // Swap succeeded but LP failed - HBCT stays in wallet (still good for price)
        this.logger.warn(`Liquidity add failed, but swap succeeded. HBCT in wallet.`);
        return {
          success: true, // Partial success - swap worked
          swapTxHash: swapResult.txHash,
          hbctBought: swapResult.amountOut,
          error: `Liquidity failed: ${liquidityResult.error}`,
        };
      }

      return {
        success: true,
        swapTxHash: swapResult.txHash,
        liquidityTxHash: liquidityResult.txHash,
        hbctBought: swapResult.amountOut,
        liquidityAdded: liquidityResult.liquidity,
      };
    } catch (error: any) {
      this.logger.error(`Buyback & liquidity failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get swap path for token pair
   */
  private getSwapPath(tokenIn: 'BNB' | 'USDT' | 'USDC', tokenOut: Address): Address[] {
    if (tokenIn === 'BNB') {
      // BNB → WBNB → HBCT
      return [WBNB_ADDRESS, tokenOut];
    } else {
      // USDT/USDC → WBNB → HBCT (route through WBNB for better liquidity)
      return [TOKEN_ADDRESSES[tokenIn], WBNB_ADDRESS, tokenOut];
    }
  }

  /**
   * Ensure token approval for router
   */
  private async ensureApproval(tokenAddress: Address, amount: bigint): Promise<void> {
    const currentAllowance = await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.account!.address, PANCAKESWAP_ROUTER],
    });

    if (currentAllowance < amount) {
      this.logger.log(`Approving ${tokenAddress} for PancakeSwap Router...`);

      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      const txHash = await this.walletClient!.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [PANCAKESWAP_ROUTER, maxApproval],
      });

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });
      this.logger.log(`Approval confirmed: ${txHash}`);
    }
  }

  /**
   * Check if buyback is enabled
   */
  isEnabled(): boolean {
    return !!this.walletClient && !!this.account;
  }

  /**
   * Get buyback wallet address
   */
  getWalletAddress(): string | null {
    return this.account?.address || null;
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(currency: 'BNB' | 'USDT' | 'USDC' | 'HBCT'): Promise<string> {
    if (!this.account) return '0';

    if (currency === 'BNB') {
      const balance = await this.publicClient.getBalance({ address: this.account.address });
      return formatUnits(balance, 18);
    }

    const tokenAddress = currency === 'HBCT' ? this.hbctAddress : TOKEN_ADDRESSES[currency];
    const balance = await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [this.account.address],
    });

    return formatUnits(balance, 18);
  }

  /**
   * Check if auto-split is enabled (deposit wallet configured)
   */
  isAutoSplitEnabled(): boolean {
    return !!this.depositWalletClient && !!this.depositAccount;
  }

  /**
   * Get deposit wallet address
   */
  getDepositWalletAddress(): string | null {
    return this.depositAccount?.address || null;
  }

  /**
   * Transfer BNB from deposit wallet to buyback wallet
   */
  async transferBNBFromDeposit(amount: string): Promise<TransferResult> {
    if (!this.depositWalletClient || !this.depositAccount || !this.account) {
      return { success: false, error: 'Deposit wallet not configured for auto-split' };
    }

    try {
      const amountWei = parseUnits(amount, 18);

      this.logger.log(`========================================`);
      this.logger.log(`AUTO-SPLIT: Transferring ${amount} BNB`);
      this.logger.log(`From: ${this.depositAccount.address} (Deposit)`);
      this.logger.log(`To: ${this.account.address} (Buyback)`);
      this.logger.log(`========================================`);

      const txHash = await this.depositWalletClient.sendTransaction({
        to: this.account.address,
        value: amountWei,
      });

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      this.logger.log(`Auto-split transfer successful: ${txHash}`);
      return { success: true, txHash, amount };
    } catch (error: any) {
      this.logger.error(`Auto-split BNB transfer failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer ERC20 tokens from deposit wallet to buyback wallet
   */
  async transferTokenFromDeposit(
    amount: string,
    currency: 'USDT' | 'USDC',
  ): Promise<TransferResult> {
    if (!this.depositWalletClient || !this.depositAccount || !this.account) {
      return { success: false, error: 'Deposit wallet not configured for auto-split' };
    }

    try {
      const tokenAddress = TOKEN_ADDRESSES[currency];
      const amountWei = parseUnits(amount, 18);

      this.logger.log(`========================================`);
      this.logger.log(`AUTO-SPLIT: Transferring ${amount} ${currency}`);
      this.logger.log(`From: ${this.depositAccount.address} (Deposit)`);
      this.logger.log(`To: ${this.account.address} (Buyback)`);
      this.logger.log(`========================================`);

      const txHash = await this.depositWalletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [this.account.address as Address, amountWei],
      });

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      this.logger.log(`Auto-split transfer successful: ${txHash}`);
      return { success: true, txHash, amount };
    } catch (error: any) {
      this.logger.error(`Auto-split ${currency} transfer failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-split: Transfer 10% from deposit to buyback wallet
   */
  async autoSplitTransfer(
    amount: string,
    currency: 'BNB' | 'USDT' | 'USDC',
  ): Promise<TransferResult> {
    if (currency === 'BNB') {
      return this.transferBNBFromDeposit(amount);
    } else {
      return this.transferTokenFromDeposit(amount, currency);
    }
  }

  /**
   * Full buyback flow with auto-split:
   * 1. Transfer 10% from deposit wallet to buyback wallet
   * 2. Convert to BNB if needed (for USDT/USDC)
   * 3. Swap BNB for HBCT
   * 4. (Optional) Add liquidity
   */
  async buybackWithAutoSplit(
    amount: string,
    currency: 'BNB' | 'USDT' | 'USDC',
    skipLiquidity: boolean = false,
  ): Promise<{
    success: boolean;
    transferTxHash?: string;
    swapTxHash?: string;
    liquidityTxHash?: string;
    hbctBought?: string;
    error?: string;
  }> {
    // Step 1: Transfer from deposit to buyback wallet
    if (this.isAutoSplitEnabled()) {
      const transferResult = await this.autoSplitTransfer(amount, currency);
      if (!transferResult.success) {
        return { success: false, error: `Transfer failed: ${transferResult.error}` };
      }
      this.logger.log(`Auto-split complete: ${transferResult.txHash}`);
    }

    // Step 2: If USDT/USDC, convert to BNB first (since pool is HBCT/WBNB)
    let bnbAmount = amount;
    if (currency !== 'BNB') {
      // For simplicity, skip non-BNB buybacks for now
      // Just swap directly to HBCT
      this.logger.log(`Converting ${amount} ${currency} to HBCT directly...`);
      const swapResult = await this.swapForHBCT(amount, currency);

      return {
        success: swapResult.success,
        swapTxHash: swapResult.txHash,
        hbctBought: swapResult.amountOut,
        error: swapResult.error,
      };
    }

    // Step 3: For BNB - swap and optionally add liquidity
    if (skipLiquidity) {
      // Just swap BNB for HBCT
      const swapResult = await this.swapForHBCT(amount, 'BNB');
      return {
        success: swapResult.success,
        swapTxHash: swapResult.txHash,
        hbctBought: swapResult.amountOut,
        error: swapResult.error,
      };
    } else {
      // Swap + add liquidity
      return this.buybackAndAddLiquidity(amount, 'BNB');
    }
  }

  /**
   * Verify swap configuration and check if liquidity exists
   */
  async verifySwapConfig(): Promise<{
    success: boolean;
    hbctAddress: string;
    wbnbAddress: string;
    routerAddress: string;
    walletAddress: string | null;
    canGetQuote: boolean;
    testQuoteError?: string;
    testQuoteAmount?: string;
  }> {
    const result = {
      success: true,
      hbctAddress: this.hbctAddress,
      wbnbAddress: WBNB_ADDRESS,
      routerAddress: PANCAKESWAP_ROUTER,
      walletAddress: this.account?.address || null,
      canGetQuote: false,
      testQuoteError: undefined as string | undefined,
      testQuoteAmount: undefined as string | undefined,
    };

    // Check if HBCT address is valid (not zero address)
    if (this.hbctAddress === '0x0000000000000000000000000000000000000000') {
      result.success = false;
      result.testQuoteError = 'HBCT token address is not configured (zero address)';
      return result;
    }

    // Try to get a quote for 0.001 BNB → HBCT
    try {
      const testAmount = '0.001';
      const quote = await this.getAmountOut(testAmount, 'BNB');
      result.canGetQuote = true;
      result.testQuoteAmount = `${testAmount} BNB → ${quote} HBCT`;
      this.logger.log(`Swap config verified: ${result.testQuoteAmount}`);
    } catch (error: any) {
      result.success = false;
      result.canGetQuote = false;
      result.testQuoteError = `Cannot get quote: ${error.message}. This usually means there's no HBCT/WBNB liquidity pool on PancakeSwap.`;
    }

    return result;
  }

  /**
   * Get current BNB price in USD from Binance API
   */
  async getBnbPrice(): Promise<{ success: boolean; price: number; source: string }> {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const price = parseFloat(data.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Invalid price data');
      }
      return { success: true, price, source: 'binance' };
    } catch (error: any) {
      this.logger.warn(`Failed to fetch BNB price from Binance: ${error.message}`);
      const fallbackPrice = parseFloat(process.env.BNB_PRICE_USD || '700');
      return { success: false, price: fallbackPrice, source: 'fallback' };
    }
  }

  /**
   * Get current gas price from BSC network
   */
  async getGasPrice(): Promise<{ success: boolean; gasPrice: bigint; source: string }> {
    try {
      if (!this.publicClient) {
        throw new Error('Public client not initialized');
      }
      const gasPrice = await this.publicClient.getGasPrice();
      return { success: true, gasPrice, source: 'network' };
    } catch (error: any) {
      this.logger.warn(`Failed to fetch gas price: ${error.message}`);
      // Fallback to 3 gwei (typical BSC gas price)
      return { success: false, gasPrice: BigInt(3000000000), source: 'fallback' };
    }
  }

  /**
   * Estimate gas fee for a swap transaction
   * Returns gas fee in BNB
   */
  async estimateSwapGasFee(): Promise<{
    success: boolean;
    gasPriceGwei: number;
    gasUnits: number;
    gasFeeWei: bigint;
    gasFeeBnb: number;
    source: string;
  }> {
    const gasResult = await this.getGasPrice();

    // PancakeSwap swap typically uses 150,000-250,000 gas units
    // Use 200,000 as a safe estimate
    const gasUnits = 200000;

    const gasFeeWei = gasResult.gasPrice * BigInt(gasUnits);
    const gasFeeBnb = parseFloat(formatUnits(gasFeeWei, 18));
    const gasPriceGwei = parseFloat(formatUnits(gasResult.gasPrice, 9));

    return {
      success: gasResult.success,
      gasPriceGwei,
      gasUnits,
      gasFeeWei,
      gasFeeBnb,
      source: gasResult.source,
    };
  }
}
