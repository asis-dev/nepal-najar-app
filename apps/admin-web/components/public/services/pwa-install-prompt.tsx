'use client';

import { useEffect, useState } from 'react';

/**
 * PWA install prompt — shows after user completes their first form.
 * Uses the beforeinstallprompt event to trigger native install dialog.
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check if already dismissed
    if (localStorage.getItem('nr_pwa_dismissed')) return;

    // Check if user has completed at least one form
    const hasCompleted = localStorage.getItem('nr_form_completed');
    if (!hasCompleted) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function dismiss() {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('nr_pwa_dismissed', '1');
  }

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom">
      <div className="rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white">Install Nepal Republic</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Add to home screen for instant access to forms, bills, and status checks — works offline too.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={install}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors"
              >
                Install App
              </button>
              <button
                onClick={dismiss}
                className="rounded-xl bg-zinc-800 px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Call this after user completes their first form to trigger install prompt.
 */
export function markFormCompleted() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nr_form_completed', '1');
  }
}
