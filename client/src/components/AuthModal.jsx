import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../hooks/useAuthModal';
import api from '../services/api';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function trapFocus(containerRef, e) {
  const els = Array.from(containerRef.current?.querySelectorAll(FOCUSABLE) || []);
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
  else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary';
const btnCls   = 'w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition-colors';

// ── OTP input — 6 boxes ──────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  function handleKey(i, e) {
    if (e.key === 'Backspace' && !e.target.value && i > 0) refs[i - 1].current?.focus();
  }

  function handleChange(i, e) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[i] = digit;
    const next = arr.join('');
    onChange(next);
    if (digit && i < 5) refs[i + 1].current?.focus();
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    refs[Math.min(pasted.length, 5)].current?.focus();
    e.preventDefault();
  }

  return (
    <div className="flex gap-2 justify-center my-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-12 text-center text-lg font-bold border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      ))}
    </div>
  );
}

// ── LoginView ────────────────────────────────────────────────────────────────
function LoginView({ onSwitchView, onError, loading, setLoading, onSuccess }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      onSuccess();
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 403 && data?.pending_user_id) {
        // Unverified — go to OTP step
        onSwitchView('verify-register', { pendingUserId: data.pending_user_id, email: form.email });
      } else {
        onError(data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-5">Sign in to your account</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className={inputCls} autoComplete="email" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className={inputCls} autoComplete="current-password" />
        </div>
        <div className="text-right">
          <button type="button" onClick={() => onSwitchView('forgot-password')} className="text-xs text-primary hover:underline">Forgot password?</button>
        </div>
        <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Don't have an account?{' '}
        <button onClick={() => onSwitchView('register')} className="text-primary font-medium hover:underline">Create one</button>
      </p>
    </>
  );
}

// ── RegisterView ─────────────────────────────────────────────────────────────
function RegisterView({ onSwitchView, onError, loading, setLoading }) {
  const [form, setForm] = useState({ email: '', display_name: '', password: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) { onError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email: form.email,
        display_name: form.display_name,
        password: form.password,
      });
      onSwitchView('verify-register', { pendingUserId: res.data.pending_user_id, email: form.email });
    } catch (err) {
      onError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 mb-1">Create account</h2>
      <p className="text-sm text-gray-500 mb-5">Join the marketplace today</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className={inputCls} autoComplete="email" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
          <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} required className={inputCls} autoComplete="name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className={inputCls} autoComplete="new-password" />
          <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
        </div>
        <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Creating account…' : 'Get Started'}</button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Already have an account?{' '}
        <button onClick={() => onSwitchView('login')} className="text-primary font-medium hover:underline">Sign in</button>
      </p>
    </>
  );
}

// ── VerifyOtpView (register) ─────────────────────────────────────────────────
function VerifyRegisterView({ ctx, onSuccess, onError, loading, setLoading }) {
  const { loginWithToken } = useAuth();
  const [otp, setOtp] = useState('');
  const [resent, setResent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (otp.length < 6) { onError('Please enter the full 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        user_id: ctx.pendingUserId,
        otp,
        purpose: 'register',
      });
      loginWithToken(res.data.token);
      onSuccess();
    } catch (err) {
      onError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await api.post('/auth/resend-otp', { user_id: ctx.pendingUserId, purpose: 'register' });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      onError('Could not resend OTP. Please try again.');
    }
  }

  return (
    <>
      <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 mb-1 text-center">Check your email</h2>
      <p className="text-sm text-gray-500 text-center mb-1">We sent a 6-digit code to</p>
      <p className="text-sm font-semibold text-gray-800 text-center mb-4">{ctx.email}</p>
      <form onSubmit={handleSubmit}>
        <OtpInput value={otp} onChange={setOtp} />
        <button type="submit" disabled={loading || otp.length < 6} className={btnCls + ' mt-2'}>
          {loading ? 'Verifying…' : 'Verify & Sign In'}
        </button>
      </form>
      <p className="text-center text-xs text-gray-400 mt-4">
        Didn't receive it?{' '}
        <button onClick={handleResend} className="text-primary hover:underline font-medium">
          {resent ? 'Sent!' : 'Resend code'}
        </button>
      </p>
    </>
  );
}

