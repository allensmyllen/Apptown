import { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';
import { AdminTable, Td, Badge, ActionBtn } from '../../components/AdminTable';

function PurchaseModal({ user, onClose }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/users/${user.id}/purchases`)
      .then(r => setPurchases(r.data.purchases || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-800">Purchase History</p>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <AdminTable cols={['Product', 'Amount', 'Status', 'License Key', 'Date']} loading={loading} empty="No purchases yet.">
            {purchases.map(p => (
              <tr key={p.order_id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-800">{p.product_title}</Td>
                <Td className="whitespace-nowrap font-semibold text-gray-800">₦{(p.amount_cents / 100).toLocaleString('en-NG')}</Td>
                <Td><Badge status={p.status} /></Td>
                <Td mono className="text-gray-500 text-xs">{p.license_key || '—'}</Td>
                <Td className="text-gray-400 text-xs whitespace-nowrap">
                  {p.completed_at ? new Date(p.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </Td>
              </tr>
            ))}
          </AdminTable>
        </div>
      </div>
    </div>
  );
}

function StatusModal({ user, onClose, onSave }) {
  const [status, setStatus] = useState(user.status);
  const [reason, setReason] = useState(user.banned_reason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setLoading(true); setError('');
    try { await onSave(user.id, status, reason); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to update status'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-1">Update User Status</h3>
        <p className="text-xs text-gray-400 mb-4">{user.email}</p>
        <div className="space-y-2">
          {['active', 'banned', 'blocked'].map(s => (
            <label key={s} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${status === s ? 'border-primary/80 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="accent-primary" />
              <div>
                <p className="text-sm font-medium text-gray-800 capitalize">{s}</p>
                <p className="text-xs text-gray-400">{s === 'active' ? 'Can log in normally' : s === 'banned' ? 'Permanently banned' : 'Temporarily blocked'}</p>
              </div>
            </label>
          ))}
          {status !== 'active' && (
            <div className="pt-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Violation of terms" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-semibold transition-colors">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purchaseUser, setPurchaseUser] = useState(null);
  const [statusUser, setStatusUser] = useState(null);

  async function load() {
    setLoading(true);
    try { const res = await api.get('/admin/users'); setUsers(res.data.users || []); } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(user) {
    if (!window.confirm(`Permanently delete "${user.email}"?`)) return;
    try { await api.delete(`/admin/users/${user.id}`); setUsers(u => u.filter(x => x.id !== user.id)); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  }

  async function handleStatusSave(id, status, reason) {
    const res = await api.patch(`/admin/users/${id}/status`, { status, reason });
    setUsers(u => u.map(x => x.id === id ? { ...x, ...res.data.user } : x));
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.email.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q)) &&
      (statusFilter === 'all' || u.status === statusFilter);
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email or name…" className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary w-52" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      <AdminTable cols={['User', 'Status', 'Verified', 'Last IP', 'Purchases', 'Joined', 'Actions']} loading={loading} empty="No users found.">
        {filtered.map(u => (
          <tr key={u.id} className="hover:bg-gray-50 transition-colors">
            <Td>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">{u.email[0].toUpperCase()}</div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{u.display_name || '—'}</p>
                  <p className="text-gray-400 text-xs">{u.email}</p>
                  {u.role === 'admin' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Admin</span>}
                </div>
              </div>
            </Td>
            <Td><Badge status={u.status || 'active'} /></Td>
            <Td>
              {u.email_verified
                ? <span className="inline-flex items-center gap-1 text-primary text-xs font-medium"><span>✓</span> Verified</span>
                : <span className="text-gray-400 text-xs">Unverified</span>
              }
            </Td>
            <Td mono className="text-gray-500 text-xs">{u.last_ip || '—'}</Td>
            <Td>
              <button onClick={() => setPurchaseUser(u)} className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline">
                {u.purchase_count} order{u.purchase_count !== '1' ? 's' : ''} ↗
              </button>
            </Td>
            <Td className="text-gray-400 text-xs whitespace-nowrap">
              {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </Td>
            <Td right>
              <div className="flex items-center justify-end gap-2">
                <ActionBtn variant="default" onClick={() => setStatusUser(u)}>
                  {u.status === 'active' ? 'Ban / Block' : 'Update'}
                </ActionBtn>
                <ActionBtn variant="danger" onClick={() => handleDelete(u)}>Delete</ActionBtn>
              </div>
            </Td>
          </tr>
        ))}
      </AdminTable>

      {purchaseUser && <PurchaseModal user={purchaseUser} onClose={() => setPurchaseUser(null)} />}
      {statusUser && <StatusModal user={statusUser} onClose={() => setStatusUser(null)} onSave={handleStatusSave} />}
    </AdminLayout>
  );
}
