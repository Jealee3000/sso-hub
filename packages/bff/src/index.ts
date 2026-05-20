import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { config } from './config';
import { handleCallback, getValidAccessToken } from './auth';
import path from 'path';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function main() {
  const app = Fastify({ logger: true });

  const redis = createClient({ url: config.redisUrl });
  await redis.connect();
  await redis.select(config.redisDb);

  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    store: new RedisStore({ client: redis as any }),
    secret: config.sessionSecret,
    cookieName: config.cookieName,
    cookie: { secure: config.cookieSecure, httpOnly: true, sameSite: 'lax' as const, maxAge: SEVEN_DAYS_MS },
  });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  const callbackUrl = `${config.bffExternalUrl}${config.callbackPath}`;

  // Home page — always serve, don't force redirect
  app.get('/', async (req, reply) => {
    return reply.sendFile('index.html');
  });

  // SSO login entry — builds /authorize URL with PKCE and redirects
  app.get('/login', async (req, reply) => {
    const crypto = require('crypto');
    const state = crypto.randomUUID();
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const session = (req as any).session;
    session.state = state;
    session.codeVerifier = codeVerifier;
    await session.save();

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    reply.redirect(`${config.ssoExternalUrl}/authorize?${params}`);
  });

  // Callback from SSO
  app.get(config.callbackPath, async (req, reply) => {
    await handleCallback(req, reply, config.ssoUrl, callbackUrl, config.clientId, config.clientSecret);
  });

  // API: get current user — uses access token with auto-refresh
  app.get('/api/me', async (req, reply) => {
    const session = (req as any).session;
    if (!session?.userId) {
      return { authenticated: false };
    }

    // 获取有效 access token，过期自动续
    const accessToken = await getValidAccessToken(
      config.ssoUrl, config.clientId, config.clientSecret, session,
    );
    if (!accessToken) {
      await session.destroy();
      return { authenticated: false, reason: 'token_expired' };
    }

    return { authenticated: true, userId: session.userId, name: session.userName, avatar: session.userAvatar };
  });

  // Logout → 清 BFF session → 跳 SSO 清 sso_sid → 跳回 BFF 首页
  app.get('/logout', async (req, reply) => {
    const session = (req as any).session;
    await session.destroy();
    reply.redirect(`${config.ssoExternalUrl}/logout?redirect=${encodeURIComponent(config.bffExternalUrl + '/')}`);
  });

  const closeGracefully = async () => {
    await app.close();
    await redis.quit();
    process.exit(0);
  };
  process.on('SIGTERM', closeGracefully);
  process.on('SIGINT', closeGracefully);

  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`BFF running on :${config.port}`);
}

main().catch(console.error);
