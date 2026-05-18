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
    res.sendFile('login/index.html', { root: 'public' });
  }

  @Get('/login/github')
  loginGitHub(@Res() res: Response) {
    const state = Math.random().toString(36).substring(2);
    const authUrl = this.github.getAuthUrl(state);
    res.redirect(authUrl);
  }

  @Get('/login/github/callback')
  async loginGitHubCallback(
    @Query('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const profile = await this.github.getUserFromCode(code);
    const authCode = await this.authService.loginViaGitHub(
      profile,
      req.ip || '127.0.0.1',
    );
    res.json({ code: authCode });
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
    @Req() req: Request,
  ) {
    const valid = await this.wallet.verifySignature(nonce, signature, walletAddress);
    if (!valid) throw new UnauthorizedException('Invalid signature');

    const code = await this.authService.loginViaWallet(
      walletAddress,
      req.ip || '127.0.0.1',
    );
    return { code };
  }
}
