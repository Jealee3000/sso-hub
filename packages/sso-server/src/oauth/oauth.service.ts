import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { createClient } from 'redis';
import { OAuthClient } from '../entities/oauth-client.entity';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtService } from './jwt.service';

interface AuthCodeData {
  userId: string;
  clientId: string;
  scopes: string[];
  redirectUri: string;
}

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthClient)
    private clientRepo: Repository<OAuthClient>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    @Inject('REDIS')
    private redis: ReturnType<typeof createClient>,
    private jwt: JwtService,
  ) {}

  async storeAuthCode(data: AuthCodeData): Promise<string> {
    const code = uuid();
    await this.redis.setEx(`auth_code:${code}`, 300, JSON.stringify(data));
    return code;
  }

  async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ) {
    const raw = await this.redis.get(`auth_code:${code}`);
    if (!raw) throw new UnauthorizedException('invalid_grant');

    const parsed: AuthCodeData = JSON.parse(raw);
    if (parsed.clientId !== clientId || parsed.redirectUri !== redirectUri) {
      throw new UnauthorizedException('invalid_grant');
    }

    const client = await this.clientRepo.findOne({ where: { clientId } });
    if (!client || !(await bcrypt.compare(clientSecret, client.clientSecret))) {
      throw new UnauthorizedException('invalid_client');
    }

    await this.redis.del(`auth_code:${code}`);

    const user = await this.userRepo.findOne({ where: { id: parsed.userId } });
    if (!user) throw new UnauthorizedException('invalid_grant');

    const accessToken = this.jwt.signAccessToken({
      sub: user.id,
      clientId: client.clientId,
      scopes: parsed.scopes,
    });

    const idToken = this.jwt.signIdToken({
      sub: user.id,
      email: user.email,
      name: user.displayName,
      avatarUrl: user.avatarUrl,
      aud: client.clientId,
    });

    const refreshValue = uuid();
    const refreshHash = await bcrypt.hash(refreshValue, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const saved = await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        token: refreshHash,
        clientId: client.id,
        userId: user.id,
        scopes: parsed.scopes,
        expiresAt,
      }),
    );

    await this.redis.setEx(
      `refresh_token:${saved.id}`,
      7 * 24 * 3600,
      JSON.stringify({
        clientId: client.clientId,
        userId: user.id,
        scopes: parsed.scopes,
        expiresAt: expiresAt.toISOString(),
      }),
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900,
      id_token: idToken,
      refresh_token: refreshValue,
    };
  }
}
