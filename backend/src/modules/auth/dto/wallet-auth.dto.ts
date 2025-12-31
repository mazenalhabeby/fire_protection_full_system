import { IsString, IsNotEmpty, IsOptional, IsEthereumAddress, MaxLength, ValidateNested, IsIn, IsNumber, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ToLowerCase } from '../../../common/utils/transforms';
import { LocationDto } from './login.dto';

// Valid referral sources for tracking
const REFERRAL_SOURCES = [
  'direct_link',
  'social_share',
  'qr_code',
  'email_campaign',
  'partner',
  'unknown',
] as const;

export type ReferralSource = typeof REFERRAL_SOURCES[number];

export class GetNonceDto {
  @ApiProperty({ description: 'Wallet address to get nonce for', example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  @IsNotEmpty()
  @IsEthereumAddress({ message: 'Invalid Ethereum wallet address format' })
  @ToLowerCase()
  walletAddress: string;
}

export class NonceResponseDto {
  @ApiProperty({ description: 'Nonce for wallet signature', example: 'Sign this message to authenticate...' })
  nonce: string;

  @ApiProperty({ description: 'Whether the wallet is already registered' })
  isRegistered: boolean;
}

export class WalletLoginDto {
  @ApiProperty({ description: 'Wallet address', example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  @IsNotEmpty()
  @IsEthereumAddress({ message: 'Invalid Ethereum wallet address format' })
  @ToLowerCase()
  walletAddress: string;

  @ApiProperty({ description: 'Signed message' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Original message that was signed' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Browser geolocation data for accurate location and VPN detection' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

export class WalletRegisterDto {
  @ApiProperty({ description: 'Wallet address', example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  @IsNotEmpty()
  @IsEthereumAddress({ message: 'Invalid Ethereum wallet address format' })
  @ToLowerCase()
  walletAddress: string;

  @ApiProperty({ description: 'Signed message' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Original message that was signed' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @ToLowerCase()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @ToLowerCase()
  lastName?: string;

  @ApiPropertyOptional({ example: 'ABC12345', description: 'Affiliate referral code (8 alphanumeric characters)' })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Za-z0-9]{8}$/, {
    message: 'Referral code must be exactly 8 alphanumeric characters',
  })
  referralCode?: string;

  @ApiPropertyOptional({
    example: 'direct_link',
    description: 'Source of the referral',
    enum: REFERRAL_SOURCES,
  })
  @IsString()
  @IsOptional()
  @IsIn(REFERRAL_SOURCES)
  referralSource?: ReferralSource;

  @ApiPropertyOptional({
    example: 1703980800000,
    description: 'Timestamp when referral was first captured (Unix ms)',
  })
  @IsNumber()
  @IsOptional()
  referralCapturedAt?: number;

  @ApiPropertyOptional({ description: 'Browser geolocation data for accurate location and VPN detection' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

export class WalletLinkDto {
  @ApiProperty({ description: 'Wallet address to link to existing account' })
  @IsString()
  @IsNotEmpty()
  @IsEthereumAddress({ message: 'Invalid Ethereum wallet address format' })
  @ToLowerCase()
  walletAddress: string;

  @ApiProperty({ description: 'Signed message' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Original message that was signed' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
