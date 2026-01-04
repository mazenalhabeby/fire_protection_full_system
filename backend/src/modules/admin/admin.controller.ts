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
} from './dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
