import { IsEnum, IsOptional, IsString, IsNumber, Min, Max, MaxLength, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { Currency, TransferMethod } from '@prisma/client';

export class InitiateTransferDto {
  @IsEnum(Currency)
  currency: Currency;

  @IsNumber()
  @Min(0.000001)
  @Type(() => Number)
  amount: number;

  @IsEnum(TransferMethod)
  transferMethod: TransferMethod;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  recipientIdentifier: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ConfirmTransferDto {
  @IsString()
  @IsNotEmpty()
  confirmationCode: string;
}

export class LookupRecipientDto {
  @IsEnum(TransferMethod)
  method: TransferMethod;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;
}

export class GenerateQRCodeDto {
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  @Type(() => Number)
  amount?: number;
}
