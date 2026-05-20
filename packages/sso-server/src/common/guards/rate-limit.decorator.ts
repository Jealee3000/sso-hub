import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  window: number; // seconds
  max: number;    // max requests in window
}

export const RateLimit = (window: number, max: number) =>
  SetMetadata(RATE_LIMIT_KEY, { window, max } as RateLimitOptions);
