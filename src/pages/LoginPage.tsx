import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, loginAsDemo, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg(t('auth.login.validationError'));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message || 'Login failed. Please check your email and password.');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'System error during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginAsDemo();
    navigate(from, { replace: true });
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md">
        {/* Floating Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-3xl overflow-hidden shadow-lg shadow-rose-200 mb-3">
            <img src="/logo-luna.svg" alt="Luna Logo" width={56} height={56} className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-primary">
            {t('auth.login.title')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            {t('auth.login.subtitle')}
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-luna-card border border-rose-100">
          {!isConfigured && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-base" aria-hidden="true">💡</span>
                <div>
                  <strong className="block font-semibold">{t('auth.login.demoNoticeTitle')}</strong>
                  <span>{t('auth.login.demoNoticeDesc')}</span>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <span className="text-base" aria-hidden="true">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" aria-label={t('auth.login.title')}>
            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1.5" htmlFor="email">
                {t('auth.login.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                aria-required="true"
                className="w-full min-h-[48px] px-4 py-3.5 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-medium text-base focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1.5" htmlFor="password">
                {t('auth.login.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-required="true"
                className="w-full min-h-[48px] px-4 py-3.5 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-medium text-base focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              aria-label={t('auth.login.submit')}
              className="w-full min-h-[48px] py-3.5 px-6 mt-2 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 disabled:opacity-60 text-white font-display font-bold text-base rounded-2xl shadow-lg shadow-rose-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true"></div>
                  <span>{t('auth.login.processing')}</span>
                </>
              ) : (
                <span>{t('auth.login.submit')}</span>
              )}
            </button>
          </form>

          {/* Quick Demo Option */}
          <div className="mt-6 pt-5 border-t border-rose-100 text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              aria-label={t('auth.login.demoButton')}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95"
            >
              <span>{t('auth.login.demoButton')}</span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-ink-secondary">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="text-rose-600 hover:text-rose-800 font-bold underline inline-block py-1">
              {t('auth.login.registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
