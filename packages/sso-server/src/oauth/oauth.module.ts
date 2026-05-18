import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { JwtService } from './jwt.service';
import { OAuthClient } from '../entities/oauth-client.entity';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { ConfigService } from '../config/config.service';
import { createClient } from 'redis';

@Module({
  imports: [TypeOrmModule.forFeature([OAuthClient, User, RefreshToken])],
  controllers: [OAuthController],
  providers: [
    OAuthService,
    JwtService,
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
  exports: [OAuthService, JwtService],
})
export class OAuthModule {}
