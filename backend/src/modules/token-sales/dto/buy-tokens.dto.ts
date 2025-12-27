import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BuyTokensDto {
  @ApiProperty({ description: 'Amount in USD to spend', example: 100 })
  @IsNumber()
  @Min(1)
  amountUsd: number;

  @ApiProperty({ description: 'Current token price from frontend', example: 0.03 })
  @IsNumber()
  @Min(0.000001)
  tokenPrice: number;

  @ApiPropertyOptional({ description: 'Payment token symbol', example: 'BNB' })
  @IsString()
  @IsOptional()
  paymentToken?: string;

  @ApiPropertyOptional({ description: 'Affiliate referral code' })
  @IsString()
  @IsOptional()
  referralCode?: string;
}

export class GetQuoteDto {
  @ApiProperty({ description: 'Amount in USD to get quote for', example: 100 })
  @IsNumber()
  @Min(1)
  amountUsd: number;

  @ApiProperty({ description: 'Current token price', example: 0.03 })
  @IsNumber()
  @Min(0.000001)
  tokenPrice: number;
}
