import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class ConfigService {
  get databaseUrl(): string {
    return process.env.DATABASE_URL!;
  }

  get redisUrl(): string {
    return process.env.REDIS_URL!;
  }

  get jwtPrivateKey(): string {
    if (process.env.JWT_PRIVATE_KEY) {
      return process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
    }
    const keyPath = process.env.JWT_PRIVATE_KEY_PATH || join(process.cwd(), 'jwt-private.pem');
    return readFileSync(keyPath, 'utf8');
  }

  get jwtPublicKey(): string {
    if (process.env.JWT_PUBLIC_KEY) {
      return process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
    }
    const keyPath = process.env.JWT_PUBLIC_KEY_PATH || join(process.cwd(), 'jwt-public.pem');
    return readFileSync(keyPath, 'utf8');
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
