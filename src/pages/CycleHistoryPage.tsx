import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cyclesApi, type UserCycle } from '../lib/api';
import { CycleCard } from '../components/CycleCard';
import { PhaseProgress } from '../components/PhaseProgress';

export const CycleHistoryPage: React.FC = () => {
  const { token, isDemoUser } = useAuth();

  const [cycles, setCycles] = useState<UserCycle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [editingCycle, setEditingCycle] = useState<UserCycle | null>(null);
  const [editHpht, setEditHpht] = useState<string>('');
  const [editCycleLength, setEditCycleLength] = useState<number>(28);
  const [editPeriodDuration, setEditPeriodDuration] = useState<number>(6);
  const [editLutealPhase, setEditLutealPhase] = useState<number>(14);

  const [resettingCycle, setResettingCycle] = useState<UserCycle | null>(null);
  const [resetHpht, setResetHpht] = useState<string>('');
  const [resetCycleLength, setResetCycleLength] = useState<number>(28);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const fetchCycles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await cyclesApi.getAll(token);
      setCycles(res.cycles || []);
    } catch (err: any) {
      console.error('Error fetching cycles:', err);
      setErrorMessage(err.message || 'Gagal memuat riwayat siklus.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // Identify active / latest cycle
  const currentCycle = useMemo(() => {
    if (cycles.length === 0) return null;
    return cycles[0];
  }, [cycles]);

  // Handle Edit
  const openEditModal = (cycle: UserCycle) => {
    setEditingCycle(cycle);
    setEditHpht(cycle.cycle_start_date);
    setEditCycleLength(cycle.cycle_length);
    setEditPeriodDuration(cycle.period_duration);
    setEditLutealPhase(cycle.luteal_phase_length);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingCycle) return;
    setIsSubmitting(true);
    try {
      await cyclesApi.update(token, editingCycle.id, {
        cycle_start_date: editHpht,
        cycle_length: editCycleLength,
        period_duration: editPeriodDuration,
        luteal_phase_length: editLutealPhase,
      });
      showToast('Siklus berhasil diperbarui!');
      setEditingCycle(null);
      await fetchCycles();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui siklus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset
  const openResetModal = (cycle: UserCycle) => {
    setResettingCycle(cycle);
    setResetHpht(cycle.cycle_start_date);
    setResetCycleLength(cycle.cycle_length);
  };

  const handleSaveReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resettingCycle) return;
    setIsSubmitting(true);
    try {
      await cyclesApi.reset(token, resettingCycle.id, {
        cycle_start_date: resetHpht,
        cycle_length: resetCycleLength,
      });
      showToast('Siklus berhasil direset & fase dihitung ulang!');
      setResettingCycle(null);
      await fetchCycles();
    } catch (err: any) {
      showToast(err.message || 'Gagal mereset siklus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const confirmDelete = async () => {
    if (!token || !deletingId) return;
    setIsSubmitting(true);
    try {
      await cyclesApi.delete(token, deletingId);
      showToast('Siklus berhasil dihapus dari riwayat.');
      setDeletingId(null);
      await fetchCycles();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus siklus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-rose-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Riwayat & Manajemen Fase
            </span>
            {isDemoUser && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                Mode Demo
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-primary mt-1.5">
            Riwayat Siklus Menstruasi
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Simpan, sesuaikan, dan perbarui siklus personal Anda untuk prediksi fase hormon yang akurat.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/calculator"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
          >
            <span>✨ Hitung Siklus Baru</span>
          </Link>
        </div>
      </section>

      {/* Active Phase Card (if current cycle exists) */}
      {currentCycle && !loading && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-base sm:text-lg text-ink-primary flex items-center gap-2">
              <span>🌸</span>
              <span>Progres Fase Siklus Aktif</span>
            </h2>
            <span className="text-xs text-ink-muted">Berdasarkan data siklus terbaru Anda</span>
          </div>
          <PhaseProgress cycle={currentCycle} />
        </section>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-6 flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={fetchCycles}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-rose-50/50 animate-pulse border border-rose-100"></div>
          ))}
        </div>
      ) : cycles.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-rose-100 shadow-sm max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-500 flex items-center justify-center text-3xl mx-auto mb-4">
            📅
          </div>
          <h3 className="font-display font-bold text-xl text-ink-primary">
            Belum Ada Siklus Tersimpan
          </h3>
          <p className="text-xs sm:text-sm text-ink-secondary mt-2 leading-relaxed">
            Anda belum menyimpan data siklus haid. Masuk ke kalkulator untuk menghitung masa subur lalu klik{' '}
            <strong className="text-rose-700 font-semibold">'Simpan Siklus'</strong> untuk mencatat riwayat pertama Anda.
          </p>
          <div className="mt-6">
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow-md shadow-rose-200 hover:scale-105 transition-all"
            >
              <span>✨ Buka Kalkulator Sekarang</span>
            </Link>
          </div>
        </div>
      ) : (
        /* List of Saved Cycles */
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base sm:text-lg text-ink-primary flex items-center gap-2">
              <span>📋</span>
              <span>Daftar Siklus Tersimpan ({cycles.length})</span>
            </h2>
            <button
              type="button"
              onClick={fetchCycles}
              className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>🔄 Segarkan</span>
            </button>
          </div>

          <div className="space-y-5">
            {cycles.map((cycle, idx) => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                isCurrent={idx === 0}
                onEdit={openEditModal}
                onReset={openResetModal}
                onDelete={(id) => setDeletingId(id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* EDIT MODAL */}
      {editingCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-rose-100">
              <h3 className="font-display font-bold text-lg text-ink-primary flex items-center gap-2">
                <span>✏️</span> Edit Data Siklus
              </h3>
              <button
                type="button"
                onClick={() => setEditingCycle(null)}
                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">
                  Hari Pertama Haid Terakhir (HPHT)
                </label>
                <input
                  type="date"
                  required
                  value={editHpht}
                  onChange={(e) => setEditHpht(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/30 text-ink-primary text-sm font-semibold focus:border-rose-400 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1">
                    Panjang Siklus (hari)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={50}
                    required
                    value={editCycleLength}
                    onChange={(e) => setEditCycleLength(parseInt(e.target.value, 10) || 28)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/30 text-center font-bold text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1">
                    Lama Haid (hari)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    required
                    value={editPeriodDuration}
                    onChange={(e) => setEditPeriodDuration(parseInt(e.target.value, 10) || 6)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/30 text-center font-bold text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">
                  Fase Luteal Personal (hari)
                </label>
                <input
                  type="number"
                  min={10}
                  max={18}
                  required
                  value={editLutealPhase}
                  onChange={(e) => setEditLutealPhase(parseInt(e.target.value, 10) || 14)}
                  className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/30 text-center font-bold text-sm outline-none"
                />
                <span className="text-[10px] text-ink-muted block mt-1">Standar klinis 14 hari (rentang 10 - 18 hari).</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setEditingCycle(null)}
                  className="px-4 py-2 rounded-xl border border-rose-200 text-xs font-semibold text-ink-secondary hover:bg-rose-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-petal-600 hover:bg-petal-700 text-white text-xs font-bold shadow-md shadow-petal-200 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET MODAL */}
      {resettingCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-rose-100">
              <h3 className="font-display font-bold text-lg text-ink-primary flex items-center gap-2">
                <span>🔄</span> Reset Prediksi Siklus
              </h3>
              <button
                type="button"
                onClick={() => setResettingCycle(null)}
                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-ink-secondary mb-4 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-amber-900">
              Gunakan fitur ini jika menstruasi datang lebih awal atau terlambat dari prediksi kalendar. Sistem akan menghitung ulang seluruh fase ovulasi dan masa subur secara otomatis.
            </p>

            <form onSubmit={handleSaveReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">
                  HPHT Baru / Aktual
                </label>
                <input
                  type="date"
                  required
                  value={resetHpht}
                  onChange={(e) => setResetHpht(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/30 text-ink-primary text-sm font-semibold focus:border-rose-400 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1">
                  Penyesuaian Panjang Siklus (hari)
                </label>
                <input
                  type="number"
                  min={20}
                  max={50}
                  required
                  value={resetCycleLength}
                  onChange={(e) => setResetCycleLength(parseInt(e.target.value, 10) || 28)}
                  className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/30 text-center font-bold text-sm outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setResettingCycle(null)}
                  className="px-4 py-2 rounded-xl border border-rose-200 text-xs font-semibold text-ink-secondary hover:bg-rose-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-200 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Mereset...' : 'Hitung Ulang Siklus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl mx-auto mb-3">
              🗑️
            </div>
            <h4 className="font-display font-bold text-base text-ink-primary">
              Hapus Siklus Ini?
            </h4>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
              Data siklus beserta seluruh perhitungan fase di dalamnya akan dihapus secara permanen.
            </p>
            <div className="flex items-center justify-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-rose-200 text-xs font-semibold text-ink-secondary hover:bg-rose-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink-primary text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all flex items-center gap-2 animate-in fade-in">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
};

export default CycleHistoryPage;
