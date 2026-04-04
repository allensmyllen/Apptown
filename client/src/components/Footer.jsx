import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Footer() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data.categories || [])).catch(() => {});
  }, []);

  return (
    <footer className="bg-[#1a1a2e] text-gray-400 mt-16">
      {/* Main footer columns */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">⚡</span>
              <span className="text-white font-bold text-base">devmarket</span>
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              The marketplace for premium digital assets built by world-class developers.
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <p className="text-white text-xs font-semibold uppercase tracking-wider mb-4">Marketplace</p>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/" className="hover:text-white transition-colors">All Items</Link></li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <Link to={'/?category=' + cat.slug} className="hover:text-white transition-colors capitalize">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-white text-xs font-semibold uppercase tracking-wider mb-4">Account</p>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/downloads" className="hover:text-white transition-colors">My Downloads</Link></li>
              <li><Link to="/admin" className="hover:text-white transition-colors">Seller Dashboard</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <p className="text-white text-xs font-semibold uppercase tracking-wider mb-4">Help</p>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/support" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/terms-of-use" className="hover:text-white transition-colors">Terms of Use</Link></li>
              <li><Link to="/license-use" className="hover:text-white transition-colors">License Use</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/return-policy" className="hover:text-white transition-colors">Return Policy</Link></li>
            </ul>
          </div>

          {/* Stats */}
          <div>
            <p className="text-white text-xs font-semibold uppercase tracking-wider mb-4">devmarket</p>
            <div className="space-y-3">
              <div>
                <p className="text-white text-lg font-bold leading-tight">Premium</p>
                <p className="text-xs text-gray-500">Digital Assets</p>
              </div>
              <div>
                <p className="text-white text-lg font-bold leading-tight">Instant</p>
                <p className="text-xs text-gray-500">Downloads</p>
              </div>
              <div>
                <p className="text-white text-lg font-bold leading-tight">Secure</p>
                <p className="text-xs text-gray-500">Payments via Paystack</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} devmarket. All rights reserved.</span>
            <Link to="/terms-of-use" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/license-use" className="hover:text-white transition-colors">Licenses</Link>
            <Link to="/return-policy" className="hover:text-white transition-colors">Returns</Link>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            {[
              { label: 'Twitter', path: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
              { label: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
              { label: 'Instagram', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 19.5h11a3 3 0 003-3v-11a3 3 0 00-3-3h-11a3 3 0 00-3 3v11a3 3 0 003 3z' },
              { label: 'YouTube', path: 'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z' },
            ].map(({ label, path }) => (
              <a key={label} href="#" aria-label={label}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
