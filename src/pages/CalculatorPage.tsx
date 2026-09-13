import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from '../components/InfoModal';
import { cyclesApi, type UserCycle } from '../lib/api';
import {
  addDays,
  diffInDays,
  isSameDay,
  formatDateFull,
  formatDateShort,
  toISODateString,
  computeCycleMetrics,
  evaluateDay,
  getThreeMonthsData,
} from '../utils/calculator';
import type { DayEvaluation, MonthCalendarData } from '../types/calculator';

export const CalculatorPage: React.FC = () => {
  const { user, signOut, isDemoUser, token } = useAuth();
  const navigate = useNavigate();

  // Form State
  const initialDate = useMemo(() => toISODateString(addDays(new Date(), -10)), []);
  const [lastPeriodInput, setLastPeriodInput] = useState<string>(initialDate);
  const [isVariable, setIsVariable] = useState<boolean>(false);
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [cycleMin, setCycleMin] = useState<number>(26);
  const [cycleMax, setCycleMax] = useState<number>(32);
  const [periodDuration, setPeriodDuration] = useState<number>(6);
  const [lutealPhase, setLutealPhase] = useState<number>(14);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // Saved cycles state (to check for matching cycle when saving)
  const [savedCycles, setSavedCycles] = useState<UserCycle[]>([]);
  const [isSavingCycle, setIsSavingCycle] = useState<boolean>(false);

  // Results visibility & calculation state
  const [hasCalculated, setHasCalculated] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const fetchUserCycles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await cyclesApi.getAll(token);
      setSavedCycles(res.cycles || []);
    } catch (err) {
      console.warn('Gagal memuat riwayat siklus:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchUserCycles();
  }, [fetchUserCycles]);

  // Check if there is an existing saved cycle close to the current input date
  const matchingCycle = useMemo(() => {
    if (!lastPeriodInput || savedCycles.length === 0) return null;
    const [iy, im, id] = lastPeriodInput.split('-').map(Number);
    const inputDate = new Date(iy, im - 1, id);

    return (
      savedCycles.find((c) => {
        const [cy, cm, cd] = c.cycle_start_date.split('-').map(Number);
        const cDate = new Date(cy, cm - 1, cd);
        const diff = Math.abs(Math.round((inputDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24)));
        return diff <= 21;
      }) || null
    );
  }, [lastPeriodInput, savedCycles]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleSaveCycle = async () => {
    if (!token) {
      showToast('Harap login untuk menyimpan siklus.');
      return;
    }
    setIsSavingCycle(true);
    try {
      const res = await cyclesApi.create(token, {
        cycle_start_date: lastPeriodInput,
        cycle_length: isVariable ? cycleMax : cycleLength,
        period_duration: periodDuration,
        luteal_phase_length: lutealPhase,
      });
      showToast(res.message || 'Siklus berhasil disimpan ke database!');
      await fetchUserCycles();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data siklus.');
    } finally {
      setIsSavingCycle(false);
    }
  };

  const handleUpdateCycle = async () => {
    if (!token || !matchingCycle) return;
    setIsSavingCycle(true);
    try {
      const res = await cyclesApi.update(token, matchingCycle.id, {
        cycle_start_date: lastPeriodInput,
        cycle_length: isVariable ? cycleMax : cycleLength,
        period_duration: periodDuration,
        luteal_phase_length: lutealPhase,
      });
      showToast(res.message || 'Siklus berhasil diperbarui!');
      await fetchUserCycles();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui data siklus.');
    } finally {
      setIsSavingCycle(false);
    }
  };

  // Validate and compute metrics
  const { calculatedMetrics, validationError } = useMemo(() => {
    if (!lastPeriodInput) {
      return {
        calculatedMetrics: null,
        validationError: 'Harap pilih tanggal hari pertama haid terakhir (HPHT) Anda.',
      };
    }

    const parts = lastPeriodInput.split('-');
    if (parts.length !== 3) {
      return {
        calculatedMetrics: null,
        validationError: 'Format tanggal haid tidak valid.',
      };
    }

    const lpd = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    const todayDate = new Date();
    const futureDiff = diffInDays(lpd, todayDate);
    if (futureDiff > 0) {
      return {
        calculatedMetrics: null,
        validationError: 'Tanggal haid terakhir tidak boleh di masa depan.',
      };
    }

    const pastDiff = diffInDays(todayDate, lpd);
    if (pastDiff > 120) {
      return {
        calculatedMetrics: null,
        validationError:
          'Tanggal haid terakhir lebih dari 120 hari yang lalu. Silakan masukkan tanggal haid terbaru untuk akurasi yang lebih baik.',
      };
    }

    if (isVariable) {
      if (cycleMin >= cycleMax) {
        return {
          calculatedMetrics: null,
          validationError: 'Siklus terpendek harus lebih kecil daripada siklus terpanjang.',
        };
      }
      if (cycleMin <= periodDuration) {
        return {
          calculatedMetrics: null,
          validationError: 'Panjang siklus menstruasi harus lebih besar daripada lama pendarahan haid.',
        };
      }
    } else {
      if (cycleLength <= periodDuration) {
        return {
          calculatedMetrics: null,
          validationError: 'Panjang siklus menstruasi harus lebih besar daripada lama pendarahan haid.',
        };
      }
    }

    const metrics = computeCycleMetrics({
      lastPeriodDate: lpd,
      isVariable,
      cycleLength,
      cycleMin,
      cycleMax,
      periodDuration,
      lutealPhase,
    });

    return {
      calculatedMetrics: metrics,
      validationError: null,
    };
  }, [lastPeriodInput, isVariable, cycleLength, cycleMin, cycleMax, periodDuration, lutealPhase]);

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

  // Next 3 Cycles Data
  const nextThreeCycles = useMemo(() => {
    if (!calculatedMetrics) return [];
    const dur = calculatedMetrics.isVariable ? calculatedMetrics.cycleMax : calculatedMetrics.cycleLength;
    const cycles = [];

    for (let i = 1; i <= 3; i++) {
      const cycleStart = addDays(calculatedMetrics.lastPeriodDate, dur * i);
      let ovulDate: Date;
      let fertileStart: Date;
      let fertileEnd: Date;

      if (!calculatedMetrics.isVariable) {
        ovulDate = addDays(cycleStart, calculatedMetrics.ovulationDayIndex);
        fertileStart = addDays(ovulDate, -5);
        fertileEnd = addDays(ovulDate, 1);
      } else {
        ovulDate = addDays(cycleStart, calculatedMetrics.cycleMax - calculatedMetrics.lutealPhase);
        fertileStart = addDays(cycleStart, calculatedMetrics.cycleMin - 18);
        fertileEnd = addDays(cycleStart, calculatedMetrics.cycleMax - 11);
      }

      cycles.push({
        cycleNumber: i,
        cycleStart,
        ovulDate,
        fertileStart,
        fertileEnd,
      });
    }

    return cycles;
  }, [calculatedMetrics]);

  // Flo Dial calculations
  const circumference = 2 * Math.PI * 98; // ~615.75
  const progressRatio = useMemo(() => {
    if (!todayEval) return 0;
    return Math.min(Math.max(todayEval.cycleDay / todayEval.cycleDuration, 0), 1);
  }, [todayEval]);
  const strokeOffset = circumference - circumference * progressRatio;

  // Handlers
  const handleQuickChip = (daysAgo: number) => {
    const d = addDays(new Date(), -daysAgo);
    setLastPeriodInput(toISODateString(d));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    setHasCalculated(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleReset = () => {
    const now = new Date();
    setLastPeriodInput(toISODateString(now));
    setCycleLength(28);
    setPeriodDuration(6);
    setLutealPhase(14);
    setIsVariable(false);
    setSelectedDate(now);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Pengaturan siklus berhasil diatur ulang.');
  };

  const handleCopySummary = () => {
    if (!calculatedMetrics) return;

    let summary = `🌸 Ringkasan Siklus & Masa Subur (Metode Kalendar)\n`;
    summary += `Hari Pertama Haid Terakhir: ${formatDateFull(calculatedMetrics.lastPeriodDate)}\n`;

    if (!calculatedMetrics.isVariable) {
      summary += `Panjang Siklus: ${calculatedMetrics.cycleLength} hari (Teratur)\n`;
      summary += `Hari Perkiraan Ovulasi: ${formatDateFull(calculatedMetrics.ovulationDate)}\n`;
      summary += `Jendela Subur: ${formatDateShort(calculatedMetrics.fertileStart)} — ${formatDateShort(calculatedMetrics.fertileEnd)}\n`;
      summary += `Perkiraan Haid Berikutnya: ${formatDateFull(calculatedMetrics.nextPeriodDate)}\n`;
    } else {
      summary += `Rentang Siklus: ${calculatedMetrics.cycleMin} - ${calculatedMetrics.cycleMax} hari (Bervariasi)\n`;
      summary += `Rentang Ovulasi: ${formatDateShort(calculatedMetrics.ovulationStartDate)} - ${formatDateShort(calculatedMetrics.ovulationEndDate)}\n`;
      summary += `Jendela Subur: ${formatDateShort(calculatedMetrics.fertileStart)} - ${formatDateShort(calculatedMetrics.fertileEnd)}\n`;
      summary += `Perkiraan Haid Berikutnya: ${formatDateShort(calculatedMetrics.nextPeriodStartDate)} - ${formatDateShort(calculatedMetrics.nextPeriodEndDate)}\n`;
    }
    summary += `\nDihitung secara lokal dengan privasi 100% menggunakan metode kalendar klinis.`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(summary)
        .then(() => showToast('Ringkasan berhasil disalin!'))
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
    showToast('Ringkasan berhasil disalin!');
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header Profile Bar */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-rose-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Kalkulator Masa Subur & Ovulasi
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-primary mt-1">
            Hitung Siklus & Masa Subur
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

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>← Kembali ke Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>📖 Dasar Klinis</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🚪 Keluar</span>
          </button>
        </div>
      </section>

      {/* CALCULATOR INPUT CARD */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-flo-card border border-rose-100 mb-8 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-rose-100">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌸</span>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-ink-primary">
                Input Data Menstruasi Anda
              </h2>
              <p className="text-xs text-ink-secondary">
                Isi parameter siklus haid untuk memperkirakan hari ovulasi dan jendela masa subur
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const refDate = addDays(new Date(), -12);
              setLastPeriodInput(toISODateString(refDate));
              setCycleLength(28);
              setPeriodDuration(6);
              setLutealPhase(14);
              setIsVariable(false);
              showToast('Data contoh siklus standar 28 hari diterapkan.');
            }}
            className="text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            Contoh Standar (28 Hari)
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6" noValidate>
          {/* 1. Date of Last Period */}
          <div>
            <label
              htmlFor="lastPeriodInput"
              className="block text-sm font-semibold text-ink-primary mb-2 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="text-rose-500">📅</span> Hari Pertama Haid Terakhir (HPHT)
              </span>
              <span className="text-xs font-normal text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                Wajib
              </span>
            </label>
            <input
              type="date"
              id="lastPeriodInput"
              required
              value={lastPeriodInput}
              onChange={(e) => setLastPeriodInput(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-bold text-base sm:text-lg focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
            />

            {/* Quick Date Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-xs text-ink-muted mr-1">Pilihan Cepat:</span>
              <button
                type="button"
                onClick={() => handleQuickChip(0)}
                className="text-xs px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-medium transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip(3)}
                className="text-xs px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-medium transition-colors cursor-pointer"
              >
                3 Hari Lalu
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip(7)}
                className="text-xs px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-medium transition-colors cursor-pointer"
              >
                7 Hari Lalu
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip(14)}
                className="text-xs px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-medium transition-colors cursor-pointer"
              >
                14 Hari Lalu
              </button>
            </div>
          </div>

          {/* 2. Cycle Regularity Selector */}
          <div>
            <label className="block text-sm font-semibold text-ink-primary mb-2 flex items-center gap-1.5">
              <span className="text-rose-500">🔄</span> Pola Siklus Menstruasi
            </label>
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-rose-50/50 rounded-2xl border border-rose-100">
              <button
                type="button"
                onClick={() => setIsVariable(false)}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isVariable
                    ? 'bg-white text-rose-700 shadow-sm border border-rose-200'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                ✓ Siklus Teratur
              </button>
              <button
                type="button"
                onClick={() => setIsVariable(true)}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isVariable
                    ? 'bg-white text-rose-700 shadow-sm border border-rose-200'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                ~ Siklus Bervariasi
              </button>
            </div>
          </div>

          {/* 3. Cycle Length Inputs */}
          {!isVariable ? (
            <div className="space-y-2">
              <label
                htmlFor="cycleLengthInput"
                className="block text-sm font-semibold text-ink-primary flex items-center justify-between"
              >
                <span>Panjang Siklus Menstruasi (hari)</span>
                <span className="text-xs font-normal text-ink-muted">Normal: 21–35 hari. Rata-rata: 28 hari</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCycleLength((prev) => Math.max(20, prev - 1))}
                  aria-label="Kurangi panjang siklus 1 hari"
                  className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 font-bold text-xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center border border-rose-200 cursor-pointer"
                >
                  −
                </button>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    id="cycleLengthInput"
                    value={cycleLength}
                    min={20}
                    max={45}
                    onChange={(e) => setCycleLength(parseInt(e.target.value, 10) || 28)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-bold text-center text-xl focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-muted">
                    hari
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCycleLength((prev) => Math.min(45, prev + 1))}
                  aria-label="Tambah panjang siklus 1 hari"
                  className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 font-bold text-xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center border border-rose-200 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-secondary bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                Metode Ogino-Knaus memperhitungkan variasi terpendek dan terpanjang selama 6 bulan terakhir untuk memperluas rentang jendela subur secara akurat.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cycleMinInput" className="block text-xs font-semibold text-ink-primary mb-1.5">
                    Siklus Terpendek (hari)
                  </label>
                  <input
                    type="number"
                    id="cycleMinInput"
                    value={cycleMin}
                    min={20}
                    max={40}
                    onChange={(e) => setCycleMin(parseInt(e.target.value, 10) || 26)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-bold text-center text-lg focus:border-rose-400 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="cycleMaxInput" className="block text-xs font-semibold text-ink-primary mb-1.5">
                    Siklus Terpanjang (hari)
                  </label>
                  <input
                    type="number"
                    id="cycleMaxInput"
                    value={cycleMax}
                    min={22}
                    max={50}
                    onChange={(e) => setCycleMax(parseInt(e.target.value, 10) || 32)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-bold text-center text-lg focus:border-rose-400 focus:bg-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Period Duration */}
          <div className="space-y-2">
            <label
              htmlFor="periodDurationInput"
              className="block text-sm font-semibold text-ink-primary flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="text-rose-500">🩸</span> Lama Pendarahan Haid (hari)
              </span>
              <span className="text-xs font-normal text-ink-muted">Normal: 3–7 hari</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPeriodDuration((prev) => Math.max(2, prev - 1))}
                aria-label="Kurangi lama haid 1 hari"
                className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 font-bold text-xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center border border-rose-200 cursor-pointer"
              >
                −
              </button>
              <div className="flex-1 relative">
                <input
                  type="number"
                  id="periodDurationInput"
                  value={periodDuration}
                  min={2}
                  max={10}
                  onChange={(e) => setPeriodDuration(parseInt(e.target.value, 10) || 6)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-bold text-center text-xl focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-muted">
                  hari
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPeriodDuration((prev) => Math.min(10, prev + 1))}
                aria-label="Tambah lama haid 1 hari"
                className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 font-bold text-xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center border border-rose-200 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* 5. Advanced Luteal Phase Accordion */}
          <div className="pt-2 border-t border-rose-100">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen((prev) => !prev)}
              className="w-full py-2 flex items-center justify-between text-xs font-semibold text-rose-700 hover:text-rose-900 transition-colors focus:outline-none cursor-pointer"
              aria-expanded={isAdvancedOpen}
            >
              <span className="flex items-center gap-1.5">
                ⚙️ Pengaturan Lanjutan: Panjang Fase Luteal Klinis
              </span>
              <span
                className="text-sm transform transition-transform duration-200"
                style={{ transform: isAdvancedOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>

            {isAdvancedOpen && (
              <div className="mt-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-ink-primary">Fase Luteal Personal</h4>
                  <p className="text-[11px] text-ink-secondary mt-0.5">
                    Durasi pasca-ovulasi hingga menstruasi berikutnya. Standar klinis: 14 hari (rentang 10 - 18 hari).
                  </p>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={lutealPhase}
                    min={10}
                    max={18}
                    onChange={(e) => setLutealPhase(parseInt(e.target.value, 10) || 14)}
                    className="w-full px-2.5 py-2 rounded-xl border border-rose-200 bg-white text-center font-bold text-ink-primary text-sm focus:border-rose-400 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {validationError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Calculate Submit Button */}
          <button
            type="submit"
            className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-display font-bold text-base sm:text-lg rounded-2xl shadow-lg shadow-rose-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>✨ Hitung Masa Subur</span>
          </button>
        </form>
      </section>

      {/* RESULTS SECTION */}
      {hasCalculated && calculatedMetrics && todayEval && (
        <section ref={resultsRef} className="space-y-8">
          {/* SAVE / UPDATE SIKLUS BANNER */}
          <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 rounded-3xl p-6 sm:p-7 text-white shadow-lg shadow-rose-200/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all animate-in fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💾</span>
                <h3 className="font-display font-bold text-lg sm:text-xl">
                  {matchingCycle ? 'Perbarui Siklus di Riwayat' : 'Simpan Siklus Menstruasi Anda'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-rose-100 max-w-xl leading-relaxed">
                {matchingCycle ? (
                  <>
                    Ditemukan siklus tersimpan dengan HPHT <strong>{matchingCycle.cycle_start_date}</strong>. Klik <strong>'Update Siklus'</strong> untuk memperbarui prediksi siklus ini, atau simpan baru jika ini periode haid berikutnya.
                  </>
                ) : (
                  'Simpan hasil perhitungan ini ke database agar fase menstruasi, masa subur, dan riwayat siklus Anda tercatat secara konsisten di akun Anda dan langsung tampil di Dashboard.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-shrink-0">
              {matchingCycle ? (
                <>
                  <button
                    type="button"
                    disabled={isSavingCycle}
                    onClick={handleUpdateCycle}
                    className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 font-display font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>🔄</span>
                    <span>{isSavingCycle ? 'Memperbarui...' : 'Update Siklus'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingCycle}
                    onClick={handleSaveCycle}
                    className="flex-1 md:flex-initial px-4 py-3 rounded-2xl bg-rose-700/60 hover:bg-rose-700 text-white font-display font-bold text-xs border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Simpan sebagai siklus baru"
                  >
                    <span>➕</span>
                    <span>Simpan Baru</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isSavingCycle}
                  onClick={handleSaveCycle}
                  className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 font-display font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>💾</span>
                  <span>{isSavingCycle ? 'Menyimpan...' : 'Simpan Siklus'}</span>
                </button>
              )}
            </div>
          </div>

          {/* CENTERPIECE: FLO DAILY DIAL */}
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
                  stroke="url(#floCalcGradient)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                />
                <defs>
                  <linearGradient id="floCalcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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

            {/* Countdown / Summary Note */}
            <div className="max-w-md mx-auto mt-3 p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs sm:text-sm text-ink-secondary">
              {(() => {
                const nextPeriodRef = calculatedMetrics.isVariable
                  ? calculatedMetrics.nextPeriodStartDate
                  : calculatedMetrics.nextPeriodDate;
                const daysToNext = diffInDays(nextPeriodRef, today);

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
          </div>

          {/* 4 KEY RESULT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Ovulation Date (Rose/Pink) */}
            <div className="result-enter bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🥚</span>
                <div>
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                    Hari Perkiraan Ovulasi
                  </span>
                  <h3 className="font-bold text-ink-primary text-base">Puncak Kesuburan</h3>
                </div>
              </div>
              <p className="text-2xl font-extrabold text-rose-600 mt-2">
                {!calculatedMetrics.isVariable
                  ? formatDateFull(calculatedMetrics.ovulationDate)
                  : `${formatDateShort(calculatedMetrics.ovulationStartDate)} — ${formatDateShort(
                      calculatedMetrics.ovulationEndDate
                    )}`}
              </p>
              <p className="text-xs text-rose-800/80 mt-2 leading-relaxed">
                Ini adalah hari paling subur dalam siklus Anda. Sel telur matang dilepaskan dan bertahan 12–24 jam di tuba fallopi.
              </p>
            </div>

            {/* Card 2: Fertile Window (Amber/Orange) */}
            <div className="result-enter bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🌟</span>
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    Jendela Subur
                  </span>
                  <h3 className="font-bold text-ink-primary text-base">Peluang Hamil Tertinggi</h3>
                </div>
              </div>
              <p className="text-2xl font-extrabold text-amber-700 mt-2">
                {`${formatDateShort(calculatedMetrics.fertileStart)} — ${formatDateShort(
                  calculatedMetrics.fertileEnd
                )}`}
              </p>
              <p className="text-xs text-amber-800/80 mt-2 leading-relaxed">
                Periode dengan peluang kehamilan tertinggi (5 hari sebelum ovulasi s/d 1 hari pasca-ovulasi karena sperma bertahan hingga 5 hari).
              </p>
            </div>

            {/* Card 3: Safe Window (Emerald/Teal) */}
            <div className="result-enter bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🛡️</span>
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    Masa Kurang Subur (Relatif Aman)
                  </span>
                  <h3 className="font-bold text-ink-primary text-base">Peluang Pembuahan Rendah</h3>
                </div>
              </div>
              <p className="text-xl font-bold text-emerald-700 mt-2">
                {!calculatedMetrics.isVariable ? (
                  calculatedMetrics.safeBeforeEnd >= calculatedMetrics.safeBeforeStart ? (
                    <span>
                      {formatDateShort(calculatedMetrics.safeBeforeStart)} —{' '}
                      {formatDateShort(calculatedMetrics.safeBeforeEnd)} &{' '}
                      {formatDateShort(calculatedMetrics.safeAfterStart)} ke depan
                    </span>
                  ) : (
                    <span>{formatDateShort(calculatedMetrics.safeAfterStart)} ke depan</span>
                  )
                ) : (
                  <span>{formatDateShort(calculatedMetrics.safeAfterStart)} ke depan</span>
                )}
              </p>
              <p className="text-xs text-emerald-800/80 mt-2 leading-relaxed">
                Peluang kehamilan relatif lebih rendah saat lapisan endometrium belum matang atau sel telur sudah tidak lagi viabel (bukan 0%).
              </p>
            </div>

            {/* Card 4: Next 3 Cycles (Violet/Purple) */}
            <div className="result-enter bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📅</span>
                <div>
                  <span className="text-xs font-bold text-violet-800 uppercase tracking-wider block">
                    3 Siklus ke Depan
                  </span>
                  <h3 className="font-bold text-ink-primary text-base">Proyeksi Kalendar</h3>
                </div>
              </div>
              <div className="space-y-2 mt-3">
                {nextThreeCycles.map((c) => (
                  <div
                    key={c.cycleNumber}
                    className="flex flex-wrap items-center justify-between bg-white/70 backdrop-blur-sm rounded-xl px-3.5 py-2 border border-violet-100 text-xs"
                  >
                    <span className="font-bold text-violet-900">Siklus {c.cycleNumber}</span>
                    <div className="flex items-center gap-3">
                      <span>
                        <span className="text-ink-muted">Haid:</span>{' '}
                        <strong className="text-rose-600">{formatDateShort(c.cycleStart)}</strong>
                      </span>
                      <span>
                        <span className="text-ink-muted">Ovulasi:</span>{' '}
                        <strong className="text-amber-700">{formatDateShort(c.ovulDate)}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3-MONTH CALENDAR VIEW */}
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
              <button
                type="button"
                onClick={matchingCycle ? handleUpdateCycle : handleSaveCycle}
                disabled={isSavingCycle}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{matchingCycle ? '🔄' : '💾'}</span>
                <span>
                  {isSavingCycle
                    ? 'Memproses...'
                    : matchingCycle
                    ? 'Update Siklus Ini'
                    : 'Simpan Siklus'}
                </span>
              </button>
              <Link
                to="/dashboard"
                className="px-5 py-2.5 rounded-2xl bg-petal-500 hover:bg-petal-600 text-white text-xs font-bold shadow-md shadow-petal-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>📊 Lihat di Dashboard</span>
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
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>🔄 Atur Ulang Data</span>
              </button>
            </div>

            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-left">
              <p className="text-xs text-ink-muted leading-relaxed">
                <strong className="text-ink-secondary">Pemberitahuan Medis:</strong> Kalkulator ini menggunakan metode kalendar klinis sebagai alat bantu estimasi statistik dan tidak menggantikan konsultasi langsung dengan dokter spesialis obstetri dan ginekologi (Sp.OG). Variasi hormonal alami, tingkat stres, dan kondisi medis dapat memengaruhi jadwal ovulasi Anda.
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

export default CalculatorPage;
