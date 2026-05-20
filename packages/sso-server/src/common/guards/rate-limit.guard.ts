import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient } from 'redis';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject('REDIS') private redis: ReturnType<typeof createClient>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const ip = req.ip;
    const endpoint =
      (req.originalUrl || req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';
    const now = Date.now();
    const windowStart = now - options.window * 1000;
    const key = `rate:${ip}:${endpoint}`;
    const member = `${now}:${Math.random().toString(36).substring(2, 10)}`;

    // Sliding window: add current request, remove old entries, count remaining
    await this.redis.zAdd(key, { score: now, value: member });
    await this.redis.zRemRangeByScore(key, 0, windowStart);
    const count = await this.redis.zCard(key);
    await this.redis.expire(key, options.window);

    if (count > options.max) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
