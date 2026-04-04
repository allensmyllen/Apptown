import { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const STATUS_STYLES = {
  active:  'bg-green-100 text-green-700',
  banned:  'bg-red-100 text-red-700',
  blocked: 'bg-yellow-100 text-yellow-700',
};

function PurchaseModal({ user, onClose }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/users/${user.id}/purchases`)
      .then(res => setPurchases(res.data.purchases || []))
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
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-10">Loading…</p>
          ) : purchases.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No purchases yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">License Key</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map(p => (
                  <tr key={p.order_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.product_title}</td>
                    <td className="px-5 py-3 text-gray-700">₦{(p.amount_cents / 100).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{p.license_key || '—'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {p.completed_at ? new Date(p.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
    setLoading(true);
    setError('');
    try {
      await onSave(user.id, status, reason);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-1">Update User Status</h3>
        <p className="text-xs text-gray-400 mb-4">{user.email}</p>

        <div className="space-y-3">
          {['active', 'banned', 'blocked'].map(s => (
            <label key={s} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${status === s ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="accent-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-800 capitalize">{s}</p>
                <p className="text-xs text-gray-400">
                  {s === 'active' ? 'User can log in and purchase normally' :
                   s === 'banned' ? 'Permanently banned — cannot log in' :
                   'Temporarily blocked — cannot log in'}
                </p>
              </div>
            </label>
          ))}

          {status !== 'active' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Violation of terms of service"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          )}

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
            {loading ? 'Saving…' : 'Save'}
          </button>
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
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(user) {
    if (!window.confirm(`Permanently delete "${user.email}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers(u => u.filter(x => x.id !== user.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  }

  async function handleStatusSave(id, status, reason) {
    const res = await api.patch(`/admin/users/${id}/status`, { status, reason });
    setUsers(u => u.map(x => x.id === id ? { ...x, ...res.data.user } : x));
  }

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 w-56"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Verified</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last IP</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchases</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">No users found.</td></tr>
            )}
            {!loading && filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-xs">{u.display_name || '—'}</p>
                      <p className="text-gray-400 text-xs">{u.email}</p>
                      {u.role === 'admin' && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Admin</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[u.status] || 'bg-gray-100 text-gray-600'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {u.email_verified
                    ? <span className="text-green-600 text-xs font-medium">✓ Verified</span>
                    : <span className="text-gray-400 text-xs">Unverified</span>
                  }
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{u.last_ip || '—'}</td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => setPurchaseUser(u)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    {u.purchase_count} order{u.purchase_count !== '1' ? 's' : ''} ↗
                  </button>
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setStatusUser(u)}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {u.status === 'active' ? 'Ban / Block' : 'Update Status'}
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {purchaseUser && (
        <PurchaseModal user={purchaseUser} onClose={() => setPurchaseUser(null)} />
      )}
      {statusUser && (
        <StatusModal user={statusUser} onClose={() => setStatusUser(null)} onSave={handleStatusSave} />
      )}
    </AdminLayout>
  );
}
