import { Controller, Get, Post, Body, Query, Req, Res, Inject, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { createClient } from 'redis';
import { AuthService } from './auth.service';
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
    @Inject('REDIS') private redis: ReturnType<typeof createClient>,
  ) {
    this.github = new GitHubStrategy(
      this.config.githubClientId,
      this.config.githubClientSecret,
      `${this.config.ssoBaseUrl}/login/github/callback`,
    );
    this.wallet = new WalletStrategy(this.redis);
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

    const authCode = await this.authService.loginViaGitHub(
      profile, req.ip || '127.0.0.1', clientId, redirectUri,
    );

    if (redirectUri) {
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state);
      res.redirect(redirectUrl.toString());
    } else {
      res.json({ code: authCode });
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
  ) {
    const valid = await this.wallet.verifySignature(nonce, signature, walletAddress);
    if (!valid) throw new UnauthorizedException('Invalid signature');

    const code = await this.authService.loginViaWallet(
      walletAddress, req.ip || '127.0.0.1', clientId, redirectUri,
    );
    return { code };
  }
}
