export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  // SSO container API calls (Docker uses service name sso-hub:3000, local dev uses localhost:3000)
  ssoUrl: process.env.SSO_URL || 'http://localhost:3000',
  // SSO browser redirect address (must be browser-accessible)
  ssoExternalUrl: process.env.SSO_EXTERNAL_URL || process.env.SSO_URL || 'http://localhost:3000',
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisDb: parseInt(process.env.REDIS_DB || '0', 10),
  callbackPath: '/callback',
  sessionSecret: process.env.SESSION_SECRET!,
};
