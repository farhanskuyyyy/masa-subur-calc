import React, { useState, useEffect, useMemo } from 'react';
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
        return 'Minum air hangat, istirahat cukup, hindari makanan pedas';
      }
      if (mood === 'buruk') {
        return 'Olahraga ringan seperti yoga atau jalan kaki bisa membantu';
      }
      return 'Kondisi tubuh Anda cukup stabil. Pastikan tetap terhidrasi dan cukup istirahat.';
    } else {
      if (heavyBleeding === 'ya' && stillPain === 'ya') {
        return 'Konsultasi dokter jika berlangsung lebih dari 7 hari';
      }
      if (energy === 'rendah') {
        return 'Konsumsi asupan bergizi kaya zat besi dan luangkan waktu relaksasi.';
      }
      return 'Fase pemulihan berjalan baik. Tetap rawat kebersihan area kewanitaan secara teratur.';
    }
  }, [selectedDay, cramps, mood, heavyBleeding, stillPain, energy]);

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
      setErrorMessage(err.message || 'Gagal menyimpan gejala harian.');
    } finally {
      setIsSaving(false);
    }
  };

  const isDay1to3 = selectedDay <= 3;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-luna-card border border-rose-100 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-rose-100">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">📝</span>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-ink-primary">
              Kuesioner Gejala Menstruasi
            </h3>
            <p className="text-xs text-ink-secondary">
              Pantau gejala dan dapatkan saran perawatan tubuh personal setiap hari
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
          {isDay1to3 ? 'Hari 1 - 3: Fase Kram & Mood' : 'Hari 4 - 5: Fase Pemulihan (Recovery)'}
        </span>
        {currentSaved && (
          <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Sudah diisi sebelumnya
          </span>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {isDay1to3 ? (
          /* DAY 1 - 3 QUESTIONS */
          <>
            {/* 1. Sakit perut / menyengat */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                1. Sakit perut / kram menyengat?
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { key: 'ringan', label: 'Ringan', icon: '🌱' },
                  { key: 'sedang', label: 'Sedang', icon: '⚡' },
                  { key: 'berat', label: 'Berat', icon: '🔥' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCramps(item.key as any)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      cramps === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Mood hari ini */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                2. Suasana hati (mood) hari ini?
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { key: 'baik', label: 'Baik', icon: '😊' },
                  { key: 'netral', label: 'Netral', icon: '😐' },
                  { key: 'buruk', label: 'Buruk / Sensitif', icon: '😔' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMood(item.key as any)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      mood === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Keputihan */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                3. Keputihan di luar darah haid?
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { key: 'ada', label: 'Ada Keputihan', icon: '💧' },
                  { key: 'tidak', label: 'Tidak Ada', icon: '✨' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDischarge(item.key as any)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      discharge === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span>{item.icon}</span>
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
                1. Apakah pendarahan masih keluar banyak?
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { key: 'ya', label: 'Ya, Masih Banyak', icon: '🩸' },
                  { key: 'tidak', label: 'Tidak, Sudah Mereda', icon: '💧' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setHeavyBleeding(item.key as any)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      heavyBleeding === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Masih sakit */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                2. Masih merasakan nyeri atau sakit perut?
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  { key: 'ya', label: 'Masih Terasa Nyeri', icon: '😣' },
                  { key: 'tidak', label: 'Sudah Nyaman', icon: '😌' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStillPain(item.key as any)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      stillPain === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Energi */}
            <div>
              <label className="block text-xs font-bold text-ink-primary mb-2">
                3. Tingkat energi fisik hari ini?
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { key: 'rendah', label: 'Rendah', icon: '🪫' },
                  { key: 'sedang', label: 'Sedang', icon: '⚡' },
                  { key: 'tinggi', label: 'Tinggi', icon: '🌟' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setEnergy(item.key as any)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      energy === item.key
                        ? 'border-rose-400 bg-rose-50/80 text-rose-800 shadow-xs ring-2 ring-rose-200'
                        : 'border-rose-100 bg-white hover:bg-rose-50/40 text-ink-primary'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
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
            <span className="text-lg">💡</span>
            <div>
              <span className="font-bold text-rose-900 block mb-0.5">
                Saran Kesehatan Personal Hari ke-{selectedDay}:
              </span>
              <p className="text-rose-800 leading-relaxed font-medium">
                {suggestion}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span>✅</span> Gejala hari ke-{selectedDay} berhasil disimpan ke catatan siklus Anda!
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-petal-600 to-rose-500 hover:from-petal-700 hover:to-rose-600 text-white text-xs font-bold shadow-md shadow-petal-200 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>{currentSaved ? 'Perbarui Gejala Hari Ini' : 'Simpan Gejala Hari Ini'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
