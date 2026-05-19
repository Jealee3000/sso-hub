import { useState } from 'react';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export default function Login() {
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const redirectUri = queryParams.get('redirect_uri') || '';
  const clientId = queryParams.get('client_id') || '';
  const state = queryParams.get('state') || '';

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loginWithGithub = () => {
    const params = new URLSearchParams();
    if (clientId) params.set('client_id', clientId);
    if (redirectUri) params.set('redirect_uri', redirectUri);
    if (state) params.set('state', state);
    const qs = params.toString();
    window.location.href = '/login/github' + (qs ? '?' + qs : '');
  };

  const loginWithWallet = async () => {
    if (!(window as any).ethereum) {
      setError('未检测到钱包，请安装 MetaMask');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const addr = accounts[0];
      setWalletAddr(addr);

      const nonceRes = await fetch('/login/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: addr }),
      });
      const { nonce } = await nonceRes.json();
      const msg = `Sign this message to log in to SSO Hub.\nNonce: ${nonce}`;
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign', params: [msg, addr],
      });

      const verifyRes = await fetch('/login/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nonce, signature, wallet_address: addr,
          client_id: clientId || '',
          redirect_uri: redirectUri,
        }),
      });
      const { code } = await verifyRes.json();

      if (clientId && redirectUri) {
        window.location.href = `${redirectUri}?code=${code}&state=${state}`;
      } else {
        showToast('登录成功', 'success');
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={styles.wrapper}>
      {/* Background pattern */}
      <div style={styles.bg} />

      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={styles.logoText}>SSO Hub</span>
        </div>

        <p style={styles.subtitle}>选择登录方式以继续</p>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerLabel}>OAuth 2.0 · OpenID Connect</span>
          <span style={styles.dividerLine} />
        </div>

        <button style={styles.btn} className="btn-github" onClick={loginWithGithub}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub 登录
        </button>

        <button style={{ ...styles.btn, ...styles.btnWallet }} onClick={loginWithWallet} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M16 10h4v4h-4V10z" />
          </svg>
          {loading
            ? walletAddr ? '请在钱包中签名...' : '连接钱包中...'
            : 'Web3 钱包登录'}
        </button>

        {error && <div style={styles.error}>{error}</div>}

        {walletAddr && !error && (
          <div style={styles.info}>
            <code>{walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}</code>
            <span style={{ color: 'var(--green)', fontSize: 13 }}>已连接</span>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ ...styles.toast, borderColor: toast.type === 'success' ? 'var(--green)' : 'var(--red)' }}>
          {toast.message}
        </div>
      )}

      <style>{`
        .btn-github { background: #24292e; }
        .btn-github:hover { background: #2f363d; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', padding: 24,
  },
  bg: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(0,180,216,0.04) 0%, transparent 50%)',
  },
  card: {
    position: 'relative', background: 'var(--bg-card)', borderRadius: 20, padding: '48px 40px',
    width: '100%', maxWidth: 420, border: '1px solid var(--border)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset',
    textAlign: 'center',
  },
  logo: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8,
  },
  logoIcon: {
    width: 48, height: 48, borderRadius: 14, background: 'var(--accent-glow)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
  },
  logoText: {
    fontSize: 28, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text-primary)',
    fontFamily: 'var(--font-ui)',
  },
  subtitle: {
    color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
  },
  dividerLine: {
    flex: 1, borderTop: '1px solid var(--border)',
  },
  dividerLabel: {
    fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5,
    fontFamily: 'var(--font-mono)',
  },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 500,
    marginBottom: 12, color: '#fff',
  },
  btnWallet: {
    background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
  },
  error: {
    marginTop: 12, fontSize: 13, color: 'var(--red)', background: 'rgba(239,68,68,0.08)',
    padding: '10px 14px', borderRadius: 8,
  },
  info: {
    marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  toast: {
    position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 10,
    background: 'var(--bg-card)', border: '1px solid', color: 'var(--text-primary)',
    fontSize: 14, animation: 'toastIn 0.25s ease-out', zIndex: 200,
  },
};
