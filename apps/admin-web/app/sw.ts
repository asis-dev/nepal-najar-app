import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkFirst, StaleWhileRevalidate, CacheFirst, ExpirationPlugin } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // All page navigations — always try network first so users see the
    // latest deploy.  Falls back to cache only when offline.
    {
      matcher: ({ request }) => request.destination === 'document',
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        ],
      }),
    },
    // API routes — network first, cache as offline fallback
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 }),
        ],
      }),
    },
    // Service OG images — cache first (they change rarely)
    {
      matcher: /\/api\/og\/service/,
      handler: new CacheFirst({
        cacheName: 'services-og',
        plugins: [
          new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Web Push handlers
self.addEventListener('push', (event: any) => {
  if (!event.data) return;
  let payload: any = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Nepal Republic', body: event.data.text() };
  }
  const title = payload.title || 'Nepal Republic';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/' },
  };
  event.waitUntil((self as any).registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window' }).then((clients: any[]) => {
      for (const c of clients) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      return (self as any).clients.openWindow(url);
    })
  );
});
