import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { AdminService } from './admin.service';
import { BuybackService } from '../blockchain/buyback.service';
import {
  DashboardDto,
  UserQueryDto,
  UpdateUserRoleDto,
  TransactionQueryDto,
  CreateLockTierDto,
  UpdateLockTierDto,
  UpdateTokenConfigDto,
  AffiliateQueryDto,
  UpdateAffiliateDto,
  AdminLockQueryDto,
  AdminPurchaseQueryDto,
  AdminUpdateUserDto,
  BanUserDto,
  AssignRbacRoleDto,
  CreateAffiliateTierDto,
  UpdateAffiliateTierDto,
  DeleteUserDto,
  DeletedUsersQueryDto,
  AdminWalletQueryDto,
} from './dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly buybackService: BuybackService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  @ApiResponse({ status: 200, type: DashboardDto })
  async getDashboard(@Req() req: Request): Promise<DashboardDto> {
    // Get user permissions from request (attached by PermissionsGuard)
    const permissions = (req as any).userPermissions || [];
    return this.adminService.getDashboard(permissions);
  }

  @Get('users')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get all users' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/deleted')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get deleted users' })
  async getDeletedUsers(@Query() query: DeletedUsersQueryDto) {
    return this.adminService.getDeletedUsers(query);
  }

  @Patch('users/:id/role')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Update user legacy role (USER/ADMIN)' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Get('users/:id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get user details by ID' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Update user profile' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/ban')
  @RequirePermissions('users.ban')
  @ApiOperation({ summary: 'Ban or unban a user' })
  async banUser(
    @Param('id') id: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminService.banUser(id, dto.isBanned, dto.banReason);
  }

  @Delete('users/:id')
  @RequirePermissions('users.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user (soft delete with recovery options)' })
  async deleteUser(
    @Param('id') id: string,
    @Body() dto: DeleteUserDto,
    @Req() req: Request,
  ) {
    const adminId = (req as any).user?.id || 'admin';
    return this.adminService.deleteUser(id, {
      reason: dto.reason,
      requestedBy: adminId,
      adminNotes: dto.adminNotes,
      forceDelete: dto.forceDelete,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('users/:id/recover')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Recover a deleted user account' })
  async recoverDeletedUser(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const adminId = (req as any).user?.id || 'admin';
    return this.adminService.recoverDeletedUser(id, {
      recoveredBy: adminId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Patch('users/:id/rbac-role')
  @RequirePermissions('roles.assign')
  @ApiOperation({ summary: 'Assign RBAC role to user' })
  async assignRbacRole(
    @Param('id') id: string,
    @Body() dto: AssignRbacRoleDto,
  ) {
    return this.adminService.assignRbacRole(id, dto.roleId ?? null);
  }

  @Post('users/:id/revoke-sessions')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Revoke all user sessions' })
  async revokeUserSessions(@Param('id') id: string) {
    return this.adminService.revokeAllSessions(id);
  }

  @Get('transactions')
  @RequirePermissions('transactions.view')
  @ApiOperation({ summary: 'Get all transactions' })
  async getTransactions(@Query() query: TransactionQueryDto) {
    return this.adminService.getTransactions(query);
  }

  @Get('lock-tiers')
  @RequirePermissions('locks.view')
  @ApiOperation({ summary: 'Get all lock tiers' })
  async getLockTiers() {
    return this.adminService.getLockTiers();
  }

  @Post('lock-tiers')
  @RequirePermissions('locks.edit')
  @ApiOperation({ summary: 'Create new lock tier' })
  async createLockTier(@Body() dto: CreateLockTierDto) {
    return this.adminService.createLockTier(dto);
  }

  @Patch('lock-tiers/:id')
  @RequirePermissions('locks.edit')
  @ApiOperation({ summary: 'Update lock tier' })
  async updateLockTier(
    @Param('id') id: string,
    @Body() dto: UpdateLockTierDto,
  ) {
    return this.adminService.updateLockTier(id, dto);
  }

  // ============ AFFILIATE TIERS ============

  @Get('affiliate-tiers')
  @RequirePermissions('affiliates.view')
  @ApiOperation({ summary: 'Get all affiliate tiers' })
  async getAffiliateTiers() {
    return this.adminService.getAffiliateTiers();
  }

  @Post('affiliate-tiers')
  @RequirePermissions('affiliates.edit')
  @ApiOperation({ summary: 'Create new affiliate tier' })
  async createAffiliateTier(@Body() dto: CreateAffiliateTierDto) {
    return this.adminService.createAffiliateTier(dto);
  }

  @Patch('affiliate-tiers/:id')
  @RequirePermissions('affiliates.edit')
  @ApiOperation({ summary: 'Update affiliate tier' })
  async updateAffiliateTier(
    @Param('id') id: string,
    @Body() dto: UpdateAffiliateTierDto,
  ) {
    return this.adminService.updateAffiliateTier(id, dto);
  }

  @Get('token-config')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get token configuration' })
  async getTokenConfig() {
    return this.adminService.getTokenConfig();
  }

  @Patch('token-config')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update token configuration' })
  async updateTokenConfig(@Body() dto: UpdateTokenConfigDto) {
    return this.adminService.updateTokenConfig(dto);
  }

  @Get('system-stats')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Get system statistics' })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  // ============ AFFILIATE MANAGEMENT ============

  @Get('affiliates')
  @RequirePermissions('affiliates.view')
  @ApiOperation({ summary: 'Get all affiliates' })
  async getAffiliates(@Query() query: AffiliateQueryDto) {
    return this.adminService.getAffiliates(query);
  }

  @Get('affiliates/stats')
  @RequirePermissions('affiliates.view')
  @ApiOperation({ summary: 'Get affiliate statistics' })
  async getAffiliateStats() {
    return this.adminService.getAffiliateStats();
  }

  @Patch('affiliates/:id')
  @RequirePermissions('affiliates.edit')
  @ApiOperation({ summary: 'Update affiliate' })
  async updateAffiliate(
    @Param('id') id: string,
    @Body() dto: UpdateAffiliateDto,
  ) {
    return this.adminService.updateAffiliate(id, dto);
  }

  // ============ TOKEN LOCKS MANAGEMENT ============

  @Get('locks')
  @RequirePermissions('locks.view')
  @ApiOperation({ summary: 'Get all token locks' })
  async getLocks(@Query() query: AdminLockQueryDto) {
    return this.adminService.getLocks(query);
  }

  @Get('locks/stats')
  @RequirePermissions('locks.view')
  @ApiOperation({ summary: 'Get lock statistics' })
  async getLockStats() {
    return this.adminService.getLockStats();
  }

  // ============ TOKEN PURCHASES MANAGEMENT ============

  @Get('purchases')
  @RequirePermissions('purchases.view')
  @ApiOperation({ summary: 'Get all token purchases' })
  async getPurchases(@Query() query: AdminPurchaseQueryDto) {
    return this.adminService.getPurchases(query);
  }

  @Get('purchases/stats')
  @RequirePermissions('purchases.view')
  @ApiOperation({ summary: 'Get purchase statistics' })
  async getPurchaseStats() {
    return this.adminService.getPurchaseStats();
  }

  // ============ BUYBACK POOL MANAGEMENT ============

  @Get('buyback/stats')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get buyback pool statistics' })
  async getBuybackStats() {
    return this.buybackService.getStats();
  }

  @Get('buyback/config')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get buyback configuration' })
  async getBuybackConfig() {
    return this.buybackService.getConfig();
  }

  @Get('buyback/wallet')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get buyback wallet status and balances' })
  async getBuybackWallet() {
    return this.buybackService.getWalletStatus();
  }

  @Get('buyback/pending-total')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get total pending amount in BNB equivalent' })
  async getPendingTotal() {
    return this.buybackService.getTotalPendingInBnb();
  }

  @Get('buyback/check-ready')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Check if buyback wallet is ready to execute' })
  async checkBuybackReady() {
    return this.buybackService.checkWalletReady();
  }

  @Post('buyback/execute')
  @RequirePermissions('settings.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute pending buybacks (requires funded buyback wallet)' })
  async executePendingBuybacks() {
    // First check if wallet is ready
    const check = await this.buybackService.checkWalletReady();
    if (!check.ready) {
      return {
        success: false,
        message: check.message,
        shortfall: check.shortfall,
      };
    }

    // Execute and return results
    const result = await this.buybackService.processPendingBuybacks();
    return {
      ...result,
      message: result.success
        ? `Execution ${result.executionId}: Swapped ${result.totalBnbSwapped.toFixed(6)} BNB for ${result.totalHbctBought.toFixed(2)} HBCT (${result.totalProcessed} allocations)`
        : result.error || 'Execution failed',
    };
  }

  @Post('buyback/execute/:id')
  @RequirePermissions('settings.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a specific buyback allocation' })
  async executeBuyback(@Param('id') id: string) {
    return this.buybackService.executeBuyback(id);
  }

  @Get('buyback/verify-swap')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Verify swap configuration and liquidity pool' })
  async verifySwapConfig() {
    const pancakeSwap = (this.buybackService as any).pancakeSwap;
    return pancakeSwap.verifySwapConfig();
  }

  @Post('buyback/test-allocations')
  @RequirePermissions('settings.edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create test buyback allocations for testing' })
  async createTestAllocations() {
    return this.adminService.createTestBuybackAllocations();
  }

  @Get('buyback/allocations')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get all buyback allocations' })
  async getBuybackAllocations(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getBuybackAllocations({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('buyback/executions')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get all buyback executions with their allocations' })
  async getBuybackExecutions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.buybackService.getExecutions({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ============ WALLET MANAGEMENT ============

  @Get('wallets')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get all connected user wallets' })
  async getWallets(@Query() query: AdminWalletQueryDto) {
    return this.adminService.getWallets(query);
  }

  @Get('wallets/stats')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get wallet statistics' })
  async getWalletStats() {
    return this.adminService.getWalletStats();
  }

  @Get('wallets/:id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get wallet details by ID' })
  async getWalletById(@Param('id') id: string) {
    return this.adminService.getWalletById(id);
  }

  @Patch('wallets/:id')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Update wallet (label, primary status)' })
  async updateWallet(
    @Param('id') id: string,
    @Body() body: { label?: string; isPrimary?: boolean },
  ) {
    return this.adminService.updateWallet(id, body);
  }

  @Delete('wallets/:id')
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete a wallet' })
  async deleteWallet(@Param('id') id: string) {
    return this.adminService.deleteWallet(id);
  }

  @Post('wallets/:id/transfer')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Transfer wallet to another user' })
  async transferWallet(
    @Param('id') id: string,
    @Body() body: { newUserId: string },
  ) {
    return this.adminService.transferWallet(id, body.newUserId);
  }

  @Get('users/:userId/wallets')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get all wallets for a specific user' })
  async getUserWallets(@Param('userId') userId: string) {
    return this.adminService.getUserWallets(userId);
  }
}
