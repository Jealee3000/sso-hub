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

  const callbackUrl = `http://localhost:${config.port}${config.callbackPath}`;
  const authGuard = buildAuthGuard(config.ssoUrl, config.clientId, callbackUrl);

  // Protected home page
  app.get('/', { preHandler: authGuard }, async (req, reply) => {
    return reply.sendFile('index.html');
  });

  // Callback from SSO
  app.get(config.callbackPath, async (req, reply) => {
    await handleCallback(req, reply, config.ssoUrl, config.clientId, config.clientSecret);
  });

  // API: get current user info
  app.get('/api/me', { preHandler: authGuard }, async (req, reply) => {
    const session = (req as any).session;
    return { userId: session.userId, name: session.userName, avatar: session.userAvatar };
  });

  // Logout
  app.get('/logout', async (req, reply) => {
    const session = (req as any).session;
    await session.destroy();
    reply.redirect(config.ssoUrl + '/logout');
  });

  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`BFF B running on :${config.port}`);
}

main().catch(console.error);
