import { FastifyRequest, FastifyReply } from 'fastify';

export function buildAuthGuard(ssoUrl: string, clientId: string, callbackUrl: string) {
  return async function authGuard(req: FastifyRequest, reply: FastifyReply) {
    const session = (req as any).session;
    if (session?.userId) return;

    const crypto = require('crypto');
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid profile',
      state,
    });

    session.state = state;
    await session.save();

    reply.redirect(`${ssoUrl}/authorize?${params}`);
  };
}

export async function handleCallback(
  req: FastifyRequest,
  reply: FastifyReply,
  ssoUrl: string,
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
        redirect_uri: `http://localhost:3001/callback`,
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
    session.idToken = tokens.id_token;
    await session.save();

    reply.redirect('/');
  } catch (err: any) {
    reply.status(500).send('Callback error: ' + err.message);
  }
}
