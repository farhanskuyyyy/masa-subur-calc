import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from './InfoModal';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isIndonesian = (i18n.language || 'en').startsWith('id');

  const toggleLanguage = () => {
    const nextLang = isIndonesian ? 'en' : 'id';
    i18n.changeLanguage(nextLang);
  };

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
        <nav aria-label="Main Navigation" className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo / Brand on the left */}
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 group"
            aria-label="Luna Home"
          >
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md shadow-rose-300/50 group-hover:scale-105 transition-transform">
              <img src="/logo-luna.svg" alt="Luna Logo" className="w-full h-full object-contain" width={40} height={40} />
            </div>
            <div>
              <span className="font-display font-bold text-lg sm:text-xl text-ink-primary tracking-tight flex items-center gap-1.5">
                Luna
              </span>
              <p className="text-[11px] text-ink-muted leading-none hidden sm:block">
                {t('nav.tagline')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation links (md+) */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              aria-label={t('nav.clinicalBasis')}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-rose-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span className="hidden xs:inline">{t('nav.clinicalBasis')}</span>
            </button>

            {/* Language Switcher Button (Desktop) */}
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={isIndonesian ? 'Switch language to English' : 'Ganti bahasa ke Bahasa Indonesia'}
              title={isIndonesian ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <span aria-hidden="true">🌐</span>
              <span>{isIndonesian ? 'ID' : 'EN'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/dashboard"
                  className={getNavLinkClass('/dashboard')}
                  title={t('nav.dashboard')}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>{t('nav.dashboard')}</span>
                </Link>

                <Link
                  to="/calculator"
                  className={getNavLinkClass('/calculator')}
                  title={t('nav.calculator')}
                >
                  <span className="text-xs" aria-hidden="true">✨</span>
                  <span>{t('nav.calculator')}</span>
                </Link>

                <Link
                  to="/cycles"
                  className={getNavLinkClass('/cycles')}
                  title={t('nav.history')}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{t('nav.history')}</span>
                </Link>

                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-900 font-medium ml-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  {isDemoUser && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      {t('nav.demo')}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/"
                  className={getNavLinkClass('/')}
                >
                  {t('nav.home')}
                </Link>
                <Link
                  to="/login"
                  className={getNavLinkClass('/login')}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className={getNavLinkClass('/register')}
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>

          {/* Right Mobile Actions: Language Switcher + Hamburger button (md:hidden) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={isIndonesian ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
              title={isIndonesian ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
              className="h-10 px-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span aria-hidden="true">🌐</span>
              <span>{isIndonesian ? 'ID' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={isMenuOpen}
              className="w-10 h-10 flex justify-center items-center rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer group"
            >
              {isMenuOpen ? (
                <img
                  src="/hamburger-close.svg"
                  alt={t('nav.closeMenu')}
                  width={24}
                  height={24}
                  className="w-6 h-6 transition-opacity duration-200 group-hover:opacity-70 hover:opacity-70"
                />
              ) : (
                <img
                  src="/hamburger.svg"
                  alt={t('nav.openMenu')}
                  width={24}
                  height={24}
                  className="w-6 h-6 transition-opacity duration-200 group-hover:opacity-70 hover:opacity-70"
                />
              )}
            </button>
          </div>
        </nav>

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
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true"></span>
                    <span className="text-xs text-rose-900 font-medium truncate">{user.email}</span>
                  </div>
                  {isDemoUser && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                      {t('nav.demo')}
                    </span>
                  )}
                </div>

                <Link
                  to="/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/dashboard')}
                >
                  <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>{t('nav.dashboard')}</span>
                </Link>

                <Link
                  to="/calculator"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/calculator')}
                >
                  <span className="text-xs shrink-0" aria-hidden="true">✨</span>
                  <span>{t('nav.calculator')}</span>
                </Link>

                <Link
                  to="/cycles"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/cycles')}
                >
                  <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{t('nav.history')}</span>
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
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>{t('nav.clinicalBasis')}</span>
                </button>

                <div className="pt-2 border-t border-rose-100/60 my-1">
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    className="w-full py-2.5 px-4 flex items-center justify-between text-xs font-semibold rounded-xl bg-rose-50/80 hover:bg-rose-100 text-rose-900 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true">🌐</span>
                      <span>{t('nav.switchLanguage')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-rose-200 font-bold">
                      {isIndonesian ? 'ID' : 'EN'}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setIsMenuOpen(false);
                    await handleLogout();
                  }}
                  className="w-full py-3 px-4 flex items-center gap-3 text-sm font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer border-t border-rose-100/60 mt-1"
                >
                  <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>{t('nav.logout')}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/')}
                >
                  <span>{t('nav.home')}</span>
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
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>{t('nav.clinicalBasis')}</span>
                </button>

                <div className="pt-2 border-t border-rose-100/60 my-1">
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    className="w-full py-2.5 px-4 flex items-center justify-between text-xs font-semibold rounded-xl bg-rose-50/80 hover:bg-rose-100 text-rose-900 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true">🌐</span>
                      <span>{t('nav.switchLanguage')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-rose-200 font-bold">
                      {isIndonesian ? 'ID' : 'EN'}
                    </span>
                  </button>
                </div>

                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/login')}
                >
                  <span>{t('nav.login')}</span>
                </Link>

                <Link
                  to="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className={getMobileNavLinkClass('/register')}
                >
                  <span>{t('nav.register')}</span>
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

export default Navbar;
