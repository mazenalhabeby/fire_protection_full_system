import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AirdropTaskDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: string; // 'social_follow', 'social_share', 'hold_tokens', 'referral', etc.

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  requiredAmount?: number; // For hold_tokens task

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  url?: string; // For social tasks
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Launch Airdrop' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(1)
  totalAllocation: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  perUserAmount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxParticipants?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endAt?: string;

  @ApiPropertyOptional({ type: () => [AirdropTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AirdropTaskDto)
  @IsOptional()
  tasks?: AirdropTaskDto[];
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string; // DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endAt?: string;
}

export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  totalAllocation: string;

  @ApiProperty()
  reserved: string;

  @ApiProperty()
  distributed: string;

  @ApiPropertyOptional()
  perUserAmount?: string | null;

  @ApiPropertyOptional()
  maxParticipants?: number | null;

  @ApiPropertyOptional()
  startAt?: Date | null;

  @ApiPropertyOptional()
  endAt?: Date | null;

  @ApiPropertyOptional()
  tasks?: AirdropTaskDto[] | unknown;

  @ApiProperty()
  participantCount: number;

  @ApiProperty()
  createdAt: Date;
}

export class ParticipateDto {
  @ApiProperty({ description: 'Wallet address for receiving airdrop' })
  @IsString()
  walletAddress: string;
}

export class CompleteTaskDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  proof?: string; // Optional proof of task completion
}

export class EntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  campaignId: string;

  @ApiProperty()
  walletAddress: string;

  @ApiProperty()
  allocatedAmount: string;

  @ApiProperty()
  isEligible: boolean;

  @ApiProperty()
  isDistributed: boolean;

  @ApiPropertyOptional()
  tasksCompleted?: Record<string, boolean> | unknown;

  @ApiProperty()
  createdAt: Date;
}
