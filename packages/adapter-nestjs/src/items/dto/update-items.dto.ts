import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateItemsDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;
}
