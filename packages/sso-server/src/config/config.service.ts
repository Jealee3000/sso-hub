import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get databaseUrl(): string {
    return process.env.DATABASE_URL!;
  }

  get redisUrl(): string {
    return process.env.REDIS_URL!;
  }

  get jwtPrivateKey(): string {
    return process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n');
  }

  get jwtPublicKey(): string {
    return process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');
  }

  get githubClientId(): string {
    return process.env.GITHUB_CLIENT_ID!;
  }

  get githubClientSecret(): string {
    return process.env.GITHUB_CLIENT_SECRET!;
  }

  get ssoBaseUrl(): string {
    return process.env.SSO_BASE_URL || 'http://localhost:3000';
  }
}
