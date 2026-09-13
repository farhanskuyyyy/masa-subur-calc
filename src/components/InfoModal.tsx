import React, { useEffect } from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-primary/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-petal-100 transform transition-all max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-petal-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-petal-100 text-petal-700 flex items-center justify-center text-sm font-bold">
              🩺
            </div>
            <h3 className="font-display font-bold text-lg text-ink-primary">
              Metodologi Klinis & Privasi
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela info"
            className="w-8 h-8 rounded-full bg-petal-50 text-petal-800 hover:bg-petal-100 flex items-center justify-center text-base font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-ink-secondary leading-relaxed">
          <div>
            <h4 className="font-bold text-ink-primary mb-1">
              1. Dasar Perhitungan Kalendar Klinis
            </h4>
            <p>
              Algoritma menggunakan kombinasi metode <strong>Ogino-Knaus</strong> dan konsensus penelitian fertilitas{' '}
              <strong>Wilcox et al. (The New England Journal of Medicine)</strong>:
            </p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1 text-ink-secondary">
              <li>
                <strong>Daya hidup sperma:</strong> Hingga 5 hari di dalam lendir serviks yang subur.
              </li>
              <li>
                <strong>Daya hidup sel telur:</strong> Hanya 12 hingga 24 jam setelah dikeluarkan dari folikel.
              </li>
              <li>
                <strong>Jendela subur:</strong> 5 hari menjelang ovulasi ditambah hari ovulasi itu sendiri (total 6 hari biologis).
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-ink-primary mb-1">2. Fleksibilitas Fase Luteal</h4>
            <p>
              Sebagian besar kalkulator standar mematok fase luteal secara kaku pada 14 hari. Luna menyediakan opsi penyesuaian fase luteal (10 - 18 hari) untuk pengguna yang mengetahui durasi fase lutealnya berdasarkan pencatatan suhu basal tubuh.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-ink-primary mb-1">3. Siklus Bervariasi (Ogino-Knaus)</h4>
            <p>
              Jika siklus Anda bervariasi antara terpendek dan terpanjang, hari subur paling awal dihitung dari (siklus terpendek - 18 hari) dan hari subur paling akhir dihitung dari (siklus terpanjang - 11 hari).
            </p>
          </div>

          <div className="p-3 bg-petal-50 rounded-xl border border-petal-100">
            <h4 className="font-bold text-petal-800 mb-1 flex items-center gap-1.5">
              <span>🔒</span> Jaminan Privasi Penuh
            </h4>
            <p className="text-xs text-petal-900">
              Perhitungan siklus menstruasi dan masa subur Anda diproses secara lokal pada browser perangkat Anda.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-petal-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-petal-600 hover:bg-petal-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-petal-300/40"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
