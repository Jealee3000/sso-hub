import { useState, useEffect } from 'react';

interface UserInfo {
  userId: string;
  name?: string;
  avatar?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then(r => {
        if (r.redirected || r.status === 401) {
          // Not logged in, BFF will redirect to SSO
          return;
        }
        if (r.ok) return r.json();
      })
      .then(data => {
        if (data) setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    window.location.href = '/logout';
  };

  return (
    <div className="page-enter" style={styles.wrapper}>
      <div style={styles.bg} />

      <header style={styles.topBar}>
        <div style={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>SSO</span>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>登出</button>
      </header>

      <main style={styles.main}>
        {loading ? (
          <div style={styles.skeleton}>加载中...</div>
        ) : (
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
              该页面受 SSO 保护。只有通过认证的用户才能看到此页面。
            </p>

            {user && (
              <div style={styles.detailCard}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>用户 ID</span>
                  <code>{user.userId}</code>
                </div>
                {user.name && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>用户名</span>
                    <span>{user.name}</span>
                  </div>
                )}
              </div>
            )}

            <div style={styles.statusRow}>
              <span style={styles.statusDot} />
              <span style={styles.statusText}>会话有效</span>
            </div>

            <button style={styles.logoutFull} onClick={handleLogout}>退出登录</button>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <span>Powered by SSO Hub · OAuth 2.0 + OpenID Connect</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative',
  },
  bg: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: 'radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,180,216,0.03) 0%, transparent 50%)',
  },
  topBar: {
    position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid var(--border)',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700,
    letterSpacing: -0.3,
  },
  logoutBtn: {
    padding: '8px 18px', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
    color: 'var(--red)', fontSize: 13, fontWeight: 500,
  },
  main: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', zIndex: 1, padding: 24,
  },
  skeleton: {
    color: 'var(--text-muted)', fontSize: 14,
  },
  card: {
    background: 'var(--bg-card)', borderRadius: 20, padding: '48px 40px',
    width: '100%', maxWidth: 420, border: '1px solid var(--border)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02) inset',
    textAlign: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
    background: 'var(--bg-elevated)', border: '2px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)', overflow: 'hidden',
  },
  greeting: {
    fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: -0.3,
  },
  info: {
    fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24,
  },
  detailCard: {
    background: 'var(--bg-primary)', borderRadius: 12, padding: 16,
    border: '1px solid var(--border)', marginBottom: 20, textAlign: 'left',
  },
  detailRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid var(--border)',
  },
  detailLabel: {
    fontSize: 13, color: 'var(--text-muted)',
  },
  statusRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 20,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
    boxShadow: '0 0 8px rgba(45,212,191,0.5)',
  },
  statusText: {
    fontSize: 13, color: 'var(--green)',
  },
  logoutFull: {
    width: '100%', padding: '12px', borderRadius: 10,
    background: 'rgba(239,68,68,0.08)', color: 'var(--red)',
    fontSize: 14, fontWeight: 500,
  },
  footer: {
    position: 'relative', zIndex: 1, textAlign: 'center', padding: '20px',
    fontSize: 12, color: 'var(--text-muted)',
  },
};
