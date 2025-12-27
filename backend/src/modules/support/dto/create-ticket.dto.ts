import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory = TicketCategory.GENERAL;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;
}
