import { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';
import { AdminTable, Td, Badge } from '../../components/AdminTable';

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
    a.href = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const completed = orders.filter(o => o.status === 'completed');
  const revenue = completed.reduce((s, o) => s + o.amount_cents, 0);
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {completed.length > 0 && <span className="ml-2 text-primary font-medium">· ₦{(revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })} revenue</span>}
          </p>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-2 border border-gray-200 bg-white text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
        </div>
        <button onClick={load} className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">Apply</button>
        {(from || to) && <button onClick={() => { setFrom(''); setTo(''); setTimeout(load, 0); }} className="text-sm text-gray-400 hover:text-gray-600">Clear</button>}
      </div>

      <AdminTable
        cols={['Order ID', 'Buyer', 'Product', 'Amount', 'Status', 'License Key', 'Date']}
        loading={loading}
        empty="No orders found."
      >
        {orders.map(o => (
          <tr key={o.id} className="hover:bg-gray-50 transition-colors">
            <Td mono className="text-gray-400 text-xs">{o.id.slice(0, 8)}…</Td>
            <Td className="text-gray-700 text-xs max-w-[160px] truncate">{o.buyer_email}</Td>
            <Td className="font-medium text-gray-800 max-w-[180px]">
              <span className="line-clamp-1">{o.product_title}</span>
            </Td>
            <Td className="font-semibold text-gray-800 whitespace-nowrap">₦{(o.amount_cents / 100).toLocaleString('en-NG')}</Td>
            <Td><Badge status={o.status} /></Td>
            <Td mono className="text-gray-500 text-xs max-w-[180px]">
              <span className="truncate block">{o.status === 'completed' && o.license_key ? o.license_key : '—'}</span>
            </Td>
            <Td className="text-gray-400 text-xs whitespace-nowrap">
              {o.completed_at ? new Date(o.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            </Td>
          </tr>
        ))}
      </AdminTable>
    </AdminLayout>
  );
}
