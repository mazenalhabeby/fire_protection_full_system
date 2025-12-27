import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class AffiliateProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  referralCode: string;

  @ApiProperty()
  commissionRate: string;

  @ApiProperty()
  totalEarnings: string;

  @ApiProperty()
  totalReferrals: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class AffiliateStatsDto {
  @ApiProperty()
  totalReferrals: number;

  @ApiProperty()
  totalEarnings: string;

  @ApiProperty()
  pendingEarnings: string;

  @ApiProperty()
  paidEarnings: string;

  @ApiProperty()
  thisMonthReferrals: number;

  @ApiProperty()
  thisMonthEarnings: string;
}

export class CommissionQueryDto {
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
}

export class WithdrawDto {
  @ApiProperty({ example: 100, description: 'Amount of tokens to withdraw' })
  @IsNumber()
  @Min(1)
  amount: number;
}
