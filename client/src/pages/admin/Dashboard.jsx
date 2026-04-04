import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import AdminLayout from '../../components/AdminLayout';
import PeriodFilter from '../../components/PeriodFilter';

/* ── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, bg, iconColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  );
}

/* ── Custom tooltip ─────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

/* ── Quick links ────────────────────────────────────────────────────────── */
const QUICK_LINKS = [
  {
    to: '/admin/products', label: 'Products', desc: 'Add, edit or remove listings',
    bg: 'bg-blue-50',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  },
  {
    to: '/admin/orders', label: 'Orders', desc: 'View and export order history',
    bg: 'bg-purple-50',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    to: '/admin/categories', label: 'Categories', desc: 'Manage product categories',
    bg: 'bg-orange-50',
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  },
];

/* ── Tick formatter: show every 5th label to avoid crowding ─────────────── */
function sparseTick(value, index) {
  return index % 5 === 0 ? value : '';
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultPeriod() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: toISODate(start), end: toISODate(end) };
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [series, setSeries] = useState([]);
  const [period, setPeriod] = useState(defaultPeriod);

  useEffect(() => {
    const params = `?start=${period.start}&end=${period.end}`;
    api.get(`/admin/metrics${params}`).then((res) => setMetrics(res.data)).catch(() => {});
    api.get(`/admin/charts${params}`).then((res) => setSeries(res.data.series || [])).catch(() => {});
  }, [period]);

  const revenue = metrics
    ? `₦${(metrics.total_revenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
    : null;

  const periodLabel = `${period.start} – ${period.end}`;
  const periodRevenue = series.reduce((s, d) => s + d.revenue, 0);
  const periodViews   = series.reduce((s, d) => s + d.views, 0);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Welcome back. Here's your store at a glance.</p>
        </div>
        <Link to="/admin/products"
          className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Link>
      </div>

      {/* Period filter */}
      <div className="mb-6">
        <PeriodFilter onChange={setPeriod} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Total Revenue" value={revenue} bg="bg-green-50" iconColor="text-green-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Completed Orders" value={metrics?.completed_orders?.toLocaleString()} bg="bg-blue-50" iconColor="text-blue-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
        <StatCard label="Registered Users" value={metrics?.registered_users?.toLocaleString()} bg="bg-purple-50" iconColor="text-purple-500"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">

        {/* Revenue chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Revenue</p>
              <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
            </div>
            <p className="text-sm font-bold text-green-600">
              ₦{(periodRevenue / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={sparseTick} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v === 0 ? '0' : `₦${(v / 100 / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip prefix="₦" />}
                formatter={(v) => [`₦${(v / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Page views chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Website Views</p>
              <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
            </div>
            <p className="text-sm font-bold text-blue-600">
              {periodViews.toLocaleString()} views
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={sparseTick} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip suffix=" views" />} />
              <Bar dataKey="views" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Orders sparkline */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Orders</p>
            <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
          </div>
          <p className="text-sm font-bold text-purple-600">
            {series.reduce((s, d) => s + d.orders, 0)} orders
          </p>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={sparseTick} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip suffix=" orders" />} />
            <Area type="monotone" dataKey="orders" stroke="#a855f7" strokeWidth={2} fill="url(#ordersGrad)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick links */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {QUICK_LINKS.map(({ to, label, desc, icon, bg }) => (
          <Link key={to} to={to}
            className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 hover:border-green-200 hover:shadow-sm transition-all group">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>{icon}</div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm group-hover:text-green-600 transition-colors">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 ml-auto shrink-0 mt-0.5 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
