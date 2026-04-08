'use client';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const STORAGE_KEY = 'nr-pwa-dismissed-at';
const COOLDOWN_MS = 14 * 86400_000; // 14 days

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = Number(localStorage.getItem(STORAGE_KEY) || '0');
    if (Date.now() - dismissed < COOLDOWN_MS) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 8000); // wait 8s so we don't blast on landing
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Nepal Republic"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-[60] rounded-2xl bg-zinc-900 border border-red-500/40 shadow-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-2xl">🇳🇵</div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-zinc-100 text-sm">Install Nepal Republic</div>
          <div className="text-xs text-zinc-400 mt-0.5">
            Works offline · nepalrepublic.org मा द्रुत पहुँच
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
