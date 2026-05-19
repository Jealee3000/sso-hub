import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createClient } from 'redis';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { OAuthClient } from '../entities/oauth-client.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [TypeOrmModule.forFeature([OAuthClient, User, AuditLog])],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminGuard,
    {
      provide: 'REDIS',
      useFactory: async (cfg: ConfigService) => {
        const client = createClient({ url: cfg.redisUrl });
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
})
export class AdminModule {}
