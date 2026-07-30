import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUnknownTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
