import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';
import {
  DashboardDto,
  UserQueryDto,
  UpdateUserRoleDto,
  TransactionQueryDto,
  CreateLockTierDto,
  UpdateLockTierDto,
  UpdateTokenConfigDto,
} from './dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  @ApiResponse({ status: 200, type: DashboardDto })
  async getDashboard(): Promise<DashboardDto> {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all transactions' })
  async getTransactions(@Query() query: TransactionQueryDto) {
    return this.adminService.getTransactions(query);
  }

  @Get('lock-tiers')
  @ApiOperation({ summary: 'Get all lock tiers' })
  async getLockTiers() {
    return this.adminService.getLockTiers();
  }

  @Post('lock-tiers')
  @ApiOperation({ summary: 'Create new lock tier' })
  async createLockTier(@Body() dto: CreateLockTierDto) {
    return this.adminService.createLockTier(dto);
  }

  @Patch('lock-tiers/:id')
  @ApiOperation({ summary: 'Update lock tier' })
  async updateLockTier(
    @Param('id') id: string,
    @Body() dto: UpdateLockTierDto,
  ) {
    return this.adminService.updateLockTier(id, dto);
  }

  @Get('token-config')
  @ApiOperation({ summary: 'Get token configuration' })
  async getTokenConfig() {
    return this.adminService.getTokenConfig();
  }

  @Patch('token-config')
  @ApiOperation({ summary: 'Update token configuration' })
  async updateTokenConfig(@Body() dto: UpdateTokenConfigDto) {
    return this.adminService.updateTokenConfig(dto);
  }

  @Get('system-stats')
  @ApiOperation({ summary: 'Get system statistics' })
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }
}
