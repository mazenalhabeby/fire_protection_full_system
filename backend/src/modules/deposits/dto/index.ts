import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { OnchainDepositStatus } from '@prisma/client';

export class DepositResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  userId: string | null;

  @ApiProperty()
  txHash: string;

  @ApiProperty()
  fromAddress: string;

  @ApiProperty()
  toAddress: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  blockNumber: string;

  @ApiPropertyOptional()
  blockTimestamp: Date | null;

  @ApiProperty()
  chainId: number;

  @ApiProperty({ enum: OnchainDepositStatus })
  status: OnchainDepositStatus;

  @ApiProperty()
  confirmations: number;

  @ApiPropertyOptional()
  creditedAt: Date | null;

  @ApiPropertyOptional()
  failureReason: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  explorerUrl: string;
}

export class DepositListResponseDto {
  @ApiProperty({ type: [DepositResponseDto] })
  deposits: DepositResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class AdminDepositFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: OnchainDepositStatus })
  @IsOptional()
  @IsEnum(OnchainDepositStatus)
  status?: OnchainDepositStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class MapDepositDto {
  @ApiProperty({
    description: 'User ID to map the deposit to',
    example: 'clxyz123456789',
  })
  @IsString()
  userId: string;
}

export class DepositStatsResponseDto {
  @ApiProperty()
  totalDeposits: number;

  @ApiProperty()
  totalAmount: string;

  @ApiProperty()
  pendingCount: number;

  @ApiProperty()
  creditedCount: number;

  @ApiProperty()
  unmappedCount: number;
}

export class ListenerStatusResponseDto {
  @ApiProperty()
  isRunning: boolean;

  @ApiProperty()
  pollingInterval: number;
}
