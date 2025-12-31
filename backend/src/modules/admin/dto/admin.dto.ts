import { IsString, IsOptional, IsNumber, Min, Max, IsBoolean, IsEnum, MaxLength, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { ToLowerCase } from '../../../common/utils/transforms';

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

export class UserQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ToLowerCase()
  search?: string;

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

export class TransactionQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  userId?: string;
}

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

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(0)
  feeDiscountPercent: number;

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

  @ApiPropertyOptional()
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
