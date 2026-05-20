import { useState } from 'react';

export default function Login() {
  const [error, setError] = useState('');
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const q = new URLSearchParams(window.location.search);
  const redirectUri = q.get('redirect_uri') || '';
  const clientId = q.get('client_id') || '';
  const state = q.get('state') || '';
  const appName = q.get('app_name') || '';
  const codeChallenge = q.get('code_challenge') || '';
  const codeChallengeMethod = q.get('code_challenge_method') || '';

  const ghParams = () => {
    const p = new URLSearchParams();
    if (clientId) { p.set('client_id', clientId); p.set('redirect_uri', redirectUri); p.set('state', state); }
    if (codeChallenge) { p.set('code_challenge', codeChallenge); p.set('code_challenge_method', codeChallengeMethod); }
    return p.toString();
  };

  const loginWithGithub = () => window.location.href = '/login/github' + (ghParams() ? '?' + ghParams() : '');

  const loginWithWallet = async () => {
    if (!(window as any).ethereum) return setError('未检测到钱包，请安装 MetaMask');
    try {
      setLoading(true); setError('');
      const [addr] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddr(addr);
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      const { nonce } = await fetch('/login/wallet/nonce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallet_address: addr }) }).then(r => r.json());
      const domain = window.location.hostname;
      const issuedAt = new Date().toISOString();
      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        addr,
        '',
        'Sign in to SSO Hub.',
        '',
        `URI: ${window.location.origin}`,
        'Version: 1',
        `Chain ID: ${parseInt(chainId, 16)}`,
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
      ].join('\n');
      const sig = await (window as any).ethereum.request({ method: 'personal_sign', params: [message, addr] });
      const { code } = await fetch('/login/wallet/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, signature: sig, wallet_address: addr, client_id: clientId || '', redirect_uri: redirectUri, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }) }).then(r => r.json());
      window.location.href = clientId && redirectUri ? `${redirectUri}?code=${code}&state=${state}` : '/';
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-enter" style={S.wrap}>
      <div style={S.bg} />
      <div style={S.card}>
        {/* Logo mark */}
        <div style={S.mark}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="var(--accent-soft)" />
            <path d="M16 6L8 11l8 4.5L24 11 16 6z" fill="var(--accent)" />
            <path d="M8 21l8 4.5L24 21" stroke="var(--accent)" strokeWidth="1.2" fill="none" />
            <path d="M8 16l8 4.5L24 16" stroke="var(--accent)" strokeWidth="1.2" fill="none" opacity="0.5" />
          </svg>
        </div>

        <h1 style={S.title}>SSO Hub</h1>

        {appName ? (
          <div style={S.appTag}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            正在登录 <strong>{appName}</strong>
          </div>
        ) : (
          <p style={S.meta}>统一身份认证</p>
        )}

        <div style={S.sep}>
          <span style={S.sepLine} />
          <span style={S.sepLabel}>选择方式</span>
          <span style={S.sepLine} />
        </div>

        <button style={S.btn} onClick={loginWithGithub}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          GitHub 登录
        </button>

        <button style={{ ...S.btn, ...S.btnAccent }} onClick={loginWithWallet} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M16 10h4v4h-4V10z" /></svg>
          {loading ? (walletAddr ? '请在钱包中签名...' : '连接钱包中...') : 'Web3 钱包'}
        </button>

        {error && <div style={S.err}>{error}</div>}
        {walletAddr && !error && <div style={S.connected}><code>{walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}</code><span style={{ color: 'var(--green)', fontSize: 13 }}>已连接</span></div>}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', padding: 24,
  },
  bg: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    background: `
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(20,184,166,0.05), transparent),
      radial-gradient(ellipse 60% 50% at 80% 100%, rgba(20,184,166,0.03), transparent),
      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
    `,
  },
  card: {
    position: 'relative', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
    padding: '48px 40px', width: '100%', maxWidth: 420,
    border: '1px solid var(--border-subtle)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 24px 80px rgba(0,0,0,0.6)',
    textAlign: 'center', backdropFilter: 'blur(24px)',
  },
  mark: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 },
  meta: { color: 'var(--text-secondary)', fontSize: 15 },
  appTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px',
    borderRadius: 100, background: 'var(--accent-soft)', border: '1px solid rgba(20,184,166,0.2)',
    color: 'var(--accent)', fontSize: 13, marginTop: 14, marginBottom: 4,
  },
  sep: { display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0' },
  sepLine: { flex: 1, height: 1, background: 'var(--border-subtle)' },
  sepLabel: { fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', padding: '14px', borderRadius: 'var(--radius)',
    fontSize: 15, fontWeight: 500, color: '#fff', background: '#1e2229',
    marginBottom: 10, border: '1px solid #2d333b',
    transition: 'all 0.2s',
  },
  btnAccent: {
    background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 20px var(--accent-glow)',
  },
  err: {
    marginTop: 16, fontSize: 13, color: 'var(--red)', background: 'var(--red-soft)',
    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239,68,68,0.15)',
  },
  connected: {
    marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
};
