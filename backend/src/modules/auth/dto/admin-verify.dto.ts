import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminVerifyDto {
  @ApiProperty({
    description: '2FA TOTP code or recovery code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 9) // 6 for TOTP, 9 for recovery code (XXXX-XXXX)
  code: string;
}

export class AdminVerifyResponseDto {
  @ApiProperty({ description: 'Whether verification was successful' })
  success: boolean;

  @ApiProperty({ description: 'Admin verification expiry time' })
  expiresAt: Date;

  @ApiProperty({ description: 'Redirect URL to admin panel' })
  redirectUrl: string;
}

export class AdminStatusResponseDto {
  @ApiProperty({ description: 'Whether user is an admin' })
  isAdmin: boolean;

  @ApiProperty({ description: 'Whether admin access is currently verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Whether 2FA is enabled (required for admin access)' })
  has2FAEnabled: boolean;

  @ApiProperty({ description: 'When admin verification expires', nullable: true })
  expiresAt: Date | null;
}
