import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient } from 'redis';
import { User } from '../../entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject('REDIS') private redis: ReturnType<typeof createClient>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const sid = req.cookies?.['sso_sid'];
    if (!sid) throw new ForbiddenException('Access denied');

    const raw = await this.redis.get(`sso_session:${sid}`);
    if (!raw) throw new ForbiddenException('Access denied');

    const session = JSON.parse(raw);
    const user = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!user?.isAdmin) throw new ForbiddenException('Access denied');

    return true;
  }
}
