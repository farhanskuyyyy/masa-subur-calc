import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from '../components/InfoModal';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-16">
      {/* Hero Section */}
      <section className="relative text-center max-w-3xl mx-auto mb-16">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-tr from-pink-200/40 via-rose-200/30 to-warm-200/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-rose-200 px-4 py-1.5 rounded-full shadow-sm mb-6 hover:border-rose-300 transition-colors">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-rose-800">
            Gratis & Privasi Terjaga 100%
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink-primary tracking-tight leading-tight">
          Kalkulator{' '}
          <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 bg-clip-text text-transparent">
            Masa Subur
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-ink-secondary leading-relaxed max-w-2xl mx-auto">
          Hitung masa subur Anda secara akurat menggunakan metode <strong>kalendar</strong> klinis. 
          Ketahui hari perkiraan ovulasi, jendela subur optimal, masa relatif aman, serta proyeksi kalender 3 bulan dalam satu tampilan yang cantik dan mudah dipahami.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-display font-bold text-base rounded-2xl shadow-lg shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>✨ Buka Kalkulator Masa Subur</span>
          </Link>

          {!user ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                to="/register"
                className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-rose-50 text-rose-700 border-2 border-rose-200 font-display font-bold text-base rounded-2xl shadow-sm hover:border-rose-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Daftar Akun</span>
                <span className="text-rose-500">→</span>
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-5 py-4 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50/70 hover:bg-rose-100/70 rounded-2xl transition-colors cursor-pointer text-center"
              >
                Masuk
              </Link>
            </div>
          ) : (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-rose-50 text-rose-700 border-2 border-rose-200 font-display font-bold text-base rounded-2xl shadow-sm transition-all text-center"
            >
              Masuk ke Dashboard
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="w-full sm:w-auto px-4 py-4 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-transparent hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer"
          >
            📖 Pelajari Metodologi
          </button>
        </div>
      </section>

      {/* 3 Info Cards Section */}
      <section className="mb-20">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
            Fitur Utama Kalkulator
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary mt-2">
            Metode ilmiah akurat dengan privasi data terlindungi dan visualisasi yang jelas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Metode Kalendar */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-7 shadow-flo-card border border-rose-100 hover:shadow-flo-hover hover:border-rose-200 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
              🧬
            </div>
            <h3 className="font-display font-bold text-lg text-ink-primary mb-2">
              Metode Kalendar
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              Menghitung masa subur berdasarkan panjang siklus menstruasi Anda. Menggunakan kaidah klinis Ogino-Knaus & Wilcox teruji yang cocok untuk siklus haid teratur maupun bervariasi.
            </p>
          </div>

          {/* Card 2: Privasi Terjaga */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-7 shadow-flo-card border border-rose-100 hover:shadow-flo-hover hover:border-rose-200 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
              🔒
            </div>
            <h3 className="font-display font-bold text-lg text-ink-primary mb-2">
              Privasi Terjaga
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              Semua perhitungan dilakukan langsung di browser Anda (100% client-side). Data siklus menstruasi pribadi Anda tidak disimpan tanpa izin dan tidak dibagikan ke pihak ketiga.
            </p>
          </div>

          {/* Card 3: Visual Kalender */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-7 shadow-flo-card border border-rose-100 hover:shadow-flo-hover hover:border-rose-200 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
              🗓️
            </div>
            <h3 className="font-display font-bold text-lg text-ink-primary mb-2">
              Visual Kalender
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              Tampilan kalender 3 bulan yang intuitif dan interaktif. Memudahkan Anda memetakan periode haid, hari ovulasi puncak, jendela subur, serta masa relatif aman dengan kode warna feminin.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Hormonal Phases Educational Section */}
      <section className="bg-gradient-to-br from-white via-rose-50/40 to-pink-50/40 rounded-3xl p-6 sm:p-10 shadow-flo-card border border-rose-100 mb-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              Edukasi Siklus Tubuh
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-primary mt-1">
              4 Fase Siklus Hormonal Kewanitaan
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 max-w-xl">
              Pahami bagaimana naik-turun hormon estrogen dan progesteron memengaruhi kesuburan, vitalitas fisik, dan mood Anda.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-200 transition-colors whitespace-nowrap"
          >
            Lihat Analisis Siklus →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                Fase 1
              </span>
              <span className="text-xs text-rose-600 font-semibold">🩸 Hari 1–5</span>
            </div>
            <h4 className="font-display font-bold text-sm text-ink-primary">Menstruasi</h4>
            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
              Peluruhan lapisan dinding rahim. Kadar hormon berada di titik dasar. Fokus pada hidrasi dan nutrisi zat besi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-pink-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-pink-100 text-pink-800">
                Fase 2
              </span>
              <span className="text-xs text-pink-600 font-semibold">🌱 Hari 6–13</span>
            </div>
            <h4 className="font-display font-bold text-sm text-ink-primary">Fase Folikular</h4>
            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
              Hormon FSH mematangkan folikel di ovarium. Estrogen meningkat pesat, meningkatkan energi dan cairan serviks.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                Fase 3
              </span>
              <span className="text-xs text-amber-700 font-semibold">★ Hari ke-14</span>
            </div>
            <h4 className="font-display font-bold text-sm text-amber-900">Ovulasi</h4>
            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
              Lonjakan LH melepaskan sel telur matang. Jendela paling subur dalam sebulan dengan lendir tipe putih telur (egg-white).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                Fase 4
              </span>
              <span className="text-xs text-purple-700 font-semibold">🌙 Hari 15–28</span>
            </div>
            <h4 className="font-display font-bold text-sm text-ink-primary">Fase Luteal</h4>
            <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
              Dominasi hormon progesteron dan kenaikan suhu basal tubuh (BBT) mempersiapkan rahim untuk siklus selanjutnya.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="text-center bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-rose-200">
        <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
          Mulai Kenali Masa Subur Anda Hari Ini
        </h2>
        <p className="mt-3 text-rose-100 text-sm sm:text-base max-w-xl mx-auto">
          Cukup masukkan tanggal hari pertama haid terakhir dan dapatkan analisis ovulasi, jendela subur, dan kalender 3 bulan secara instan.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-8 py-3.5 bg-white text-rose-700 hover:bg-rose-50 font-display font-bold text-sm sm:text-base rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Mulai Hitung Sekarang
          </Link>
          {!user && (
            <Link
              to="/login"
              className="px-6 py-3.5 bg-rose-700/60 hover:bg-rose-700 text-white font-display font-semibold text-sm sm:text-base rounded-xl border border-white/20 transition-colors"
            >
              Masuk Akun
            </Link>
          )}
        </div>
      </section>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </div>
  );
};

export default LandingPage;
