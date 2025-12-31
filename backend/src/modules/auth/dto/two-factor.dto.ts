import { IsString, Length, Matches, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ToLowerCase } from '../../../common/utils/transforms';

class TwoFactorLocationDto {
  @ApiPropertyOptional({ example: 48.2082, description: 'Latitude from browser geolocation' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 16.3738, description: 'Longitude from browser geolocation' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @ToLowerCase()
  city?: string;

  @IsOptional()
  @IsString()
  @ToLowerCase()
  country?: string;
}

export class VerifyTwoFactorDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code from authenticator app',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  token: string;
}

export class VerifyTwoFactorLoginDto {
  @ApiProperty({
    example: '123456 or ABCD-EFGH',
    description: '6-digit TOTP code or 9-character recovery code',
  })
  @IsString()
  @Length(6, 9)
  code: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code to confirm disable',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  token: string;
}

export class RegenerateRecoveryCodesDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code to confirm regeneration',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  token: string;
}

// For login flow - verify 2FA after password/wallet verification
export class TwoFactorLoginDto {
  @ApiProperty({
    description: 'Temporary 2FA challenge token from password/wallet verification',
  })
  @IsString()
  twoFactorToken: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code or recovery code',
  })
  @IsString()
  @Length(6, 9)
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TwoFactorLocationDto)
  location?: TwoFactorLocationDto;
}
