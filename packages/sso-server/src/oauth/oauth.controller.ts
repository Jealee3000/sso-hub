import {
  Controller, Get, Post, Query, Body, HttpCode, Headers,
  UnauthorizedException, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthService } from './oauth.service';
import { ConfigService } from '../config/config.service';
import { JwtService } from './jwt.service';
import { AuthorizeDto } from './dto/authorize.dto';
import { TokenDto } from './dto/token.dto';
import { User } from '../entities/user.entity';

@Controller()
export class OAuthController {
  constructor(
    private oauth: OAuthService,
    private config: ConfigService,
    private jwt: JwtService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Get('/authorize')
  getAuthorize(@Query() query: AuthorizeDto, @Res() res: Response) {
    const params = new URLSearchParams({
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
      response_type: query.response_type,
      scope: query.scope || 'openid profile',
      state: query.state,
    });
    res.redirect(`/login?${params.toString()}`);
  }

  @Post('/token')
  @HttpCode(200)
  async postToken(@Body() body: TokenDto) {
    return this.oauth.exchangeCode(
      body.code,
      body.client_id,
      body.client_secret,
      body.redirect_uri,
    );
  }

  @Get('/.well-known/openid-configuration')
  getOpenIdConfig() {
    const base = this.config.ssoBaseUrl;
    return {
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      userinfo_endpoint: `${base}/userinfo`,
      jwks_uri: `${base}/.well-known/jwks.json`,
      introspection_endpoint: `${base}/introspect`,
      revocation_endpoint: `${base}/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
    };
  }

  @Get('/.well-known/jwks.json')
  getJwks() {
    const crypto = require('crypto');
    const key = crypto.createPublicKey(this.config.jwtPublicKey);
    const jwk = key.export({ format: 'jwk' });
    return { keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid: 'default' }] };
  }

  @Get('/userinfo')
  async getUserInfo(@Headers('authorization') auth: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const payload = this.jwt.verify(auth.slice(7));
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return {
      sub: user.id,
      email: user.email,
      name: user.displayName,
      picture: user.avatarUrl,
    };
  }

  @Post('/introspect')
  async introspect(@Body('token') token: string) {
    try {
      return { active: true, ...this.jwt.verify(token) };
    } catch {
      return { active: false };
    }
  }

  @Post('/revoke')
  async revoke(@Body('token') token: string) {
    return {}; // Refresh token revocation will be enhanced later
  }
}
