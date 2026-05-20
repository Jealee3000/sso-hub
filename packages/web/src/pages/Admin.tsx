import { useState, useEffect } from 'react';

interface Client { id: string; name: string; clientId: string; isActive: boolean; createdAt: string; }
interface User { id: string; email: string | null; displayName: string | null; isAdmin: boolean; createdAt: string; }
interface AuditEntry { id: string; userId: string | null; action: string; ipAddress: string; createdAt: string; }

type Tab = 'clients' | 'users' | 'audit';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(0);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [uris, setUris] = useState('');
  const [result, setResult] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const toastIt = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = {
    clients: async () => { const r = await fetch('/admin/clients'); setClients(await r.json()); },
    users: async () => { const r = await fetch('/admin/users'); setUsers(await r.json()); },
    audit: async (p = 1) => {
      const r = await fetch(`/admin/audit-logs?page=${p}&pageSize=20`);
      const d = await r.json();
      setAudit(d.items); setAuditPage(d.page); setAuditTotal(d.total); setAuditTotalPages(d.totalPages);
    },
  };

  useEffect(() => {
    setResult(null);
    if (tab === 'clients') load.clients();
    else if (tab === 'users') load.users();
    else { setAuditPage(1); load.audit(1); }
  }, [tab]);

  const create = async () => {
    const u = uris.split('\n').map(s => s.trim()).filter(Boolean);
    if (!name.trim() || !u.length) return toastIt('请填写应用名称和回调地址');
    setSaving(true);
    const r = await fetch('/admin/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, redirectUris: u }) });
    if (!r.ok) { setSaving(false); return toastIt('创建失败'); }
    const d = await r.json();
    setResult({ clientId: d.clientId, clientSecret: d.clientSecret });
    setModal(false); setName(''); setUris(''); setSaving(false);
    load.clients();
  };

  const badge = (active: boolean) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? 'var(--green)' : 'var(--text-tertiary)', boxShadow: active ? '0 0 8px rgba(45,212,191,0.4)' : 'none' }} />
      {active ? '启用' : '停用'}
    </span>
  );

  return (
    <div className="page-enter" style={S.ctn}>
      <div style={S.bg} />
      <header style={S.head}>
        <div>
          <h1 style={S.h1}>SSO Hub</h1>
          <p style={S.sub}>管理后台</p>
        </div>
      </header>

      <nav style={S.nav}>
        {(['clients', 'users', 'audit'] as Tab[]).map(t => (
          <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabOn : {}) }} onClick={() => setTab(t)}>
            {t === 'clients' ? '应用管理' : t === 'users' ? '用户管理' : '审计日志'}
          </button>
        ))}
        <div style={{ flex: 1, borderBottom: '1px solid var(--border-subtle)' }} />
      </nav>

      {/* ── Clients ── */}
      {tab === 'clients' && (
        <section>
          <div style={{ marginBottom: 20 }}>
            <button style={S.btnPrimary} onClick={() => setModal(true)}>+ 新建应用</button>
          </div>

          {result && (
            <div style={S.resultCard}>
              <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 16, fontSize: 14 }}>应用已创建</div>
              <div style={S.field}><label style={S.lbl}>Client ID</label><div style={S.copyRow}><code>{result.clientId}</code><button style={S.btnGhost} onClick={() => { navigator.clipboard.writeText(result.clientId); toastIt('已复制'); }}>复制</button></div></div>
              <div style={S.field}><label style={S.lbl}>Client Secret</label><div style={S.copyRow}><code>{result.clientSecret}</code><button style={S.btnGhost} onClick={() => { navigator.clipboard.writeText(result.clientSecret); toastIt('已复制'); }}>复制</button></div></div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>Secret 仅显示一次</p>
            </div>
          )}

          <table><thead><tr><th>名称</th><th>Client ID</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
            <tbody>
              {!clients.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>暂无应用</td></tr>}
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</td>
                  <td><code>{c.clientId}</code></td>
                  <td>{badge(c.isActive)}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button style={S.btnGhost} onClick={async () => { const r = await fetch(`/admin/clients/${c.id}/reset-secret`, { method: 'POST' }); const d = await r.json(); setResult({ clientId: d.clientId, clientSecret: d.clientSecret }); toastIt('Secret 已重置'); load.clients(); }}>重置</button>
                    <button style={S.btnDanger} onClick={async () => { await fetch(`/admin/clients/${c.id}`, { method: 'DELETE' }); toastIt('已停用'); load.clients(); }}>停用</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <table><thead><tr><th>ID</th><th>邮箱</th><th>昵称</th><th>管理员</th><th>创建时间</th><th>操作</th></tr></thead>
          <tbody>
            {!users.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>暂无用户</td></tr>}
            {users.map(u => (
              <tr key={u.id}>
                <td><code>{u.id.slice(0, 12)}…</code></td>
                <td style={{ color: 'var(--text-primary)' }}>{u.email || '—'}</td>
                <td>{u.displayName || '—'}</td>
                <td>{badge(u.isAdmin)}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button style={S.btnGhost} onClick={async () => { await fetch(`/admin/users/${u.id}/toggle-admin`, { method: 'POST' }); toastIt('已切换'); load.users(); }}>{u.isAdmin ? '取消管理' : '设为管理'}</button>
                  <button style={S.btnDanger} onClick={async () => { await fetch(`/admin/users/${u.id}`, { method: 'DELETE' }); toastIt('已禁用'); load.users(); }}>禁用</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Audit ── */}
      {tab === 'audit' && (
        <div>
          <table><thead><tr><th>时间</th><th>用户</th><th>操作</th><th>IP</th></tr></thead>
            <tbody>
              {!audit.length && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>暂无日志</td></tr>}
              {audit.map(l => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td><code>{l.userId?.slice(0, 12) || '—'}</code></td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.action}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{l.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 }}>
              <button style={{ ...S.btnGhost, opacity: auditPage <= 1 ? 0.4 : 1 }} disabled={auditPage <= 1} onClick={() => load.audit(auditPage - 1)}>上一页</button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>第 {auditPage} / {auditTotalPages} 页 · 共 {auditTotal} 条</span>
              <button style={{ ...S.btnGhost, opacity: auditPage >= auditTotalPages ? 0.4 : 1 }} disabled={auditPage >= auditTotalPages} onClick={() => load.audit(auditPage + 1)}>下一页</button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={S.modal}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>新建应用</h2>
            <div style={S.field}><label style={S.lbl}>应用名称</label><input value={name} onChange={e => setName(e.target.value)} placeholder="例如：BFF App A" /></div>
            <div style={S.field}><label style={S.lbl}>回调地址（每行一个）</label><textarea value={uris} onChange={e => setUris(e.target.value)} placeholder="http://localhost:3001/callback&#10;http://localhost:3002/callback" /><p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>OAuth 2.0 授权完成后浏览器回跳的地址，必须完全匹配</p></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button style={S.btnGhost} onClick={() => setModal(false)}>取消</button>
              <button style={S.btnPrimary} onClick={create} disabled={saving}>{saving ? '创建中…' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, padding: '12px 22px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 14, animation: 'toastIn 0.25s ease-out', zIndex: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  ctn: { maxWidth: 1120, margin: '0 auto', padding: '40px 32px', position: 'relative' },
  bg: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: 'radial-gradient(ellipse 60% 50% at 30% 0%, rgba(20,184,166,0.03), transparent), radial-gradient(ellipse 50% 40% at 70% 100%, rgba(20,184,166,0.02), transparent)',
  },
  head: { position: 'relative', marginBottom: 32 },
  h1: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' },
  sub: { fontSize: 14, color: 'var(--text-tertiary)', marginTop: 2 },
  nav: { display: 'flex', gap: 0, marginBottom: 28, position: 'relative' },
  tab: {
    padding: '10px 22px', fontSize: 14, fontWeight: 500, background: 'transparent',
    color: 'var(--text-tertiary)', borderRadius: '8px 8px 0 0', border: 'none',
    borderBottom: '2px solid transparent', transition: 'all 0.15s',
  },
  tabOn: { color: 'var(--accent)', borderBottomColor: 'var(--accent)', background: 'var(--accent-soft)' },
  btnPrimary: {
    padding: '9px 22px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
    color: '#070a12', fontSize: 13, fontWeight: 600, border: 'none',
    boxShadow: '0 2px 12px var(--accent-glow)',
  },
  btnGhost: {
    padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'transparent',
    color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 12, fontWeight: 500,
  },
  btnDanger: {
    padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--red-soft)',
    color: 'var(--red)', fontSize: 12, fontWeight: 500, border: '1px solid rgba(239,68,68,0.15)',
  },
  resultCard: {
    background: 'var(--green-soft)', border: '1px solid rgba(45,212,191,0.2)',
    borderRadius: 'var(--radius)', padding: 20, marginBottom: 20, position: 'relative',
  },
  field: { marginBottom: 16 },
  lbl: { display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 },
  copyRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(4,6,10,0.7)', backdropFilter: 'blur(4px)',
    zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: 32,
    width: '100%', maxWidth: 480, border: '1px solid var(--border-subtle)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
  },
};
