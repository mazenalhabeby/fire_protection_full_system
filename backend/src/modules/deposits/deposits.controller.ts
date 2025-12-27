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
    return this.depositsService.checkUserDeposits(req.user.userId);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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

  @Post('admin/:id/map')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Map deposit to user' })
  @ApiResponse({ status: 200, description: 'Deposit mapped successfully' })
  @ApiResponse({ status: 404, description: 'Deposit or user not found' })
  async mapDepositToUser(
    @Param('id') depositId: string,
    @Body('userId') userId: string,
  ) {
    return this.depositsService.mapDepositToUser(depositId, userId);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get deposit statistics' })
  @ApiResponse({ status: 200, description: 'Returns deposit statistics' })
  async getStats() {
    return this.depositsService.getDepositStats();
  }

  @Get('admin/listener/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get deposit listener status' })
  @ApiResponse({ status: 200, description: 'Returns listener status' })
  async getListenerStatus() {
    return this.listenerService.getStatus();
  }

  @Post('admin/listener/start')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Start deposit listener' })
  @ApiResponse({ status: 200, description: 'Listener started' })
  async startListener() {
    this.listenerService.startListening();
    return { message: 'Deposit listener started' };
  }

  @Post('admin/listener/stop')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Stop deposit listener' })
  @ApiResponse({ status: 200, description: 'Listener stopped' })
  async stopListener() {
    this.listenerService.stopListening();
    return { message: 'Deposit listener stopped' };
  }

  @Post('admin/process')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Manually trigger deposit processing' })
  @ApiResponse({ status: 200, description: 'Processing triggered' })
  async triggerProcessing() {
    const count = await this.depositsService.processNewDeposits();
    return { message: `Processed ${count} deposits` };
  }
}
