import { IsString } from 'class-validator';

export class TokenDto {
  @IsString()
  grant_type!: string;

  @IsString()
  code!: string;

  @IsString()
  redirect_uri!: string;

  @IsString()
  client_id!: string;

  @IsString()
  client_secret!: string;
}
