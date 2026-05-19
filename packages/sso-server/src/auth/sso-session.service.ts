import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '../config/config.service';

interface SsoSession {
  userId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

@Injectable()
export class SsoSessionService {
  constructor(private config: ConfigService) {}

  /** Set SSO's own session cookie — marks user as authenticated on SSO */
  setSession(res: Response, user: SsoSession) {
    const token = jwt.sign(
      { sub: user.userId, email: user.email, name: user.displayName, picture: user.avatarUrl },
      this.config.jwtPrivateKey,
      { algorithm: 'RS256', expiresIn: '24h', issuer: this.config.ssoBaseUrl },
    );
    res.cookie('sso_sid', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  /** Check if user already has an active SSO session */
  getSession(req: Request): SsoSession | null {
    const token = req.cookies?.['sso_sid'];
    if (!token) return null;
    try {
      const payload = jwt.verify(token, this.config.jwtPublicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
      return {
        userId: payload.sub!,
        email: payload.email,
        displayName: payload.name,
        avatarUrl: payload.picture,
      };
    } catch {
      return null;
    }
  }

  clearSession(res: Response) {
    res.clearCookie('sso_sid', { path: '/' });
  }
}
