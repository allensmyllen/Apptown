import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../hooks/useAuthModal';
import { useCart } from '../hooks/useCart';
import api from '../services/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { openModal } = useAuthModal();
  const { items } = useCart();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef(null);
  const initials = user?.email ? user.email[0].toUpperCase() : '?';
  const displayName = user?.email?.split('@')[0] || '';

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  function closeSidebar() { setSidebarOpen(false); }

  async function handleLogout() {
    await logout();
    setDropdownOpen(false);
    closeSidebar();
    navigate('/');
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#1a1a2e] text-white shadow-lg">
        {/* Main bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight shrink-0">
            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded">⚡</span>
            <span className="text-white">devmarket</span>
          </Link>

          {/* Desktop right side */}
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <Link to="/cart" className="relative text-gray-300 hover:text-white transition-colors p-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {items.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">{items.length}</span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(v => !v)} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold select-none">{initials}</div>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">{initials}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate capitalize">{displayName}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link to="/downloads" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        My Downloads
                      </Link>
                      <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Profile Settings
                      </Link>
                      {user.role === 'admin' && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                          <Link to="/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            Dashboard
                          </Link>
                        </>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full text-left">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => openModal('login')} className="text-gray-300 hover:text-white transition-colors">Sign In</button>
                <button onClick={() => openModal('register')} className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded font-medium transition-colors">Get Started</button>
              </>
            )}
          </div>

          {/* Mobile right: cart + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link to="/cart" className="relative text-gray-300 hover:text-white p-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {items.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">{items.length}</span>
              )}
            </Link>
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white p-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop category sub-nav */}
        <div className="hidden sm:block border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 flex gap-6 text-xs text-gray-400 overflow-x-auto py-2">
            <Link to="/" className="whitespace-nowrap hover:text-white transition-colors pb-0.5 border-b border-transparent hover:border-primary/80">All Items</Link>
            {categories.map(cat => (
              <Link key={cat.id} to={`/?category=${cat.slug}`} className="whitespace-nowrap hover:text-white transition-colors pb-0.5 border-b border-transparent hover:border-primary/80 capitalize">{cat.name}</Link>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Mobile sidebar ─────────────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 sm:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeSidebar}
      />

      {/* Sidebar panel — slides in from right */}
      <div className={`fixed top-0 right-0 h-full w-72 bg-[#1a1a2e] z-50 sm:hidden flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <Link to="/" onClick={closeSidebar} className="flex items-center gap-2">
            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded">⚡</span>
            <span className="text-white font-bold text-sm">devmarket</span>
          </Link>
          <button onClick={closeSidebar} className="text-gray-400 hover:text-white p-1 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

          {user ? (
            <>
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-white/5 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">{initials}</div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold capitalize truncate">{displayName}</p>
                  <p className="text-gray-400 text-xs truncate">{user.email}</p>
                </div>
              </div>

              <Link to="/downloads" onClick={closeSidebar}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                My Downloads
              </Link>
              <Link to="/profile" onClick={closeSidebar}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Profile Settings
              </Link>

              <Link to="/cart" onClick={closeSidebar}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Cart {items.length > 0 && <span className="ml-auto bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{items.length}</span>}
              </Link>

              {user.role === 'admin' && (
                <>
                  <div className="border-t border-white/10 my-2" />
                  <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</p>
                  <Link to="/admin" onClick={closeSidebar}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    Admin Dashboard
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <button onClick={() => { openModal('login'); closeSidebar(); }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all w-full text-left">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                Sign In
              </button>
              <button onClick={() => { openModal('register'); closeSidebar(); }}
                className="flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl text-sm bg-primary hover:bg-primary/90 text-white font-semibold transition-all">
                Get Started
              </button>
            </>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <>
              <div className="border-t border-white/10 my-2" />
              <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</p>
              <Link to="/" onClick={closeSidebar}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                All Items
              </Link>
              {categories.map(cat => (
                <Link key={cat.id} to={`/?category=${cat.slug}`} onClick={closeSidebar}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all capitalize">
                  {cat.name}
                </Link>
              ))}
            </>
          )}
        </div>

        {/* Footer — sign out */}
        {user && (
          <div className="px-4 py-4 border-t border-white/10">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full text-left">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </>
  );
}
