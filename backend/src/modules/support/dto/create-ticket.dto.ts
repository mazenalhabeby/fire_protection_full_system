import { IsString, IsEnum, IsOptional, MinLength, MaxLength, IsEmail } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';
import { ToLowerCase } from '../../../common/utils/transforms';

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @ToLowerCase()
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  @ToLowerCase()
  message: string;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory = TicketCategory.GENERAL;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;
}

export class CreateGuestTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @ToLowerCase()
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  @ToLowerCase()
  message: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory = TicketCategory.GENERAL;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;
}

export class GuestTicketAccessDto {
  @IsString()
  ticketNumber: string;

  @IsEmail()
  email: string;
}

export class GuestReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  @ToLowerCase()
  content: string;

  @IsString()
  accessToken: string;
}
