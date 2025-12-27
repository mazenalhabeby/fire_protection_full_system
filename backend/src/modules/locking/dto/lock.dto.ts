import { ApiProperty } from '@nestjs/swagger';

export class LockTierDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lockMonths: number;

  @ApiProperty({ description: 'Bonus percentage', example: '15.00' })
  bonusPercent: string;

  @ApiProperty({ description: 'Fee discount percentage', example: '20.00' })
  feeDiscountPercent: string;

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
  page?: number;
  limit?: number;
  status?: string;
}
