import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import DownloadButton from '../components/DownloadButton';

const CATEGORY_COLORS = {
  theme: 'bg-purple-50 text-purple-600',
  plugin: 'bg-blue-50 text-blue-600',
  script: 'bg-yellow-50 text-yellow-600',
  source_code: 'bg-green-50 text-green-600',
};

export default function MyDownloads() {
  const [orders, setOrders] = useState([]);
  const [licenses, setLicenses] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/orders'),
      api.get('/licenses'),
    ]).then(([ordersRes, licensesRes]) => {
      setOrders(ordersRes.data.orders || []);
      // Build a map of product_id -> license_key for quick lookup
      const licenseMap = {};
      (licensesRes.data.licenses || []).forEach((l) => {
        licenseMap[l.product_id] = l.license_key;
      });
      setLicenses(licenseMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function copyToClipboard(key, orderId) {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">My Downloads</h1>
        <p className="text-sm text-gray-500 mt-1">All your purchased digital products in one place.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-gray-700 font-semibold mb-1">No purchases yet</h3>
          <p className="text-sm text-gray-400 mb-5">Browse the marketplace and find something you love.</p>
          <Link to="/" className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors inline-block">
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow">
              {/* Icon / thumbnail */}
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                {order.image_url ? (
                  <img src={order.image_url} alt={order.product_title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{order.product_title}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                  {order.category && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[order.category] || 'bg-gray-100 text-gray-500'}`}>
                      {order.category.replace('_', ' ')}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {/* License key — inline on mobile */}
                {licenses[order.product_id] && (
                  <div className="flex items-center gap-2 mt-2 sm:hidden">
                    <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 truncate max-w-[180px]">
                      {licenses[order.product_id]}
                    </span>
                    <button onClick={() => copyToClipboard(licenses[order.product_id], order.id)} className="text-gray-400 hover:text-green-600 transition-colors shrink-0">
                      {copiedId === order.id
                        ? <span className="text-xs text-green-600 font-medium">Copied!</span>
                        : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      }
                    </button>
                  </div>
                )}
              </div>

              {/* Download */}
              <DownloadButton productId={order.product_id} />

              {/* License key — desktop only */}
              {licenses[order.product_id] && (
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-gray-400">License</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                      {licenses[order.product_id]}
                    </span>
                    <button onClick={() => copyToClipboard(licenses[order.product_id], order.id)} className="text-gray-400 hover:text-green-600 transition-colors" title="Copy license key">
                      {copiedId === order.id
                        ? <span className="text-xs text-green-600 font-medium">Copied!</span>
                        : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
