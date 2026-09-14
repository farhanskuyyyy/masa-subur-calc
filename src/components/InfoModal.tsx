import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

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
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-petal-100 transform transition-all max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-petal-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-petal-100 text-petal-700 flex items-center justify-center text-sm font-bold" aria-hidden="true">
              🩺
            </div>
            <h2 id="info-modal-title" className="font-display font-bold text-lg text-ink-primary">
              {t('infoModal.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('infoModal.close')}
            className="w-8 h-8 rounded-full bg-petal-50 text-petal-800 hover:bg-petal-100 flex items-center justify-center text-base font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-ink-secondary leading-relaxed">
          <div>
            <h3 className="font-bold text-ink-primary mb-1">
              {t('infoModal.section1Title')}
            </h3>
            <p>
              {t('infoModal.section1Desc')}
            </p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1 text-ink-secondary">
              <li>{t('infoModal.spermLifespan')}</li>
              <li>{t('infoModal.eggLifespan')}</li>
              <li>{t('infoModal.fertileWindow')}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-ink-primary mb-1">{t('infoModal.section2Title')}</h3>
            <p>
              {t('infoModal.section2Desc')}
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink-primary mb-1">{t('infoModal.section3Title')}</h3>
            <p>
              {t('infoModal.section3Desc')}
            </p>
          </div>

          <div className="p-3 bg-petal-50 rounded-xl border border-petal-100">
            <h3 className="font-bold text-petal-800 mb-1 flex items-center gap-1.5">
              <span aria-hidden="true">🔒</span> {t('infoModal.privacyTitle')}
            </h3>
            <p className="text-xs text-petal-900">
              {t('infoModal.privacyDesc')}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-petal-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('infoModal.understand')}
            className="px-5 py-2.5 rounded-xl bg-petal-600 hover:bg-petal-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-petal-300/40"
          >
            {t('infoModal.understand')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
