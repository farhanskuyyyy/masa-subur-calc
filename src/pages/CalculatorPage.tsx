import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from '../components/InfoModal';
import { DatePicker } from '../components/DatePicker';
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

type CalculatorStep = 'input' | 'result' | 'detail';

export const CalculatorPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, isDemoUser, token } = useAuth();
  const navigate = useNavigate();

  const isEn = (i18n.language || 'en').startsWith('en');

  // Step state: 'input' | 'result' | 'detail'
  const [step, setStep] = useState<CalculatorStep>('input');
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);

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

  const periodDateStrings = useMemo(() => {
    if (!lastPeriodInput) return [];
    try {
      const [y, m, d] = lastPeriodInput.split('-').map(Number);
      const start = new Date(y, m - 1, d, 12, 0, 0);
      const res: string[] = [];
      const dur = periodDuration || 6;
      for (let i = 0; i < dur; i++) {
        const next = new Date(start.getTime());
        next.setDate(next.getDate() + i);
        const yStr = next.getFullYear();
        const mStr = String(next.getMonth() + 1).padStart(2, '0');
        const dStr = String(next.getDate()).padStart(2, '0');
        res.push(`${yStr}-${mStr}-${dStr}`);
      }
      return res;
    } catch {
      return [];
    }
  }, [lastPeriodInput, periodDuration]);

  // Saved cycles state (to check for matching cycle when saving)
  const [savedCycles, setSavedCycles] = useState<UserCycle[]>([]);
  const [isSavingCycle, setIsSavingCycle] = useState<boolean>(false);

  // Results & calendar state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [mobileCalMonthIndex, setMobileCalMonthIndex] = useState<number>(0);

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
      showToast(isEn ? 'Please log in to save your cycle.' : 'Harap login untuk menyimpan siklus.');
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
      showToast(res.message || (isEn ? 'Cycle successfully saved!' : 'Siklus berhasil disimpan ke database!'));
      await fetchUserCycles();
    } catch (err: any) {
      showToast(err.message || (isEn ? 'Failed to save cycle.' : 'Gagal menyimpan data siklus.'));
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
      showToast(res.message || (isEn ? 'Cycle successfully updated!' : 'Siklus berhasil diperbarui!'));
      await fetchUserCycles();
    } catch (err: any) {
      showToast(err.message || (isEn ? 'Failed to update cycle.' : 'Gagal memperbarui data siklus.'));
    } finally {
      setIsSavingCycle(false);
    }
  };

  // Validate and compute metrics
  const { calculatedMetrics, validationError } = useMemo(() => {
    if (!lastPeriodInput) {
      return {
        calculatedMetrics: null,
        validationError: isEn
          ? 'Please select your first day of last menstrual period (LMP).'
          : 'Harap pilih tanggal hari pertama haid terakhir (HPHT) Anda.',
      };
    }

    const parts = lastPeriodInput.split('-');
    if (parts.length !== 3) {
      return {
        calculatedMetrics: null,
        validationError: isEn ? 'Invalid date format.' : 'Format tanggal haid tidak valid.',
      };
    }

    const lpd = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    const todayDate = new Date();
    const futureDiff = diffInDays(lpd, todayDate);
    if (futureDiff > 0) {
      return {
        calculatedMetrics: null,
        validationError: isEn
          ? 'Last period date cannot be in the future.'
          : 'Tanggal haid terakhir tidak boleh di masa depan.',
      };
    }

    const pastDiff = diffInDays(todayDate, lpd);
    if (pastDiff > 120) {
      return {
        calculatedMetrics: null,
        validationError: isEn
          ? 'Last period date is more than 120 days ago. Please enter a more recent period date.'
          : 'Tanggal haid terakhir lebih dari 120 hari yang lalu. Silakan masukkan tanggal haid terbaru untuk akurasi yang lebih baik.',
      };
    }

    if (isVariable) {
      if (cycleMin >= cycleMax) {
        return {
          calculatedMetrics: null,
          validationError: isEn
            ? 'Shortest cycle must be shorter than longest cycle.'
            : 'Siklus terpendek harus lebih kecil daripada siklus terpanjang.',
        };
      }
      if (cycleMin <= periodDuration) {
        return {
          calculatedMetrics: null,
          validationError: isEn
            ? 'Menstrual cycle length must be greater than bleeding duration.'
            : 'Panjang siklus menstruasi harus lebih besar daripada lama pendarahan haid.',
        };
      }
    } else {
      if (cycleLength <= periodDuration) {
        return {
          calculatedMetrics: null,
          validationError: isEn
            ? 'Menstrual cycle length must be greater than bleeding duration.'
            : 'Panjang siklus menstruasi harus lebih besar daripada lama pendarahan haid.',
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
  }, [lastPeriodInput, isVariable, cycleLength, cycleMin, cycleMax, periodDuration, lutealPhase, isEn]);

  // Today Evaluation
  const today = useMemo(() => new Date(), []);
  const todayEval: DayEvaluation | null = useMemo(() => {
    if (!calculatedMetrics) return null;
    return evaluateDay(today, calculatedMetrics, i18n.language);
  }, [today, calculatedMetrics, i18n.language]);

  // Selected Day Evaluation
  const selectedDayEval: DayEvaluation | null = useMemo(() => {
    if (!calculatedMetrics) return null;
    return evaluateDay(selectedDate, calculatedMetrics, i18n.language);
  }, [selectedDate, calculatedMetrics, i18n.language]);

  // 3 Months Calendar Data
  const threeMonthsData: MonthCalendarData[] = useMemo(() => {
    if (!calculatedMetrics) return [];
    return getThreeMonthsData(calculatedMetrics.lastPeriodDate, calculatedMetrics, i18n.language);
  }, [calculatedMetrics, i18n.language]);

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

  // Luna Dial calculations
  const circumference = 2 * Math.PI * 98; // ~615.75
  const progressRatio = useMemo(() => {
    if (!todayEval) return 0;
    return Math.min(Math.max(todayEval.cycleDay / todayEval.cycleDuration, 0), 1);
  }, [todayEval]);
  const strokeOffset = circumference - circumference * progressRatio;

  // Is today fertile?
  const isFertileToday = useMemo(() => {
    if (!todayEval) return false;
    return (
      todayEval.phase === 'fertile' ||
      todayEval.phase === 'fertile-peak' ||
      todayEval.phase === 'ovulation' ||
      todayEval.phase === 'fertile-late'
    );
  }, [todayEval]);

  // Date formatting helpers
  const formatDisplayDate = useCallback((date: Date): string => {
    const loc = isEn ? 'en-US' : 'id-ID';
    return date.toLocaleDateString(loc, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [isEn]);

  const formatFertileRange = useCallback((start: Date, end: Date): string => {
    const loc = isEn ? 'en-US' : 'id-ID';
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameMonth) {
      const monthName = end.toLocaleDateString(loc, { month: 'long' });
      return `${start.getDate()}–${end.getDate()} ${monthName} ${end.getFullYear()}`;
    } else if (sameYear) {
      const startMonth = start.toLocaleDateString(loc, { month: 'short' });
      const endMonth = end.toLocaleDateString(loc, { month: 'short' });
      return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
    } else {
      return `${formatDateShort(start, i18n.language)} – ${formatDateShort(end, i18n.language)}`;
    }
  }, [isEn, i18n.language]);

  const daysToNextPeriod = useMemo(() => {
    if (!calculatedMetrics) return 0;
    const nextPeriodRef = calculatedMetrics.isVariable
      ? calculatedMetrics.nextPeriodStartDate
      : calculatedMetrics.nextPeriodDate;
    return diffInDays(nextPeriodRef, today);
  }, [calculatedMetrics, today]);

  // Handlers
  const handleQuickChip = (daysAgo: number) => {
    const d = addDays(new Date(), -daysAgo);
    setLastPeriodInput(toISODateString(d));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    setHasCalculated(true);
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    const now = new Date();
    setLastPeriodInput(toISODateString(now));
    setCycleLength(28);
    setPeriodDuration(6);
    setLutealPhase(14);
    setIsVariable(false);
    setSelectedDate(now);
    setStep('input');
    setHasCalculated(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(isEn ? 'Cycle settings have been reset.' : 'Pengaturan siklus berhasil diatur ulang.');
  };

  const handleCopySummary = () => {
    if (!calculatedMetrics) return;

    let summary = isEn
      ? `🌸 Cycle & Fertility Summary (Clinical Calendar)\n`
      : `🌸 Ringkasan Siklus & Masa Subur (Metode Kalendar)\n`;
    summary += `${t('calculator.hpht')}: ${formatDateFull(calculatedMetrics.lastPeriodDate, i18n.language)}\n`;

    if (!calculatedMetrics.isVariable) {
      summary += `${t('calculator.cycleLength')}: ${calculatedMetrics.cycleLength} ${t('calculator.days')} (${t('calculator.regular')})\n`;
      summary += `${t('dashboard.ovulation')}: ${formatDateFull(calculatedMetrics.ovulationDate, i18n.language)}\n`;
      summary += `${t('dashboard.fertileWindow')}: ${formatDateShort(calculatedMetrics.fertileStart, i18n.language)} — ${formatDateShort(calculatedMetrics.fertileEnd, i18n.language)}\n`;
      summary += `${t('dashboard.nextPeriod')}: ${formatDateFull(calculatedMetrics.nextPeriodDate, i18n.language)}\n`;
    } else {
      summary += `${t('calculator.cycleType')}: ${calculatedMetrics.cycleMin} - ${calculatedMetrics.cycleMax} ${t('calculator.days')} (${t('calculator.variable')})\n`;
      summary += `${t('dashboard.ovulation')}: ${formatDateShort(calculatedMetrics.ovulationStartDate, i18n.language)} - ${formatDateShort(calculatedMetrics.ovulationEndDate, i18n.language)}\n`;
      summary += `${t('dashboard.fertileWindow')}: ${formatDateShort(calculatedMetrics.fertileStart, i18n.language)} - ${formatDateShort(calculatedMetrics.fertileEnd, i18n.language)}\n`;
      summary += `${t('dashboard.nextPeriod')}: ${formatDateShort(calculatedMetrics.nextPeriodStartDate, i18n.language)} - ${formatDateShort(calculatedMetrics.nextPeriodEndDate, i18n.language)}\n`;
    }
    summary += isEn ? `\nCalculated privately using Luna clinical methods.` : `\nDihitung secara lokal dengan privasi 100% menggunakan metode kalendar klinis.`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(summary)
        .then(() => showToast(isEn ? 'Summary copied to clipboard!' : 'Ringkasan berhasil disalin!'))
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
    showToast(isEn ? 'Summary copied to clipboard!' : 'Ringkasan berhasil disalin!');
  };

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12 w-full overflow-x-hidden min-w-0">
      {/* Header Profile Bar */}
      <section aria-labelledby="calc-page-heading" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-rose-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              {t('calculator.title')}
            </span>
          </div>
          <h1 id="calc-page-heading" className="font-display text-2xl sm:text-3xl font-extrabold text-ink-primary mt-1">
            {t('calculator.title')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            {isEn ? 'Logged in as:' : 'Masuk sebagai:'} <strong className="text-rose-700">{user?.email || 'User'}</strong>
            {isDemoUser && (
              <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {t('nav.demo')}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Link
            to="/dashboard"
            aria-label={t('nav.dashboard')}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
          >
            <span>← {t('nav.dashboard')}</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            aria-label={t('nav.clinicalBasis')}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
          >
            <span>📖 {t('nav.clinicalBasis')}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label={t('nav.logout')}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer active:scale-98"
          >
            <span>🚪 {t('nav.logout')}</span>
          </button>
        </div>
      </section>

      {/* STEP INDICATOR (1 Input → 2 Hasil → 3 Detail) */}
      <nav aria-label={isEn ? 'Calculation Steps' : 'Tahapan Perhitungan'} className="mb-6">
        <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-md mx-auto">
          {/* Step 1: Input */}
          <button
            type="button"
            onClick={() => {
              setStep('input');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              step === 'input'
                ? 'bg-rose-600 text-white shadow-sm ring-4 ring-rose-100'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'input' ? 'bg-white text-rose-600' : 'bg-rose-200 text-rose-800'
              }`}
            >
              1
            </span>
            <span>{t('calculator.stepInput', 'Input')}</span>
          </button>

          <span className="text-rose-300 font-bold select-none" aria-hidden="true">→</span>

          {/* Step 2: Hasil */}
          <button
            type="button"
            disabled={!calculatedMetrics || !hasCalculated}
            onClick={() => {
              if (calculatedMetrics && hasCalculated) {
                setStep('result');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
              step === 'result'
                ? 'bg-rose-600 text-white shadow-sm ring-4 ring-rose-100'
                : calculatedMetrics && hasCalculated
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'result' ? 'bg-white text-rose-600' : 'bg-rose-200 text-rose-800'
              }`}
            >
              2
            </span>
            <span>{t('calculator.stepResult', 'Hasil')}</span>
          </button>

          <span className="text-rose-300 font-bold select-none" aria-hidden="true">→</span>

          {/* Step 3: Detail */}
          <button
            type="button"
            disabled={!calculatedMetrics || !hasCalculated}
            onClick={() => {
              if (calculatedMetrics && hasCalculated) {
                setStep('detail');
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
              step === 'detail'
                ? 'bg-rose-600 text-white shadow-sm ring-4 ring-rose-100'
                : calculatedMetrics && hasCalculated
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'detail' ? 'bg-white text-rose-600' : 'bg-rose-200 text-rose-800'
              }`}
            >
              3
            </span>
            <span>{t('calculator.stepDetail', 'Detail')}</span>
          </button>
        </div>
      </nav>

      {/* STEP 1: INPUT FORM (visible when step === 'input') */}
      {step === 'input' && (
        <section
          aria-labelledby="calc-input-heading"
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-luna-card border border-rose-100 mb-8 step-fade-in transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-rose-100">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl" aria-hidden="true">🌸</span>
              <div>
                <h2 id="calc-input-heading" className="font-display font-bold text-lg sm:text-xl text-ink-primary">
                  {t('calculator.title')}
                </h2>
                <p className="text-xs text-ink-secondary">
                  {t('calculator.subtitle')}
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
                showToast(isEn ? '28-day standard example applied.' : 'Data contoh siklus standar 28 hari diterapkan.');
              }}
              aria-label={isEn ? 'Apply 28-day standard example' : 'Terapkan contoh standar 28 hari'}
              className="text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer self-start sm:self-auto active:scale-98"
            >
              {isEn ? 'Standard Example (28 Days)' : 'Contoh Standar (28 Hari)'}
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6" noValidate aria-label={t('calculator.title')}>
            {/* 1. Date of Last Period (HPHT) */}
            <div>
              <DatePicker
                id="lastPeriodInput"
                label={t('calculator.hpht')}
                required
                value={lastPeriodInput}
                onChange={(val) => setLastPeriodInput(val)}
                placeholder={isEn ? 'Select LMP date...' : 'Pilih tanggal HPHT...'}
                menstruationDays={periodDateStrings}
              />

              {/* Quick Date Chips */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="text-xs text-ink-muted mr-1">{isEn ? 'Quick select:' : 'Pilihan Cepat:'}</span>
                <button
                  type="button"
                  onClick={() => handleQuickChip(0)}
                  aria-label={isEn ? 'Today' : 'Hari Ini'}
                  className="min-h-[44px] text-xs px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                >
                  {isEn ? 'Today' : 'Hari Ini'}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickChip(3)}
                  aria-label={isEn ? '3 days ago' : '3 Hari Lalu'}
                  className="min-h-[44px] text-xs px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                >
                  {isEn ? '3 Days Ago' : '3 Hari Lalu'}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickChip(7)}
                  aria-label={isEn ? '7 days ago' : '7 Hari Lalu'}
                  className="min-h-[44px] text-xs px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                >
                  {isEn ? '7 Days Ago' : '7 Hari Lalu'}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickChip(14)}
                  aria-label={isEn ? '14 days ago' : '14 Hari Lalu'}
                  className="min-h-[44px] text-xs px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                >
                  {isEn ? '14 Days Ago' : '14 Hari Lalu'}
                </button>
              </div>
            </div>

            {/* 2. Cycle Length Inputs */}
            <div className="space-y-2">
              <label
                htmlFor="cycleLengthInput"
                className="block text-sm font-semibold text-ink-primary flex items-center justify-between"
              >
                <span>{t('calculator.cycleLength')}</span>
                <span className="text-xs font-normal text-ink-muted">
                  {isEn ? 'Normal: 21–35 days. Average: 28 days' : 'Normal: 21–35 hari. Rata-rata: 28 hari'}
                </span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCycleLength((prev) => Math.max(20, prev - 1))}
                  aria-label={isEn ? 'Decrease cycle length by 1 day' : 'Kurangi panjang siklus 1 hari'}
                  className="w-12 h-12 min-w-12 min-h-12 shrink-0 rounded-2xl bg-rose-50 text-rose-600 font-bold text-2xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center border border-rose-200 cursor-pointer"
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
                    className="w-full min-h-[48px] h-12 px-4 py-3 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-bold text-center text-xl focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-muted">
                    {t('calculator.days')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCycleLength((prev) => Math.min(45, prev + 1))}
                  aria-label={isEn ? 'Increase cycle length by 1 day' : 'Tambah panjang siklus 1 hari'}
                  className="w-12 h-12 min-w-12 min-h-12 shrink-0 rounded-2xl bg-rose-50 text-rose-600 font-bold text-2xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center border border-rose-200 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* 3. Period Duration */}
            <div className="space-y-2">
              <label
                htmlFor="periodDurationInput"
                className="block text-sm font-semibold text-ink-primary flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span className="text-rose-500" aria-hidden="true">🩸</span> {t('calculator.periodDuration')}
                </span>
                <span className="text-xs font-normal text-ink-muted">
                  {isEn ? 'Normal: 3–7 days' : 'Normal: 3–7 hari'}
                </span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPeriodDuration((prev) => Math.max(2, prev - 1))}
                  aria-label={isEn ? 'Decrease period duration by 1 day' : 'Kurangi lama haid 1 hari'}
                  className="w-12 h-12 min-w-12 min-h-12 shrink-0 rounded-2xl bg-rose-50 text-rose-600 font-bold text-2xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center border border-rose-200 cursor-pointer"
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
                    className="w-full min-h-[48px] h-12 px-4 py-3 rounded-2xl border-2 border-rose-100 bg-rose-50/30 text-ink-primary font-bold text-center text-xl focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-muted">
                    {t('calculator.days')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPeriodDuration((prev) => Math.min(10, prev + 1))}
                  aria-label={isEn ? 'Increase period duration by 1 day' : 'Tambah lama haid 1 hari'}
                  className="w-12 h-12 min-w-12 min-h-12 shrink-0 rounded-2xl bg-rose-50 text-rose-600 font-bold text-2xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center border border-rose-200 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* 4. Advanced Settings Expandable (Hidden by default) */}
            <div className="pt-2 border-t border-rose-100">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen((prev) => !prev)}
                className="w-full min-h-[44px] py-3 px-2 flex items-center justify-between text-xs font-semibold text-rose-700 hover:text-rose-900 transition-colors focus:outline-none cursor-pointer rounded-xl active:bg-rose-50/50"
                aria-expanded={isAdvancedOpen}
              >
                <span className="flex items-center gap-1.5">
                  ⚙️ {t('calculator.advancedSettings')}
                </span>
                <span
                  className="text-sm transform transition-transform duration-200"
                  style={{ transform: isAdvancedOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>

              {isAdvancedOpen && (
                <div className="mt-3 p-4 sm:p-5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-4 step-fade-in">
                  {/* Cycle Regularity */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-primary mb-2 flex items-center gap-1.5">
                      <span className="text-rose-500" aria-hidden="true">🔄</span> {t('calculator.cycleType')}
                    </label>
                    <div className="grid grid-cols-2 gap-3 p-1.5 bg-white rounded-2xl border border-rose-100">
                      <button
                        type="button"
                        onClick={() => setIsVariable(false)}
                        aria-pressed={!isVariable}
                        className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          !isVariable
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'text-ink-secondary hover:text-ink-primary'
                        }`}
                      >
                        ✓ {t('calculator.regular')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsVariable(true)}
                        aria-pressed={isVariable}
                        className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isVariable
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'text-ink-secondary hover:text-ink-primary'
                        }`}
                      >
                        ~ {t('calculator.variable')}
                      </button>
                    </div>
                  </div>

                  {/* Variable Cycle Inputs */}
                  {isVariable && (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs text-ink-secondary bg-white p-3 rounded-xl border border-rose-100">
                        {isEn
                          ? 'Ogino-Knaus clinical method takes into account cycle variations over the past 6 months to expand the fertile window accurately.'
                          : 'Metode Ogino-Knaus memperhitungkan variasi terpendek dan terpanjang selama 6 bulan terakhir untuk memperluas rentang jendela subur secara akurat.'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="cycleMinInput" className="block text-xs font-semibold text-ink-primary mb-1">
                            {t('calculator.shortestCycle')}
                          </label>
                          <input
                            type="number"
                            id="cycleMinInput"
                            value={cycleMin}
                            min={20}
                            max={40}
                            onChange={(e) => setCycleMin(parseInt(e.target.value, 10) || 26)}
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-rose-200 bg-white text-ink-primary font-bold text-center text-sm focus:border-rose-400 outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="cycleMaxInput" className="block text-xs font-semibold text-ink-primary mb-1">
                            {t('calculator.longestCycle')}
                          </label>
                          <input
                            type="number"
                            id="cycleMaxInput"
                            value={cycleMax}
                            min={22}
                            max={50}
                            onChange={(e) => setCycleMax(parseInt(e.target.value, 10) || 32)}
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-rose-200 bg-white text-ink-primary font-bold text-center text-sm focus:border-rose-400 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Luteal Phase Length */}
                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-rose-100">
                    <div>
                      <h3 className="text-xs font-bold text-ink-primary">{t('calculator.lutealPhase')}</h3>
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        {isEn
                          ? 'Post-ovulation duration. Clinical standard: 14 days (10–18 days).'
                          : 'Durasi pasca-ovulasi. Standar klinis: 14 hari (rentang 10 - 18 hari).'}
                      </p>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={lutealPhase}
                        min={10}
                        max={18}
                        onChange={(e) => setLutealPhase(parseInt(e.target.value, 10) || 14)}
                        aria-label={t('calculator.lutealPhase')}
                        className="w-full px-2.5 py-2 rounded-xl border border-rose-200 bg-white text-center font-bold text-ink-primary text-sm focus:border-rose-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {validationError && (
              <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <span className="text-base" aria-hidden="true">⚠️</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* Primary CTA: Calculate Button */}
            <button
              type="submit"
              aria-label={t('calculator.calculate')}
              className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-display font-bold text-base sm:text-lg rounded-2xl shadow-lg shadow-rose-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span aria-hidden="true">✨</span>
              <span>{t('calculator.calculate')}</span>
            </button>
          </form>
        </section>
      )}

      {/* STEP 2: QUICK RESULT CARD (visible in 'result' and 'detail' steps) */}
      {(step === 'result' || step === 'detail') && calculatedMetrics && todayEval && (
        <section
          ref={resultsRef}
          aria-labelledby="quick-result-heading"
          className="bg-gradient-to-br from-white via-rose-50/40 to-pink-50/30 rounded-3xl p-6 sm:p-8 shadow-luna-card border border-rose-200/80 mb-8 step-fade-in transition-all"
        >
          {/* Card Top Row: Badge + Back to Input (Edit) Button */}
          <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-rose-100">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🌸</span>
              <h2 id="quick-result-heading" className="font-display font-bold text-lg sm:text-xl text-ink-primary">
                {t('calculator.result')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('input');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label={isEn ? 'Edit input data' : 'Ubah data input'}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
            >
              <span aria-hidden="true">✏️</span>
              <span>{t('calculator.editInput', isEn ? 'Edit Input' : 'Ubah Data')}</span>
            </button>
          </div>

          {/* PROMINENT TODAY STATUS HERO BANNER */}
          <div
            className={`rounded-2xl p-5 sm:p-6 mb-6 transition-all ${
              isFertileToday
                ? 'bg-gradient-to-r from-amber-50/90 via-rose-50/80 to-pink-50/90 border-2 border-amber-200/90 shadow-xs'
                : 'bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-rose-50/40 border-2 border-emerald-200/80 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 border ${
                    isFertileToday
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : todayEval.phase === 'period'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" aria-hidden="true"></span>
                  {todayEval.phaseName} • {isEn ? `Cycle Day ${todayEval.cycleDay}` : `Hari ke-${todayEval.cycleDay}`}
                </span>
                <h3 className="font-display font-extrabold text-xl sm:text-2xl text-ink-primary">
                  {isFertileToday
                    ? (isEn ? 'Today you are in your fertile window 🌟' : 'Hari ini kamu sedang masa subur 🌟')
                    : (isEn ? 'Today is outside your fertile window 🛡️' : 'Hari ini belum subur 🛡️')}
                </h3>
                <p className="text-xs sm:text-sm text-ink-secondary mt-1.5 leading-relaxed">
                  {isEn ? 'Pregnancy chance today: ' : 'Peluang kehamilan hari ini: '}
                  <strong className="text-rose-700 font-bold">{todayEval.chanceName} ({todayEval.chancePct})</strong>
                  {' — '}
                  <span>{todayEval.chanceDesc}</span>
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-xs text-ink-muted block">
                  {formatDateFull(today, i18n.language)}
                </span>
              </div>
            </div>
          </div>

          {/* 3 FOCUSED RESULT METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 1. Next Period */}
            <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/50 rounded-2xl p-5 border border-rose-200 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl" aria-hidden="true">🩸</span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
                    {t('dashboard.nextPeriod')}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {daysToNextPeriod > 0
                      ? `${daysToNextPeriod} ${isEn ? 'days away' : 'hari lagi'}`
                      : daysToNextPeriod === 0
                      ? (isEn ? 'Estimated today' : 'Perkiraan hari ini')
                      : (isEn ? `Late by ${Math.abs(daysToNextPeriod)} days` : `Terlambat ${Math.abs(daysToNextPeriod)} hari`)}
                  </span>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-rose-700 mt-2">
                {!calculatedMetrics.isVariable
                  ? formatDisplayDate(calculatedMetrics.nextPeriodDate)
                  : `${formatDateShort(calculatedMetrics.nextPeriodStartDate, i18n.language)} – ${formatDateShort(
                      calculatedMetrics.nextPeriodEndDate,
                      i18n.language
                    )}`}
              </p>
              <p className="text-xs text-rose-900/70 mt-1.5 leading-relaxed">
                {isEn ? 'Estimated next period start' : 'Perkiraan dimulainya siklus menstruasi berikutnya'}
              </p>
            </div>

            {/* 2. Ovulation */}
            <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 rounded-2xl p-5 border border-amber-200 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl" aria-hidden="true">🥚</span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                    {t('dashboard.ovulation')}
                  </span>
                  <span className="text-xs text-ink-muted">{isEn ? 'Peak Fertility' : 'Puncak Kesuburan'}</span>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-amber-700 mt-2">
                {!calculatedMetrics.isVariable
                  ? formatDisplayDate(calculatedMetrics.ovulationDate)
                  : `${formatDateShort(calculatedMetrics.ovulationStartDate, i18n.language)} – ${formatDateShort(
                      calculatedMetrics.ovulationEndDate,
                      i18n.language
                    )}`}
              </p>
              <p className="text-xs text-amber-900/70 mt-1.5 leading-relaxed">
                {isEn ? 'Mature egg released into fallopian tube' : 'Pelepasan sel telur matang (viabel 12–24 jam)'}
              </p>
            </div>

            {/* 3. Fertile Window */}
            <div className="bg-gradient-to-br from-pink-50/80 to-rose-50/50 rounded-2xl p-5 border border-pink-200 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl" aria-hidden="true">🌟</span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-pink-700 block">
                    {t('dashboard.fertileWindow')}
                  </span>
                  <span className="text-xs text-ink-muted">{isEn ? 'Optimal Window' : 'Rentang Optimal'}</span>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-pink-700 mt-2">
                {formatFertileRange(calculatedMetrics.fertileStart, calculatedMetrics.fertileEnd)}
              </p>
              <p className="text-xs text-pink-900/70 mt-1.5 leading-relaxed">
                {isEn ? 'Highest conception probability days' : 'Rentang peluang hamil paling tinggi (sperma & ovum)'}
              </p>
            </div>
          </div>

          {/* ACTION BAR: Save Button (Secondary Outline) + Lihat Detail Link */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-rose-100">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* SECONDARY SAVE / UPDATE BUTTON (OUTLINE STYLE) */}
              <button
                type="button"
                disabled={isSavingCycle}
                onClick={matchingCycle ? handleUpdateCycle : handleSaveCycle}
                aria-label={matchingCycle ? t('calculator.update') : t('calculator.save')}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl border-2 border-rose-500 hover:bg-rose-50 text-rose-700 font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                <span aria-hidden="true">{matchingCycle ? '🔄' : '💾'}</span>
                <span>
                  {isSavingCycle
                    ? t('auth.login.processing')
                    : matchingCycle
                    ? t('calculator.update')
                    : t('calculator.save')}
                </span>
              </button>

              {matchingCycle && (
                <button
                  type="button"
                  disabled={isSavingCycle}
                  onClick={handleSaveCycle}
                  aria-label={isEn ? 'Save as new cycle' : 'Simpan sebagai siklus baru'}
                  className="min-h-[44px] px-3.5 py-2.5 rounded-2xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-medium text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  title={isEn ? 'Save as separate cycle entry' : 'Simpan sebagai entri siklus terpisah'}
                >
                  <span aria-hidden="true">➕</span>
                  <span>{isEn ? 'Save New' : 'Simpan Baru'}</span>
                </button>
              )}

              <Link
                to="/dashboard"
                aria-label={t('nav.dashboard')}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white border border-rose-200 hover:bg-rose-50 text-ink-secondary text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <span aria-hidden="true">📊</span>
                <span>{t('nav.dashboard')}</span>
              </Link>
            </div>

            {/* LIHAT DETAIL TEXT LINK WITH ARROW */}
            <button
              type="button"
              onClick={() => {
                const nextStep = step === 'detail' ? 'result' : 'detail';
                setStep(nextStep);
              }}
              aria-expanded={step === 'detail'}
              className="min-h-[44px] px-3 py-2 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-800 transition-colors inline-flex items-center justify-center sm:justify-start gap-1 cursor-pointer hover:underline self-end sm:self-auto"
            >
              <span>
                {step === 'detail'
                  ? (isEn ? 'Hide Details ↑' : 'Sembunyikan Detail ↑')
                  : (isEn ? 'View Details →' : 'Lihat Detail →')}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: FULL DETAIL SECTION (expanded only when step === 'detail') */}
      {step === 'detail' && calculatedMetrics && todayEval && (
        <section aria-label={isEn ? 'Full Cycle Details' : 'Detail Siklus Lengkap'} className="space-y-8 step-fade-in">
          {/* LUNA DAILY DIAL CENTERPIECE */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-luna-card border border-rose-100 text-center relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true"></span>
                {t('dashboard.todayStatus')}
              </span>
              <span className="text-xs font-medium text-ink-muted">
                {formatDateFull(today, i18n.language)}
              </span>
            </div>

            {/* Luna Cycle Ring */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto my-2 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 240 240" aria-hidden="true">
                <circle cx="120" cy="120" r="98" fill="none" stroke="#fdecf0" strokeWidth="16" />
                <circle
                  className="cycle-ring-circle"
                  cx="120"
                  cy="120"
                  r="98"
                  fill="none"
                  stroke="url(#lunaCalcGradient)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                />
                <defs>
                  <linearGradient id="lunaCalcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#db3264" />
                    <stop offset="50%" stopColor="#ef5582" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inside ring details */}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">
                  {t('calculator.title')}
                </span>
                <span className="font-display text-2xl sm:text-3xl font-extrabold text-ink-primary my-1">
                  {t('dashboard.day')} {todayEval.cycleDay}
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
                  <span className="text-[11px] text-ink-muted block">{isEn ? 'Pregnancy Chance:' : 'Peluang Kehamilan:'}</span>
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
                      {isEn
                        ? `Today you are in ${todayEval.phaseName}. Approximately ${daysToNext} days until next period.`
                        : `Hari ini Anda berada di ${todayEval.phaseName}. Diperkirakan sekitar ${daysToNext} hari lagi menuju haid berikutnya.`}
                    </p>
                  );
                } else if (daysToNext === 0) {
                  return (
                    <p className="leading-relaxed">
                      {isEn
                        ? 'Today is the estimated start of your next menstrual cycle.'
                        : 'Hari ini adalah perkiraan dimulainya siklus menstruasi berikutnya jika belum terjadi pembuahan.'}
                    </p>
                  );
                } else {
                  return (
                    <p className="leading-relaxed">
                      {isEn
                        ? `Late by ${Math.abs(daysToNext)} days from initial estimate.`
                        : `Terlambat ${Math.abs(daysToNext)} hari dari estimasi awal. Bila sedang merencanakan kehamilan, lakukan tes kehamilan dini secara berkala.`}
                    </p>
                  );
                }
              })()}
            </div>
          </div>

          {/* 3-MONTH CALENDAR VIEW */}
          <div className="bg-white rounded-3xl p-2.5 sm:p-8 shadow-luna-card border border-rose-100 overflow-hidden min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">🗓️</span>
                  <h3 className="font-display font-bold text-xl text-ink-primary">
                    {t('dashboard.threeMonthsTitle')}
                  </h3>
                </div>
                <p className="text-xs text-ink-secondary mt-1">
                  {isEn
                    ? 'Visual calendar for 3 consecutive months. Click any date to view daily biology.'
                    : 'Tampilan visual kalender untuk 3 bulan berturut-turut. Ketuk tanggal manapun untuk melihat status biologis harian.'}
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-400" aria-hidden="true"></span>
                  <span>{t('phases.period')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-400" aria-hidden="true"></span>
                  <span>{t('phases.fertile')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500 font-bold text-white text-[9px] flex items-center justify-center" aria-hidden="true">
                    ★
                  </span>
                  <span>{t('phases.ovulation')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-gray-200" aria-hidden="true"></span>
                  <span>{t('phases.safe')}</span>
                </div>
              </div>
            </div>

            {/* Mobile Single-Month View with Navigation (< md) */}
            <div className="md:hidden pt-4">
              {threeMonthsData[mobileCalMonthIndex] && (() => {
                const m = threeMonthsData[mobileCalMonthIndex];
                return (
                  <div>
                    {/* Mobile Month Navigation Header */}
                    <div className="flex items-center justify-between py-2 px-1 mb-3 bg-rose-50/60 rounded-2xl border border-rose-100">
                      <button
                        type="button"
                        onClick={() => setMobileCalMonthIndex((prev) => Math.max(0, prev - 1))}
                        disabled={mobileCalMonthIndex === 0}
                        aria-label={isEn ? 'Previous month' : 'Bulan sebelumnya'}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white border border-rose-200 text-rose-700 font-bold shadow-xs hover:bg-rose-50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-xl"
                      >
                        ‹
                      </button>
                      <div className="text-center">
                        <h4 className="font-display font-bold text-base text-ink-primary">
                          {m.monthTitle}
                        </h4>
                        <span className="text-[11px] text-ink-muted">
                          {isEn
                            ? `Month ${mobileCalMonthIndex + 1} of ${threeMonthsData.length}`
                            : `Bulan ${mobileCalMonthIndex + 1} dari ${threeMonthsData.length}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileCalMonthIndex((prev) => Math.min(threeMonthsData.length - 1, prev + 1))}
                        disabled={mobileCalMonthIndex >= threeMonthsData.length - 1}
                        aria-label={isEn ? 'Next month' : 'Bulan berikutnya'}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white border border-rose-200 text-rose-700 font-bold shadow-xs hover:bg-rose-50 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer text-xl"
                      >
                        ›
                      </button>
                    </div>

                    <div className="bg-rose-50/30 rounded-2xl p-1 sm:p-4 border border-rose-100 shadow-sm">
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-xs font-bold text-ink-muted mb-2">
                        <div className="text-rose-500 py-1">{isEn ? 'Sun' : 'Min'}</div>
                        <div className="py-1">{isEn ? 'Mon' : 'Sen'}</div>
                        <div className="py-1">{isEn ? 'Tue' : 'Sel'}</div>
                        <div className="py-1">{isEn ? 'Wed' : 'Rab'}</div>
                        <div className="py-1">{isEn ? 'Thu' : 'Kam'}</div>
                        <div className="py-1">{isEn ? 'Fri' : 'Jum'}</div>
                        <div className="text-rose-700 py-1">{isEn ? 'Sat' : 'Sab'}</div>
                      </div>

                      {/* Days Grid - 44px min touch target */}
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {Array.from({ length: m.firstDayOfWeek }).map((_, i) => (
                          <div key={`mob-pad-${i}`} className="min-h-[44px] h-11 rounded-lg"></div>
                        ))}

                        {m.days.map((item) => {
                          const isCurrentToday = isSameDay(item.date, today);
                          const isSelected = isSameDay(item.date, selectedDate);
                          const evalData = item.evaluation;

                          let cellClasses =
                            'min-h-[44px] h-11 w-full rounded-xl flex flex-col items-center justify-center text-xs font-bold cursor-pointer transition-all relative select-none ';

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
                              key={`mob-day-${item.dayNumber}`}
                              onClick={() => setSelectedDate(item.date)}
                              className={cellClasses}
                              aria-label={`${item.dayNumber} ${m.monthTitle} - ${evalData?.phaseName || ''}`}
                            >
                              <span className="leading-none text-sm">{item.dayNumber}</span>
                              {evalData?.phase === 'ovulation' ? (
                                <span className="text-[9px] leading-none mt-0.5" aria-hidden="true">★</span>
                              ) : evalData?.phase === 'period' ? (
                                <span className="text-[8px] leading-none mt-0.5 opacity-80" aria-hidden="true">💧</span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Desktop 3 Months Grid (>= md) */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
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
                    <div className="text-rose-500">{isEn ? 'Sun' : 'Min'}</div>
                    <div>{isEn ? 'Mon' : 'Sen'}</div>
                    <div>{isEn ? 'Tue' : 'Sel'}</div>
                    <div>{isEn ? 'Wed' : 'Rab'}</div>
                    <div>{isEn ? 'Thu' : 'Kam'}</div>
                    <div>{isEn ? 'Fri' : 'Jum'}</div>
                    <div className="text-rose-700">{isEn ? 'Sat' : 'Sab'}</div>
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: m.firstDayOfWeek }).map((_, i) => (
                      <div key={`pad-${i}`} className="h-10 sm:h-11 rounded-lg"></div>
                    ))}

                    {m.days.map((item) => {
                      const isCurrentToday = isSameDay(item.date, today);
                      const isSelected = isSameDay(item.date, selectedDate);
                      const evalData = item.evaluation;

                      let cellClasses =
                        'h-10 sm:h-11 rounded-xl flex flex-col items-center justify-center text-xs font-semibold cursor-pointer transition-all relative select-none ';

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
                            <span className="text-[8px] leading-none mt-0.5" aria-hidden="true">★</span>
                          ) : evalData?.phase === 'period' ? (
                            <span className="text-[7px] leading-none mt-0.5 opacity-80" aria-hidden="true">💧</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DAILY BIOLOGY DETAIL (Selected Date) */}
          {selectedDayEval && (
            <div className="bg-gradient-to-br from-white to-rose-50/50 rounded-3xl p-6 sm:p-8 shadow-luna-card border border-rose-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-rose-100">
                <div>
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                    {isEn ? 'Selected Date Detail' : 'Detail Tanggal yang Dipilih'}
                  </span>
                  <h3 className="font-display text-xl font-bold text-ink-primary">
                    {formatDateFull(selectedDate, i18n.language)} ({t('dashboard.day')} {selectedDayEval.cycleDay})
                  </h3>
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
                    <span className="text-lg" aria-hidden="true">📈</span>
                    <h4 className="text-xs font-bold text-ink-primary uppercase">
                      {isEn ? 'Conception Chance' : 'Peluang Konsepsi'}
                    </h4>
                  </div>
                  <p className="text-sm font-bold text-rose-700">
                    {selectedDayEval.chanceName} ({selectedDayEval.chancePct})
                  </p>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                    {selectedDayEval.chanceDesc}
                  </p>
                </div>

                {/* Cervical Mucus */}
                <div className="bg-white/90 p-4 rounded-2xl border border-rose-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg" aria-hidden="true">💧</span>
                    <h4 className="text-xs font-bold text-ink-primary uppercase">
                      {isEn ? 'Cervical Fluid' : 'Karakteristik Cairan Serviks'}
                    </h4>
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
                    <span className="text-lg" aria-hidden="true">🌡️</span>
                    <h4 className="text-xs font-bold text-ink-primary uppercase">
                      {isEn ? 'BBT & Hormones' : 'Suhu Basal & Hormon'}
                    </h4>
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

          {/* CYCLE PROJECTIONS (Next 3 Cycles) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-luna-card border border-violet-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl" aria-hidden="true">📅</span>
              <div>
                <span className="text-xs font-bold text-violet-800 uppercase tracking-wider block">
                  {isEn ? 'Next 3 Cycles' : '3 Siklus ke Depan'}
                </span>
                <h3 className="font-display font-bold text-lg sm:text-xl text-ink-primary">
                  {isEn ? 'Calendar Projections' : 'Proyeksi Kalendar'}
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nextThreeCycles.map((c) => (
                <div
                  key={c.cycleNumber}
                  className="bg-gradient-to-br from-violet-50/70 to-purple-50/40 rounded-2xl p-4 border border-violet-100 text-xs shadow-2xs"
                >
                  <span className="font-bold text-violet-900 text-sm block mb-2">
                    {isEn ? `Cycle ${c.cycleNumber}` : `Siklus ${c.cycleNumber}`}
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">{t('phases.period')}:</span>
                      <strong className="text-rose-600 font-semibold">{formatDateShort(c.cycleStart, i18n.language)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">{t('dashboard.ovulation')}:</span>
                      <strong className="text-amber-700 font-semibold">{formatDateShort(c.ovulDate, i18n.language)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-muted">{t('dashboard.fertileWindow')}:</span>
                      <strong className="text-pink-700 font-semibold">
                        {formatDateShort(c.fertileStart, i18n.language)}–{formatDateShort(c.fertileEnd, i18n.language)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TERTIARY ACTION BUTTONS (Muted text buttons at bottom) */}
          <div className="pt-2 text-center space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCopySummary}
                aria-label={isEn ? 'Copy summary' : 'Salin ringkasan'}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-semibold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span aria-hidden="true">📋</span>
                <span>{t('calculator.copySummary', isEn ? 'Copy Summary' : 'Salin Ringkasan')}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                aria-label={isEn ? 'Print report' : 'Cetak laporan'}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-white border border-rose-200 text-ink-primary hover:bg-rose-50 text-xs sm:text-sm font-semibold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span aria-hidden="true">🖨️</span>
                <span>{t('calculator.printReport', isEn ? 'Print Report' : 'Cetak Laporan')}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                aria-label={isEn ? 'Reset data' : 'Atur ulang data'}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span aria-hidden="true">🔄</span>
                <span>{t('calculator.resetData', isEn ? 'Reset Data' : 'Atur Ulang Data')}</span>
              </button>
            </div>

            {/* MEDICAL NOTICE */}
            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-left">
              <p className="text-xs text-ink-muted leading-relaxed">
                <strong className="text-ink-secondary">{isEn ? 'Medical Notice:' : 'Pemberitahuan Medis:'}</strong>{' '}
                {isEn
                  ? 'This calculator uses clinical calendar methods as a statistical estimation tool and is not a substitute for direct consultation with an obstetrician-gynecologist (OB-GYN).'
                  : 'Kalkulator ini menggunakan metode kalendar klinis sebagai alat bantu estimasi statistik dan tidak menggantikan konsultasi langsung dengan dokter spesialis obstetri dan ginekologi (Sp.OG). Variasi hormonal alami, tingkat stres, dan kondisi medis dapat memengaruhi jadwal ovulasi Anda.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink-primary text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all flex items-center gap-2">
          <span aria-hidden="true">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </main>
  );
};

export default CalculatorPage;
