import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../hooks/useAuthModal';
import { useCart } from '../hooks/useCart';

const CATEGORY_GRADIENTS = {
  theme: 'from-purple-600 to-indigo-700',
  plugin: 'from-blue-600 to-cyan-700',
  script: 'from-yellow-500 to-orange-600',
  source_code: 'from-primary to-teal-700',
};

const CATEGORY_COLORS = {
  theme: 'bg-purple-50 text-purple-700 border-purple-100',
  plugin: 'bg-blue-50 text-blue-700 border-blue-100',
  script: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  source_code: 'bg-blue-50 text-primary border-primary/20',
};

function Stars({ rating, interactive = false, onSelect }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i}
          onClick={() => interactive && onSelect && onSelect(i)}
          className={`w-4 h-4 transition-colors ${interactive ? 'cursor-pointer' : ''} ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { openModal } = useAuthModal();
  const { addItem, items } = useCart();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  // Review form
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inCart = product ? items.some(i => i.id === product.id) : false;

  useEffect(() => {
    api.get(`/products/${id}`).then(res => setProduct(res.data)).catch(() => {});
    api.get(`/products/${id}/reviews`).then(res => {
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.avg_rating);
      setTotalReviews(res.data.total_reviews || 0);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!user) return;
    api.get('/orders').then(res => {
      // product_id from API may be a number; id from useParams is a string
      const owned = (res.data.orders || []).some(
        o => String(o.product_id) === String(id)
      );
      setHasPurchased(owned);
    }).catch(() => {});
  }, [user, id]);

  async function handleBuy() {
    if (!user) { openModal('login'); return; }
    setBuying(true);
    try {
      const res = await api.post('/orders', { productId: id });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Purchase failed. Please try again.');
      setBuying(false);
    }
  }

  async function handleBuySupportLicense() {
    setBuying(true);
    try {
      const res = await api.post('/support-licenses/purchase', { productId: product.id });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || 'Support license purchase failed. Please try again.');
      setBuying(false);
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (reviewRating === 0) { setReviewError('Please select a star rating.'); return; }
    setSubmitting(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      await api.post(`/products/${id}/reviews`, { rating: reviewRating, body: reviewBody });
      setReviewSuccess('Review submitted. Thank you!');
      setReviewRating(0);
      setReviewBody('');
      // Refresh reviews
      const res = await api.get(`/products/${id}/reviews`);
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.avg_rating);
      setTotalReviews(res.data.total_reviews || 0);
    } catch (err) {
      setReviewError(err.response?.data?.error || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const gradient = CATEGORY_GRADIENTS[product.category] || 'from-gray-600 to-gray-800';
  const badge = CATEGORY_COLORS[product.category] || 'bg-gray-50 text-gray-600 border-gray-100';
  const sales = parseInt(product.sales_count || 0);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-gray-600 transition-colors">Marketplace</Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-600 truncate max-w-xs">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — preview + description + reviews */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preview banner */}
          <div className="w-full h-56 rounded-2xl overflow-hidden shadow-sm bg-gray-100">
            {product.image_url ? (
              <img src={product.image_url} className="w-full h-full object-cover" alt={product.title} />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">About this product</h2>
            <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>
            {product.preview_link && (
              <a href={product.preview_link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-5 text-sm font-medium text-primary border border-primary/30 bg-blue-50 rounded-lg px-4 py-2 hover:bg-blue-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Live Preview
              </a>
            )}
          </div>

          {/* ── Reviews section ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-800 text-base">Reviews</h2>
              {totalReviews > 0 && (
                <div className="flex items-center gap-2">
                  <Stars rating={avgRating} />
                  <span className="text-sm font-semibold text-gray-800">{avgRating}</span>
                  <span className="text-xs text-gray-400">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
                </div>
              )}
            </div>

            {/* Write a review — login gate */}
            {!user ? (
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-3">Sign in to leave a review</p>
                <button onClick={() => openModal('login')}
                  className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                  Sign In
                </button>
              </div>
            ) : !hasPurchased ? (
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                <p className="text-sm text-gray-500">Purchase this product to leave a review.</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">Leave a review</p>
                <div className="flex items-center gap-1 mb-3">
                  <Stars rating={reviewRating} interactive onSelect={setReviewRating} />
                  {reviewRating > 0 && <span className="text-xs text-gray-500 ml-1">{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}</span>}
                </div>
                <textarea
                  value={reviewBody}
                  onChange={e => setReviewBody(e.target.value)}
                  placeholder="Share your experience with this product… (optional)"
                  rows={3}
                  maxLength={1000}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                {reviewError && <p className="text-red-600 text-xs mt-1">{reviewError}</p>}
                {reviewSuccess && <p className="text-primary text-xs mt-1">{reviewSuccess}</p>}
                <button type="submit" disabled={submitting}
                  className="mt-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}

            {/* Review list */}
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">No reviews yet. Be the first to review this product.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {r.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 capitalize">{r.author}</p>
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <Stars rating={r.rating} />
                      {r.body && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{r.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — purchase card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6">
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border capitalize mb-3 ${badge}`}>
              {product.category?.replace('_', ' ')}
            </span>
            <h1 className="text-xl font-bold text-gray-800 leading-snug">{product.title}</h1>

            {/* Real rating + sales */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {avgRating && (
                <div className="flex items-center gap-1">
                  <Stars rating={avgRating} />
                  <span className="text-xs text-gray-600 font-medium">{avgRating}</span>
                  <span className="text-xs text-gray-400">({totalReviews})</span>
                </div>
              )}
              {sales > 0 && (
                <span className="text-xs text-gray-400">{sales.toLocaleString()} {sales === 1 ? 'sale' : 'sales'}</span>
              )}
            </div>

            <p className="text-3xl font-bold text-gray-900 mt-4">₦{(product.price_cents / 100).toLocaleString('en-NG')}</p>
            <p className="text-xs text-gray-400 mt-0.5">One-time purchase · Instant download</p>

            {product.support_price_cents && (
              <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-indigo-700">Support License available</p>
                  <p className="text-xs text-indigo-500">₦{(product.support_price_cents / 100).toLocaleString('en-NG')} · 3 support requests</p>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="mt-5 space-y-2">
              {!user ? (
                <button onClick={() => openModal('login')}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  Sign in to Purchase
                </button>
              ) : hasPurchased ? (
                <>
                  <button disabled
                    className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Already Purchased
                  </button>
                  <Link to="/downloads"
                    className="w-full py-2.5 rounded-xl font-semibold text-sm transition-colors border border-primary/80 text-primary bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-2">
                    Go to My Downloads
                  </Link>
                  {product.support_price_cents && (
                    <button onClick={handleBuySupportLicense}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                      Buy Support License — ₦{(product.support_price_cents / 100).toLocaleString('en-NG')}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={handleBuy} disabled={buying}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                    {buying
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Redirecting…</>
                      : <>Buy Now</>
                    }
                  </button>
                  <button onClick={() => addItem(product)}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors border flex items-center justify-center gap-2 ${inCart ? 'border-primary/80 text-primary bg-blue-50' : 'border-gray-200 text-gray-600 hover:border-primary/80 hover:text-primary'}`}>
                    {inCart ? 'Added to Cart' : 'Add to Cart'}
                  </button>
                </>
              )}
            </div>

            {/* Trust badges */}
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-2.5">
              {[
                { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Secure checkout' },
                { icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', label: 'Instant download after purchase' },
                { icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z', label: '24/7 support' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
