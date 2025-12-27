import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLockDto {
  @ApiProperty({ description: 'Amount of tokens to lock', example: 1000 })
  @IsNumber()
  @Min(100, { message: 'Minimum lock amount is 100 tokens' })
  amount: number;

  @ApiProperty({ description: 'Lock tier ID', example: 'tier-6m' })
  @IsString()
  lockTierId: string;
}
