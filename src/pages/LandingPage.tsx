import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from '../components/InfoModal';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-16">
      {/* Hero Section */}
      <section aria-labelledby="hero-heading" className="relative text-center max-w-3xl mx-auto mb-16">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-tr from-pink-200/40 via-rose-200/30 to-warm-200/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-rose-200 px-4 py-1.5 rounded-full shadow-sm mb-6 hover:border-rose-300 transition-colors">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" aria-hidden="true"></span>
          <span className="text-xs font-semibold text-rose-800">
            {t('landing.badge')}
          </span>
        </div>

        <h1 id="hero-heading" className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink-primary tracking-tight leading-tight">
          {t('landing.title')}{' '}
          <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 bg-clip-text text-transparent">
            {t('landing.titleHighlight')}
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-ink-secondary leading-relaxed max-w-2xl mx-auto">
          {t('landing.subtitle')}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
          <Link
            to="/dashboard"
            aria-label={t('landing.openCalculator')}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-display font-bold text-base rounded-2xl shadow-lg shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>{t('landing.openCalculator')}</span>
          </Link>

          {!user ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-2 w-full sm:w-auto">
              <Link
                to="/register"
                aria-label={t('landing.registerCta')}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-white hover:bg-rose-50 text-rose-700 border-2 border-rose-200 font-display font-bold text-base rounded-2xl shadow-sm hover:border-rose-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('landing.registerCta')}</span>
                <span className="text-rose-500" aria-hidden="true">→</span>
              </Link>
              <Link
                to="/login"
                aria-label={t('landing.loginCta')}
                className="w-full sm:w-auto min-h-[48px] px-5 py-3.5 text-sm font-bold text-rose-700 hover:text-rose-900 bg-rose-50/70 hover:bg-rose-100/70 rounded-2xl transition-colors cursor-pointer flex items-center justify-center text-center"
              >
                {t('landing.loginCta')}
              </Link>
            </div>
          ) : (
            <Link
              to="/dashboard"
              aria-label={t('landing.goToDashboard')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-white hover:bg-rose-50 text-rose-700 border-2 border-rose-200 font-display font-bold text-base rounded-2xl shadow-sm transition-all flex items-center justify-center text-center"
            >
              {t('landing.goToDashboard')}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            aria-label={t('landing.learnMethod')}
            className="w-full sm:w-auto min-h-[44px] px-4 py-3 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-transparent hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer flex items-center justify-center"
          >
            {t('landing.learnMethod')}
          </button>
        </div>
      </section>

      {/* 3 Info Cards Section */}
      <section aria-labelledby="features-heading" className="mb-20">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 id="features-heading" className="font-display text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
            {t('landing.features.title')}
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary mt-2">
            {t('landing.features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Metode Kalendar */}
          <article className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-7 shadow-luna-card border border-rose-100 hover:shadow-luna-hover hover:border-rose-200 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform" aria-hidden="true">
              🧬
            </div>
            <h3 className="font-display font-bold text-lg text-ink-primary mb-2">
              {t('landing.features.calendar')}
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              {t('landing.features.calendarDesc')}
            </p>
          </article>

          {/* Card 2: Privasi Terjaga */}
          <article className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-7 shadow-luna-card border border-rose-100 hover:shadow-luna-hover hover:border-rose-200 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform" aria-hidden="true">
              🔒
            </div>
            <h3 className="font-display font-bold text-lg text-ink-primary mb-2">
              {t('landing.features.privacy')}
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              {t('landing.features.privacyDesc')}
            </p>
          </article>

          {/* Card 3: Visual Kalender */}
          <article className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-7 shadow-luna-card border border-rose-100 hover:shadow-luna-hover hover:border-rose-200 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform" aria-hidden="true">
              🗓️
            </div>
            <h3 className="font-display font-bold text-lg text-ink-primary mb-2">
              {t('landing.features.visualization')}
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              {t('landing.features.visualizationDesc')}
            </p>
          </article>
        </div>
      </section>

      {/* 4 Hormonal Phases Educational Section */}
      <section aria-labelledby="phases-heading" className="bg-gradient-to-br from-white via-rose-50/40 to-pink-50/40 rounded-3xl p-6 sm:p-10 shadow-luna-card border border-rose-100 mb-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              {t('landing.phases.tag')}
            </span>
            <h2 id="phases-heading" className="font-display text-2xl sm:text-3xl font-bold text-ink-primary mt-1">
              {t('landing.phases.title')}
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 max-w-xl">
              {t('landing.phases.subtitle')}
            </p>
          </div>
          <Link
            to="/dashboard"
            aria-label={t('landing.phases.viewAnalysis')}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            {t('landing.phases.viewAnalysis')}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                1
              </span>
              <span className="text-xs text-rose-600 font-semibold">{t('landing.phases.phase1Days')}</span>
            </div>
            <h3 className="font-display font-bold text-sm text-ink-primary">{t('landing.phases.phase1Name')}</h3>
            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
              {t('landing.phases.phase1Desc')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-pink-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-pink-100 text-pink-800">
                2
              </span>
              <span className="text-xs text-pink-600 font-semibold">{t('landing.phases.phase2Days')}</span>
            </div>
            <h3 className="font-display font-bold text-sm text-ink-primary">{t('landing.phases.phase2Name')}</h3>
            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
              {t('landing.phases.phase2Desc')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                3
              </span>
              <span className="text-xs text-amber-700 font-semibold">{t('landing.phases.phase3Days')}</span>
            </div>
            <h3 className="font-display font-bold text-sm text-amber-900">{t('landing.phases.phase3Name')}</h3>
            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
              {t('landing.phases.phase3Desc')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                4
              </span>
              <span className="text-xs text-purple-700 font-semibold">{t('landing.phases.phase4Days')}</span>
            </div>
            <h3 className="font-display font-bold text-sm text-ink-primary">{t('landing.phases.phase4Name')}</h3>
            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
              {t('landing.phases.phase4Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section aria-labelledby="cta-heading" className="text-center bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-rose-200">
        <h2 id="cta-heading" className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
          {t('landing.banner.title')}
        </h2>
        <p className="mt-3 text-rose-100 text-sm sm:text-base max-w-xl mx-auto">
          {t('landing.banner.subtitle')}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto">
          <Link
            to="/dashboard"
            aria-label={t('landing.banner.cta')}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-white text-rose-700 hover:bg-rose-50 font-display font-bold text-sm sm:text-base rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
          >
            {t('landing.banner.cta')}
          </Link>
          {!user && (
            <Link
              to="/login"
              aria-label={t('landing.banner.login')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-rose-700/60 hover:bg-rose-700 text-white font-display font-semibold text-sm sm:text-base rounded-xl border border-white/20 transition-colors cursor-pointer flex items-center justify-center"
            >
              {t('landing.banner.login')}
            </Link>
          )}
        </div>
      </section>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </main>
  );
};

export default LandingPage;
