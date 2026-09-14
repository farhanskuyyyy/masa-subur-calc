import React from 'react';
import { useTranslation } from 'react-i18next';
import type { UserCycle } from '../lib/api';
import { PhaseProgress } from './PhaseProgress';

interface CycleCardProps {
  cycle: UserCycle;
  isCurrent?: boolean;
  onEdit?: (cycle: UserCycle) => void;
  onReset?: (cycle: UserCycle) => void;
  onDelete?: (cycleId: string) => void;
}

export const CycleCard: React.FC<CycleCardProps> = ({
  cycle,
  isCurrent = false,
  onEdit,
  onReset,
  onDelete,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').startsWith('id') ? 'id-ID' : 'en-US';

  const formatDateLocalized = (isoDate: string) => {
    if (!isoDate) return '-';
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(currentLang, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const menstrualPhase = cycle.phases.find((p) => p.phase_type === 'menstrual');
  const follicularPhase = cycle.phases.find((p) => p.phase_type === 'follicular');
  const ovulatoryPhase = cycle.phases.find((p) => p.phase_type === 'ovulatory');
  const lutealPhase = cycle.phases.find((p) => p.phase_type === 'luteal');

  return (
    <div
      className={`rounded-3xl bg-white border transition-all duration-200 overflow-hidden ${
        isCurrent
          ? 'border-petal-300 shadow-md ring-2 ring-petal-200 ring-offset-2'
          : 'border-rose-100 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top Banner */}
      <div className="p-5 sm:p-6 pb-4 border-b border-rose-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/40 via-white to-pink-50/30">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {isCurrent && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-petal-600 text-white shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true"></span>
                {t('history.activeCycle')}
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {cycle.cycle_length} {t('dashboard.days')}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800">
              {t('phases.period')} {cycle.period_duration} {t('dashboard.days')}
            </span>
            <span className="text-xs text-ink-muted hidden md:inline">
              {t('calculator.lutealPhase')}: {cycle.luteal_phase_length} {t('dashboard.days')}
            </span>
          </div>
          <h3 className="font-display font-extrabold text-lg sm:text-xl text-ink-primary mt-1.5">
            {t('dashboard.hpht')}: {formatDateLocalized(cycle.cycle_start_date)}
          </h3>
          <p className="text-xs text-ink-secondary mt-0.5">
            {t('dashboard.ovulation')}: <strong className="text-amber-700">{formatDateLocalized(cycle.ovulation_date || '')}</strong>
            {cycle.fertile_window && (
              <>
                {' '}• {t('dashboard.fertileWindow')}:{' '}
                <strong className="text-rose-700">
                  {formatDateLocalized(cycle.fertile_window.start)} — {formatDateLocalized(cycle.fertile_window.end)}
                </strong>
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(cycle)}
              aria-label={t('history.edit')}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span aria-hidden="true">✏️</span>
              <span>{t('history.edit')}</span>
            </button>
          )}

          {onReset && (
            <button
              type="button"
              onClick={() => onReset(cycle)}
              aria-label={t('history.reset')}
              className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span aria-hidden="true">🔄</span>
              <span>{t('history.reset')}</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(cycle.id)}
              aria-label={t('history.delete')}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-rose-100 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress & Phases Breakdown */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Visual Progress Bar */}
        <PhaseProgress cycle={cycle} compact={true} />

        {/* 4 Phases Detailed Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Phase 1: Menstruasi */}
          <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 mb-1">
              <span aria-hidden="true">🩸</span>
              <span className="truncate">{t('phases.menstrual')}</span>
            </div>
            <p className="text-xs font-semibold text-ink-primary">
              {formatDateLocalized(menstrualPhase?.phase_start || '')}
            </p>
            <p className="text-[11px] text-ink-muted">
              - {formatDateLocalized(menstrualPhase?.phase_end || '')}
            </p>
          </div>

          {/* Phase 2: Folikular */}
          <div className="p-3 rounded-2xl bg-pink-50/50 border border-pink-100/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-800 mb-1">
              <span aria-hidden="true">🌱</span>
              <span className="truncate">{t('phases.follicular')}</span>
            </div>
            <p className="text-xs font-semibold text-ink-primary">
              {formatDateLocalized(follicularPhase?.phase_start || '')}
            </p>
            <p className="text-[11px] text-ink-muted">
              - {formatDateLocalized(follicularPhase?.phase_end || '')}
            </p>
          </div>

          {/* Phase 3: Ovulasi */}
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
              <span aria-hidden="true">🥚</span>
              <span className="truncate">{t('phases.ovulatory')}</span>
            </div>
            <p className="text-xs font-bold text-amber-800">
              {formatDateLocalized(ovulatoryPhase?.phase_start || '')}
            </p>
            <p className="text-[11px] text-amber-700/80">★ {t('dashboard.ovulation')}</p>
          </div>

          {/* Phase 4: Luteal */}
          <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 mb-1">
              <span aria-hidden="true">🌙</span>
              <span className="truncate">{t('phases.luteal')}</span>
            </div>
            <p className="text-xs font-semibold text-ink-primary">
              {formatDateLocalized(lutealPhase?.phase_start || '')}
            </p>
            <p className="text-[11px] text-ink-muted">
              - {formatDateLocalized(lutealPhase?.phase_end || '')}
            </p>
          </div>
        </div>

        {/* Next Period Forecast */}
        {cycle.next_cycle_start && (
          <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-petal-50 border border-petal-100 text-petal-900">
            <span>📅 {t('dashboard.nextPeriod')}:</span>
            <strong className="text-petal-700">{formatDateLocalized(cycle.next_cycle_start)}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

export default CycleCard;
