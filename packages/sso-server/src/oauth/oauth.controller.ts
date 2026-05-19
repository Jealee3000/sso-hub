import {
  Controller, Get, Post, Query, Body, HttpCode, Headers,
  UnauthorizedException, Res, Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthService } from './oauth.service';
import { ConfigService } from '../config/config.service';
import { JwtService } from './jwt.service';
import { SsoSessionService } from '../auth/sso-session.service';
import { AuthorizeDto } from './dto/authorize.dto';
import { TokenDto } from './dto/token.dto';
import { User } from '../entities/user.entity';

@Controller()
export class OAuthController {
  constructor(
    private oauth: OAuthService,
    private config: ConfigService,
    private jwt: JwtService,
    private ssoSession: SsoSessionService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Get('/authorize')
  async getAuthorize(
    @Query() query: AuthorizeDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ssoUser = await this.ssoSession.getSession(req);

    if (ssoUser) {
      // 已有 SSO 登录态 → 展示确认页面，让用户选择是否用当前账户
      return res.send(renderConfirmPage(ssoUser, query));
    }

    // 无 SSO 登录态 → 跳转登录页
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
    try {
      if (body.grant_type === 'refresh_token') {
        return await this.oauth.refreshTokenGrant(
          body.refresh_token!,
          body.client_id,
          body.client_secret,
        );
      }
      return await this.oauth.exchangeCode(
        body.code!,
        body.client_id,
        body.client_secret,
        body.redirect_uri!,
      );
    } catch (err) {
      console.error('Token exchange error:', err);
      throw err;
    }
  }

  @Get('/authorize/confirm')
  async confirmAuthorize(
    @Query() query: AuthorizeDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ssoUser = await this.ssoSession.getSession(req);
    if (!ssoUser) {
      // 没登录，跳回登录页
      const params = new URLSearchParams({
        client_id: query.client_id,
        redirect_uri: query.redirect_uri,
        response_type: query.response_type,
        scope: query.scope || 'openid profile',
        state: query.state,
      });
      return res.redirect(`/login?${params}`);
    }
    // 用户确认 → 签发 auth_code
    const code = await this.oauth.storeAuthCode({
      userId: ssoUser.userId,
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      scopes: (query.scope || 'openid profile').split(' '),
    });
    const redirectUrl = new URL(query.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', query.state);
    return res.redirect(redirectUrl.toString());
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
    return {};
  }
}

function renderConfirmPage(
  ssoUser: { userId: string; email?: string; displayName?: string; avatarUrl?: string },
  query: AuthorizeDto,
): string {
  const name = ssoUser.displayName || ssoUser.email || ssoUser.userId.slice(0, 8);
  const avatar = ssoUser.avatarUrl
    ? `<img src="${ssoUser.avatarUrl}" style="width:64px;height:64px;border-radius:50%;border:2px solid #334155;" alt="" />`
    : `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#8896a9" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>`;

  const continueUrl = `/authorize/confirm?${new URLSearchParams(query as any).toString()}`;
  const resetUrl = `/logout?redirect=${encodeURIComponent('/authorize?' + new URLSearchParams(query as any).toString())}`;

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>SSO Hub</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#060912;color:#e8edf5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#111827;border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;border:1px solid #1e293b;box-shadow:0 24px 80px rgba(0,0,0,0.5)}
  h1{font-size:20px;margin-bottom:4px}
  .sub{color:#8896a9;font-size:14px;margin-bottom:24px}
  .user{display:flex;align-items:center;gap:12px;background:#0b0f1a;border-radius:12px;padding:16px;margin-bottom:24px;text-align:left}
  .user .name{font-size:15px;font-weight:600}
  .user .email{font-size:13px;color:#8896a9}
  .btn{display:block;width:100%;padding:12px;border-radius:10px;border:none;cursor:pointer;font-size:15px;text-decoration:none;margin-bottom:10px;transition:all .15s}
  .btn:hover{transform:translateY(-1px)}
  .btn-primary{background:linear-gradient(135deg,#00d4ff,#00b4d8);color:#060912;font-weight:600}
  .btn-ghost{background:transparent;color:#8896a9;font-size:13px}
  .logo{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px}
  .logo svg{color:#00d4ff}
  .logo span{font-size:24px;font-weight:700;letter-spacing:-0.5px}
</style></head><body>
<div class="card">
  <div class="logo">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    <span>SSO Hub</span>
  </div>
  <h1>继续登录</h1>
  <p class="sub">使用当前已登录的 SSO 账户</p>
  <div class="user">
    ${avatar}
    <div>
      <div class="name">${name}</div>
      ${ssoUser.email ? `<div class="email">${ssoUser.email}</div>` : ''}
    </div>
  </div>
  <a class="btn btn-primary" href="${continueUrl}">继续以 ${name} 登录</a>
  <a class="btn btn-ghost" href="${resetUrl}">使用其他账户</a>
</div>
</body></html>`;
}
