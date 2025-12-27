import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  ValidateIf,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetQuoteDto {
  @ApiProperty({
    enum: ['BNB', 'USDT', 'USDC'],
    description: 'Payment currency',
  })
  @IsEnum(['BNB', 'USDT', 'USDC'], {
    message: 'Payment currency must be BNB, USDT, or USDC',
  })
  paymentCurrency: 'BNB' | 'USDT' | 'USDC';

  @ApiPropertyOptional({ description: 'Amount to spend in payment currency' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.?\d*$/, { message: 'Invalid payment amount format' })
  @ValidateIf((o) => !o.hbctAmount)
  paymentAmount?: string;

  @ApiPropertyOptional({ description: 'Amount of HBCT to receive' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.?\d*$/, { message: 'Invalid HBCT amount format' })
  @ValidateIf((o) => !o.paymentAmount)
  hbctAmount?: string;

  @ApiProperty({
    enum: ['OFF_CHAIN', 'ON_CHAIN'],
    description: 'Delivery method for purchased tokens',
  })
  @IsEnum(['OFF_CHAIN', 'ON_CHAIN'], {
    message: 'Delivery method must be OFF_CHAIN or ON_CHAIN',
  })
  deliveryMethod: 'OFF_CHAIN' | 'ON_CHAIN';
}

export class PurchaseOffChainDto {
  @ApiProperty({
    enum: ['BNB', 'USDT', 'USDC'],
    description: 'Payment currency',
  })
  @IsEnum(['BNB', 'USDT', 'USDC'], {
    message: 'Payment currency must be BNB, USDT, or USDC',
  })
  paymentCurrency: 'BNB' | 'USDT' | 'USDC';

  @ApiProperty({ description: 'Amount to spend in payment currency' })
  @IsString()
  @IsNotEmpty({ message: 'Payment amount is required' })
  @Matches(/^\d+\.?\d*$/, { message: 'Invalid payment amount format' })
  paymentAmount: string;

  @ApiPropertyOptional({ description: 'Affiliate referral code' })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class PurchaseOnChainDto extends PurchaseOffChainDto {
  @ApiProperty({ description: 'Destination wallet ID (UserWallet ID)' })
  @IsString()
  @IsNotEmpty({ message: 'Destination wallet is required for on-chain delivery' })
  destinationWalletId: string;
}

export class PurchaseHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ['OFF_CHAIN', 'ON_CHAIN'],
    description: 'Filter by delivery method',
  })
  @IsOptional()
  @IsEnum(['OFF_CHAIN', 'ON_CHAIN'])
  deliveryMethod?: 'OFF_CHAIN' | 'ON_CHAIN';

  @ApiPropertyOptional({
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
  status?: string;
}
