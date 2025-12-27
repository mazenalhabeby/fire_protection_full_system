import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional, Min, IsIn } from 'class-validator';

export class StakingPlanDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lockPeriodDays: number;

  @ApiProperty()
  apy: number;

  @ApiProperty()
  minAmount: number;
}

export class CreateStakeDto {
  @ApiProperty({ example: 1000, description: 'Amount of tokens to stake' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 30, description: 'Lock period in days (30, 90, 180, 365)' })
  @IsNumber()
  @IsIn([30, 90, 180, 365])
  lockPeriodDays: number;
}

export class StakeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  lockPeriod: number;

  @ApiProperty()
  apy: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  totalRewards: string;

  @ApiProperty()
  claimedRewards: string;

  @ApiProperty()
  pendingRewards: string;
}

export class StakeQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  status?: string;
}

export class RewardsDto {
  @ApiProperty()
  totalPending: string;

  @ApiProperty()
  totalClaimed: string;

  @ApiProperty()
  stakes: {
    stakeId: string;
    pendingRewards: string;
  }[];
}
