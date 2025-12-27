import { IsString, IsNotEmpty, IsOptional, IsEthereumAddress, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetNonceDto {
  @ApiProperty({ description: 'Wallet address to get nonce for', example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  @IsNotEmpty()
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

export class WalletRegisterDto {
  @ApiProperty({ description: 'Wallet address', example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  @IsNotEmpty()
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
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Referral code from another user' })
  @IsString()
  @IsOptional()
  referralCode?: string;
}

export class WalletLinkDto {
  @ApiProperty({ description: 'Wallet address to link to existing account' })
  @IsString()
  @IsNotEmpty()
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
