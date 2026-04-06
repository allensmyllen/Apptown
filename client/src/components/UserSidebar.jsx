import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PRIMARY = '#3781EE';
const NAV_BG  = '#0D0D1A';

const navItems = [
  {
    to: '/downloads?tab=downloads',
    label: 'My Downloads',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
    match: '/downloads',
  },
  {
    to: '/profile?tab=profile',
    label: 'Profile Settings',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    match: '/profile',
  },
  {
    to: '/profile?tab=password',
    label: 'Change Password',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    match: '/profile',
  },
  {
    to: '/support',
    label: 'Help Center',
    icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
    match: '/support',
  },
];

export default function UserSidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Only show for logged-in non-admin users
  if (!user || user.role === 'admin') return null;

  const initials = user.email?.[0]?.toUpperCase() || '?';
  const displayName = user.email?.split('@')[0] || '';

  return (
    <aside
      style={{ backgroundColor: NAV_BG, top: '88px' }}
      className="hidden lg:flex fixed left-0 bottom-0 w-52 flex-col z-30 border-r border-white/10"
    >
      {/* User info */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: PRIMARY }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold capitalize truncate">{displayName}</p>
            <p className="text-gray-500 text-xs truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon, match }) => {
          const isActive = pathname === (match || to.split('?')[0]);
          return (
            <Link
              key={to}
              to={to}
              style={isActive ? { backgroundColor: PRIMARY } : {}}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — marketplace link */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Marketplace
        </Link>
      </div>
    </aside>
  );
}
