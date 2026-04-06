import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthModal } from '../hooks/useAuthModal';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { openModal } = useAuthModal();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-white rounded-2xl shadow-md p-10">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="text-xl font-bold text-gray-800">Invalid Reset Link</h1>
        <p className="text-gray-500 text-sm mt-2">This password reset link is invalid or has expired.</p>
        <button onClick={() => openModal('forgot-password')}
          className="mt-6 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
          Request a new link
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center bg-white rounded-2xl shadow-md p-10">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-xl font-bold text-gray-800">Password Updated</h1>
        <p className="text-gray-500 text-sm mt-2">Your password has been reset successfully.</p>
        <button onClick={() => openModal('login')}
          className="mt-6 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
          Sign In
        </button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 bg-white rounded-2xl shadow-md p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Set new password</h1>
      <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputCls} autoComplete="new-password" />
          <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inputCls} autoComplete="new-password" />
        </div>
        {error && <p role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors">
          {loading ? 'Updating…' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
