import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '../config/config.service';

@Injectable()
export class JwtService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(private config: ConfigService) {
    this.privateKey = this.config.jwtPrivateKey;
    this.publicKey = this.config.jwtPublicKey;
  }

  signAccessToken(payload: { sub: string; clientId: string; scopes: string[] }): string {
    return jwt.sign(
      {
        sub: payload.sub,
        clientId: payload.clientId,
        scopes: payload.scopes,
        iat: Math.floor(Date.now() / 1000),
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '15m',
        issuer: this.config.ssoBaseUrl,
      },
    );
  }

  signIdToken(payload: {
    sub: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    aud: string;
  }): string {
    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.avatarUrl,
        iat: Math.floor(Date.now() / 1000),
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '15m',
        issuer: this.config.ssoBaseUrl,
        audience: payload.aud,
      },
    );
  }

  verify(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
  }
}
