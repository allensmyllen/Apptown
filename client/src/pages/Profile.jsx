import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  // Profile form
  const [displayName, setDisplayName] = useState('');
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
      setProfile(res.data.profile);
      setDisplayName(res.data.profile.display_name || '');
    }).catch(() => {});
  }, []);

  async function handleProfileSave(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileErr('');
    try {
      await api.put('/auth/profile', { display_name: displayName });
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

  const initials = profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Profile Settings</h1>
      <p className="text-sm text-gray-400 mb-8">Manage your account details and password.</p>

      {/* Avatar + info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">{profile?.display_name || '—'}</p>
          <p className="text-sm text-gray-400">{profile?.email}</p>
          {joinDate && <p className="text-xs text-gray-400 mt-0.5">Member since {joinDate}</p>}
          {profile?.role === 'admin' && (
            <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">Admin</span>
          )}
        </div>
      </div>

      {/* Update profile */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="font-semibold text-gray-800 mb-4">Personal Information</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className={inputCls}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input value={profile?.email || ''} disabled className={inputCls + ' opacity-60 cursor-not-allowed'} />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
          </div>
          {profileErr && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileErr}</p>}
          {profileMsg && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{profileMsg}</p>}
          <button type="submit" disabled={savingProfile}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Change Password</h2>
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
    </div>
  );
}
