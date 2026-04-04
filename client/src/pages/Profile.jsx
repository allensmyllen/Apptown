import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
// v2 — tabbed layout

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400';
const disabledCls = 'w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-100 text-gray-400 cursor-not-allowed';

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState('personal');
  const [profile, setProfile] = useState(null);

  // Personal info form
  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api.get('/auth/profile').then(res => {
      const p = res.data.profile;
      setProfile(p);
      setForm({
        display_name: p.display_name || '',
        phone: p.phone || '',
        address: p.address || '',
        date_of_birth: p.date_of_birth ? p.date_of_birth.slice(0, 10) : '',
      });
    }).catch(() => {});
  }, []);

  async function handleProfileSave(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileErr('');
    try {
      await api.put('/auth/profile', form);
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileErr(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwErr('New passwords do not match.'); return; }
    if (newPw.length < 8) { setPwErr('New password must be at least 8 characters.'); return; }
    setSavingPw(true);
    setPwMsg('');
    setPwErr('');
    try {
      await api.put('/auth/change-password', { current_password: currentPw, new_password: newPw });
      setPwMsg('Password changed successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwErr(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  }

  const initials = form.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">

      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">{form.display_name || '—'}</p>
          <p className="text-sm text-gray-400">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {joinDate && <span className="text-xs text-gray-400">Member since {joinDate}</span>}
            {profile?.role === 'admin' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">Admin</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        <TabButton active={tab === 'personal'} onClick={() => setTab('personal')}>
          Personal Information
        </TabButton>
        <TabButton active={tab === 'password'} onClick={() => setTab('password')}>
          Change Password
        </TabButton>
      </div>

      {/* ── Personal Information tab ─────────────────────────────────────── */}
      {tab === 'personal' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Personal Information</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display Name *</label>
                <input
                  value={form.display_name}
                  onChange={e => setForm({ ...form, display_name: e.target.value })}
                  required
                  placeholder="Your name"
                  className={inputCls}
                />
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
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+234 800 000 0000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Your full address"
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </div>

            {profileErr && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileErr}</p>}
            {profileMsg && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{profileMsg}</p>}

            <button type="submit" disabled={savingProfile}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              {savingProfile ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* ── Change Password tab ──────────────────────────────────────────── */}
      {tab === 'password' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Change Password</h2>
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
            {pwMsg && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{pwMsg}</p>}
            <button type="submit" disabled={savingPw}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              {savingPw ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