// ── ForgotPasswordView ───────────────────────────────────────────────────────
function ForgotPasswordView({ onSwitchView, onError, loading, setLoading }) {
  const [email, setEmail] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.pending_user_id) {
        onSwitchView('verify-reset', { pendingUserId: res.data.pending_user_id, email });
      } else {
        // Email not found — still show OTP screen (anti-enumeration UX)
        onSwitchView('verify-reset', { pendingUserId: null, email });
      }
    } catch {
      onError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 mb-1">Forgot password?</h2>
      <p className="text-sm text-gray-500 mb-5">Enter your email and we'll send you a verification code.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} autoComplete="email" />
        </div>
        <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Sending…' : 'Send Code'}</button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        <button onClick={() => onSwitchView('login')} className="text-primary hover:underline">← Back to sign in</button>
      </p>
    </>
  );
}

// ── VerifyResetView ──────────────────────────────────────────────────────────
function VerifyResetView({ ctx, onSwitchView, onError, loading, setLoading }) {
  const [otp, setOtp] = useState('');
  const [resent, setResent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ctx.pendingUserId) { onError('Email not found. Please check and try again.'); return; }
    if (otp.length < 6) { onError('Please enter the full 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        user_id: ctx.pendingUserId,
        otp,
        purpose: 'reset_password',
      });
      onSwitchView('new-password', { resetToken: res.data.reset_token });
    } catch (err) {
      onError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!ctx.pendingUserId) return;
    try {
      await api.post('/auth/resend-otp', { user_id: ctx.pendingUserId, purpose: 'reset_password' });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      onError('Could not resend OTP.');
    }
  }

  return (
    <>
      <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 mb-1 text-center">Enter your code</h2>
      <p className="text-sm text-gray-500 text-center mb-1">We sent a 6-digit code to</p>
      <p className="text-sm font-semibold text-gray-800 text-center mb-4">{ctx.email}</p>
      <form onSubmit={handleSubmit}>
        <OtpInput value={otp} onChange={setOtp} />
        <button type="submit" disabled={loading || otp.length < 6} className={btnCls + ' mt-2'}>
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>
      </form>
      <p className="text-center text-xs text-gray-400 mt-4">
        Didn't receive it?{' '}
        <button onClick={handleResend} className="text-primary hover:underline font-medium">
          {resent ? 'Sent!' : 'Resend code'}
        </button>
      </p>
    </>
  );
}

// ── NewPasswordView ──────────────────────────────────────────────────────────
function NewPasswordView({ ctx, onSwitchView, onError, loading, setLoading }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) { onError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { onError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: ctx.resetToken, password });
      setDone(true);
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <>
        <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 mb-2 text-center">Password updated</h2>
        <p className="text-sm text-gray-500 text-center mb-5">You can now sign in with your new password.</p>
        <button onClick={() => onSwitchView('login')} className={btnCls}>Sign In</button>
      </>
    );
  }

  return (
    <>
      <h2 id="auth-modal-title" className="text-xl font-bold text-gray-800 mb-1">Set new password</h2>
      <p className="text-sm text-gray-500 mb-5">Choose a strong password for your account.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputCls} autoComplete="new-password" />
          <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inputCls} autoComplete="new-password" />
        </div>
        <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Saving…' : 'Save Password'}</button>
      </form>
    </>
  );
}

// ── AuthModal ────────────────────────────────────────────────────────────────
export default function AuthModal() {
  const { isOpen, view, setView, closeModal } = useAuthModal();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState({});
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLoading(false);
      setTimeout(() => containerRef.current?.querySelector(FOCUSABLE)?.focus(), 50);
    }
  }, [isOpen, view]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Tab') trapFocus(containerRef, e);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  function switchView(v, newCtx = {}) {
    setError('');
    setCtx(newCtx);
    setView(v);
  }

  if (!isOpen) return null;

  const sharedProps = { onError: setError, loading, setLoading };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog" aria-labelledby="auth-modal-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
      <div ref={containerRef} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 z-10">
        <button onClick={closeModal} aria-label="Close" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>

        {error && (
          <div role="alert" className="mb-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        {view === 'login' && (
          <LoginView {...sharedProps} onSwitchView={switchView} onSuccess={closeModal} />
        )}
        {view === 'register' && (
          <RegisterView {...sharedProps} onSwitchView={switchView} />
        )}
        {view === 'verify-register' && (
          <VerifyRegisterView {...sharedProps} ctx={ctx} onSwitchView={switchView} onSuccess={closeModal} />
        )}
        {view === 'forgot-password' && (
          <ForgotPasswordView {...sharedProps} onSwitchView={switchView} />
        )}
        {view === 'verify-reset' && (
          <VerifyResetView {...sharedProps} ctx={ctx} onSwitchView={switchView} />
        )}
        {view === 'new-password' && (
          <NewPasswordView {...sharedProps} ctx={ctx} onSwitchView={switchView} />
        )}
      </div>
    </div>,
    document.body
  );
}
