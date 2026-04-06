import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import DownloadButton from '../components/DownloadButton';

const PRIMARY = '#3781EE';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200';
const disabledCls = 'w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-100 text-gray-400 cursor-not-allowed';

const CATEGORY_COLORS = {
  theme:       'bg-purple-50 text-purple-600',
  plugin:      'bg-blue-50 text-blue-600',
  script:      'bg-amber-50 text-amber-600',
  source_code: 'bg-blue-50 text-blue-700',
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }
  return (
    <button onClick={copy} title="Copy" className="text-gray-400 hover:text-blue-600 transition-colors shrink-0">
      {copied
        ? <span className="text-xs font-medium" style={{ color: PRIMARY }}>Copied!</span>
        : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      }
    </button>
  );
}

const TABS = [
  { key: 'downloads', label: 'Downloads' },
  { key: 'support',   label: 'Support Licenses' },
  { key: 'profile',   label: 'Profile Settings' },
  { key: 'password',  label: 'Change Password' },
];

export default function UserDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'downloads');

  // profile
  const [profile, setProfile]   = useState(null);
  const [form, setForm]         = useState({ display_name: '', phone: '', address: '', date_of_birth: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg]         = useState('');
  const [pwErr, setPwErr]         = useState('');
  const [savingPw, setSavingPw]   = useState(false);

  // downloads
  const [orders, setOrders]               = useState([]);
  const [licenses, setLicenses]           = useState({});
  const [supportLicenses, setSupportLicenses] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    api.get('/auth/profile').then(res => {
      const p = res.data.profile;
      setProfile(p);
      setForm({
        display_name: p.display_name || '',
        phone:        p.phone || '',
        address:      p.address || '',
        date_of_birth: p.date_of_birth ? p.date_of_birth.slice(0, 10) : '',
      });
    }).catch(() => {});

    Promise.all([
      api.get('/orders'),
      api.get('/licenses'),
      api.get('/support-licenses').catch(() => ({ data: { licenses: [] } })),
    ]).then(([ordersRes, licensesRes, supportRes]) => {
      setOrders(ordersRes.data.orders || []);
      const map = {};
      (licensesRes.data.licenses || []).forEach(l => { map[l.product_id] = l.license_key; });
      setLicenses(map);
      setSupportLicenses(supportRes.data.licenses || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function switchTab(key) {
    setTab(key);
    setSearchParams({ tab: key });
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setSavingProfile(true); setProfileMsg(''); setProfileErr('');
    try {
      await api.put('/auth/profile', form);
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileErr(err.response?.data?.error || 'Failed to update profile.');
    } finally { setSavingProfile(false); }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwErr('Passwords do not match.'); return; }
    if (newPw.length < 8)   { setPwErr('Minimum 8 characters.'); return; }
    setSavingPw(true); setPwMsg(''); setPwErr('');
    try {
      await api.put('/auth/change-password', { current_password: currentPw, new_password: newPw });
      setPwMsg('Password changed successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwErr(err.response?.data?.error || 'Failed to change password.');
    } finally { setSavingPw(false); }
  }

  const initials    = form.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  const displayName = form.display_name || user?.email?.split('@')[0] || '';
  const joinDate    = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>

      {/* ── Full-width profile banner ──────────────────────────────────── */}
      <div style={{ backgroundColor: '#EBF2FD' }}>
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          {/* Avatar + name row */}
          <div className="flex items-center gap-5 pt-8 pb-5">
            <div
              style={{ backgroundColor: PRIMARY }}
              className="w-20 h-20 rounded-xl flex items-center justify-center text-white text-3xl font-bold shrink-0 shadow-lg"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-gray-900 text-xl font-bold capitalize truncate">{displayName}</h1>
              {joinDate && <p className="text-gray-500 text-sm mt-0.5">Member since {joinDate}</p>}
            </div>
            <div className="hidden sm:flex items-center gap-10 shrink-0 pr-4">
              <div className="text-center">
                <p className="text-gray-900 text-2xl font-bold">{orders.length}</p>
                <p className="text-gray-500 text-xs uppercase tracking-wider mt-0.5">Purchases</p>
              </div>
              <div className="text-center">
                <p className="text-gray-900 text-2xl font-bold">{supportLicenses.length}</p>
                <p className="text-gray-500 text-xs uppercase tracking-wider mt-0.5">Support Licenses</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar — separate light blue band ────────────────────────── */}
      <div style={{ backgroundColor: '#EBF2FD' }}>
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  style={active ? { borderBottomColor: PRIMARY, color: PRIMARY } : {}}
                  className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active ? '' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {label}
                  {key === 'downloads' && orders.length > 0 && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: active ? PRIMARY : '#d1e3fa', color: active ? '#fff' : PRIMARY }}>{orders.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">

        {/* DOWNLOADS */}
        {tab === 'downloads' && (
          loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }} />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <h3 className="text-gray-700 font-semibold mb-1">No purchases yet</h3>
              <p className="text-sm text-gray-400 mb-5">Browse the marketplace and find something you love.</p>
              <Link to="/" style={{ backgroundColor: PRIMARY }} className="text-white text-sm font-semibold px-5 py-2.5 rounded-lg inline-block hover:opacity-90 transition-opacity">
                Browse Marketplace
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    {order.image_url
                      ? <img src={order.image_url} alt={order.product_title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${order.product_id}`} className="font-semibold text-gray-800 hover:text-blue-600 transition-colors truncate block">
                      {order.product_title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {order.category && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[order.category] || 'bg-gray-100 text-gray-500'}`}>
                          {order.category.replace('_', ' ')}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* License key */}
                  {licenses[order.product_id] && (
                    <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-gray-400">License</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5 max-w-[160px] truncate">
                          {licenses[order.product_id]}
                        </span>
                        <CopyButton text={licenses[order.product_id]} />
                      </div>
                    </div>
                  )}

                  {/* Download button */}
                  <div className="shrink-0">
                    <DownloadButton productId={order.product_id} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* SUPPORT LICENSES */}
        {tab === 'support' && (
          loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }} />
            </div>
          ) : supportLicenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-gray-700 font-semibold mb-1">No support licenses yet</h3>
              <p className="text-sm text-gray-400 mb-5">Purchase a support license from any product page.</p>
              <Link to="/" style={{ backgroundColor: PRIMARY }} className="text-white text-sm font-semibold px-5 py-2.5 rounded-lg inline-block hover:opacity-90 transition-opacity">Browse Products</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {supportLicenses.map(sl => (
                <div key={sl.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{sl.product_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(sl.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        <span className="mx-1.5">·</span>
                        <span style={{ color: sl.requests_used >= sl.requests_total ? '#ef4444' : PRIMARY }}>
                          {sl.requests_used} / {sl.requests_total} requests used
                        </span>
                      </p>
                    </div>
                    <Link to="/support" className="text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors hover:opacity-80 shrink-0" style={{ color: PRIMARY, borderColor: PRIMARY, backgroundColor: '#eff6ff' }}>
                      Use License
                    </Link>
                  </div>
                  <div className="mt-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs text-gray-700 flex-1 truncate">{sl.license_key}</span>
                    <CopyButton text={sl.license_key} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* PROFILE SETTINGS */}
        {tab === 'profile' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 text-base mb-5">Personal Information</h2>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Display Name *</label>
                    <input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} required placeholder="Your name" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input value={profile?.email || ''} disabled className={disabledCls} />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+234 800 000 0000" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                    <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Your full address" rows={3} className={inputCls + ' resize-none'} />
                </div>
                {profileErr && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileErr}</p>}
                {profileMsg && <p className="text-sm bg-blue-50 border rounded-lg px-3 py-2" style={{ color: PRIMARY, borderColor: '#bfdbfe' }}>{profileMsg}</p>}
                <button type="submit" disabled={savingProfile} style={{ backgroundColor: PRIMARY }} className="text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity">
                  {savingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CHANGE PASSWORD */}
        {tab === 'password' && (
          <div className="max-w-md">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 text-base mb-5">Change Password</h2>
              <form onSubmit={handlePasswordSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                  <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required className={inputCls} autoComplete="current-password" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required className={inputCls} autoComplete="new-password" />
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required className={inputCls} autoComplete="new-password" />
                </div>
                {pwErr && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwErr}</p>}
                {pwMsg && <p className="text-sm bg-blue-50 border rounded-lg px-3 py-2" style={{ color: PRIMARY, borderColor: '#bfdbfe' }}>{pwMsg}</p>}
                <button type="submit" disabled={savingPw} style={{ backgroundColor: PRIMARY }} className="text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity">
                  {savingPw ? 'Saving…' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
