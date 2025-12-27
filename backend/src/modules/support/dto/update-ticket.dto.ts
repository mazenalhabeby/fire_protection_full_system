import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

export class UpdateTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsString()
  @IsOptional()
  assignedTo?: string;
}
