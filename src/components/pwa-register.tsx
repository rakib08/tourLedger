'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISSED_KEY = 'tourledger:pwa-install-dismissed:v1';
const INSTALLED_KEY = 'tourledger:pwa-installed:v1';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let installPrompt: BeforeInstallPromptEvent | undefined;

export function PwaRegister() {
  const [available, setAvailable] = useState(false);
  const [ios, setIos] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let isStandalone = false;
    try {
      isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const wasDismissed = localStorage.getItem(DISMISSED_KEY) === '1';
      const wasInstalled = localStorage.getItem(INSTALLED_KEY) === '1';
      setDismissed(wasDismissed || wasInstalled || isStandalone);
    } catch {
      setDismissed(isStandalone);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(error =>
        console.error('TourLedger service worker registration failed:', error),
      );
    }

    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIosDevice && !isStandalone);
    if (isIosDevice && !isStandalone) {
      try {
        if (localStorage.getItem(DISMISSED_KEY) !== '1' && localStorage.getItem(INSTALLED_KEY) !== '1') setShowBanner(true);
      } catch { setShowBanner(true); }
    }

    const handler = (event: Event) => {
      event.preventDefault();
      installPrompt = event as BeforeInstallPromptEvent;
      try {
        if (localStorage.getItem(DISMISSED_KEY) !== '1' &&
            localStorage.getItem(INSTALLED_KEY) !== '1' && !isStandalone) {
          setAvailable(true);
          setShowBanner(true);
        }
      } catch {
        if (!isStandalone) {
          setAvailable(true);
          setShowBanner(true);
        }
      }
    };

    const installed = () => {
      installPrompt = undefined;
      try {
        localStorage.setItem(INSTALLED_KEY, '1');
        localStorage.setItem(DISMISSED_KEY, '1');
      } catch {}
      setDismissed(true);
      setShowBanner(false);
      setAvailable(false);
      setIos(false);
      setShowHelp(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
    setDismissed(true);
    setShowBanner(false);
    setAvailable(false);
    setIos(false);
    setShowHelp(false);
  }

  async function install() {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }
    const promptEvent = installPrompt;
    installPrompt = undefined;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setAvailable(false);
      setShowBanner(false);
    } else {
      // Keep the banner visible until the user explicitly dismisses it.
      setAvailable(false);
      setShowBanner(true);
      setShowHelp(true);
    }
  }

  if (dismissed || !showBanner || (!available && !ios && !showHelp)) return null;

  return (
    <aside
      role="region"
      aria-label="Install TourLedger"
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:bottom-4"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#10243a] text-[#e5bb68]">
          <Download size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Install TourLedger</p>
          <p className="text-xs text-slate-500">Add the app to your home screen for quick access.</p>
        </div>
        {available ? (
          <button onClick={install} className="min-h-11 rounded-xl bg-[#10243a] px-3 py-2 text-xs font-bold text-white">
            Install
          </button>
        ) : (
          <button onClick={() => setShowHelp(value => !value)} className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-[#10243a]">
            How to
          </button>
        )}
        <button aria-label="Dismiss install prompt" onClick={dismiss} className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-400">
          <X size={17} />
        </button>
      </div>
      {showHelp && (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          {ios
            ? 'In Safari, tap Share, then choose “Add to Home Screen”.'
            : 'Open your browser menu and choose “Install app” or “Add to Home screen”.'}
        </p>
      )}
    </aside>
  );
}
