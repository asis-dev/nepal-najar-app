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
