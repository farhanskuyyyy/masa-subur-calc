import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { InfoModal } from '../components/InfoModal';
import { cyclesApi, type UserCycle, type UserCheckin, type UserSymptom } from '../lib/api';
import { PhaseProgress } from '../components/PhaseProgress';
import { SymptomQuestionnaire } from '../components/SymptomQuestionnaire';
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
import type { DayEvaluation, MonthCalendarData, RegularCycleMetrics } from '../types/calculator';

export const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, isDemoUser, token } = useAuth();
  const navigate = useNavigate();

  const isEn = (i18n.language || 'en').startsWith('en');

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

  const [checkins, setCheckins] = useState<UserCheckin[]>([]);
  const [symptoms, setSymptoms] = useState<UserSymptom[]>([]);
  const [isCheckinSubmitting, setIsCheckinSubmitting] = useState<boolean>(false);
  const [showQuestionnaireExpanded, setShowQuestionnaireExpanded] = useState<boolean>(false);

  const fetchCycleAddons = useCallback(async (cycleId: string) => {
    if (!token || !cycleId) return;
    try {
      const [cRes, sRes] = await Promise.all([
        cyclesApi.getCheckins(token, cycleId),
        cyclesApi.getSymptoms(token, cycleId),
      ]);
      setCheckins(cRes.checkins || []);
      setSymptoms(sRes.symptoms || []);
    } catch (err) {
      console.warn('Gagal memuat data checkin atau gejala:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchCyclesData();
  }, [fetchCyclesData]);

  useEffect(() => {
    if (currentCycle?.id) {
      fetchCycleAddons(currentCycle.id);
    } else {
      setCheckins([]);
      setSymptoms([]);
    }
  }, [currentCycle?.id, fetchCycleAddons]);

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
    return evaluateDay(today, calculatedMetrics, i18n.language);
  }, [today, calculatedMetrics, i18n.language]);

  const todayISO = useMemo(() => toISODateString(today), [today]);

  const todayCheckin = useMemo(() => {
    return checkins.find((c) => c.checkin_date === todayISO);
  }, [checkins, todayISO]);

  // Is today within a predicted period window?
  const isTodayPredictedPeriod = useMemo(() => {
    if (!calculatedMetrics || !currentCycle) return false;
    if (todayEval?.phase === 'period') return true;
    const diffNext = diffInDays(today, calculatedMetrics.nextPeriodDate);
    if (diffNext >= -3 && diffNext <= currentCycle.period_duration) {
      return true;
    }
    return false;
  }, [calculatedMetrics, currentCycle, today, todayEval]);

  const predictedPeriodDateStr = useMemo(() => {
    if (!calculatedMetrics) return '';
    if (todayEval?.phase === 'period') {
      return formatDateFull(calculatedMetrics.lastPeriodDate, i18n.language);
    }
    return formatDateFull(calculatedMetrics.nextPeriodDate, i18n.language);
  }, [calculatedMetrics, todayEval, i18n.language]);

  const handleCheckin = async (periodStarted: boolean) => {
    if (!token || !currentCycle) return;
    setIsCheckinSubmitting(true);
    try {
      const res = await cyclesApi.checkin(token, currentCycle.id, {
        checkin_date: todayISO,
        period_started: periodStarted,
      });
      setCheckins((prev) => {
        const filtered = prev.filter((c) => c.checkin_date !== todayISO);
        return [res.checkin, ...filtered];
      });
      showToast(
        periodStarted
          ? (isEn ? 'Period start confirmed for today!' : 'Status haid berhasil dikonfirmasi dimulai!')
          : (isEn ? 'Check-in recorded (period not started).' : 'Status check-in berhasil dicatat (belum haid).')
      );
    } catch (err: any) {
      showToast(err.message || (isEn ? 'Failed to record check-in.' : 'Gagal menyimpan check-in.'));
    } finally {
      setIsCheckinSubmitting(false);
    }
  };

  // Menstruation days evaluation for Symptom Questionnaire
  const isOnMenstruationDays = useMemo(() => {
    return todayEval?.phase === 'period' || Boolean(todayCheckin?.period_started);
  }, [todayEval, todayCheckin]);

  const menstruationDayNumber = useMemo(() => {
    if (todayEval?.phase === 'period') {
      return Math.min(Math.max(todayEval.cycleDay, 1), 5);
    }
    return 1;
  }, [todayEval]);

  const todaySymptomFilled = useMemo(() => {
    return symptoms.find((s) => s.day_number === menstruationDayNumber);
  }, [symptoms, menstruationDayNumber]);

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

  // Luna Dial calculations
  const circumference = 2 * Math.PI * 98; // ~615.75
  const progressRatio = useMemo(() => {
    if (!todayEval) return 0;
    return Math.min(Math.max(todayEval.cycleDay / todayEval.cycleDuration, 0), 1);
  }, [todayEval]);
  const strokeOffset = circumference - circumference * progressRatio;

  const handleCopySummary = () => {
    if (!calculatedMetrics || !currentCycle) return;

    let summary = isEn
      ? `🌸 Cycle Summary & Today's Status (Luna)\n`
      : `🌸 Ringkasan Siklus & Status Hari Ini (Luna)\n`;
    summary += `${t('dashboard.hpht')}: ${formatDateFull(calculatedMetrics.lastPeriodDate, i18n.language)}\n`;
    summary += `${t('dashboard.cycleLength')}: ${currentCycle.cycle_length} ${t('dashboard.days')} (${t('dashboard.periodDuration')}: ${currentCycle.period_duration} ${t('dashboard.days')})\n`;
    summary += `${t('dashboard.ovulation')}: ${formatDateFull(calculatedMetrics.ovulationDate, i18n.language)}\n`;
    summary += `${t('dashboard.fertileWindow')}: ${formatDateShort(calculatedMetrics.fertileStart, i18n.language)} — ${formatDateShort(calculatedMetrics.fertileEnd, i18n.language)}\n`;
    summary += `${t('dashboard.nextPeriod')}: ${formatDateFull(calculatedMetrics.nextPeriodDate, i18n.language)}\n`;
    if (todayEval) {
      summary += `${t('dashboard.todayStatus')}: ${t('dashboard.day')} ${todayEval.cycleDay} (${todayEval.phaseName}), ${todayEval.chanceName} (${todayEval.chancePct})\n`;
    }
    summary += isEn ? `\nTracked privately with Luna clinical calendar.` : `\nDipantau secara pribadi dengan standar klinis Luna.`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(summary)
        .then(() => showToast(isEn ? 'Cycle summary copied to clipboard!' : 'Ringkasan siklus berhasil disalin!'))
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
    showToast(isEn ? 'Cycle summary copied to clipboard!' : 'Ringkasan siklus berhasil disalin!');
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12 w-full overflow-x-hidden min-w-0">
      {/* Header Profile & Quick Action Bar */}
      <section aria-labelledby="dashboard-heading" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-rose-100 min-w-0 w-full">
        <div className="min-w-0 max-w-full">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true"></span>
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              {t('dashboard.title')}
            </span>
          </div>
          <h1 id="dashboard-heading" className="font-display text-2xl sm:text-3xl font-extrabold text-ink-primary mt-1 break-words">
            {t('dashboard.title')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1 break-words">
            {isEn ? 'Logged in as:' : 'Masuk sebagai:'} <strong className="text-rose-700 break-all">{user?.email || 'User'}</strong>
            {isDemoUser && (
              <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {t('nav.demo')}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Link
            to="/calculator"
            aria-label={t('dashboard.calculate')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span aria-hidden="true">✨</span>
            <span>{t('dashboard.calculate')}</span>
          </Link>
          <Link
            to="/cycles"
            aria-label={t('dashboard.manageHistory')}
            className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span aria-hidden="true">📋</span>
            <span>{t('nav.history')} ({savedCycles.length})</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            aria-label={t('nav.clinicalBasis')}
            className="px-3 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>📖 {t('nav.clinicalBasis')}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label={t('nav.logout')}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🚪 {t('nav.logout')}</span>
          </button>
        </div>
      </section>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse" aria-busy="true">
          <div className="h-32 bg-rose-100/50 rounded-3xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-24 bg-rose-100/50 rounded-2xl"></div>
            <div className="h-24 bg-rose-100/50 rounded-2xl"></div>
            <div className="h-24 bg-rose-100/50 rounded-2xl"></div>
          </div>
          <div className="h-80 bg-rose-100/40 rounded-3xl"></div>
        </div>
      ) : !currentCycle ? (
        /* Empty State */
        <section aria-labelledby="empty-heading" className="bg-white rounded-3xl p-8 sm:p-12 shadow-luna-card border border-rose-100 text-center max-w-2xl mx-auto my-6 animate-in fade-in">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner" aria-hidden="true">
            🌸
          </div>
          <h2 id="empty-heading" className="font-display font-extrabold text-2xl sm:text-3xl text-ink-primary mb-3">
            {t('dashboard.noData')}
          </h2>
          <p className="text-sm text-ink-secondary max-w-lg mx-auto leading-relaxed mb-8">
            {isEn
              ? 'Calculate your cycle using clinical methods to view hormonal phases, fertility windows, and 3-month forecast.'
              : 'Masukkan data haid terakhir Anda di kalkulator untuk melihat analisis fase biologis hari ini, kalender ovulasi 3 bulan, dan proyeksi siklus otomatis.'}
          </p>

          <Link
            to="/calculator"
            aria-label={t('dashboard.calculate')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-display font-bold text-base rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all cursor-pointer"
          >
            <span>✨ {t('dashboard.calculate')}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        /* Saved Data Status Overview */
        <section aria-label={t('dashboard.cycleSummary')} className="space-y-8 animate-in fade-in duration-300">
          {/* PERIOD CHECK-IN CARD */}
          {isTodayPredictedPeriod && (
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 rounded-3xl p-5 sm:p-7 text-white shadow-lg shadow-rose-200 border border-rose-300 relative overflow-hidden min-w-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 min-w-0">
                <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl sm:text-2xl shrink-0" aria-hidden="true">
                    🩸
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                        {t('dashboard.dailyCheckin')}
                      </span>
                      {todayCheckin && (
                        <span className="text-xs bg-emerald-500 text-white font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          ✓ {isEn ? 'Recorded' : 'Sudah Dicatat'}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display font-extrabold text-lg sm:text-xl mt-1.5 text-white">
                      {isEn ? 'Has Your Period Started?' : 'Apakah Haid Anda Sudah Dimulai?'}
                    </h2>
                    <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-xl leading-relaxed">
                      {isEn ? 'Estimated period date:' : 'Perkiraan tanggal haid Anda:'}{' '}
                      <strong className="text-white underline decoration-rose-300">
                        {predictedPeriodDateStr}
                      </strong>
                      . {t('dashboard.checkinDesc')}.
                    </p>
                    {todayCheckin && (
                      <p className="text-xs font-semibold text-rose-100 mt-2">
                        {isEn ? 'Current status:' : 'Status saat ini:'}{' '}
                        <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-white font-bold">
                          {todayCheckin.period_started
                            ? (isEn ? '🌸 Period Started' : '🌸 Sudah Mulai Haid')
                            : (isEn ? '⏳ Not Started' : '⏳ Belum Mulai Haid')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 self-start md:self-center shrink-0 flex-wrap">
                  <button
                    type="button"
                    disabled={isCheckinSubmitting}
                    onClick={() => handleCheckin(true)}
                    aria-label={isEn ? 'Yes, period started' : 'Ya, haid sudah mulai'}
                    className={`px-5 py-2.5 rounded-2xl font-display font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                      todayCheckin?.period_started
                        ? 'bg-white text-rose-700 ring-2 ring-white/80'
                        : 'bg-white text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    {isCheckinSubmitting ? (
                      <span>{t('auth.login.processing')}</span>
                    ) : (
                      <>
                        <span aria-hidden="true">✓</span>
                        <span>{isEn ? 'Yes, Started' : 'Ya, Sudah'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isCheckinSubmitting}
                    onClick={() => handleCheckin(false)}
                    aria-label={isEn ? 'No, not yet' : 'Belum mulai'}
                    className={`px-5 py-2.5 rounded-2xl font-display font-semibold text-xs border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                      todayCheckin && !todayCheckin.period_started
                        ? 'bg-white/30 border-white text-white font-bold ring-2 ring-white/60'
                        : 'bg-white/10 hover:bg-white/20 border-white/30 text-white'
                    }`}
                  >
                    {isCheckinSubmitting ? (
                      <span>{t('auth.login.processing')}</span>
                    ) : (
                      <>
                        <span aria-hidden="true">✕</span>
                        <span>{isEn ? 'Not Yet' : 'Belum'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* QUICK SUMMARY CARDS */}
          {calculatedMetrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label={t('dashboard.cycleSummary')}>
              {/* HPHT */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                  📅
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                    {t('dashboard.hpht')}
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-ink-primary truncate mt-0.5">
                    {formatDateShort(calculatedMetrics.lastPeriodDate, i18n.language)}
                  </p>
                  <p className="text-[10px] text-ink-muted">{isEn ? 'First day of period' : 'Hari pertama haid'}</p>
                </div>
              </div>

              {/* Cycle Length */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                  🔄
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-pink-800 uppercase tracking-wider block">
                    {t('dashboard.cycleLength')}
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-ink-primary truncate mt-0.5">
                    {currentCycle.cycle_length} {t('dashboard.days')}
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    {t('dashboard.periodDuration')}: {currentCycle.period_duration} {t('dashboard.days')}
                  </p>
                </div>
              </div>

              {/* Ovulation Peak */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                  🥚
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                    {t('dashboard.ovulation')}
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-amber-700 truncate mt-0.5">
                    {formatDateShort(calculatedMetrics.ovulationDate, i18n.language)}
                  </p>
                  <p className="text-[10px] text-ink-muted">{isEn ? 'Peak fertility day' : 'Puncak masa subur'}</p>
                </div>
              </div>

              {/* Next Period Date */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 shadow-sm flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                  ⏳
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                    {t('dashboard.nextPeriod')}
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-purple-700 truncate mt-0.5">
                    {formatDateShort(calculatedMetrics.nextPeriodDate, i18n.language)}
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    {(() => {
                      const daysToNext = diffInDays(calculatedMetrics.nextPeriodDate, today);
                      if (daysToNext > 0) return t('dashboard.daysRemaining', { count: daysToNext });
                      if (daysToNext === 0) return t('dashboard.periodToday');
                      return t('dashboard.late', { count: Math.abs(daysToNext) });
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PHASE PROGRESS COMPONENT */}
          <section aria-labelledby="phase-progress-heading" className="bg-white rounded-3xl p-6 sm:p-7 shadow-luna-card border border-rose-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🌸</span>
                <div>
                  <h2 id="phase-progress-heading" className="font-display font-bold text-base sm:text-lg text-ink-primary">
                    {t('dashboard.phaseProgress')}
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    {isEn ? 'Current hormonal status based on saved active cycle' : 'Status hormonal terkini berdasarkan siklus aktif tersimpan'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/calculator"
                  aria-label={t('dashboard.calculate')}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span aria-hidden="true">✨</span>
                  <span>{t('dashboard.calculate')}</span>
                </Link>
                <Link
                  to="/cycles"
                  aria-label={t('dashboard.manageHistory')}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('nav.history')}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <PhaseProgress cycle={currentCycle} />
          </section>

          {/* SYMPTOM QUESTIONNAIRE SECTION */}
          {isOnMenstruationDays && currentCycle && (
            <section aria-label={t('symptoms.title')} className="space-y-4">
              {todaySymptomFilled && !showQuestionnaireExpanded ? (
                <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-luna-card border border-rose-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl flex-shrink-0" aria-hidden="true">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-base text-ink-primary">
                            {t('symptoms.title')} ({t('dashboard.day')} {menstruationDayNumber})
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {t('symptoms.filled')}
                          </span>
                        </div>
                        <p className="text-xs text-ink-secondary mt-1">
                          {todaySymptomFilled.suggestion || t('symptoms.savedSuccess')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuestionnaireExpanded(true)}
                      aria-label={isEn ? 'Edit symptoms' : 'Ubah Jawaban Gejala'}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
                    >
                      <span aria-hidden="true">✏️</span>
                      <span>{isEn ? 'Edit Symptoms' : 'Ubah Jawaban Gejala'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {todaySymptomFilled && showQuestionnaireExpanded && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowQuestionnaireExpanded(false)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                      >
                        ✕ {isEn ? 'Hide Questionnaire' : 'Sembunyikan Kuesioner'}
                      </button>
                    </div>
                  )}
                  <SymptomQuestionnaire
                    cycleId={currentCycle.id}
                    defaultDayNumber={menstruationDayNumber}
                    checkinId={todayCheckin?.id}
                    existingSymptoms={symptoms}
                    onSaved={(savedSymptom) => {
                      setSymptoms((prev) => {
                        const filtered = prev.filter((s) => s.day_number !== savedSymptom.day_number);
                        return [...filtered, savedSymptom];
                      });
                      setShowQuestionnaireExpanded(false);
                      showToast(t('symptoms.savedSuccess'));
                    }}
                    token={token || ''}
                  />
                </div>
              )}
            </section>
          )}

          {/* TODAY'S STATUS CARD & CENTERPIECE LUNA DAILY DIAL */}
          {calculatedMetrics && todayEval && (
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
              <div className="relative w-56 h-56 sm:w-72 sm:h-72 mx-auto my-2 flex items-center justify-center max-w-full">
                <svg className="w-full h-full" viewBox="0 0 240 240" aria-hidden="true">
                  <circle cx="120" cy="120" r="98" fill="none" stroke="#fdecf0" strokeWidth="16" />
                  <circle
                    className="cycle-ring-circle"
                    cx="120"
                    cy="120"
                    r="98"
                    fill="none"
                    stroke="url(#lunaDashGradient)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                  />
                  <defs>
                    <linearGradient id="lunaDashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#db3264" />
                      <stop offset="50%" stopColor="#ef5582" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Inside ring details */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">
                    {t('dashboard.title')}
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

              {/* Countdown / Status Note */}
              <div className="max-w-md mx-auto mt-3 p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs sm:text-sm text-ink-secondary">
                {(() => {
                  const daysToNext = diffInDays(calculatedMetrics.nextPeriodDate, today);

                  if (daysToNext > 0) {
                    return (
                      <p className="leading-relaxed">
                        {isEn
                          ? `Today you are in ${todayEval.phaseName}. Approximately ${daysToNext} days remaining until next period.`
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

              {/* Fertile window & biological status cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-left">
                {/* Ovulation */}
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-200">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                    🥚 {t('dashboard.ovulation')}
                  </span>
                  <p className="text-base sm:text-lg font-extrabold text-rose-600 mt-1">
                    {formatDateShort(calculatedMetrics.ovulationDate, i18n.language)}
                  </p>
                  <p className="text-[11px] text-rose-800/80 mt-1 leading-relaxed">
                    {isEn ? 'Peak fertility window. Mature egg is released.' : 'Puncak kesuburan. Sel telur matang dilepaskan dan bertahan 12–24 jam.'}
                  </p>
                </div>

                {/* Fertile Window */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    🌟 {t('dashboard.fertileWindow')}
                  </span>
                  <p className="text-base sm:text-lg font-extrabold text-amber-700 mt-1">
                    {formatDateShort(calculatedMetrics.fertileStart, i18n.language)} — {formatDateShort(calculatedMetrics.fertileEnd, i18n.language)}
                  </p>
                  <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed">
                    {isEn ? 'Highest conception opportunity window.' : 'Peluang hamil tertinggi (5 hari sebelum ovulasi s/d 1 hari pasca-ovulasi).'}
                  </p>
                </div>

                {/* Safe Window */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    🛡️ {t('dashboard.safeWindow')}
                  </span>
                  <p className="text-base sm:text-lg font-extrabold text-emerald-700 mt-1">
                    {calculatedMetrics.safeBeforeEnd >= calculatedMetrics.safeBeforeStart ? (
                      <span>
                        {formatDateShort(calculatedMetrics.safeBeforeStart, i18n.language)}—{formatDateShort(calculatedMetrics.safeBeforeEnd, i18n.language)}
                      </span>
                    ) : (
                      <span>{formatDateShort(calculatedMetrics.safeAfterStart, i18n.language)}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-emerald-800/80 mt-1 leading-relaxed">
                    {isEn ? 'Lower conception likelihood outside fertile window.' : 'Peluang pembuahan relatif lebih rendah di luar jendela subur.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3-CYCLE PROJECTIONS */}
          {nextThreeCycles.length > 0 && (
            <section aria-labelledby="projections-heading" className="bg-gradient-to-r from-violet-50 via-purple-50 to-pink-50 rounded-3xl p-5 sm:p-7 border border-violet-200 shadow-sm overflow-hidden min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-violet-100 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl shrink-0" aria-hidden="true">📅</span>
                  <div className="min-w-0">
                    <h3 id="projections-heading" className="font-display font-bold text-lg text-ink-primary truncate">
                      {isEn ? '3-Cycle Projections' : 'Proyeksi 3 Siklus ke Depan'}
                    </h3>
                    <p className="text-xs text-ink-secondary truncate">
                      {isEn ? 'Estimated period, ovulation, and fertile windows' : 'Estimasi tanggal haid, ovulasi, dan jendela subur untuk 3 siklus mendatang'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-violet-100 text-violet-800 self-start sm:self-auto shrink-0">
                  {isEn ? 'Clinical Method' : 'Metode Klinis'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {nextThreeCycles.map((c) => (
                  <div
                    key={c.cycleNumber}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-violet-100 shadow-xs space-y-2.5 min-w-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
                        {isEn ? `Cycle ${c.cycleNumber}` : `Siklus ke-${c.cycleNumber}`}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-rose-50">
                        <span className="text-ink-muted">{t('dashboard.hpht')}:</span>
                        <strong className="text-rose-600 font-bold">
                          {formatDateShort(c.cycleStart, i18n.language)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-rose-50">
                        <span className="text-ink-muted">{t('dashboard.ovulation')}:</span>
                        <strong className="text-amber-700 font-bold">
                          {formatDateShort(c.ovulDate, i18n.language)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-ink-muted">{t('dashboard.fertileWindow')}:</span>
                        <strong className="text-ink-primary font-semibold">
                          {formatDateShort(c.fertileStart, i18n.language)} — {formatDateShort(c.fertileEnd, i18n.language)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CALENDAR 3-MONTH VIEW */}
          {calculatedMetrics && (
            <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-luna-card border border-rose-100 overflow-hidden min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">🗓️</span>
                    <h3 className="font-display font-bold text-xl text-ink-primary">
                      {t('dashboard.threeMonthsTitle')}
                    </h3>
                  </div>
                  <p className="text-xs text-ink-secondary mt-1">
                    {isEn ? 'Interactive 3-month calendar view. Click any date to view biological status.' : 'Tampilan visual kalender untuk 3 bulan berturut-turut. Ketuk tanggal manapun untuk melihat status biologis harian.'}
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

              {/* 3 Months Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                {threeMonthsData.map((m) => (
                  <div
                    key={`${m.year}-${m.month}`}
                    className="bg-rose-50/30 rounded-2xl p-3 sm:p-5 border border-rose-100 shadow-sm overflow-hidden min-w-0"
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
                        <div key={`pad-${i}`} className="h-9 sm:h-10 rounded-lg"></div>
                      ))}

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
          )}

          {/* SELECTED DAY CLINICAL DETAIL */}
          {selectedDayEval && (
            <div className="bg-gradient-to-br from-white to-rose-50/50 rounded-3xl p-5 sm:p-8 shadow-luna-card border border-rose-200 overflow-hidden min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-rose-100 min-w-0">
                <div className="min-w-0">
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
                <div className="bg-white/90 p-4 rounded-2xl border border-rose-100 shadow-sm min-w-0">
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

          {/* ACTION BUTTONS & MEDICAL DISCLAIMER */}
          <div className="text-center space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/calculator"
                aria-label={t('dashboard.calculate')}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-200 hover:from-rose-600 hover:to-pink-600 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true">✨</span>
                <span>{t('dashboard.calculate')}</span>
              </Link>
              <button
                type="button"
                onClick={handleCopySummary}
                aria-label={isEn ? 'Copy summary' : 'Salin ringkasan'}
                className="px-5 py-2.5 rounded-2xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true">📋</span>
                <span>{isEn ? 'Copy Summary' : 'Salin Ringkasan'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                aria-label={isEn ? 'Print report' : 'Cetak laporan'}
                className="px-5 py-2.5 rounded-2xl bg-white border border-rose-200 text-ink-primary hover:bg-rose-50 text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true">🖨️</span>
                <span>{isEn ? 'Print Report' : 'Cetak Laporan'}</span>
              </button>
              <Link
                to="/cycles"
                aria-label={t('dashboard.manageHistory')}
                className="px-5 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true">📋</span>
                <span>{t('dashboard.manageHistory')}</span>
              </Link>
            </div>

            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-left">
              <p className="text-xs text-ink-muted leading-relaxed">
                <strong className="text-ink-secondary">{isEn ? 'Medical Notice:' : 'Pemberitahuan Medis:'}</strong>{' '}
                {isEn
                  ? 'This dashboard provides statistical estimations based on clinical calendar methods (Ogino-Knaus and Wilcox Consensus). Actual cycles may vary based on individual health and hormonal factors.'
                  : 'Dashboard ini menyajikan estimasi statistik berdasarkan metode kalendar klinis Ogino-Knaus dan konsensus Wilcox. Jadwal menstruasi dan ovulasi aktual dapat bervariasi sesuai faktor biologis, hormonal, dan kondisi kesehatan Anda.'}
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

export default DashboardPage;
