import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength, IsEthereumAddress, IsEmail, Matches } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Please enter a valid phone number' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '0x1234...' })
  @IsString()
  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string;
}

export class UpdateUsernameDto {
  @ApiProperty({
    example: 'john123',
    description: 'Unique username (3-20 chars, alphanumeric and underscores only)'
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(20, { message: 'Username cannot exceed 20 characters' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
    message: 'Username must start with a letter and contain only letters, numbers, and underscores'
  })
  username: string;
}

export class CheckUsernameDto {
  @ApiProperty({ example: 'john123' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: 'OldPass123!' })
  @IsString()
  currentPassword: string;

  @ApiPropertyOptional({ example: 'NewPass123!' })
  @IsString()
  newPassword: string;
}
