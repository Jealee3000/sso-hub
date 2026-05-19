import { useState, useEffect } from 'react';

interface Client { id: string; name: string; clientId: string; isActive: boolean; createdAt: string; }
interface User { id: string; email: string | null; displayName: string | null; isAdmin: boolean; createdAt: string; }
interface AuditEntry { id: string; userId: string | null; action: string; ipAddress: string; createdAt: string; }
interface Toast { message: string; type: 'success' | 'error'; }

type Tab = 'clients' | 'users' | 'audit';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUris, setNewUris] = useState('');
  const [result, setResult] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success'));
  };

  const fetchClients = async () => {
    const res = await fetch('/admin/clients');
    setClients(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch('/admin/users');
    setUsers(await res.json());
  };

  const fetchAudit = async () => {
    const res = await fetch('/admin/audit-logs');
    setAudit(await res.json());
  };

  useEffect(() => {
    if (tab === 'clients') fetchClients();
    else if (tab === 'users') fetchUsers();
    else fetchAudit();
  }, [tab]);

  const createClient = async () => {
    if (!newName.trim()) return showToast('请输入应用名称', 'error');
    const uris = newUris.split('\n').map(s => s.trim()).filter(Boolean);
    if (!uris.length) return showToast('至少需要一个回调地址', 'error');
    setLoading(true);
    const res = await fetch('/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, redirectUris: uris }),
    });
    if (!res.ok) { setLoading(false); return showToast('创建失败', 'error'); }
    const data = await res.json();
    setResult({ clientId: data.clientId, clientSecret: data.clientSecret });
    setModalOpen(false);
    setNewName('');
    setNewUris('');
    setLoading(false);
    fetchClients();
  };

  const delClient = async (id: string) => {
    await fetch(`/admin/clients/${id}`, { method: 'DELETE' });
    showToast('应用已停用', 'success');
    fetchClients();
  };

  const toggleAdmin = async (id: string) => {
    await fetch(`/admin/users/${id}/toggle-admin`, { method: 'POST' });
    showToast('管理员状态已切换', 'success');
    fetchUsers();
  };

  const delUser = async (id: string) => {
    await fetch(`/admin/users/${id}`, { method: 'DELETE' });
    showToast('用户已禁用', 'success');
    fetchUsers();
  };

  return (
    <div className="page-enter" style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>SSO Hub</h1>
          <p style={styles.titleSub}>管理后台</p>
        </div>
      </header>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {(['clients', 'users', 'audit'] as Tab[]).map(t => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => { setTab(t); setResult(null); }}
          >
            {t === 'clients' ? '应用管理' : t === 'users' ? '用户管理' : '审计日志'}
          </button>
        ))}
      </div>

      {/* Clients Tab */}
      {tab === 'clients' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <button style={styles.btnPrimary} onClick={() => setModalOpen(true)}>+ 新建应用</button>
          </div>

          {result && (
            <div style={styles.resultCard}>
              <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 16 }}>
                ✓ 应用创建成功
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Client ID</label>
                <div style={styles.copyRow}>
                  <code>{result.clientId}</code>
                  <button style={styles.btnGhost} onClick={() => copyText(result.clientId)}>复制</button>
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Client Secret</label>
                <div style={styles.copyRow}>
                  <code>{result.clientSecret}</code>
                  <button style={styles.btnGhost} onClick={() => copyText(result.clientSecret)}>复制</button>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                Secret 仅显示一次，请妥善保管
              </p>
            </div>
          )}

          <table>
            <thead>
              <tr><th>名称</th><th>Client ID</th><th>状态</th><th>创建时间</th><th>操作</th></tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>暂无应用</td></tr>
              )}
              {clients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td><code>{c.clientId}</code></td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.isActive ? 'var(--green)' : 'var(--text-muted)' }} />
                      {c.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button style={styles.btnDanger} onClick={() => delClient(c.id)}>停用</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <table>
          <thead>
            <tr><th>ID</th><th>邮箱</th><th>昵称</th><th>管理员</th><th>创建时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>暂无用户</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id}>
                <td><code>{u.id.slice(0, 12)}...</code></td>
                <td>{u.email || '—'}</td>
                <td>{u.displayName || '—'}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.isAdmin ? 'var(--green)' : 'var(--text-muted)' }} />
                    {u.isAdmin ? '是' : '否'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button style={styles.btnGhost} onClick={() => toggleAdmin(u.id)}>
                    {u.isAdmin ? '取消管理员' : '设为管理员'}
                  </button>
                  <button style={styles.btnDanger} onClick={() => delUser(u.id)}>禁用</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Audit Tab */}
      {tab === 'audit' && (
        <table>
          <thead>
            <tr><th>时间</th><th>用户</th><th>操作</th><th>IP</th></tr>
          </thead>
          <tbody>
            {audit.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>暂无日志</td></tr>
            )}
            {audit.map(l => (
              <tr key={l.id}>
                <td style={{ color: 'var(--text-secondary)' }}>{new Date(l.createdAt).toLocaleString()}</td>
                <td><code>{l.userId?.slice(0, 12) || '—'}</code></td>
                <td>{l.action}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{l.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={styles.modal}>
            <h2 style={{ fontSize: 20, marginBottom: 20 }}>新建应用</h2>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>应用名称</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="例如：BFF App A" />
            </div>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>回调地址（每行一个）</label>
              <textarea value={newUris} onChange={e => setNewUris(e.target.value)}
                placeholder={'http://localhost:3001/callback\nhttp://localhost:3002/callback'} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                OAuth 2.0 授权完成后浏览器回跳的地址，必须完全匹配
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button style={styles.btnGhost} onClick={() => setModalOpen(false)}>取消</button>
              <button style={styles.btnPrimary} onClick={createClient} disabled={loading}>
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 10,
          background: 'var(--bg-card)', border: `1px solid ${toast.type === 'success' ? 'var(--green)' : 'var(--red)'}`,
          color: 'var(--text-primary)', fontSize: 14, animation: 'toastIn 0.25s ease-out', zIndex: 300,
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1100, margin: '0 auto', padding: '40px 32px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32,
  },
  title: { fontSize: 26, fontWeight: 700, letterSpacing: -0.5 },
  titleSub: { fontSize: 14, color: 'var(--text-muted)', marginTop: 2 },
  tabBar: { display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' },
  tab: {
    padding: '10px 22px', borderRadius: '8px 8px 0 0', background: 'transparent',
    color: 'var(--text-muted)', fontSize: 14, fontWeight: 500,
  },
  tabActive: { background: 'var(--bg-card)', color: 'var(--text-primary)' },
  btnPrimary: {
    padding: '9px 20px', borderRadius: 8, background: 'var(--accent)', color: 'var(--bg-deep)',
    fontSize: 13, fontWeight: 600,
  },
  btnGhost: {
    padding: '6px 14px', borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)',
    border: '1px solid var(--border)', fontSize: 12,
  },
  btnDanger: {
    padding: '5px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: 'var(--red)',
    fontSize: 12, fontWeight: 500,
  },
  resultCard: {
    background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.2)',
    borderRadius: 12, padding: 20, marginBottom: 20,
  },
  field: { marginBottom: 16 },
  fieldLabel: { display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 },
  copyRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480,
    border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
};
