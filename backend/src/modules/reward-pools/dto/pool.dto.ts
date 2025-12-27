import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RewardPoolDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  allocation: string;

  @ApiProperty()
  reserved: string;

  @ApiProperty()
  distributed: string;

  @ApiProperty()
  available: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UpdatePoolDto {
  @ApiPropertyOptional({ description: 'Additional allocation to add' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  addAllocation?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class PoolStatsDto {
  @ApiProperty()
  totalAllocation: string;

  @ApiProperty()
  totalReserved: string;

  @ApiProperty()
  totalDistributed: string;

  @ApiProperty()
  totalAvailable: string;

  @ApiProperty({ type: () => [PoolBreakdownDto] })
  pools: PoolBreakdownDto[];
}

export class PoolBreakdownDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  allocation: string;

  @ApiProperty()
  reserved: string;

  @ApiProperty()
  distributed: string;

  @ApiProperty()
  available: string;

  @ApiProperty()
  usagePercent: string;
}
