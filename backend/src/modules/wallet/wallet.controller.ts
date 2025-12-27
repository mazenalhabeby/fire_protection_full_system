import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { TransferMethod, Currency, WalletTransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../../common/decorators';
import { BalanceService, TransferService, LimitsService, HistoryService } from './services';
import {
  TransactionHistoryQueryDto,
  TransferHistoryQueryDto,
  TransactionSummaryQueryDto,
  ExportQueryDto,
  InitiateTransferDto,
  ConfirmTransferDto,
  GenerateQRCodeDto,
} from './dto';

@ApiTags('wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(
    private readonly balanceService: BalanceService,
    private readonly transferService: TransferService,
    private readonly limitsService: LimitsService,
    private readonly historyService: HistoryService,
  ) {}

  // ============================================
  // BALANCE ENDPOINTS
  // ============================================

  @Get('balances')
  @ApiOperation({ summary: 'Get all currency balances' })
  @ApiResponse({ status: 200, description: 'All currency balances' })
  async getAllBalances(@CurrentUser('id') userId: string) {
    return this.balanceService.getUserBalances(userId);
  }

  @Get('balances/:currency')
  @ApiOperation({ summary: 'Get balance for a specific currency' })
  @ApiResponse({ status: 200, description: 'Currency balance' })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  async getBalance(
    @CurrentUser('id') userId: string,
    @Param('currency') currency: 'HBCT' | 'BNB' | 'USDT' | 'USDC',
  ) {
    return this.balanceService.getBalance(userId, currency);
  }

  // ============================================
  // TRANSFER ENDPOINTS
  // ============================================

  @Post('transfers')
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 per hour
  @ApiOperation({ summary: 'Initiate an internal transfer' })
  @ApiResponse({ status: 201, description: 'Transfer initiated' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient balance' })
  async initiateTransfer(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiateTransferDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.getClientIp(req);
    return this.transferService.initiateTransfer({
      senderId: userId,
      recipientIdentifier: dto.recipientIdentifier,
      transferMethod: dto.transferMethod,
      currency: dto.currency,
      amount: new Decimal(dto.amount),
      note: dto.note,
      ipAddress,
    });
  }

  @Post('transfers/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a pending transfer with confirmation code' })
  @ApiResponse({ status: 200, description: 'Transfer confirmed and executed' })
  @ApiResponse({ status: 400, description: 'Invalid or expired confirmation code' })
  async confirmTransfer(
    @CurrentUser('id') userId: string,
    @Param('id') transferId: string,
    @Body() dto: ConfirmTransferDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.getClientIp(req);
    return this.transferService.confirmTransfer(
      transferId,
      dto.confirmationCode,
      userId,
      ipAddress,
    );
  }

  @Delete('transfers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending transfer' })
  @ApiResponse({ status: 200, description: 'Transfer cancelled' })
  @ApiResponse({ status: 400, description: 'Transfer cannot be cancelled' })
  async cancelTransfer(
    @CurrentUser('id') userId: string,
    @Param('id') transferId: string,
  ) {
    return this.transferService.cancelTransfer(transferId, userId);
  }

  @Get('transfers')
  @ApiOperation({ summary: 'Get transfer history' })
  @ApiResponse({ status: 200, description: 'Transfer history' })
  async getTransfers(
    @CurrentUser('id') userId: string,
    @Query() query: TransferHistoryQueryDto,
  ) {
    return this.transferService.getTransferHistory(userId, {
      currency: query.currency,
      status: query.status,
      direction: query.direction,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('transfers/pending')
  @ApiOperation({ summary: 'Get pending transfers' })
  @ApiResponse({ status: 200, description: 'Pending transfers' })
  async getPendingTransfers(@CurrentUser('id') userId: string) {
    const transfers = await this.transferService.getPendingTransfers(userId);
    return { transfers, total: transfers.length };
  }

  // ============================================
  // RECIPIENT LOOKUP ENDPOINT
  // ============================================

  @Get('lookup/:method/:identifier')
  @Throttle({ default: { limit: 50, ttl: 3600000 } }) // 50 per hour
  @ApiOperation({ summary: 'Lookup recipient by method and identifier' })
  @ApiResponse({ status: 200, description: 'Recipient found' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  async lookupRecipient(
    @CurrentUser('id') userId: string,
    @Param('method') method: TransferMethod,
    @Param('identifier') identifier: string,
  ) {
    const recipient = await this.transferService.lookupRecipient(method, identifier, userId);
    if (!recipient) {
      return { found: false, recipient: null };
    }
    return { found: true, recipient };
  }

  // ============================================
  // TRANSACTION HISTORY ENDPOINTS
  // ============================================

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionHistoryQueryDto,
  ) {
    return this.historyService.getTransactionHistory(userId, {
      currency: query.currency,
      type: query.type,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('transactions/summary')
  @ApiOperation({ summary: 'Get transaction summary (totals by period)' })
  @ApiResponse({ status: 200, description: 'Transaction summary' })
  async getTransactionSummary(
    @CurrentUser('id') userId: string,
    @Query() query: TransactionSummaryQueryDto,
  ) {
    return this.historyService.getTransactionSummary(userId, {
      currency: query.currency,
      period: query.period as 'day' | 'week' | 'month' | 'all',
    });
  }

  @Get('transactions/recent')
  @ApiOperation({ summary: 'Get recent transactions for dashboard' })
  @ApiResponse({ status: 200, description: 'Recent transactions' })
  async getRecentTransactions(@CurrentUser('id') userId: string) {
    const transactions = await this.historyService.getRecentActivity(userId, 5);
    return { transactions };
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(
    @CurrentUser('id') userId: string,
    @Param('id') transactionId: string,
  ) {
    return this.historyService.getTransaction(userId, transactionId);
  }

  // ============================================
  // EXPORT ENDPOINTS (Phase 3 - Stubs for now)
  // ============================================

  @Get('export/csv')
  @ApiOperation({ summary: 'Export transaction history as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file' })
  async exportCSV(
    @CurrentUser('id') userId: string,
    @Query() query: ExportQueryDto,
  ) {
    // TODO: Implement CSV export in Phase 3
    return {
      message: 'CSV export coming soon',
      userId,
      ...query,
    };
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export transaction history as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  async exportPDF(
    @CurrentUser('id') userId: string,
    @Query() query: ExportQueryDto,
  ) {
    // TODO: Implement PDF export in Phase 3
    return {
      message: 'PDF export coming soon',
      userId,
      ...query,
    };
  }

  // ============================================
  // TRANSFER LIMITS ENDPOINT
  // ============================================

  @Get('limits')
  @ApiOperation({ summary: 'Get user transfer limits' })
  @ApiResponse({ status: 200, description: 'Transfer limits' })
  async getTransferLimits(@CurrentUser('id') userId: string) {
    return this.limitsService.getUserLimits(userId);
  }

  // ============================================
  // QR CODE ENDPOINTS (Phase 2 - Stubs for now)
  // ============================================

  @Post('qr')
  @ApiOperation({ summary: 'Generate a QR code for receiving transfers' })
  @ApiResponse({ status: 201, description: 'QR code generated' })
  async generateQRCode(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateQRCodeDto,
  ) {
    // TODO: Implement QR code generation
    return {
      message: 'QR code generation coming soon',
      userId,
      ...dto,
    };
  }

  @Get('qr/:code')
  @ApiOperation({ summary: 'Get QR code details' })
  @ApiResponse({ status: 200, description: 'QR code details' })
  @ApiResponse({ status: 404, description: 'QR code not found' })
  async getQRCodeDetails(@Param('code') code: string) {
    // TODO: Implement QR code lookup
    return {
      message: 'QR code lookup coming soon',
      code,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return req.socket?.remoteAddress || req.ip || 'unknown';
  }
}
