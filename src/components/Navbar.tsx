import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from './InfoModal';

export const Navbar: React.FC = () => {
  const { user, signOut, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close mobile menu on route change
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    setIsMenuOpen(false);
  }

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getNavLinkClass = (href: string) => {
    const isActive = location.pathname === href;
    return `h-10 px-2 sm:px-3 flex items-center gap-1.5 text-xs sm:text-sm transition-colors cursor-pointer ${
      isActive
        ? 'font-bold text-rose-600 border-b-2 border-rose-500'
        : 'text-gray-600 hover:text-rose-500 border-b-2 border-transparent'
    }`;
  };

  const getMobileNavLinkClass = (href: string) => {
    const isActive = location.pathname === href;
    return `w-full py-3 px-4 flex items-center gap-3 text-sm font-medium rounded-xl transition-colors ${
      isActive
        ? 'font-bold text-rose-600 bg-rose-50 border-l-4 border-rose-500'
        : 'text-gray-700 hover:text-rose-600 hover:bg-rose-50/60'
    }`;
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-rose-100 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo / Brand on the left */}
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-300/50 group-hover:scale-105 transition-transform">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2C6.5 2 2 6.5 2 12c0 3.8 2.1 7.1 5.3 8.8.7.4 1.5-.1 1.5-.9v-2.3c0-.4.3-.8.7-.9 1.6-.4 3.4-.4 5 0 .4.1.7.5.7.9v2.3c0 .8.8 1.3 1.5.9 3.2-1.7 5.3-5 5.3-8.8 0-5.5-4.5-10-10-10z"></path>
                <path
                  d="M12 7c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5z"
                  fill="rgba(255,255,255,0.25)"
                ></path>
              </svg>
            </div>
            <div>
              <span className="font-display font-bold text-lg sm:text-xl text-ink-primary tracking-tight flex items-center gap-1.5">
                Luna
              </span>
              <p className="text-[11px] text-ink-muted leading-none hidden sm:block">
                Kalkulator Masa Subur & Siklus Hormonal
              </p>
            </div>
          </Link>

          {/* Desktop Navigation links (md+) */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              aria-label="Informasi Medis & Privasi"
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-rose-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span className="hidden xs:inline">Dasar Klinis</span>
            </button>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/dashboard"
                  className={getNavLinkClass('/dashboard')}
                  title="Dashboard"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/calculator"
                  className={getNavLinkClass('/calculator')}
                  title="Hitung Siklus"
                >
                  <span className="text-xs">✨</span>
                  <span>Hitung Siklus</span>
                </Link>

                <Link
                  to="/cycles"
                  className={getNavLinkClass('/cycles')}
                  title="Riwayat Siklus"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="hidden sm:inline">Riwayat Siklus</span>
                  <span className="sm:hidden">Riwayat</span>
                </Link>

                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-900 font-medium ml-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  {isDemoUser && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      Demo
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
                  title="Keluar dari akun"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/"
                  className={getNavLinkClass('/')}
                >
                  Beranda
                </Link>
                <Link
                  to="/login"
                  className={getNavLinkClass('/login')}
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className={getNavLinkClass('/register')}
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>

          {/* Hamburger button on the right (md:hidden) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={isMenuOpen}
              className="w-10 h-10 flex justify-center items-center rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer group"
            >
              {isMenuOpen ? (
                <img
                  src="/hamburger-close.svg"
                  alt="Tutup menu"
                  width={24}
                  height={24}
                  className="w-6 h-6 transition-opacity duration-200 group-hover:opacity-70 hover:opacity-70"
                />
              ) : (
                <img
                  src="/hamburger.svg"
                  alt="Buka menu"
                  width={24}
                  height={24}
                  className="w-6 h-6 transition-opacity duration-200 group-hover:opacity-70 hover:opacity-70"
                />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (md:hidden) */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMenuOpen
              ? 'max-h-[500px] opacity-100 visible'
              : 'max-h-0 opacity-0 invisible pointer-events-none'
          }`}
        >
          <div className="bg-white rounded-b-2xl shadow-lg border-t border-rose-100 px-4 pt-2 pb-5 space-y-1">
            {user ? (
              <>
                <div className="py-2.5 px-4 mb-2 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="text-xs text-rose-900 font-medium truncate">{user.email}</span>
                  </div>
                  {isDemoUser && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                      Demo
                    </span>
                  )}
                </div>

                <Link
                  to="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/dashboard')}
                >
                  <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/calculator"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/calculator')}
                >
                  <span className="text-xs shrink-0">✨</span>
                  <span>Hitung Siklus</span>
                </Link>

                <Link
                  to="/cycles"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/cycles')}
                >
                  <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Riwayat Siklus</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsInfoOpen(true);
                  }}
                  className="w-full py-3 px-4 flex items-center gap-3 text-sm font-medium rounded-xl text-gray-700 hover:bg-rose-50/60 hover:text-rose-600 transition-colors text-left cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-rose-500 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Dasar Klinis</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsMenuOpen(false);
                    await handleLogout();
                  }}
                  className="w-full py-3 px-4 flex items-center gap-3 text-sm font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer border-t border-rose-100/60 mt-1"
                >
                  <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Keluar</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/')}
                >
                  <span>Beranda</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsInfoOpen(true);
                  }}
                  className="w-full py-3 px-4 flex items-center gap-3 text-sm font-medium rounded-xl text-gray-700 hover:bg-rose-50/60 hover:text-rose-600 transition-colors text-left cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-rose-500 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>Dasar Klinis</span>
                </button>

                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/login')}
                >
                  <span>Masuk</span>
                </Link>

                <Link
                  to="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/register')}
                >
                  <span>Daftar</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </>
  );
};
