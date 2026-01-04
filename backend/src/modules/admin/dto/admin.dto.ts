import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ToLowerCase } from '../../../common/utils/transforms';
import {
  PaginationDto,
  SearchablePaginationDto,
  StatusFilterPaginationDto,
} from '../../../common/dto';

// ============ DASHBOARD ============

export class DashboardDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalSalesUsd: string;

  @ApiProperty()
  totalTokensSold: string;

  @ApiProperty()
  totalLiquidityAdded: string;

  @ApiProperty()
  totalLockedTokens: string;

  @ApiProperty()
  totalRewardsDistributed: string;

  @ApiProperty()
  activeAirdrops: number;

  @ApiProperty()
  pendingOrders: number;

  @ApiProperty()
  affiliatePayouts: string;
}

// ============ USER QUERIES ============

export class UserQueryDto extends SearchablePaginationDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'ADMIN', enum: UserRole })
  @IsEnum(UserRole, { message: 'Role must be either USER or ADMIN' })
  role: UserRole;
}

export class DeletedUsersQueryDto extends SearchablePaginationDto {}

// ============ TRANSACTION QUERIES ============

export class TransactionQueryDto extends StatusFilterPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  userId?: string;
}

// ============ LOCK TIER DTOs ============

export class CreateLockTierDto {
  @ApiProperty({ example: '24 Months' })
  @IsString()
  @ToLowerCase()
  name: string;

  @ApiProperty({ example: 24 })
  @IsNumber()
  @Min(1)
  lockMonths: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  bonusPercent: number;

  @ApiProperty({ example: 50, description: 'Fee discount percentage (for future use)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  feeDiscountPercent?: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  minAmount: number;
}

export class UpdateLockTierDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @ToLowerCase()
  name?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  bonusPercent?: number;

  @ApiPropertyOptional({ description: 'Fee discount percentage (for future use)' })
  @IsNumber()
  @IsOptional()
  feeDiscountPercent?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ============ TOKEN CONFIG ============

export class UpdateTokenConfigDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  currentPrice?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPresale?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  presalePrice?: number;
}

// ============ AFFILIATE QUERIES ============

export class AffiliateQueryDto extends SearchablePaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tier?: string;
}

export class UpdateAffiliateDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tier?: string;
}

// ============ ADMIN LOCK QUERIES ============

export class AdminLockQueryDto extends StatusFilterPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

// ============ ADMIN PURCHASE QUERIES ============

export class AdminPurchaseQueryDto extends StatusFilterPaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

// ============ USER MANAGEMENT DTOs ============

export class AdminUpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;
}

export class BanUserDto {
  @ApiProperty()
  @IsBoolean()
  isBanned: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  banReason?: string;
}

export class AssignRbacRoleDto {
  @ApiPropertyOptional({ description: 'Role ID to assign, or null to remove role' })
  @IsOptional()
  @IsString()
  roleId?: string | null;
}

export class AdjustBalanceDto {
  @ApiProperty({ description: 'Amount to add (positive) or deduct (negative)' })
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason: string;
}

// ============ AFFILIATE TIER DTOs ============

export class CreateAffiliateTierDto {
  @ApiProperty({ example: 'Gold' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 0.10, description: 'Commission rate as decimal (0.10 = 10%)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate: number;

  @ApiProperty({ example: 10, description: 'Minimum referrals to qualify for this tier' })
  @IsNumber()
  @Min(0)
  minReferrals: number;

  @ApiPropertyOptional({ example: '#FFD700', description: 'Color for UI display' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class UpdateAffiliateTierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minReferrals?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============ ACCOUNT DELETION DTOs ============

export class DeleteUserDto {
  @ApiPropertyOptional({
    description: 'Reason for deletion',
    enum: ['user_requested', 'admin_action', 'fraud', 'inactive', 'compliance'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reason?: string;

  @ApiPropertyOptional({ description: 'Internal admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'Skip balance/lock checks (for fraud/compliance cases)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceDelete?: boolean;
}
