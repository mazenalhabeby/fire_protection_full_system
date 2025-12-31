import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNumber, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ToLowerCase } from '../../../common/utils/transforms';

export class LocationDto {
  @ApiPropertyOptional({ example: 48.2082, description: 'Latitude from browser geolocation' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 16.3738, description: 'Longitude from browser geolocation' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 50, description: 'Accuracy in meters from browser geolocation' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ example: 'Linz', description: 'City from browser geolocation (optional, will be reverse geocoded)' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'AT', description: 'Country code from browser geolocation (optional, will be reverse geocoded)' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @ToLowerCase()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password: string;

  @ApiPropertyOptional({ description: 'Browser geolocation data for accurate location' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
