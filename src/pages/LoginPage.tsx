import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
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
      setErrorMsg('Harap isi alamat email dan kata sandi Anda.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginAsDemo();
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md">
        {/* Floating Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-3xl overflow-hidden shadow-lg shadow-rose-200 mb-3">
            <img src="/logo-luna.svg" alt="Luna" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-primary">
            Selamat Datang Kembali
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Masuk untuk mengakses kalkulator masa subur dan siklus Anda
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-luna-card border border-rose-100">
          {!isConfigured && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-base">💡</span>
                <div>
                  <strong className="block font-semibold">Mode Uji Coba Tersedia</strong>
                  <span>
                    Anda dapat menggunakan tombol <strong>Masuk sebagai Akun Demo</strong> di bawah untuk langsung mencoba aplikasi.
                  </span>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1.5" htmlFor="email">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-3 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-medium text-sm focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1.5" htmlFor="password">
                Kata Sandi
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-medium text-sm focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 mt-2 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 disabled:opacity-60 text-white font-display font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-rose-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk Sekarang</span>
              )}
            </button>
          </form>

          {/* Quick Demo Option */}
          <div className="mt-6 pt-5 border-t border-rose-100 text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>🌸</span>
              <span>Masuk sebagai Akun Demo (Uji Coba Langsung)</span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-ink-secondary">
            Belum memiliki akun?{' '}
            <Link to="/register" className="text-rose-600 hover:text-rose-800 font-bold underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
