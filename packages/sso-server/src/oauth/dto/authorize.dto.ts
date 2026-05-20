import { IsString, IsOptional } from 'class-validator';

export class AuthorizeDto {
  @IsString()
  client_id!: string;

  @IsString()
  redirect_uri!: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  response_type!: string;

  @IsString()
  state!: string;

  @IsString()
  @IsOptional()
  code_challenge?: string;

  @IsString()
  @IsOptional()
  code_challenge_method?: string;

  @IsString()
  @IsOptional()
  prompt?: string;
}
