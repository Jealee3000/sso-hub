export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  // SSO 内部 API 地址（容器间调用，Docker 用服务名 sso-hub:3000）
  ssoUrl: process.env.SSO_URL!,
  // SSO 外部地址（浏览器跳转用）
  ssoExternalUrl: process.env.SSO_EXTERNAL_URL!,
  // BFF 自身外部地址（callback + logout 回跳用）
  bffExternalUrl: process.env.BFF_EXTERNAL_URL!,
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  redisUrl: process.env.REDIS_URL!,
  redisDb: parseInt(process.env.REDIS_DB || '0', 10),
  callbackPath: '/callback',
  sessionSecret: process.env.SESSION_SECRET!,
  cookieName: process.env.COOKIE_NAME || 'sessionId',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};
