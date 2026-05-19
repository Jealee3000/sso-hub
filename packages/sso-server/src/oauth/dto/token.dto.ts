import { IsString, IsOptional } from 'class-validator';

export class TokenDto {
  @IsString()
  grant_type!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @IsString()
  @IsOptional()
  refresh_token?: string;

  @IsString()
  client_id!: string;

  @IsString()
  client_secret!: string;
}
