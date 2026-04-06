import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import DownloadButton from '../components/DownloadButton';

const CATEGORY_COLORS = {
  theme: 'bg-purple-50 text-purple-600',
  plugin: 'bg-blue-50 text-blue-600',
  script: 'bg-yellow-50 text-yellow-600',
  source_code: 'bg-blue-50 text-primary',
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <button onClick={copy} className="text-gray-400 hover:text-primary transition-colors shrink-0" title="Copy">
      {copied
        ? <span className="text-xs text-primary font-medium">Copied!</span>
        : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      }
    </button>
  );
}

export default function MyDownloads() {
  const [orders, setOrders] = useState([]);
  const [licenses, setLicenses] = useState({});
  const [supportLicenses, setSupportLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('downloads');

  useEffect(() => {
    Promise.all([
      api.get('/orders'),
      api.get('/licenses'),
      api.get('/support-licenses').catch(() => ({ data: { licenses: [] } })),
    ]).then(([ordersRes, licensesRes, supportRes]) => {
      setOrders(ordersRes.data.orders || []);
      const licenseMap = {};
      (licensesRes.data.licenses || []).forEach((l) => { licenseMap[l.product_id] = l.license_key; });
      setLicenses(licenseMap);
      setSupportLicenses(supportRes.data.licenses || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Downloads</h1>
        <p className="text-sm text-gray-500 mt-1">Your purchased products and support licenses.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab('downloads')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'downloads' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          Downloads
        </button>
        <button onClick={() => setActiveTab('support')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'support' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          Support Licenses
          {supportLicenses.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'support' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
              {supportLicenses.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'downloads' ? (
        orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">No purchases yet</h3>
            <p className="text-sm text-gray-400 mb-5">Browse the marketplace and find something you love.</p>
            <Link to="/" className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors inline-block">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow">
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
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{order.product_title}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                    {order.category && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[order.category] || 'bg-gray-100 text-gray-500'}`}>
                        {order.category.replace('_', ' ')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {licenses[order.product_id] && (
                    <div className="flex items-center gap-2 mt-2 sm:hidden">
                      <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 truncate max-w-[180px]">{licenses[order.product_id]}</span>
                      <CopyButton text={licenses[order.product_id]} />
                    </div>
                  )}
                </div>
                <DownloadButton productId={order.product_id} />
                {licenses[order.product_id] && (
                  <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-gray-400">License</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{licenses[order.product_id]}</span>
                      <CopyButton text={licenses[order.product_id]} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Support Licenses tab */
        supportLicenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">No support licenses yet</h3>
            <p className="text-sm text-gray-400 mb-5">Purchase a support license from a product page to get dedicated support.</p>
            <Link to="/" className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors inline-block">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {supportLicenses.map((sl) => (
              <div key={sl.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{sl.product_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(sl.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      <span className="mx-1.5">·</span>
                      <span className={sl.requests_used >= sl.requests_total ? 'text-red-500' : 'text-primary'}>
                        {sl.requests_used} / {sl.requests_total} requests used
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to="/support" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                      Use License
                    </Link>
                  </div>
                </div>
                {/* License key */}
                <div className="mt-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-gray-700 flex-1 truncate">{sl.license_key}</span>
                  <CopyButton text={sl.license_key} />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
