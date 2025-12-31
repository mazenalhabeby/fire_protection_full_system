import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ToLowerCase } from '../../../common/utils/transforms';

export class ContactFormDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @ToLowerCase()
  name: string;

  @IsEmail()
  @ToLowerCase()
  email: string;

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
}
