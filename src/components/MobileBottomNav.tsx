import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isEn = (i18n.language || 'en').startsWith('en');

  const navItems = [
    {
      to: '/',
      label: isEn ? 'Home' : 'Beranda',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? '2.5' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      to: '/calculator',
      label: isEn ? 'Calculate' : 'Hitung',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? '2.5' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      ),
    },
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? '2.5' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      to: '/cycles',
      label: isEn ? 'History' : 'Riwayat',
      icon: (active: boolean) => (
        <svg
          className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? '2.5' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-rose-100 shadow-[0_-4px_20px_rgba(219,50,100,0.08)] md:hidden transition-all"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
    >
      <div className="grid grid-cols-4 items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-rose-600 font-bold bg-rose-50/80 shadow-xs'
                  : 'text-gray-500 hover:text-rose-500 font-medium active:scale-95'
              }`}
            >
              {item.icon(isActive)}
              <span className="text-[11px] leading-tight mt-1 truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
