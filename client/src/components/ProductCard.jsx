import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

const CATEGORY_GRADIENTS = {
  theme: 'from-purple-600 to-indigo-700',
  plugin: 'from-blue-600 to-cyan-700',
  script: 'from-yellow-500 to-orange-600',
  source_code: 'from-green-600 to-teal-700',
};

function StarRating({ rating = 4.5 }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className={`w-3 h-3 ${i < full ? 'text-yellow-400' : i === full && half ? 'text-yellow-300' : 'text-gray-300'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function ProductCard({ product }) {
  const { id, title, price_cents, category, preview_link, image_url, sales_count, avg_rating, review_count } = product;
  const { addItem, items } = useCart();
  const inCart = items.some(i => i.id === id);
  const gradient = CATEGORY_GRADIENTS[category] || 'from-gray-600 to-gray-800';
  const sales = parseInt(sales_count || 0);
  const rating = avg_rating ? parseFloat(avg_rating) : null;
  const reviews = parseInt(review_count || 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow group">
      {/* Preview image — fixed 176px height, always fills container */}
      <div className="relative w-full h-32 sm:h-44 overflow-hidden bg-gray-100">
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        {preview_link && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <a href={preview_link} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-800 text-xs font-semibold px-4 py-2 rounded-full shadow hover:bg-gray-100">
              Live Preview
            </a>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-2 sm:p-3">
        <Link to={`/products/${id}`}>
          <h2 className="text-sm font-semibold text-gray-800 hover:text-green-600 line-clamp-2 leading-snug min-h-[2.5rem]">
            {title}
          </h2>
        </Link>
        <p className="text-xs text-gray-400 mt-1 capitalize">{category?.replace(/_/g, ' ')}</p>

        {/* Rating + sales — only show if there's real data */}
        {(rating || sales > 0) && (
          <div className="flex items-center gap-1.5 mt-2">
            {rating && <StarRating rating={rating} />}
            {rating && <span className="text-xs text-gray-500">{rating}</span>}
            {sales > 0 && <span className="text-xs text-gray-400">{sales.toLocaleString()} {sales === 1 ? 'sale' : 'sales'}</span>}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {/* Price */}
          <span className="text-base sm:text-lg font-bold text-gray-800 truncate">
            ₦{(price_cents / 100).toLocaleString('en-NG')}
          </span>
          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.preventDefault(); addItem(product); }}
              title={inCart ? 'In cart' : 'Add to cart'}
              className={`p-1.5 rounded border transition-colors shrink-0 ${inCart ? 'border-green-400 text-green-600 bg-green-50' : 'border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            <Link to={`/products/${id}`}
              className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-2 py-1.5 rounded transition-colors">
              Buy Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
