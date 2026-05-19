import { Controller, Get, Post, Body, Query, Req, Res, Inject, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { createClient } from 'redis';
import { AuthService } from './auth.service';
import { SsoSessionService } from './sso-session.service';
import { GitHubStrategy } from './strategies/github.strategy';
import { WalletStrategy } from './strategies/wallet.strategy';
import { ConfigService } from '../config/config.service';

@Controller()
export class AuthController {
  private readonly github: GitHubStrategy;
  private readonly wallet: WalletStrategy;

  constructor(
    private authService: AuthService,
    private config: ConfigService,
    private ssoSession: SsoSessionService,
    @Inject('REDIS') private redis: ReturnType<typeof createClient>,
  ) {
    this.github = new GitHubStrategy(
      this.config.githubClientId,
      this.config.githubClientSecret,
      `${this.config.ssoBaseUrl}/login/github/callback`,
    );
    this.wallet = new WalletStrategy(this.redis);
  }

  @Get('/')
  async getHomePage(@Req() req: Request, @Res() res: Response) {
    const ssoUser = await this.ssoSession.getSession(req);
    if (ssoUser) {
      const name = ssoUser.displayName || ssoUser.email || ssoUser.userId.slice(0, 8);
      const avatar = ssoUser.avatarUrl
        ? `<img src="${ssoUser.avatarUrl}" style="width:64px;height:64px;border-radius:50%;border:2px solid #334155;" alt="" />`
        : `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#8896a9" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>`;

      return res.send(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>SSO Hub</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#060912;color:#e8edf5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#111827;border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;border:1px solid #1e293b;box-shadow:0 24px 80px rgba(0,0,0,0.5)}
  h1{font-size:22px;margin-bottom:4px}
  .sub{color:#8896a9;font-size:14px;margin-bottom:24px}
  .user{display:flex;align-items:center;gap:12px;background:#0b0f1a;border-radius:12px;padding:16px;margin-bottom:20px;text-align:left}
  .name{font-size:15px;font-weight:600}
  .email{font-size:13px;color:#8896a9}
  .actions{display:flex;flex-direction:column;gap:10px}
  .btn{display:block;width:100%;padding:10px;border-radius:10px;border:none;cursor:pointer;font-size:14px;text-decoration:none;text-align:center;color:#fff}
  .btn-admin{background:#1e293b}
  .btn-logout{background:rgba(239,68,68,0.1);color:#ef4444}
  .divider{display:flex;align-items:center;gap:12px;margin:16px 0;color:#556478;font-size:12px}
  .divider::before,.divider::after{content:'';flex:1;border-top:1px solid #1e293b}
</style></head><body>
<div class="card">
  ${avatar}
  <h1>${name}</h1>
  <p class="sub">已登录 SSO Hub</p>
  <div class="user">
    <div style="width:100%">
      <div class="name">${name}</div>
      ${ssoUser.email ? `<div class="email">${ssoUser.email}</div>` : ''}
    </div>
  </div>
  <div class="actions">
    <a class="btn btn-admin" href="/admin">进入管理后台</a>
    <a class="btn btn-logout" href="/logout">退出登录</a>
  </div>
</div>
</body></html>`);
    }
    res.redirect('/login');
  }

  @Get('/login')
  getLoginPage(@Res() res: Response) {
    res.sendFile('index.html', { root: 'public' });
  }

  @Get('/admin')
  getAdminPage(@Res() res: Response) {
    res.sendFile('index.html', { root: 'public' });
  }

  @Get('/login/github')
  loginGitHub(
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Query('client_id') clientId: string,
    @Res() res: Response,
  ) {
    const ghState = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    this.redis.setEx(`oauth_ctx:${ghState}`, 600, JSON.stringify({
      redirectUri: redirectUri || '',
      state: state || '',
      clientId: clientId || '',
    }));
    const authUrl = this.github.getAuthUrl(ghState);
    res.redirect(authUrl);
  }

  @Get('/login/github/callback')
  async loginGitHubCallback(
    @Query('code') code: string,
    @Query('state') ghState: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const profile = await this.github.getUserFromCode(code);

    let clientId: string | undefined;
    let redirectUri: string | undefined;
    let state: string | undefined;
    const ctxStr = await this.redis.get(`oauth_ctx:${ghState}`);
    if (ctxStr) {
      const ctx = JSON.parse(ctxStr);
      clientId = ctx.clientId;
      redirectUri = ctx.redirectUri;
      state = ctx.state;
      await this.redis.del(`oauth_ctx:${ghState}`);
    }

    const result = await this.authService.loginViaGitHub(
      profile, req.ip || '127.0.0.1', clientId, redirectUri,
    );

    // 设置 SSO 自身登录态
    this.ssoSession.setSession(res, {
      userId: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      avatarUrl: result.user.avatarUrl,
    });

    if (redirectUri) {
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', result.code);
      if (state) redirectUrl.searchParams.set('state', state);
      res.redirect(redirectUrl.toString());
    } else {
      res.redirect('/');
    }
  }

  @Get('/logout')
  async ssoLogout(@Query('redirect') redirect: string, @Req() req: Request, @Res() res: Response) {
    await this.ssoSession.clearSession(res, req);
    if (redirect) {
      res.redirect(redirect);
    } else {
      res.json({ message: 'Logged out' });
    }
  }

  @Post('/login/wallet/nonce')
  async getWalletNonce(@Body('wallet_address') walletAddress: string) {
    const nonce = await this.wallet.generateNonce(walletAddress);
    return { nonce };
  }

  @Post('/login/wallet/verify')
  async loginWallet(
    @Body('nonce') nonce: string,
    @Body('signature') signature: string,
    @Body('wallet_address') walletAddress: string,
    @Body('client_id') clientId: string,
    @Body('redirect_uri') redirectUri: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const valid = await this.wallet.verifySignature(nonce, signature, walletAddress);
    if (!valid) throw new UnauthorizedException('Invalid signature');

    const result = await this.authService.loginViaWallet(
      walletAddress, req.ip || '127.0.0.1', clientId, redirectUri,
    );
    this.ssoSession.setSession(res, {
      userId: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      avatarUrl: result.user.avatarUrl,
    });
    return { code: result.code };
  }
}
