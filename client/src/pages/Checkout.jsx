import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Paystack returns ?reference=xxx&trxref=xxx on callback
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  const [status, setStatus] = useState('idle'); // idle | verifying | success | canceled | error
  const verified = useRef(false);

  useEffect(() => {
    // No reference means user landed here directly or something went wrong
    if (!reference) {
      setStatus('canceled');
      return;
    }

    if (verified.current) return;
    verified.current = true;
    setStatus('verifying');

    api.get('/orders/verify/' + reference)
      .then((res) => {
        if (res.data.status === 'success') {
          setStatus('success');
        } else {
          // Payment was abandoned / failed
          setStatus('canceled');
        }
      })
      .catch(() => {
        setStatus('error');
      });
  }, [reference]);

  // ── Verifying ──────────────────────────────────────────────────────────────
  if (status === 'verifying') {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Confirming your payment…</span>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-green-500 px-8 py-10 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
          <p className="text-green-100 text-sm mt-2">Your order has been confirmed.</p>
        </div>
        <div className="px-8 py-8 text-center">
          <p className="text-gray-600 text-sm leading-relaxed">
            Thank you for your purchase. A confirmation email with your license key has been sent to your registered email address.
          </p>
          {reference && (
            <div className="mt-5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-left">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Transaction Reference</p>
              <p className="font-mono text-sm text-gray-700 mt-0.5 break-all">{reference}</p>
            </div>
          )}
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/downloads"
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Go to My Downloads
            </Link>
            <Link to="/"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Canceled / abandoned ───────────────────────────────────────────────────
  if (status === 'canceled') {
    return (
      <div className="max-w-lg mx-auto mt-20 bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Payment Canceled</h1>
        <p className="text-gray-500 text-sm mt-3 mb-7">Your payment was not completed. No charge was made.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">
            Try Again
          </button>
          <Link to="/"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-20 bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Something went wrong</h1>
        <p className="text-gray-500 text-sm mt-3 mb-7">
          We couldn't verify your payment. If you were charged, please contact support with your reference: <span className="font-mono text-xs">{reference}</span>
        </p>
        <Link to="/"
          className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  // ── Initial idle (shouldn't normally be seen) ──────────────────────────────
  return (
    <div className="max-w-lg mx-auto mt-20 text-center">
      <div className="flex items-center justify-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
