import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, AdminGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { DepositsService } from './deposits.service';
import { DepositsListenerService } from './deposits.listener';
import { OnchainDepositStatus } from '@prisma/client';

@ApiTags('Deposits')
@Controller('deposits')
export class DepositsController {
  constructor(
    private readonly depositsService: DepositsService,
    private readonly listenerService: DepositsListenerService,
  ) {}

  // ============================================
  // USER ENDPOINTS
  // ============================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user deposits' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns user deposit history' })
  async getMyDeposits(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.depositsService.getUserDeposits(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('me/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get specific deposit by ID' })
  @ApiResponse({ status: 200, description: 'Returns deposit details' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  async getMyDepositById(@Request() req: any, @Param('id') id: string) {
    return this.depositsService.getDepositById(id, req.user.id);
  }

  @Post('check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check for new deposits from linked wallet' })
  @ApiResponse({ status: 200, description: 'Returns check result' })
  async checkMyDeposits(@Request() req: any) {
    return this.depositsService.checkUserDeposits(req.user.id);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify deposit by transaction hash' })
  @ApiResponse({ status: 200, description: 'Returns verification result' })
  async verifyDepositByTxHash(
    @Request() req: any,
    @Body('txHash') txHash: string,
  ) {
    return this.depositsService.verifyDepositByTxHash(req.user.id, txHash);
  }

  @Post('check-wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check deposits from specific wallet address' })
  @ApiResponse({ status: 200, description: 'Returns check result with transactions' })
  async checkWalletDeposits(
    @Request() req: any,
    @Body('walletAddress') walletAddress: string,
  ) {
    return this.depositsService.checkWalletDeposits(req.user.id, walletAddress);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all deposits with filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OnchainDepositStatus })
  @ApiQuery({ name: 'fromAddress', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns filtered deposits' })
  async getDeposits(
    @Query('userId') userId?: string,
    @Query('status') status?: OnchainDepositStatus,
    @Query('fromAddress') fromAddress?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.depositsService.getDeposits({
      userId,
      status,
      fromAddress,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('admin/unmapped')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get unmapped deposits' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns unmapped deposits' })
  async getUnmappedDeposits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.depositsService.getUnmappedDeposits(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('admin/locked')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get locked deposits (pending release)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns locked deposits' })
  async getLockedDeposits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.depositsService.getLockedDeposits(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('admin/:id/map')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.credit_manual')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Map deposit to user (auto-locks if wallet not verified)' })
  @ApiResponse({ status: 200, description: 'Deposit mapped successfully (may be locked for 24h)' })
  @ApiResponse({ status: 404, description: 'Deposit or user not found' })
  async mapDepositToUser(
    @Request() req: any,
    @Param('id') depositId: string,
    @Body('userId') userId: string,
  ) {
    return this.depositsService.mapDepositToUser(depositId, userId, req.user.id);
  }

  @Post('admin/:id/release')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.credit_manual')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Release a locked deposit early' })
  @ApiResponse({ status: 200, description: 'Deposit released successfully' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  async releasePendingDeposit(
    @Request() req: any,
    @Param('id') depositId: string,
    @Body('reason') reason: string,
  ) {
    return this.depositsService.releasePendingDeposit(depositId, req.user.id, reason);
  }

  @Get('admin/:id/balance-check')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get deposit details with user balance info' })
  @ApiResponse({ status: 200, description: 'Returns deposit with user balance info' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  async getDepositWithBalance(@Param('id') depositId: string) {
    return this.depositsService.getDepositWithUserBalance(depositId);
  }

  @Post('admin/:id/unmap')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.credit_manual')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Unmap deposit from user (reverse wrong mapping)' })
  @ApiResponse({ status: 200, description: 'Deposit unmapped successfully' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  async unmapDeposit(
    @Request() req: any,
    @Param('id') depositId: string,
    @Body('reason') reason: string,
    @Body('force') force?: boolean,
  ) {
    return this.depositsService.unmapDeposit(depositId, req.user.id, reason, force || false);
  }

  @Post('admin/:id/reassign')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.credit_manual')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Reassign deposit to different user' })
  @ApiResponse({ status: 200, description: 'Deposit reassigned successfully' })
  @ApiResponse({ status: 404, description: 'Deposit or user not found' })
  async reassignDeposit(
    @Request() req: any,
    @Param('id') depositId: string,
    @Body('userId') newUserId: string,
    @Body('reason') reason: string,
    @Body('force') force?: boolean,
  ) {
    return this.depositsService.reassignDeposit(depositId, newUserId, req.user.id, reason, force || false);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get deposit statistics' })
  @ApiResponse({ status: 200, description: 'Returns deposit statistics' })
  async getStats() {
    return this.depositsService.getDepositStats();
  }

  @Get('admin/listener/status')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get deposit listener status' })
  @ApiResponse({ status: 200, description: 'Returns listener status' })
  async getListenerStatus() {
    return this.listenerService.getStatus();
  }

  @Post('admin/listener/start')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Start deposit listener' })
  @ApiResponse({ status: 200, description: 'Listener started' })
  async startListener() {
    this.listenerService.startListening();
    return { message: 'Deposit listener started' };
  }

  @Post('admin/listener/stop')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Stop deposit listener' })
  @ApiResponse({ status: 200, description: 'Listener stopped' })
  async stopListener() {
    this.listenerService.stopListening();
    return { message: 'Deposit listener stopped' };
  }

  @Post('admin/process')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Manually trigger deposit processing' })
  @ApiResponse({ status: 200, description: 'Processing triggered' })
  async triggerProcessing() {
    const count = await this.depositsService.processNewDeposits();
    return { message: `Processed ${count} deposits` };
  }

  // ============================================
  // ADMIN: HISTORICAL SCAN ENDPOINTS
  // ============================================

  @Post('admin/lookup-tx')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.credit_manual')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Lookup and process a specific transaction by hash' })
  @ApiResponse({ status: 200, description: 'Transaction lookup result' })
  async lookupTransaction(@Body('txHash') txHash: string) {
    return this.depositsService.adminProcessTransactionByHash(txHash);
  }

  @Post('admin/scan/quick')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Quick scan last N hours for missed deposits' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Hours to scan (default 24, max 72)' })
  @ApiResponse({ status: 200, description: 'Quick scan result' })
  async quickScan(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.depositsService.adminQuickScan(hoursNum);
  }

  @Post('admin/scan/historical')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('deposits.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Full historical scan for missed deposits (takes time)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days to scan (default 7, max 30)' })
  @ApiResponse({ status: 200, description: 'Historical scan result' })
  async historicalScan(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.depositsService.adminScanHistoricalDeposits(daysNum);
  }
}
