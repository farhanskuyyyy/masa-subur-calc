import React from 'react';
import { useTranslation } from 'react-i18next';
import type { UserCycle, UserCyclePhase } from '../lib/api';

interface PhaseProgressProps {
  cycle: UserCycle;
  todayDateStr?: string;
  compact?: boolean;
}

export const PhaseProgress: React.FC<PhaseProgressProps> = ({
  cycle,
  todayDateStr,
  compact = false,
}) => {
  const { t } = useTranslation();

  // Parse base cycle dates
  const todayStr = todayDateStr || (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const [sy, sm, sd] = cycle.cycle_start_date.split('-').map(Number);
  const cycleStart = new Date(sy, sm - 1, sd, 12, 0, 0);

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(ty, tm - 1, td, 12, 0, 0);

  const totalDiffDays = Math.round((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
  const cycleDay = totalDiffDays + 1;
  const daysRemaining = cycle.cycle_length - totalDiffDays;

  // Active phase lookup
  const activePhase: UserCyclePhase | undefined = cycle.phases.find(
    (p) => todayStr >= p.phase_start && todayStr <= p.phase_end
  );

  const isLate = totalDiffDays >= cycle.cycle_length;
  const daysLate = Math.max(0, totalDiffDays - cycle.cycle_length);
  const isBeforeStart = totalDiffDays < 0;

  // Calculate durations for progress segments
  const menstrualPhase = cycle.phases.find((p) => p.phase_type === 'menstrual');
  const follicularPhase = cycle.phases.find((p) => p.phase_type === 'follicular');
  const ovulatoryPhase = cycle.phases.find((p) => p.phase_type === 'ovulatory');
  const lutealPhase = cycle.phases.find((p) => p.phase_type === 'luteal');

  const menstrualDur = cycle.period_duration;
  const ovulDayOffset = cycle.cycle_length - cycle.luteal_phase_length;
  const follicularDur = Math.max(1, ovulDayOffset - menstrualDur);
  const ovulatoryDur = 1;
  const lutealDur = cycle.luteal_phase_length;
  const totalLength = cycle.cycle_length;

  const pctMenstrual = (menstrualDur / totalLength) * 100;
  const pctFollicular = (follicularDur / totalLength) * 100;
  const pctOvulatory = (ovulatoryDur / totalLength) * 100;
  const pctLuteal = (lutealDur / totalLength) * 100;

  // Pin pointer position
  const currentPct = Math.min(100, Math.max(0, (totalDiffDays / totalLength) * 100));

  // Format short date helper (DD/MM)
  const formatShortDate = (isoStr: string) => {
    if (!isoStr) return '';
    const [, m, d] = isoStr.split('-');
    return `${d}/${m}`;
  };

  const getPhaseBadge = (phaseType?: string) => {
    switch (phaseType) {
      case 'menstrual':
        return {
          label: t('phases.menstrual'),
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: '🩸',
        };
      case 'follicular':
        return {
          label: t('phases.follicular'),
          color: 'bg-pink-100 text-pink-800 border-pink-200',
          icon: '🌱',
        };
      case 'ovulatory':
        return {
          label: t('phases.ovulatory'),
          color: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
          icon: '🥚',
        };
      case 'luteal':
        return {
          label: t('phases.luteal'),
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: '🌙',
        };
      default:
        if (isLate) {
          return {
            label: t('phases.late', { count: daysLate }),
            color: 'bg-amber-100 text-amber-900 border-amber-300',
            icon: '⏱️',
          };
        }
        if (isBeforeStart) {
          return {
            label: t('phases.notStarted'),
            color: 'bg-gray-100 text-gray-700 border-gray-200',
            icon: '🗓️',
          };
        }
        return {
          label: t('phases.inCycle'),
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: '🌸',
        };
    }
  };

  const badge = getPhaseBadge(activePhase?.phase_type);

  return (
    <div className={`w-full rounded-2xl bg-white border border-rose-100 shadow-sm overflow-hidden ${compact ? 'p-3.5' : 'p-5 sm:p-6'}`}>
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-rose-50">
        <div className="flex items-center gap-2.5">
          <span className="text-xl sm:text-2xl" aria-hidden="true">{badge.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${badge.color}`}>
                {badge.label}
              </span>
              <span className="text-xs font-bold text-ink-primary">
                {t('dashboard.day')} {Math.max(1, Math.min(cycleDay, totalLength))}
              </span>
              <span className="text-xs text-ink-muted hidden sm:inline">
                {t('dashboard.of')} {cycle.cycle_length} {t('dashboard.days')}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted mt-0.5">
              {t('dashboard.hpht')}: <strong>{cycle.cycle_start_date}</strong>
              {cycle.ovulation_date && (
                <> • {t('dashboard.ovulation')}: <strong className="text-amber-700">{cycle.ovulation_date}</strong></>
              )}
            </p>
          </div>
        </div>

        <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
          <span className="text-[11px] text-ink-muted">{t('dashboard.todayStatus')}:</span>
          {isLate ? (
            <span className="text-xs font-bold text-rose-700">
              {t('dashboard.late', { count: daysLate })}
            </span>
          ) : daysRemaining <= 0 ? (
            <span className="text-xs font-bold text-rose-600">
              {t('dashboard.periodToday')}
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-700">
              {t('dashboard.daysRemaining', { count: daysRemaining })}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar with 4 Phase Segments */}
      <div className="relative pt-6 pb-2">
        {/* Today Indicator Pin */}
        {!isBeforeStart && totalDiffDays <= totalLength + 5 && (
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-10 pointer-events-none transition-all duration-300"
            style={{ left: `${Math.min(94, Math.max(6, currentPct))}%` }}
          >
            <span className="px-2 py-0.5 rounded-md bg-ink-primary text-white text-[10px] font-bold shadow-md whitespace-nowrap">
              {t('dashboard.day')} {cycleDay}
            </span>
            <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-ink-primary" aria-hidden="true"></div>
          </div>
        )}

        {/* 4 Colored Segments */}
        <div className="h-4 sm:h-5 w-full rounded-full overflow-hidden flex bg-rose-50 p-0.5 border border-rose-100 shadow-inner">
          {/* 1. Menstrual */}
          <div
            style={{ width: `${pctMenstrual}%` }}
            className="h-full bg-rose-400 hover:bg-rose-500 rounded-l-full relative group transition-colors cursor-pointer"
            title={`${t('phases.menstrual')}: ${menstrualPhase?.phase_start} s/d ${menstrualPhase?.phase_end}`}
          >
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white uppercase tracking-wider overflow-hidden">
              {menstrualDur >= 4 && <span className="truncate px-1">{t('phases.period')}</span>}
            </div>
          </div>

          {/* 2. Follicular */}
          <div
            style={{ width: `${pctFollicular}%` }}
            className="h-full bg-pink-200 hover:bg-pink-300 relative group transition-colors cursor-pointer"
            title={`${t('phases.follicular')}: ${follicularPhase?.phase_start} s/d ${follicularPhase?.phase_end}`}
          >
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-rose-900 overflow-hidden">
              {follicularDur >= 5 && <span className="truncate px-1">{t('phases.follicular')}</span>}
            </div>
          </div>

          {/* 3. Ovulatory */}
          <div
            style={{ width: `${pctOvulatory}%` }}
            className="h-full bg-amber-400 hover:bg-amber-500 ring-2 ring-amber-300 ring-offset-0 relative group transition-colors cursor-pointer z-0 flex items-center justify-center"
            title={`${t('phases.ovulatory')}: ${ovulatoryPhase?.phase_start}`}
          >
            <span className="text-[10px] text-white font-bold leading-none" aria-hidden="true">★</span>
          </div>

          {/* 4. Luteal */}
          <div
            style={{ width: `${pctLuteal}%` }}
            className="h-full bg-purple-200 hover:bg-purple-300 rounded-r-full relative group transition-colors cursor-pointer"
            title={`${t('phases.luteal')}: ${lutealPhase?.phase_start} s/d ${lutealPhase?.phase_end}`}
          >
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-purple-900 overflow-hidden">
              {lutealDur >= 6 && <span className="truncate px-1">{t('phases.luteal')}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Phase Dates */}
      {!compact && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-[11px] text-ink-secondary border-t border-rose-50 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 flex-shrink-0" aria-hidden="true"></span>
            <div className="truncate">
              <span className="font-semibold text-ink-primary block truncate">
                {t('phases.period')} ({menstrualDur}h)
              </span>
              <span className="text-ink-muted text-[10px]">
                {formatShortDate(menstrualPhase?.phase_start || '')}–{formatShortDate(menstrualPhase?.phase_end || '')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-300 flex-shrink-0" aria-hidden="true"></span>
            <div className="truncate">
              <span className="font-semibold text-ink-primary block truncate">
                {t('phases.follicular')} ({follicularDur}h)
              </span>
              <span className="text-ink-muted text-[10px]">
                {formatShortDate(follicularPhase?.phase_start || '')}–{formatShortDate(follicularPhase?.phase_end || '')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" aria-hidden="true"></span>
            <div className="truncate">
              <span className="font-semibold text-amber-900 block truncate">
                {t('phases.ovulation')} ({t('dashboard.day')} {ovulDayOffset})
              </span>
              <span className="text-ink-muted text-[10px]">
                {formatShortDate(ovulatoryPhase?.phase_start || '')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-300 flex-shrink-0" aria-hidden="true"></span>
            <div className="truncate">
              <span className="font-semibold text-ink-primary block truncate">
                {t('phases.luteal')} ({lutealDur}h)
              </span>
              <span className="text-ink-muted text-[10px]">
                {formatShortDate(lutealPhase?.phase_start || '')}–{formatShortDate(lutealPhase?.phase_end || '')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhaseProgress;
