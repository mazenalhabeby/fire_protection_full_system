import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ToLowerCase } from '../../../common/utils/transforms';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @ToLowerCase()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from email' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewSecurePassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPassword123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}

export class SetPasswordDto {
  @ApiProperty({ example: 'NewSecurePassword123!', description: 'Password to set for users without a password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ example: 'NewSecurePassword123!', description: 'Confirm password' })
  @IsString()
  confirmPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Verification token from email' })
  @IsString()
  token: string;
}

export class VerifyEmailCodeDto {
  @ApiProperty({ description: '6-digit verification code from email', example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Code must be 6 digits' })
  @MaxLength(6, { message: 'Code must be 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;
}
