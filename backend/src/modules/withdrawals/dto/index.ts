import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches, MinLength } from 'class-validator';

export class RequestWithdrawalDto {
  @ApiProperty({
    description: 'Amount to withdraw',
    example: '1000',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'ID of the linked wallet to withdraw to (must be a verified wallet linked to your account)',
    example: 'clxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty({ message: 'Please select a linked wallet for withdrawal' })
  walletId: string;
}

export class ConfirmWithdrawalDto {
  @ApiProperty({
    description: 'Email confirmation code',
    example: 'A1B2C3',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  confirmationCode: string;
}

export class RejectWithdrawalDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Suspicious activity detected',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AdminWithdrawalFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toDate?: string;
}
