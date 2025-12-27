import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean = false;
}
