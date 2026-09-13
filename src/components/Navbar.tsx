import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from './InfoModal';

export const Navbar: React.FC = () => {
  const { user, signOut, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-petal-100 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-petal-600 to-petal-400 flex items-center justify-center text-white shadow-md shadow-petal-300/50 group-hover:scale-105 transition-transform">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
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
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-petal-100 text-petal-700 font-sans">
                  Flo Style
                </span>
              </span>
              <p className="text-[11px] text-ink-muted leading-none hidden sm:block">
                Kalkulator Masa Subur & Siklus Hormonal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              aria-label="Informasi Medis & Privasi"
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl border border-petal-200 bg-petal-50 hover:bg-petal-100 text-petal-800 text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-petal-400 cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-petal-600"
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
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/dashboard"
                  className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-petal-500 hover:bg-petal-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-petal-200 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Dashboard</span>
                </Link>

                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-petal-50 border border-petal-100 text-xs text-petal-900 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="max-w-[130px] truncate">{user.email}</span>
                  {isDemoUser && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      Demo
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl border border-petal-200 bg-white hover:bg-petal-50 text-petal-800 text-xs font-semibold flex items-center justify-center transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-petal-600 to-petal-500 hover:from-petal-700 hover:to-petal-600 text-white text-xs font-semibold flex items-center justify-center shadow-md shadow-petal-200 transition-all"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </>
  );
};
