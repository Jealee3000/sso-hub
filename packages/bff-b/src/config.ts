export const config = {
  port: 3002,
  ssoUrl: process.env.SSO_URL || 'http://localhost:3000',
  clientId: process.env.CLIENT_ID || 'bff-b-client',
  clientSecret: process.env.CLIENT_SECRET || 'bff-b-secret',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisDb: 2,
  callbackPath: '/callback',
  sessionSecret: process.env.SESSION_SECRET || 'bff-b-session-secret-at-least-32-chars-long!',
};
