import { Injectable, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { createClient } from 'redis';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '../config/config.service';

export interface SsoSession {
  userId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

@Injectable()
export class SsoSessionService {
  constructor(
    @Inject('REDIS') private redis: ReturnType<typeof createClient>,
    private config: ConfigService,
  ) {}

  private get cookieSecure(): boolean {
    return process.env.COOKIE_SECURE === 'true';
  }

  setSession(res: Response, user: SsoSession) {
    const sid = uuid();
    const ttl = 7 * 24 * 3600;
    this.redis.setEx(`sso_session:${sid}`, ttl, JSON.stringify(user));
    this.redis.sAdd(`user_sessions:${user.userId}`, sid);
    this.redis.expire(`user_sessions:${user.userId}`, ttl);
    res.cookie('sso_sid', sid, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSecure ? 'strict' : 'lax',
      maxAge: ttl * 1000,
      path: '/',
    });
  }

  async getSession(req: Request): Promise<SsoSession | null> {
    const sid = req.cookies?.['sso_sid'];
    if (!sid) return null;
    const raw = await this.redis.get(`sso_session:${sid}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async clearSession(res: Response, req?: Request) {
    if (req) {
      const sid = req.cookies?.['sso_sid'];
      if (sid) await this.redis.del(`sso_session:${sid}`);
    }
    res.clearCookie('sso_sid', { path: '/' });
  }

  /** 管理员操作：强制清除指定用户的全部 SSO 会话 */
  async revokeUserSessions(userId: string) {
    // Redis 不支持按 value 扫描，用 SET 维护用户 → session 列表
    const key = `user_sessions:${userId}`;
    const members = await this.redis.sMembers(key);
    if (members.length) {
      const pipe = this.redis.multi();
      members.forEach((sid) => pipe.del(`sso_session:${sid}`));
      pipe.del(key);
      await pipe.exec();
    }
  }
}
