import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ToLowerCase } from '../../../common/utils/transforms';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  @ToLowerCase()
  content: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean = false;
}
