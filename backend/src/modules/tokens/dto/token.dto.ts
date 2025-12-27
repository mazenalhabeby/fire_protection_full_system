import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional, IsString, Min } from 'class-validator';

export class BuyTokenDto {
  @ApiProperty({ example: 100, description: 'Amount in USD to spend' })
  @IsNumber()
  @IsPositive()
  amountUsd: number;

  @ApiPropertyOptional({ example: 'REF123', description: 'Referral code' })
  @IsString()
  @IsOptional()
  referralCode?: string;
}

export class SellTokenDto {
  @ApiProperty({ example: 1000, description: 'Amount of tokens to sell' })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class TokenInfoDto {
  @ApiProperty()
  symbol: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  totalSupply: string;

  @ApiProperty()
  currentPrice: string;

  @ApiProperty()
  isPresale: boolean;

  @ApiProperty()
  presalePrice: string;
}

export class TokenBalanceDto {
  @ApiProperty()
  availableBalance: string;

  @ApiProperty()
  lockedBalance: string;

  @ApiProperty()
  totalBalance: string;
}

export class TransactionQueryDto {
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
  @IsString()
  @IsOptional()
  type?: string;
}
