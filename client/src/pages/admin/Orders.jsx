import { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  failed:    'bg-red-100 text-red-700',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/admin/orders', { params });
    setOrders(res.data.orders || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleExport() {
    const res = await api.get('/admin/orders/export', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const completed = orders.filter(o => o.status === 'completed');
  const revenue = completed.reduce((sum, o) => sum + o.amount_cents, 0);
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400';

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {completed.length > 0 && (
              <span className="ml-2 text-green-600 font-medium">
                · ₦{(revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })} revenue
              </span>
            )}
          </p>
        </div>
        <button onClick={handleExport}
          className="border border-gray-200 bg-white text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </div>
        <button onClick={load}
          className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
          Apply
        </button>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); setTimeout(load, 0); }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Buyer</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">License Key</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">No orders found.</td></tr>
            )}
            {!loading && orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{o.id.slice(0, 8)}…</td>
                <td className="px-5 py-3.5 text-gray-700 text-xs">{o.buyer_email}</td>
                <td className="px-5 py-3.5 font-medium text-gray-800">{o.product_title}</td>
                <td className="px-5 py-3.5 font-semibold text-gray-700">₦{(o.amount_cents / 100).toFixed(2)}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                  {o.status === 'completed' && o.license_key ? o.license_key : '—'}
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  {o.completed_at ? new Date(o.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
