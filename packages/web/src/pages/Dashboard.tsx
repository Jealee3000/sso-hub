import { useState, useEffect } from 'react';

interface UserInfo {
  authenticated: boolean;
  userId?: string;
  name?: string;
  avatar?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleLogout = () => {
    window.location.href = '/logout';
  };

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.main}>
          <p style={{ color: 'var(--text-muted)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  const isLoggedIn = user?.authenticated;

  return (
    <div className="page-enter" style={styles.wrapper}>
      <div style={styles.bg} />

      {/* Top bar */}
      <header style={styles.topBar}>
        <div style={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>SSO</span>
        </div>
        {isLoggedIn && (
          <button style={styles.logoutBtn} onClick={handleLogout}>登出</button>
        )}
      </header>

      <main style={styles.main}>
        {isLoggedIn ? (
          /* ── 已登录状态 ── */
          <div style={styles.card}>
            <div style={styles.avatar}>
              {user?.avatar ? (
                <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-7 8-7s8 3 8 7" />
                </svg>
              )}
            </div>
            <h1 style={styles.greeting}>
              {user?.name ? `你好，${user.name}` : '已通过认证'}
            </h1>
            <p style={styles.info}>
              已通过 SSO 单点登录验证，可访问所有接入业务。
            </p>

            <div style={styles.detailCard}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>用户 ID</span>
                <code>{user?.userId}</code>
              </div>
              {user?.name && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>用户名</span>
                  <span style={{ fontSize: 14 }}>{user.name}</span>
                </div>
              )}
            </div>

            <div style={styles.statusRow}>
              <span style={styles.statusDot} />
              <span style={styles.statusText}>会话有效</span>
            </div>

            <button style={styles.logoutFull} onClick={handleLogout}>退出登录</button>
          </div>
        ) : (
          /* ── 未登录状态 ── */
          <div style={styles.hero}>
            <div style={{ ...styles.avatar, margin: '0 auto 24px', width: 88, height: 88, borderColor: 'var(--border-active)' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: -0.5 }}>
              业务应用
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
              该页面受 SSO Hub 保护
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
              点击下方按钮，通过 SSO 认证中心登录以访问此应用
            </p>

            <button style={styles.loginBtn} onClick={handleLogin}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              SSO 单点登录
            </button>

            <div style={{ marginTop: 40, display: 'flex', gap: 24, justifyContent: 'center' }}>
              {[
                { icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', label: 'OAuth 2.0' },
                { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', label: 'OIDC' },
                { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: '安全认证' },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: 'var(--bg-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 6px', color: 'var(--text-muted)',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d={item.icon} />
                    </svg>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        Powered by SSO Hub · OAuth 2.0 + OpenID Connect
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' },
  bg: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: 'radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,180,216,0.03) 0%, transparent 50%)',
  },
  topBar: {
    position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid var(--border)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, letterSpacing: -0.3 },
  logoutBtn: { padding: '8px 18px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--red)', fontSize: 13, fontWeight: 500 },
  main: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: 24 },
  card: {
    background: 'var(--bg-card)', borderRadius: 20, padding: '48px 40px', width: '100%', maxWidth: 420,
    border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02) inset',
    textAlign: 'center',
  },
  hero: { textAlign: 'center', maxWidth: 480 },
  avatar: {
    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', background: 'var(--bg-elevated)',
    border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)', overflow: 'hidden',
  },
  greeting: { fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: -0.3 },
  info: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 },
  detailCard: {
    background: 'var(--bg-primary)', borderRadius: 12, padding: 16, border: '1px solid var(--border)',
    marginBottom: 20, textAlign: 'left',
  },
  detailRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid var(--border)',
  },
  detailLabel: { fontSize: 13, color: 'var(--text-muted)' },
  statusRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  statusDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px rgba(45,212,191,0.5)' },
  statusText: { fontSize: 13, color: 'var(--green)' },
  logoutFull: { width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', color: 'var(--red)', fontSize: 14, fontWeight: 500 },
  loginBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 36px',
    borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
    color: 'var(--bg-deep)', fontSize: 16, fontWeight: 600,
    boxShadow: '0 8px 32px rgba(0,212,255,0.2)',
  },
  footer: { position: 'relative', zIndex: 1, textAlign: 'center', padding: '20px', fontSize: 12, color: 'var(--text-muted)' },
};
