import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWA_DISMISSED_KEY = 'luna_pwa_dismissed_at';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isRecentlyDismissed(): boolean {
  try {
    const dismissedAt = localStorage.getItem(PWA_DISMISSED_KEY);
    if (!dismissedAt) return false;
    const timestamp = parseInt(dismissedAt, 10);
    if (isNaN(timestamp)) return false;
    return Date.now() - timestamp < SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

export const PwaToast: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if dismissed in the last 7 days
    if (isRecentlyDismissed()) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Auto-dismiss after 30 seconds if not interacted
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 30000);

    return () => clearTimeout(timer);
  }, [isVisible]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
    } catch {
      // Ignore localStorage errors
    }
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      if (typeof deferredPrompt.prompt === 'function') {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          setIsVisible(false);
          setDeferredPrompt(null);
          return;
        }
      }
    } catch (err) {
      console.error('Error triggering PWA install prompt:', err);
    }

    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Notifikasi Instal Aplikasi"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white/95 backdrop-blur-md border border-rose-200/90 shadow-xl shadow-rose-900/10 rounded-2xl p-4 sm:p-4.5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-rose-300">
            <span className="font-bold text-lg font-display">L</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-900 leading-snug">
              📱 Instal Luna sebagai aplikasi
            </h2>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              Pasang untuk akses cepat siklus subur & menstruasi langsung dari layar beranda Anda.
            </p>
            <div className="flex items-center gap-2.5 mt-3">
              <button
                type="button"
                onClick={handleInstall}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-sm shadow-rose-300/50 hover:shadow transition-all cursor-pointer active:scale-95"
              >
                Pasang
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/70 transition-colors cursor-pointer"
              >
                Nanti Saja
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup notifikasi"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};
