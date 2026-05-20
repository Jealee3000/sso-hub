import { useState, useEffect } from 'react';

interface UserInfo { authenticated: boolean; userId?: string; name?: string; avatar?: string; }

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { setUser(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const loggedIn = user?.authenticated;

  return (
    <div className="page-enter" style={S.wrap}>
      <div style={S.bg} />
      <header style={S.top}>
        <div style={S.logo}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="var(--accent-soft)"/><path d="M16 6L8 11l8 4.5L24 11 16 6z" fill="var(--accent)"/><path d="M8 21l8 4.5L24 21" stroke="var(--accent)" strokeWidth="1.2" fill="none"/></svg>
          <span>SSO</span>
        </div>
        {loggedIn && <button style={S.logoutSm} onClick={() => { window.location.href = '/logout'; }}>登出</button>}
      </header>
      <main style={S.main}>
        {loading ? (
          <p style={{ color: 'var(--text-tertiary)' }}>加载中…</p>
        ) : loggedIn ? (
          <div style={S.card}>
            <div style={S.avatarWrap}>
              {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>
              )}
            </div>
            <h1 style={S.greet}>{user?.name ? `你好，${user.name}` : '已通过认证'}</h1>
            <p style={S.desc}>已通过 SSO 单点登录验证，可访问所有接入业务系统。</p>
            {user && (
              <div style={S.infoBox}>
                <div style={S.infoRow}><span style={S.infoLbl}>用户 ID</span><code>{user.userId}</code></div>
                {user.name && <div style={S.infoRow}><span style={S.infoLbl}>用户名</span><span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{user.name}</span></div>}
              </div>
            )}
            <div style={S.status}><span style={S.dot} /><span style={{ color: 'var(--green)', fontSize: 13 }}>会话有效</span></div>
            <button style={S.logoutFull} onClick={() => { window.location.href = '/logout'; }}>退出登录</button>
          </div>
        ) : (
          <div style={S.hero}>
            <div style={S.heroIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>业务应用</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 6 }}>该页面受 SSO Hub 保护</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 32 }}>通过 SSO 认证中心登录以访问此应用</p>
            <button style={S.loginBtn} onClick={() => { window.location.href = '/login'; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              SSO 单点登录
            </button>
            <div style={{ marginTop: 48, display: 'flex', gap: 32, justifyContent: 'center' }}>
              {[{ t: 'OAuth 2.0', d:'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' }, { t:'OIDC', d:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }, { t:'安全认证', d:'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }].map((item, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', color: 'var(--text-tertiary)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={item.d} /></svg>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.t}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer style={S.footer}>Powered by SSO Hub · OAuth 2.0 + OpenID Connect</footer>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' },
  bg: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 60% 50% at 30% 20%, rgba(20,184,166,0.04), transparent), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(20,184,166,0.03), transparent)' },
  top: { position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid var(--border-subtle)' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' },
  logoutSm: { padding: '8px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--red-soft)', color: 'var(--red)', fontSize: 13, fontWeight: 500, border: '1px solid rgba(239,68,68,0.15)' },
  main: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, padding: 24 },
  card: { background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: '48px 40px', width: '100%', maxWidth: 420, border: '1px solid var(--border-subtle)', boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 24px 80px rgba(0,0,0,0.5)', textAlign: 'center' },
  avatarWrap: { width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', background: 'var(--bg-elevated)', border: '2px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', overflow: 'hidden' },
  greet: { fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' },
  desc: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 },
  infoBox: { background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 16, border: '1px solid var(--border-subtle)', marginBottom: 20, textAlign: 'left' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' },
  infoLbl: { fontSize: 13, color: 'var(--text-tertiary)' },
  status: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 10px rgba(45,212,191,0.5)' },
  logoutFull: { width: '100%', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--red-soft)', color: 'var(--red)', fontSize: 14, fontWeight: 500, border: '1px solid rgba(239,68,68,0.15)' },
  hero: { textAlign: 'center', maxWidth: 480 },
  heroIcon: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', background: 'var(--bg-surface)', border: '2px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBtn: { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 36px', borderRadius: 'var(--radius)', background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))', color: '#070a12', fontSize: 16, fontWeight: 600, boxShadow: '0 8px 32px var(--accent-glow)', border: '1px solid rgba(255,255,255,0.1)' },
  footer: { position: 'relative', zIndex: 1, textAlign: 'center', padding: '20px', fontSize: 12, color: 'var(--text-tertiary)' },
};
