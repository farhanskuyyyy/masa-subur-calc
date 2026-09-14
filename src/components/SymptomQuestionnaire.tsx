import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cyclesApi, type UserSymptom } from '../lib/api';

export interface SymptomQuestionnaireProps {
  cycleId: string;
  defaultDayNumber?: number; // 1 to 5
  checkinId?: string;
  existingSymptoms?: UserSymptom[];
  onSaved?: (symptom: UserSymptom) => void;
  token: string;
}

export const SymptomQuestionnaire: React.FC<SymptomQuestionnaireProps> = ({
  cycleId,
  defaultDayNumber = 1,
  checkinId,
  existingSymptoms = [],
  onSaved,
  token,
}) => {
  const { t } = useTranslation();

  // Clamped day number between 1 and 5
  const initialDay = Math.min(Math.max(defaultDayNumber, 1), 5);
  const [selectedDay, setSelectedDay] = useState<number>(initialDay);

  // Day 1-3 state
  const [cramps, setCramps] = useState<'ringan' | 'sedang' | 'berat'>('ringan');
  const [mood, setMood] = useState<'baik' | 'netral' | 'buruk'>('netral');
  const [discharge, setDischarge] = useState<'ada' | 'tidak'>('tidak');

  // Day 4-5 state
  const [heavyBleeding, setHeavyBleeding] = useState<'ya' | 'tidak'>('tidak');
  const [stillPain, setStillPain] = useState<'ya' | 'tidak'>('tidak');
  const [energy, setEnergy] = useState<'rendah' | 'sedang' | 'tinggi'>('sedang');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Find if current day has existing saved symptom
  const currentSaved = useMemo(() => {
    return existingSymptoms.find((s) => s.day_number === selectedDay);
  }, [existingSymptoms, selectedDay]);

  // Load answers when changing day or when existingSymptoms update
  useEffect(() => {
    if (currentSaved && currentSaved.symptoms) {
      const s = currentSaved.symptoms;
      if (selectedDay <= 3) {
        if (s.cramps) setCramps(s.cramps);
        if (s.mood) setMood(s.mood);
        if (s.discharge) setDischarge(s.discharge);
      } else {
        if (s.bleeding) setHeavyBleeding(s.bleeding);
        if (s.pain) setStillPain(s.pain);
        if (s.energy) setEnergy(s.energy);
      }
    } else {
      // Default resets
      if (selectedDay <= 3) {
        setCramps('ringan');
        setMood('netral');
        setDischarge('tidak');
      } else {
        setHeavyBleeding('tidak');
        setStillPain('tidak');
        setEnergy('sedang');
      }
    }
    setSavedSuccess(false);
    setErrorMessage(null);
  }, [selectedDay, currentSaved]);

  // Dynamic suggestion computation
  const suggestion = useMemo(() => {
    if (selectedDay <= 3) {
      if (cramps === 'berat') {
        return t('suggestions.rest');
      }
      if (mood === 'buruk') {
        return t('suggestions.exercise');
      }
      return t('suggestions.stable');
    } else {
      if (heavyBleeding === 'ya' && stillPain === 'ya') {
        return t('suggestions.consultDoctor');
      }
      if (energy === 'rendah') {
        return t('suggestions.nutrition');
      }
      return t('suggestions.recovery');
    }
  }, [selectedDay, cramps, mood, heavyBleeding, stillPain, energy, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !cycleId) return;

    setIsSaving(true);
    setErrorMessage(null);

    const symptomData =
      selectedDay <= 3
        ? { cramps, mood, discharge }
        : { bleeding: heavyBleeding, pain: stillPain, energy };

    try {
      const res = await cyclesApi.saveSymptoms(token, cycleId, {
        day_number: selectedDay,
        symptoms: symptomData,
        suggestion,
        checkin_id: checkinId,
      });

      setSavedSuccess(true);
      if (onSaved) {
        onSaved(res.symptom);
      }
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving daily symptoms.');
    } finally {
      setIsSaving(false);
    }
  };

  const isDay1to3 = selectedDay <= 3;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-luna-card border border-rose-100 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-rose-100">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden="true">📝</span>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-ink-primary">
              {t('symptoms.title')}
            </h3>
            <p className="text-xs text-ink-secondary">
              {t('symptoms.subtitle')}
            </p>
          </div>
        </div>

        {/* Day Selector Pills (Hari 1 - 5) */}
        <div className="flex items-center gap-1.5 bg-rose-50/70 p-1.5 rounded-2xl border border-rose-100 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((d) => {
            const hasFilled = existingSymptoms.some((s) => s.day_number === d);
            const isSelected = selectedDay === d;
            return (
              <button
                key={`day-pill-${d}`}
                type="button"
                onClick={() => setSelectedDay(d)}
                aria-label={`Day ${d}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1 ${
                  isSelected
                    ? 'bg-petal-600 text-white shadow-sm scale-105'
                    : 'text-petal-800 hover:bg-rose-100/70'
                }`}
              >
                <span>H{d}</span>
                {hasFilled && (
                  <span className={`text-[9px] ${isSelected ? 'text-white' : 'text-emerald-600 font-bold'}`}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Badge */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800">
          {isDay1to3 ? t('symptoms.day1to3') : t('symptoms.day4to5')}
        </span>
        {currentSaved && (
          <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
            {t('symptoms.filled')}
          </span>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" aria-label={t('symptoms.title')}>
        {isDay1to3 ? (
          /* DAY 1 - 3 QUESTIONS */
          <>
            {/* 1. Sakit perut / menyengat */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                1. {t('symptoms.cramps')}
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { key: 'ringan', label: t('symptoms.mild'), icon: '🌱' },
                  { key: 'sedang', label: t('symptoms.moderate'), icon: '⚡' },
                  { key: 'berat', label: t('symptoms.severe'), icon: '🔥' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCramps(item.key as any)}
                    aria-pressed={cramps === item.key}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      cramps === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span className="text-base" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Mood hari ini */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                2. {t('symptoms.mood')}
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { key: 'baik', label: t('symptoms.good'), icon: '😊' },
                  { key: 'netral', label: t('symptoms.neutral'), icon: '😐' },
                  { key: 'buruk', label: t('symptoms.bad'), icon: '😔' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMood(item.key as any)}
                    aria-pressed={mood === item.key}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      mood === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span className="text-base" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Keputihan */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                3. {t('symptoms.discharge')}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { key: 'ada', label: t('symptoms.hasDischarge'), icon: '💧' },
                  { key: 'tidak', label: t('symptoms.noDischarge'), icon: '✨' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDischarge(item.key as any)}
                    aria-pressed={discharge === item.key}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      discharge === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* DAY 4 - 5 QUESTIONS */
          <>
            {/* 1. Pendarahan masih banyak */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                1. {t('symptoms.bleeding')}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { key: 'ya', label: t('symptoms.heavyYes'), icon: '🩸' },
                  { key: 'tidak', label: t('symptoms.heavyNo'), icon: '💧' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setHeavyBleeding(item.key as any)}
                    aria-pressed={heavyBleeding === item.key}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      heavyBleeding === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Masih sakit */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                2. {t('symptoms.pain')}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { key: 'ya', label: t('symptoms.painYes'), icon: '😣' },
                  { key: 'tidak', label: t('symptoms.painNo'), icon: '😌' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStillPain(item.key as any)}
                    aria-pressed={stillPain === item.key}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      stillPain === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Energi */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                3. {t('symptoms.energy')}
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { key: 'rendah', label: t('symptoms.energyLow'), icon: '🪫' },
                  { key: 'sedang', label: t('symptoms.energyModerate'), icon: '⚡' },
                  { key: 'tinggi', label: t('symptoms.energyHigh'), icon: '🌟' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setEnergy(item.key as any)}
                    aria-pressed={energy === item.key}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      energy === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span className="text-base" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Suggestion Card Based on Current Answers */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-lg" aria-hidden="true">💡</span>
            <div>
              <span className="font-bold text-rose-900 block mb-0.5">
                {t('symptoms.title')} (H{selectedDay}):
              </span>
              <p className="text-rose-800 leading-relaxed font-medium">
                {suggestion}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        {savedSuccess && (
          <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span aria-hidden="true">✅</span> {t('symptoms.savedSuccess')}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            aria-label={t('symptoms.saveButton')}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-petal-600 to-rose-500 hover:from-petal-700 hover:to-rose-600 text-white text-xs font-bold shadow-md shadow-petal-200 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>{t('symptoms.saving')}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">💾</span>
                <span>{t('symptoms.saveButton')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SymptomQuestionnaire;
