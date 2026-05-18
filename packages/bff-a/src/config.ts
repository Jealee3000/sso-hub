export const config = {
  port: 3001,
  ssoUrl: process.env.SSO_URL || 'http://localhost:3000',
  clientId: process.env.CLIENT_ID || 'bff-a-client',
  clientSecret: process.env.CLIENT_SECRET || 'bff-a-secret',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisDb: 1,
  callbackPath: '/callback',
  sessionSecret: process.env.SESSION_SECRET || 'bff-a-session-secret-at-least-32-chars-long!',
};
