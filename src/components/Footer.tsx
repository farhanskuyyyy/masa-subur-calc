import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const footerLinks = [
    { href: '/', label: t('footer.home') },
    { href: '/dashboard', label: t('footer.dashboard') },
    { href: '/login', label: t('footer.login') },
    { href: '/register', label: t('footer.register') },
  ];

  return (
    <footer aria-label="Footer" className="mt-10 sm:mt-16 border-t border-rose-100 bg-white/60 py-5 sm:py-8 px-4 sm:px-6 text-center text-xs text-ink-muted">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Desktop-only footer navigation */}
        <nav aria-label="Footer Navigation" className="hidden md:flex flex-wrap items-center justify-center gap-4 text-xs">
          {footerLinks.map((link, idx) => {
            const isActive = location.pathname === link.href;
            return (
              <React.Fragment key={link.href}>
                {idx > 0 && <span className="text-gray-300" aria-hidden="true">•</span>}
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
        </nav>
        <p className="leading-relaxed max-w-xl mx-auto hidden md:block">
          {t('footer.description')}
        </p>
        <p className="text-[11px] text-ink-muted/80">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
