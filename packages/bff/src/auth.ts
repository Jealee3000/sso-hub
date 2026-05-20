import { FastifyRequest, FastifyReply } from 'fastify';

export async function handleCallback(
  req: FastifyRequest,
  reply: FastifyReply,
  ssoUrl: string,
  callbackUrl: string,
  clientId: string,
  clientSecret: string,
) {
  const { code, state } = req.query as any;
  const session = (req as any).session;

  if (state && state !== session.state) {
    return reply.status(400).send('Invalid state parameter');
  }

  try {
    const tokenRes = await fetch(`${ssoUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return reply.status(401).send('Token exchange failed: ' + JSON.stringify(tokens));
    }

    // Decode id_token to get user info
    let userId = 'unknown';
    if (tokens.id_token) {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
      userId = payload.sub || 'unknown';
      session.userName = payload.name || payload.email || 'User';
      session.userAvatar = payload.picture || '';
    }

    session.userId = userId;
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.idToken = tokens.id_token;
    await session.save();

    reply.redirect('/');
  } catch (err: any) {
    reply.status(500).send('Callback error: ' + err.message);
  }
}

/** 检查 JWT 是否过期（本地解码，不调 SSO） */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return (payload.exp * 1000) < Date.now();
  } catch {
    return true;
  }
}

/** 获取有效 access token，过期自动用 refresh token 续 */
export async function getValidAccessToken(
  ssoUrl: string,
  clientId: string,
  clientSecret: string,
  session: any,
): Promise<string | null> {
  if (!session?.accessToken) return null;

  if (!isTokenExpired(session.accessToken)) {
    return session.accessToken;
  }

  // Access token 过期，尝试用 refresh token 续
  if (!session.refreshToken) return null;

  try {
    const res = await fetch(`${ssoUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokens = await res.json();
    if (!tokens.access_token) return null;

    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    await session.save();

    return tokens.access_token;
  } catch {
    return null;
  }
}
