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
    // Always fetch daily-brief fresh from network
    {
      matcher: /\/api\/daily-brief/,
      handler: new NetworkFirst({ networkTimeoutSeconds: 10 }),
    },
    // Services directory pages — offline-first reference data.
    // StaleWhileRevalidate so users see cached content instantly and
    // get a background refresh while online.
    {
      matcher: ({ url, request }) =>
        request.destination === 'document' && url.pathname.startsWith('/services'),
      handler: new StaleWhileRevalidate({
        cacheName: 'services-pages',
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
      }),
    },
    // Service OG images
    {
      matcher: /\/api\/og\/service/,
      handler: new CacheFirst({
        cacheName: 'services-og',
        plugins: [
          new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }),
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
