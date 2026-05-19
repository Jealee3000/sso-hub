import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createClient } from 'redis';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SsoSessionService } from './sso-session.service';
import { WalletStrategy } from './strategies/wallet.strategy';
import { User } from '../entities/user.entity';
import { UserIdentity } from '../entities/user-identity.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserIdentity, AuditLog])],
  controllers: [AuthController],
  providers: [
    AuthService,
    SsoSessionService,
    WalletStrategy,
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
  exports: [AuthService, SsoSessionService],
})
export class AuthModule {}
