import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, RedisClientType } from 'redis';
import { User } from '../entities/user.entity';
import { UserIdentity } from '../entities/user-identity.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserIdentity)
    private identityRepo: Repository<UserIdentity>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    @Inject('REDIS')
    private redis: RedisClientType,
  ) {}

  async loginViaGitHub(
    profile: {
      providerUserId: string;
      email?: string;
      displayName?: string;
      avatarUrl?: string;
      raw: Record<string, unknown>;
    },
    ipAddress: string,
    clientId?: string,
    redirectUri?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string,
  ): Promise<{ code: string; user: { id: string; email?: string; displayName?: string; avatarUrl?: string } }> {
    let identity = await this.identityRepo.findOne({
      where: { provider: 'github', providerUserId: profile.providerUserId },
      relations: ['user'],
    });

    if (!identity) {
      const user = await this.userRepo.save(
        this.userRepo.create({
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        }),
      );

      identity = await this.identityRepo.save(
        this.identityRepo.create({
          userId: user.id,
          provider: 'github',
          providerUserId: profile.providerUserId,
          providerData: profile.raw,
        }),
      );

      identity.user = user;
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        userId: identity.user.id,
        action: 'login.github',
        ipAddress,
        details: { provider: 'github' },
      }),
    );

    const user = identity.user;
    const code = uuid();
    await this.redis.setEx(`auth_code:${code}`, 300, JSON.stringify({
      userId: user.id,
      clientId: clientId || '',
      redirectUri: redirectUri || '',
      scopes: ['openid', 'profile'],
      codeChallenge: codeChallenge || '',
      codeChallengeMethod: codeChallengeMethod || '',
    }));

    return { code, user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } };
  }

  async loginViaWallet(
    walletAddress: string,
    ipAddress: string,
    clientId?: string,
    redirectUri?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string,
  ): Promise<{ code: string; user: { id: string; email?: string; displayName?: string; avatarUrl?: string } }> {
    const normalizedAddress = walletAddress.toLowerCase();

    let identity = await this.identityRepo.findOne({
      where: { provider: 'wallet', providerUserId: normalizedAddress },
      relations: ['user'],
    });

    if (!identity) {
      const user = await this.userRepo.save(this.userRepo.create({}));
      identity = await this.identityRepo.save(
        this.identityRepo.create({
          userId: user.id,
          provider: 'wallet',
          providerUserId: normalizedAddress,
          providerData: { walletAddress: normalizedAddress },
        }),
      );
      identity.user = user;
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        userId: identity.user.id,
        action: 'login.wallet',
        ipAddress,
        details: { provider: 'wallet', walletAddress: normalizedAddress },
      }),
    );

    const user = identity.user;
    const code = uuid();
    await this.redis.setEx(`auth_code:${code}`, 300, JSON.stringify({
      userId: user.id,
      clientId: clientId || '',
      redirectUri: redirectUri || '',
      scopes: ['openid', 'profile'],
      codeChallenge: codeChallenge || '',
      codeChallengeMethod: codeChallengeMethod || '',
    }));

    return { code, user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } };
  }
}
