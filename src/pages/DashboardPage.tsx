import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from '../components/InfoModal';
import { cyclesApi, type UserCycle } from '../lib/api';
import { PhaseProgress } from '../components/PhaseProgress';
import {
  addDays,
  diffInDays,
  isSameDay,
  formatDateFull,
  formatDateShort,
  computeCycleMetrics,
  evaluateDay,
  getThreeMonthsData,
} from '../utils/calculator';
import type { DayEvaluation, MonthCalendarData, RegularCycleMetrics } from '../types/calculator';

export const DashboardPage: React.FC = () => {
  const { user, signOut, isDemoUser, token } = useAuth();
  const navigate = useNavigate();

  // Saved cycles & loading state
  const [currentCycle, setCurrentCycle] = useState<UserCycle | null>(null);
  const [savedCycles, setSavedCycles] = useState<UserCycle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Calendar interactive selection & UI state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  const fetchCyclesData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [currRes, allRes] = await Promise.all([
        cyclesApi.getCurrent(token),
        cyclesApi.getAll(token),
      ]);

      const cyclesList = allRes.cycles || [];
      setSavedCycles(cyclesList);

      if (currRes.cycle) {
        setCurrentCycle(currRes.cycle);
      } else if (cyclesList.length > 0) {
        setCurrentCycle(cyclesList[0]);
      } else {
        setCurrentCycle(null);
      }
    } catch (err) {
      console.warn('Gagal memuat data siklus:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCyclesData();
  }, [fetchCyclesData]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Compute metrics from current saved cycle
  const calculatedMetrics = useMemo((): RegularCycleMetrics | null => {
    if (!currentCycle) return null;
    const [y, m, d] = currentCycle.cycle_start_date.split('-').map(Number);
    const lastPeriodDate = new Date(y, m - 1, d);

    return computeCycleMetrics({
      lastPeriodDate,
      isVariable: false,
      cycleLength: currentCycle.cycle_length,
      cycleMin: currentCycle.cycle_length,
      cycleMax: currentCycle.cycle_length,
      periodDuration: currentCycle.period_duration,
      lutealPhase: currentCycle.luteal_phase_length,
    }) as RegularCycleMetrics | null;
  }, [currentCycle]);

  // Today Evaluation
  const today = useMemo(() => new Date(), []);
  const todayEval: DayEvaluation | null = useMemo(() => {
    if (!calculatedMetrics) return null;
    return evaluateDay(today, calculatedMetrics);
  }, [today, calculatedMetrics]);

  // Selected Day Evaluation
  const selectedDayEval: DayEvaluation | null = useMemo(() => {
    if (!calculatedMetrics) return null;
    return evaluateDay(selectedDate, calculatedMetrics);
  }, [selectedDate, calculatedMetrics]);

  // 3 Months Calendar Data
  const threeMonthsData: MonthCalendarData[] = useMemo(() => {
    if (!calculatedMetrics) return [];
    return getThreeMonthsData(calculatedMetrics.lastPeriodDate, calculatedMetrics);
  }, [calculatedMetrics]);

  // Next 3 Cycles Data (Projections from saved cycle)
  const nextThreeCycles = useMemo(() => {
    if (!calculatedMetrics || !currentCycle) return [];
    const dur = currentCycle.cycle_length;
    const cycles = [];

    for (let i = 1; i <= 3; i++) {
      const cycleStart = addDays(calculatedMetrics.lastPeriodDate, dur * i);
      const ovulDate = addDays(cycleStart, calculatedMetrics.ovulationDayIndex);
      const fertileStart = addDays(ovulDate, -5);
      const fertileEnd = addDays(ovulDate, 1);

      cycles.push({
        cycleNumber: i,
        cycleStart,
        ovulDate,
        fertileStart,
        fertileEnd,
      });
    }

    return cycles;
  }, [calculatedMetrics, currentCycle]);

  // Flo Dial calculations
  const circumference = 2 * Math.PI * 98; // ~615.75
  const progressRatio = useMemo(() => {
    if (!todayEval) return 0;
    return Math.min(Math.max(todayEval.cycleDay / todayEval.cycleDuration, 0), 1);
  }, [todayEval]);
  const strokeOffset = circumference - circumference * progressRatio;

  const handleCopySummary = () => {
    if (!calculatedMetrics || !currentCycle) return;

    let summary = `🌸 Ringkasan Siklus & Status Hari Ini (Data Tersimpan)\n`;
    summary += `Hari Pertama Haid Terakhir: ${formatDateFull(calculatedMetrics.lastPeriodDate)}\n`;
    summary += `Panjang Siklus: ${currentCycle.cycle_length} hari (Lama haid: ${currentCycle.period_duration} hari)\n`;
    summary += `Hari Perkiraan Ovulasi: ${formatDateFull(calculatedMetrics.ovulationDate)}\n`;
    summary += `Jendela Subur: ${formatDateShort(calculatedMetrics.fertileStart)} — ${formatDateShort(calculatedMetrics.fertileEnd)}\n`;
    summary += `Perkiraan Haid Berikutnya: ${formatDateFull(calculatedMetrics.nextPeriodDate)}\n`;
    if (todayEval) {
      summary += `Status Hari Ini: Hari ke-${todayEval.cycleDay} (${todayEval.phaseName}), Peluang Hamil: ${todayEval.chanceName} (${todayEval.chancePct})\n`;
    }
    summary += `\nDipantau secara pribadi dengan standar klinis Flo-style.`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(summary)
        .then(() => showToast('Ringkasan siklus berhasil disalin!'))
        .catch(() => fallbackCopy(summary));
    } else {
      fallbackCopy(summary);
    }
  };

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Ringkasan siklus berhasil disalin!');
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header Profile & Quick Action Bar */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-rose-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Dashboard Status Siklus
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-primary mt-1">
            Dashboard Siklus Menstruasi
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Masuk sebagai: <strong className="text-rose-700">{user?.email || 'Pengguna'}</strong>
            {isDemoUser && (
              <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Akun Demo
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/calculator"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>✨</span>
            <span>Hitung Siklus Baru</span>
          </Link>
          <Link
            to="/cycles"
            className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>📋</span>
            <span>Riwayat ({savedCycles.length})</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="px-3 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>📖 Dasar Klinis</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🚪 Keluar</span>
          </button>
        </div>
      </section>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-32 bg-rose-100/50 rounded-3xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-24 bg-rose-100/50 rounded-2xl"></div>
            <div className="h-24 bg-rose-100/50 rounded-2xl"></div>
            <div className="h-24 bg-rose-100/50 rounded-2xl"></div>
          </div>
          <div className="h-80 bg-rose-100/40 rounded-3xl"></div>
        </div>
      ) : !currentCycle ? (
        /* Friendly Empty State When User Has NO Saved Cycles */
        <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-flo-card border border-rose-100 text-center max-w-2xl mx-auto my-6 animate-in fade-in">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner">
            🌸
          </div>
          <span className="inline-block text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 mb-2">
            Mulai Perjalanan Anda
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-ink-primary mb-3">
            Belum Ada Data Siklus
          </h2>
          <p className="text-sm text-ink-secondary max-w-lg mx-auto leading-relaxed mb-8">
            Anda belum memiliki riwayat siklus menstruasi yang tersimpan. Masukkan data haid terakhir Anda di kalkulator untuk melihat analisis fase biologis hari ini, kalender ovulasi 3 bulan, dan proyeksi siklus otomatis.
          </p>

          <Link
            to="/calculator"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-display font-bold text-base rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all cursor-pointer"
          >
            <span>✨ Mulai Hitung Siklus Pertama</span>
            <span>→</span>
          </Link>

          {/* Feature Highlights Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mt-10 pt-8 border-t border-rose-100">
            <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100">
              <span className="text-2xl block mb-2">🌿</span>
              <h4 className="font-display font-bold text-xs text-ink-primary mb-1">
                Fase Siklus Real-Time
              </h4>
              <p className="text-[11px] text-ink-secondary leading-relaxed">
                Pantau transisi fase menstruasi, folikular, ovulasi, hingga luteal setiap hari.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100">
              <span className="text-2xl block mb-2">🌟</span>
              <h4 className="font-display font-bold text-xs text-ink-primary mb-1">
                Jendela Masa Subur
              </h4>
              <p className="text-[11px] text-ink-secondary leading-relaxed">
                Ketahui peluang konsepsi harian dan perkiraan ovulasi dengan akurasi klinis.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100">
              <span className="text-2xl block mb-2">🗓️</span>
              <h4 className="font-display font-bold text-xs text-ink-primary mb-1">
                Kalender 3 Bulan
              </h4>
              <p className="text-[11px] text-ink-secondary leading-relaxed">
                Visualisasi kalender komprehensif lengkap dengan proyeksi 3 siklus mendatang.
              </p>
            </div>
          </div>
        </section>
      ) : (
        /* Saved Data Status Overview */
        <section className="space-y-8 animate-in fade-in duration-300">
          {/* (e) QUICK SUMMARY CARDS */}
          {calculatedMetrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* HPHT */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl flex-shrink-0">
                  📅
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                    HPHT (Awal Siklus)
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-ink-primary truncate mt-0.5">
                    {formatDateShort(calculatedMetrics.lastPeriodDate)}
                  </p>
                  <p className="text-[10px] text-ink-muted">Hari pertama haid</p>
                </div>
              </div>

              {/* Cycle Length */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center text-xl flex-shrink-0">
                  🔄
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-pink-800 uppercase tracking-wider block">
                    Panjang Siklus
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-ink-primary truncate mt-0.5">
                    {currentCycle.cycle_length} Hari
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    Lama haid: {currentCycle.period_duration} hari
                  </p>
                </div>
              </div>

              {/* Ovulation Peak */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl flex-shrink-0">
                  🥚
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                    Perkiraan Ovulasi
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-amber-700 truncate mt-0.5">
                    {formatDateShort(calculatedMetrics.ovulationDate)}
                  </p>
                  <p className="text-[10px] text-ink-muted">Puncak masa subur</p>
                </div>
              </div>

              {/* Next Period Date */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl flex-shrink-0">
                  ⏳
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                    Haid Berikutnya
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-purple-700 truncate mt-0.5">
                    {formatDateShort(calculatedMetrics.nextPeriodDate)}
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    {(() => {
                      const daysToNext = diffInDays(calculatedMetrics.nextPeriodDate, today);
                      if (daysToNext > 0) return `${daysToNext} hari lagi`;
                      if (daysToNext === 0) return 'Hari ini perkiraan haid';
                      return `Terlambat ${Math.abs(daysToNext)} hari`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* (a) PHASE PROGRESS COMPONENT */}
          <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-flo-card border border-rose-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌸</span>
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-ink-primary">
                    Fase Siklus Hari Ini
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    Status hormonal terkini berdasarkan siklus aktif tersimpan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/calculator"
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Perbarui atau hitung data siklus baru"
                >
                  <span>✨ Hitung Baru</span>
                </Link>
                <Link
                  to="/cycles"
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Riwayat</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
            <PhaseProgress cycle={currentCycle} />
          </section>

          {/* (b) TODAY'S STATUS CARD & CENTERPIECE FLO DAILY DIAL */}
          {calculatedMetrics && todayEval && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-flo-card border border-rose-100 text-center relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Status Hari Ini
                </span>
                <span className="text-xs font-medium text-ink-muted">
                  {formatDateFull(today)}
                </span>
              </div>

              {/* Flo Cycle Ring */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto my-2 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 240 240">
                  <circle cx="120" cy="120" r="98" fill="none" stroke="#fdecf0" strokeWidth="16" />
                  <circle
                    className="cycle-ring-circle"
                    cx="120"
                    cy="120"
                    r="98"
                    fill="none"
                    stroke="url(#floDashGradient)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                  />
                  <defs>
                    <linearGradient id="floDashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#db3264" />
                      <stop offset="50%" stopColor="#ef5582" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Inside ring details */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">
                    Siklus Menstruasi
                  </span>
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-ink-primary my-1">
                    Hari ke-{todayEval.cycleDay}
                  </span>

                  <div className="my-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        todayEval.chanceLevel === 'peak'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : todayEval.chanceLevel === 'high'
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : todayEval.phase === 'period'
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-purple-100 text-purple-900 border-purple-200'
                      }`}
                    >
                      {todayEval.phaseName}
                    </span>
                  </div>

                  <div className="mt-2 text-center">
                    <span className="text-[11px] text-ink-muted block">Peluang Kehamilan:</span>
                    <span className="text-xs sm:text-sm font-extrabold text-rose-700">
                      {todayEval.chanceName} ({todayEval.chancePct})
                    </span>
                  </div>
                </div>
              </div>

              {/* Countdown / Status Note */}
              <div className="max-w-md mx-auto mt-3 p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs sm:text-sm text-ink-secondary">
                {(() => {
                  const daysToNext = diffInDays(calculatedMetrics.nextPeriodDate, today);

                  if (daysToNext > 0) {
                    return (
                      <p className="leading-relaxed">
                        Hari ini Anda berada di <strong>{todayEval.phaseName}</strong>. Diperkirakan sekitar{' '}
                        <strong>{daysToNext} hari lagi</strong> menuju haid berikutnya.
                      </p>
                    );
                  } else if (daysToNext === 0) {
                    return (
                      <p className="leading-relaxed">
                        Hari ini adalah perkiraan <strong>dimulainya siklus menstruasi berikutnya</strong> jika belum terjadi pembuahan.
                      </p>
                    );
                  } else {
                    return (
                      <p className="leading-relaxed">
                        Terlambat {Math.abs(daysToNext)} hari dari estimasi awal. Bila sedang merencanakan kehamilan, lakukan tes kehamilan dini secara berkala.
                      </p>
                    );
                  }
                })()}
              </div>

              {/* Fertile window & biological status cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-left">
                {/* Ovulation */}
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-200">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                    🥚 Hari Ovulasi
                  </span>
                  <p className="text-base sm:text-lg font-extrabold text-rose-600 mt-1">
                    {formatDateShort(calculatedMetrics.ovulationDate)}
                  </p>
                  <p className="text-[11px] text-rose-800/80 mt-1 leading-relaxed">
                    Puncak kesuburan. Sel telur matang dilepaskan dan bertahan 12–24 jam.
                  </p>
                </div>

                {/* Fertile Window */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    🌟 Jendela Subur
                  </span>
                  <p className="text-base sm:text-lg font-extrabold text-amber-700 mt-1">
                    {formatDateShort(calculatedMetrics.fertileStart)} — {formatDateShort(calculatedMetrics.fertileEnd)}
                  </p>
                  <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed">
                    Peluang hamil tertinggi (5 hari sebelum ovulasi s/d 1 hari pasca-ovulasi).
                  </p>
                </div>

                {/* Safe Window */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    🛡️ Masa Kurang Subur
                  </span>
                  <p className="text-base sm:text-lg font-extrabold text-emerald-700 mt-1">
                    {calculatedMetrics.safeBeforeEnd >= calculatedMetrics.safeBeforeStart ? (
                      <span>
                        {formatDateShort(calculatedMetrics.safeBeforeStart)}—{formatDateShort(calculatedMetrics.safeBeforeEnd)} & {formatDateShort(calculatedMetrics.safeAfterStart)} ke depan
                      </span>
                    ) : (
                      <span>{formatDateShort(calculatedMetrics.safeAfterStart)} ke depan</span>
                    )}
                  </p>
                  <p className="text-[11px] text-emerald-800/80 mt-1 leading-relaxed">
                    Peluang pembuahan relatif lebih rendah di luar jendela subur.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* (d) 3-CYCLE PROJECTIONS FROM SAVED DATA */}
          {nextThreeCycles.length > 0 && (
            <section className="bg-gradient-to-r from-violet-50 via-purple-50 to-pink-50 rounded-3xl p-6 sm:p-7 border border-violet-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-violet-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">📅</span>
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink-primary">
                      Proyeksi 3 Siklus ke Depan
                    </h3>
                    <p className="text-xs text-ink-secondary">
                      Estimasi tanggal haid, ovulasi, dan jendela subur untuk 3 siklus mendatang
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-violet-100 text-violet-800 self-start sm:self-auto">
                  Metode Klinis Otomatis
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {nextThreeCycles.map((c) => (
                  <div
                    key={c.cycleNumber}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-violet-100 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
                        Siklus ke-{c.cycleNumber}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-rose-50">
                        <span className="text-ink-muted">Awal Haid:</span>
                        <strong className="text-rose-600 font-bold">
                          {formatDateShort(c.cycleStart)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-rose-50">
                        <span className="text-ink-muted">Ovulasi:</span>
                        <strong className="text-amber-700 font-bold">
                          {formatDateShort(c.ovulDate)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-ink-muted">Jendela Subur:</span>
                        <strong className="text-ink-primary font-semibold">
                          {formatDateShort(c.fertileStart)} — {formatDateShort(c.fertileEnd)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* (c) CALENDAR 3-MONTH VIEW BASED ON LATEST SAVED CYCLE */}
          {calculatedMetrics && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-flo-card border border-rose-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🗓️</span>
                    <h3 className="font-display font-bold text-xl text-ink-primary">
                      Kalender 3 Bulan
                    </h3>
                  </div>
                  <p className="text-xs text-ink-secondary mt-1">
                    Tampilan visual kalender untuk 3 bulan berturut-turut. Ketuk tanggal manapun untuk melihat status biologis harian.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-400"></span>
                    <span>Haid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-amber-400"></span>
                    <span>Subur</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-500 font-bold text-white text-[9px] flex items-center justify-center">
                      ★
                    </span>
                    <span>Ovulasi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-gray-200"></span>
                    <span>Kurang Subur</span>
                  </div>
                </div>
              </div>

              {/* 3 Months Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                {threeMonthsData.map((m) => (
                  <div
                    key={`${m.year}-${m.month}`}
                    className="bg-rose-50/30 rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm"
                  >
                    <h4 className="font-display font-bold text-center text-sm sm:text-base text-ink-primary mb-3">
                      {m.monthTitle}
                    </h4>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-muted mb-2">
                      <div className="text-rose-500">Min</div>
                      <div>Sen</div>
                      <div>Sel</div>
                      <div>Rab</div>
                      <div>Kam</div>
                      <div>Jum</div>
                      <div className="text-rose-700">Sab</div>
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Padding empty cells */}
                      {Array.from({ length: m.firstDayOfWeek }).map((_, i) => (
                        <div key={`pad-${i}`} className="h-9 sm:h-10 rounded-lg"></div>
                      ))}

                      {/* Day Cells */}
                      {m.days.map((item) => {
                        const isCurrentToday = isSameDay(item.date, today);
                        const isSelected = isSameDay(item.date, selectedDate);
                        const evalData = item.evaluation;

                        let cellClasses =
                          'h-9 sm:h-10 rounded-xl flex flex-col items-center justify-center text-xs font-semibold cursor-pointer transition-all relative select-none ';

                        if (evalData?.phase === 'period') {
                          cellClasses += 'bg-rose-400 text-white shadow-sm ';
                        } else if (evalData?.phase === 'ovulation') {
                          cellClasses +=
                            'bg-rose-500 text-white font-bold ovulation-glow ring-2 ring-rose-300 ring-offset-1 ';
                        } else if (
                          evalData?.phase === 'fertile-peak' ||
                          evalData?.phase === 'fertile' ||
                          evalData?.phase === 'fertile-late'
                        ) {
                          cellClasses += 'bg-amber-400 text-amber-950 font-semibold ';
                        } else {
                          cellClasses += 'bg-gray-100 text-gray-600 hover:bg-gray-200 ';
                        }

                        if (isSelected) {
                          cellClasses += 'ring-2 ring-rose-700 ring-offset-2 z-10 ';
                        }

                        if (isCurrentToday) {
                          cellClasses += 'underline decoration-2 font-extrabold ';
                        }

                        return (
                          <button
                            type="button"
                            key={item.dayNumber}
                            onClick={() => setSelectedDate(item.date)}
                            className={cellClasses}
                            aria-label={`${item.dayNumber} ${m.monthTitle} - ${evalData?.phaseName || ''}`}
                          >
                            <span className="leading-none">{item.dayNumber}</span>
                            {evalData?.phase === 'ovulation' ? (
                              <span className="text-[8px] leading-none mt-0.5">★</span>
                            ) : evalData?.phase === 'period' ? (
                              <span className="text-[7px] leading-none mt-0.5 opacity-80">💧</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SELECTED DAY CLINICAL DETAIL */}
          {selectedDayEval && (
            <div className="bg-gradient-to-br from-white to-rose-50/50 rounded-3xl p-6 sm:p-8 shadow-flo-card border border-rose-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-rose-100">
                <div>
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                    Detail Tanggal yang Dipilih
                  </span>
                  <h4 className="font-display text-xl font-bold text-ink-primary">
                    {formatDateFull(selectedDate)} (Hari ke-{selectedDayEval.cycleDay} Siklus)
                  </h4>
                </div>
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      selectedDayEval.chanceLevel === 'peak'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : selectedDayEval.chanceLevel === 'high'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : selectedDayEval.phase === 'period'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : 'bg-purple-100 text-purple-900 border-purple-200'
                    }`}
                  >
                    {selectedDayEval.phaseName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Conception Chance */}
                <div className="bg-white/90 p-4 rounded-2xl border border-rose-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📈</span>
                    <h5 className="text-xs font-bold text-ink-primary uppercase">Peluang Konsepsi</h5>
                  </div>
                  <p className="text-sm font-bold text-rose-700">
                    Peluang Hamil: {selectedDayEval.chanceName} ({selectedDayEval.chancePct})
                  </p>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                    {selectedDayEval.chanceDesc}
                  </p>
                </div>

                {/* Cervical Mucus */}
                <div className="bg-white/90 p-4 rounded-2xl border border-rose-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">💧</span>
                    <h5 className="text-xs font-bold text-ink-primary uppercase">Karakteristik Cairan Serviks</h5>
                  </div>
                  <p className="text-sm font-semibold text-ink-primary">
                    {selectedDayEval.mucusTitle}
                  </p>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                    {selectedDayEval.mucusDesc}
                  </p>
                </div>

                {/* Hormone & BBT */}
                <div className="bg-white/90 p-4 rounded-2xl border border-rose-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🌡️</span>
                    <h5 className="text-xs font-bold text-ink-primary uppercase">Suhu Basal & Hormon</h5>
                  </div>
                  <p className="text-sm font-semibold text-ink-primary">
                    {selectedDayEval.hormoneTitle}
                  </p>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                    {selectedDayEval.hormoneDesc}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS & MEDICAL DISCLAIMER */}
          <div className="text-center space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/calculator"
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>✨ Hitung Siklus Baru</span>
              </Link>
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-5 py-2.5 rounded-2xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>📋 Salin Ringkasan Siklus</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-2xl bg-white border border-rose-200 text-ink-primary hover:bg-rose-50 text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>🖨️ Cetak Laporan</span>
              </button>
              <Link
                to="/cycles"
                className="px-5 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>📋 Kelola Riwayat Lengkap</span>
              </Link>
            </div>

            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-left">
              <p className="text-xs text-ink-muted leading-relaxed">
                <strong className="text-ink-secondary">Pemberitahuan Medis:</strong> Dashboard ini menyajikan estimasi statistik berdasarkan metode kalendar klinis Ogino-Knaus dan konsensus Wilcox. Jadwal menstruasi dan ovulasi aktual dapat bervariasi sesuai faktor biologis, hormonal, dan kondisi kesehatan Anda.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink-primary text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all flex items-center gap-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </main>
  );
};

export default DashboardPage;
