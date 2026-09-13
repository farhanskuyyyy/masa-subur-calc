import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-petal-100 bg-white/60 py-8 px-4 sm:px-6 text-center text-xs text-ink-muted">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-petal-800 font-medium">
          <Link to="/" className="hover:text-petal-600 transition-colors">Beranda</Link>
          <span>•</span>
          <Link to="/dashboard" className="hover:text-petal-600 transition-colors">Kalkulator & Kalender</Link>
          <span>•</span>
          <Link to="/login" className="hover:text-petal-600 transition-colors">Masuk</Link>
          <span>•</span>
          <Link to="/register" className="hover:text-petal-600 transition-colors">Daftar Akun</Link>
        </div>
        <p className="leading-relaxed max-w-xl mx-auto">
          Luna dirancang dengan metodologi kalendar medis (Ogino-Knaus & Konsensus Wilcox). Seluruh perhitungan fertilitas dijalankan secara aman di browser Anda.
        </p>
        <p className="text-[11px] text-ink-muted/80">
          © {new Date().getFullYear()} Luna Menstrual Calculator (Flo Style).
        </p>
      </div>
    </footer>
  );
};
