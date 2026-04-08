'use client';
import { useEffect, useState } from 'react';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushOptIn() {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID) return;
    setSupported(true);
    setStatus(Notification.permission as any);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as any);
      if (perm !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID),
        });
      }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;
  if (status === 'granted') {
    return (
      <div className="text-xs text-emerald-400">🔔 Notifications on — you&apos;ll get urgent alerts.</div>
    );
  }
  return (
    <button
      onClick={enable}
      disabled={busy}
      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
    >
      🔔 {busy ? 'Enabling…' : 'Get urgent alerts'}
    </button>
  );
}
