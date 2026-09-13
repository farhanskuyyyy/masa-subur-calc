import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Footer: React.FC = () => {
  const location = useLocation();

  const footerLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/login', label: 'Masuk' },
    { href: '/register', label: 'Daftar Akun' },
  ];

  return (
    <footer className="mt-16 border-t border-rose-100 bg-white/60 py-8 px-4 sm:px-6 text-center text-xs text-ink-muted">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          {footerLinks.map((link, idx) => {
            const isActive = location.pathname === link.href;
            return (
              <React.Fragment key={link.href}>
                {idx > 0 && <span className="text-gray-300">•</span>}
                <Link
                  to={link.href}
                  className={`transition-colors border-b-2 pb-0.5 ${
                    isActive
                      ? 'font-bold text-rose-600 border-rose-500'
                      : 'text-gray-600 hover:text-rose-500 border-transparent'
                  }`}
                >
                  {link.label}
                </Link>
              </React.Fragment>
            );
          })}
        </div>
        <p className="leading-relaxed max-w-xl mx-auto">
          Luna dirancang dengan metodologi kalendar medis (Ogino-Knaus & Konsensus Wilcox). Seluruh perhitungan fertilitas dijalankan secara aman di browser Anda.
        </p>
        <p className="text-[11px] text-ink-muted/80">
          © {new Date().getFullYear()} Luna Menstrual Calculator.
        </p>
      </div>
    </footer>
  );
};
