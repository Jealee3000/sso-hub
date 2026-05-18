import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GitHubStrategy } from './strategies/github.strategy';
import { ConfigService } from '../config/config.service';

@Controller()
export class AuthController {
  private readonly github: GitHubStrategy;

  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {
    this.github = new GitHubStrategy(
      this.config.githubClientId,
      this.config.githubClientSecret,
      `${this.config.ssoBaseUrl}/login/github/callback`,
    );
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
}
