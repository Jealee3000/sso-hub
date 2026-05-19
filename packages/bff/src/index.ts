import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import { config } from './config';
import { buildAuthGuard, handleCallback } from './auth';
import path from 'path';

async function main() {
  const app = Fastify({ logger: true });

  const redis = createClient({ url: config.redisUrl });
  await redis.connect();
  await redis.select(config.redisDb);

  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    store: new RedisStore({ client: redis as any }),
    secret: config.sessionSecret,
    cookie: { secure: false, httpOnly: true, sameSite: 'lax' as const, maxAge: 24 * 60 * 60 * 1000 },
  });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  const callbackUrl = config.ssoExternalUrl + config.callbackPath;

  // Home page — always serve, don't force redirect
  app.get('/', async (req, reply) => {
    return reply.sendFile('index.html');
  });

  // SSO login entry — builds /authorize URL and redirects
  app.get('/login', async (req, reply) => {
    const crypto = require('crypto');
    const state = crypto.randomUUID();
    const session = (req as any).session;
    session.state = state;
    await session.save();

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid profile',
      state,
    });
    reply.redirect(`${config.ssoExternalUrl}/authorize?${params}`);
  });

  // Callback from SSO
  app.get(config.callbackPath, async (req, reply) => {
    await handleCallback(req, reply, config.ssoUrl, callbackUrl, config.clientId, config.clientSecret);
  });

  // API: get current user info (no redirect, just return status)
  app.get('/api/me', async (req, reply) => {
    const session = (req as any).session;
    if (!session?.userId) {
      return { authenticated: false };
    }
    return { authenticated: true, userId: session.userId, name: session.userName, avatar: session.userAvatar };
  });

  // Logout
  app.get('/logout', async (req, reply) => {
    const session = (req as any).session;
    await session.destroy();
    reply.redirect(config.ssoExternalUrl + '/logout');
  });

  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`BFF running on :${config.port}`);
}

main().catch(console.error);
