import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard, AdminGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SmartThrottleGuard, SmartThrottle } from '../../common/guards/smart-throttle.guard';
import { RequirePermissions } from '../../common/decorators';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsProcessorService } from './withdrawals.processor';
import { WithdrawalRequestStatus } from '@prisma/client';
import {
  RequestWithdrawalDto,
  ConfirmWithdrawalDto,
  RejectWithdrawalDto,
} from './dto';

@ApiTags('Withdrawals')
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    private readonly processorService: WithdrawalsProcessorService,
  ) {}

  // ============================================
  // USER ENDPOINTS
  // ============================================

  @Post('request')
  @UseGuards(JwtAuthGuard, SmartThrottleGuard)
  @SmartThrottle('withdrawal_create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a withdrawal to a linked wallet' })
  @ApiBody({ type: RequestWithdrawalDto })
  @ApiResponse({ status: 201, description: 'Withdrawal request created' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Wallet not linked or not verified' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded - check X-RateLimit headers' })
  async requestWithdrawal(
    @Request() req: any,
    @Body() dto: RequestWithdrawalDto,
    @Ip() ip: string,
  ) {
    return this.withdrawalsService.requestWithdrawal({
      userId: req.user.id,
      amount: dto.amount,
      walletId: dto.walletId,
      ipAddress: ip,
    });
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, SmartThrottleGuard)
  @SmartThrottle('withdrawal_confirm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm withdrawal with email code' })
  @ApiBody({ type: ConfirmWithdrawalDto })
  @ApiResponse({ status: 200, description: 'Withdrawal confirmed' })
  @ApiResponse({ status: 400, description: 'Invalid code or expired' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded - check X-RateLimit headers' })
  async confirmWithdrawal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ConfirmWithdrawalDto,
  ) {
    return this.withdrawalsService.confirmWithdrawal(
      id,
      req.user.id,
      dto.confirmationCode,
    );
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending withdrawal' })
  @ApiResponse({ status: 200, description: 'Withdrawal cancelled' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async cancelWithdrawal(@Request() req: any, @Param('id') id: string) {
    return this.withdrawalsService.cancelWithdrawal(id, req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user withdrawals' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns user withdrawal history' })
  async getMyWithdrawals(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.withdrawalsService.getUserWithdrawals(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('withdrawals.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all withdrawals with filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawalRequestStatus })
  @ApiQuery({ name: 'toAddress', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns filtered withdrawals' })
  async getWithdrawals(
    @Query('userId') userId?: string,
    @Query('status') status?: WithdrawalRequestStatus,
    @Query('toAddress') toAddress?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.withdrawalsService.getWithdrawals({
      userId,
      status,
      toAddress,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('withdrawals.approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Approve a withdrawal' })
  @ApiResponse({ status: 200, description: 'Withdrawal approved' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async approveWithdrawal(@Request() req: any, @Param('id') id: string) {
    return this.withdrawalsService.approveWithdrawal(id, req.user.id);
  }

  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('withdrawals.reject')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Reject a withdrawal' })
  @ApiBody({ type: RejectWithdrawalDto })
  @ApiResponse({ status: 200, description: 'Withdrawal rejected' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async rejectWithdrawal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.withdrawalsService.rejectWithdrawal(id, req.user.id, dto.reason);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('withdrawals.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get withdrawal statistics' })
  @ApiResponse({ status: 200, description: 'Returns withdrawal statistics' })
  async getStats() {
    return this.withdrawalsService.getWithdrawalStats();
  }

  @Get('admin/hot-wallet')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('withdrawals.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get hot wallet status' })
  @ApiResponse({ status: 200, description: 'Returns hot wallet info' })
  async getHotWalletStatus() {
    return this.withdrawalsService.getHotWalletStatus();
  }

  @Get('admin/processor/status')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('withdrawals.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get withdrawal processor status' })
  @ApiResponse({ status: 200, description: 'Returns processor status' })
  async getProcessorStatus() {
    return this.processorService.getStatus();
  }

  @Post('admin/processor/start')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('withdrawals.process')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Start withdrawal processor' })
  @ApiResponse({ status: 200, description: 'Processor started' })
  async startProcessor() {
    this.processorService.startProcessing();
    return { message: 'Withdrawal processor started' };
  }

  @Post('admin/processor/stop')
  @UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
  @RequirePermissions('withdrawals.process')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Stop withdrawal processor' })
  @ApiResponse({ status: 200, description: 'Processor stopped' })
  async stopProcessor() {
    this.processorService.stopProcessing();
    return { message: 'Withdrawal processor stopped' };
  }

  @Post('admin/processor/trigger')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Manually trigger withdrawal processing' })
  @ApiResponse({ status: 200, description: 'Processing triggered' })
  async triggerProcessing() {
    const count = await this.processorService.triggerProcessing();
    return { message: `Processed ${count} withdrawals` };
  }

  @Post('admin/:id/process')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Manually process a specific withdrawal' })
  @ApiResponse({ status: 200, description: 'Withdrawal processed' })
  async processWithdrawal(@Param('id') id: string) {
    return this.withdrawalsService.processWithdrawal(id);
  }
}
