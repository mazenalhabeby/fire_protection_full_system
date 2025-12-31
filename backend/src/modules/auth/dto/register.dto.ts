import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  ValidateNested,
  IsIn,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from './login.dto';
import { ToLowerCase } from '../../../common/utils/transforms';

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

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @ToLowerCase()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, and number or special character',
  })
  password: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @ToLowerCase()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
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

  @ApiPropertyOptional({ description: 'Browser geolocation data for accurate location' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
