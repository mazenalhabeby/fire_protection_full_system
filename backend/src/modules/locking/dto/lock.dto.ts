import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LockTierDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lockMonths: number;

  @ApiProperty({ description: 'Bonus percentage', example: '15.00' })
  bonusPercent: string;

  @ApiProperty({ description: 'Minimum lock amount', example: '100' })
  minAmount: string;

  @ApiProperty()
  isActive: boolean;
}

export class TokenLockDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  rewardAmount: string;

  @ApiProperty()
  claimedReward: string;

  @ApiProperty()
  tier: LockTierDto;
}

export class CreateLockResponseDto {
  @ApiProperty()
  lockId: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  tierName: string;

  @ApiProperty()
  lockMonths: number;

  @ApiProperty()
  bonusPercent: string;

  @ApiProperty()
  rewardAmount: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  status: string;
}

export class UnlockResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  unlockedAmount: string;

  @ApiProperty()
  rewardAmount: string;

  @ApiProperty()
  totalReceived: string;
}

export class LockRewardsSummaryDto {
  @ApiProperty()
  totalLocked: string;

  @ApiProperty()
  totalPendingRewards: string;

  @ApiProperty()
  totalClaimedRewards: string;

  @ApiProperty()
  activeLocks: number;

  @ApiProperty({ type: () => [TokenLockDto] })
  locks: TokenLockDto[];
}

export class LockQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class EarlyUnlockResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  unlockedAmount: string;

  @ApiProperty({ description: 'Total reward promised for full lock period' })
  totalReward: string;

  @ApiProperty({ description: 'Accrued reward based on time served (totalReward × completedPercent)' })
  accruedReward: string;

  @ApiProperty({ description: 'Penalty applied on accrued rewards' })
  penaltyAmount: string;

  @ApiProperty({ description: 'Penalty percentage applied on accrued rewards' })
  penaltyPercent: number;

  @ApiProperty({ description: 'Actual reward received after penalty (accruedReward - penaltyAmount)' })
  actualReward: string;

  @ApiProperty({ description: 'Total forfeited reward (unearned portion + penalty)' })
  forfeitedReward: string;

  @ApiProperty({ description: 'Total tokens received (principal + actualReward)' })
  totalReceived: string;

  @ApiProperty({ description: 'Percentage of lock period completed' })
  completedPercent: number;
}

export class CancelLockResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  refundedAmount: string;

  @ApiProperty({ description: 'Whether cancellation was within grace period (no penalty)' })
  wasGracePeriod: boolean;
}

export class LockHistoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['LOCK', 'UNLOCK', 'EARLY_UNLOCK', 'CANCEL'] })
  action: string;

  @ApiProperty()
  amount: string;

  @ApiProperty({ nullable: true })
  rewardAmount?: string;

  @ApiProperty({ nullable: true })
  penaltyAmount?: string;

  @ApiProperty()
  tierName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  metadata?: Record<string, unknown>;
}

export class LockHistoryResponseDto {
  @ApiProperty({ type: [LockHistoryDto] })
  history: LockHistoryDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class LockDetailsDto extends TokenLockDto {
  @ApiProperty({ description: 'Days remaining until unlock' })
  daysRemaining: number;

  @ApiProperty({ description: 'Percentage of lock period completed' })
  completedPercent: number;

  @ApiProperty({ description: 'Can be unlocked (period complete)' })
  canUnlock: boolean;

  @ApiProperty({ description: 'Can be cancelled (within grace period)' })
  canCancel: boolean;

  @ApiProperty({ description: 'Can early unlock (>= 50% complete and not yet mature)' })
  canEarlyUnlock: boolean;

  @ApiProperty({ description: 'Minimum completion percentage required for early unlock' })
  minEarlyUnlockPercent: number;

  @ApiProperty({ description: 'Early unlock penalty percentage if unlocked now' })
  earlyUnlockPenaltyPercent: number;

  @ApiProperty({ description: 'Accrued reward based on time served' })
  accruedReward: string;

  @ApiProperty({ description: 'Penalty amount if unlocked now' })
  penaltyAmount: string;

  @ApiProperty({ description: 'Estimated reward if unlocked now (after penalty)' })
  estimatedEarlyUnlockReward: string;
}
