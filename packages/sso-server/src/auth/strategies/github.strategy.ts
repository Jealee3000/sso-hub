interface GitHubUser {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
}

export class GitHubStrategy {
  private readonly authUrl = 'https://github.com/login/oauth/authorize';
  private readonly tokenUrl = 'https://github.com/login/oauth/access_token';
  private readonly userUrl = 'https://api.github.com/user';

  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
  ) {}

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email',
      state,
    });
    return `${this.authUrl}?${params}`;
  }

  async getUserFromCode(code: string): Promise<{
    providerUserId: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
    raw: Record<string, unknown>;
  }> {
    const tokenRes = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      }),
    });

    const tokenData: Record<string, unknown> = await tokenRes.json() as Record<string, unknown>;
    if (tokenData.error) throw new Error(`GitHub token error: ${tokenData.error}`);

    const userRes = await fetch(this.userUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token as string}`,
        'User-Agent': 'sso-hub',
      },
    });

    const ghUser = await userRes.json() as GitHubUser;

    return {
      providerUserId: String(ghUser.id),
      email: ghUser.email,
      displayName: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url,
      raw: ghUser as unknown as Record<string, unknown>,
    };
  }
}
