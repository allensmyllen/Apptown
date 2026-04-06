import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../hooks/useAuthModal';
import api from '../services/api';

export default function Cart() {
  const { items, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout() {
    if (!user) { openModal('login'); return; }
    if (items.length === 0) return;
    setLoading(true);
    setError('');
    try {
      if (items.length === 1) {
        const res = await api.post('/orders', { productId: items[0].id });
        clearCart();
        window.location.href = res.data.url;
      } else {
        const res = await api.post('/orders/cart', { productIds: items.map(i => i.id) });
        clearCart();
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 text-sm mb-7">Browse the marketplace and add items to get started.</p>
        <Link to="/" className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Your Cart</h1>
        <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
      </div>

      <div className="space-y-3 mb-8">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              {item.image_url
                ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{item.category?.replace('_', ' ')}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-gray-800">₦{(item.price_cents / 100).toFixed(2)}</p>
              <button onClick={() => removeItem(item.id)} className="text-xs text-red-400 hover:text-red-600 mt-1 transition-colors">Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500 text-sm">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <span className="text-2xl font-bold text-gray-800">₦{(total / 100).toFixed(2)}</span>
        </div>
        {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
            : 'Proceed to Checkout'
          }
        </button>
        <Link to="/" className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
}
