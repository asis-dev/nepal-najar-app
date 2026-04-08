'use client';

/**
 * Lightweight PostHog snippet loader.
 * No npm dependency — pulls from CDN. Capture is done via window.posthog.
 * Disabled automatically if NEXT_PUBLIC_POSTHOG_KEY is missing.
 *
 * Usage:
 *   <PostHogProvider /> inside a layout once.
 *   trackServiceEvent('service_view', { slug }) anywhere client-side.
 */

import { useEffect } from 'react';

declare global {
  interface Window {
    posthog?: any;
  }
}

export default function PostHogProvider() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === 'undefined' || window.posthog) return;

    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
    // Minified loader from posthog docs (no npm dep).
    (function (t: any, e: any) {
      const n: any = (t.posthog = t.posthog || []);
      if (!n.__SV) {
        n._i = [];
        n.init = function (i: any, s: any, a: any) {
          const r: any = document.createElement('script');
          r.type = 'text/javascript';
          r.crossOrigin = 'anonymous';
          r.async = !0;
          r.src = (s?.api_host || host).replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
          const o: any = document.getElementsByTagName('script')[0];
          o.parentNode.insertBefore(r, o);
          const c: any = function (i: any) {
            return function () {
              n.push([i].concat(Array.prototype.slice.call(arguments, 0)));
            };
          };
          const u = 'init capture identify alias people.set people.set_once register unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset group'.split(' ');
          for (let l = 0; l < u.length; l++) n[u[l]] = c(u[l]);
          n.__SV = 1;
          n._i.push([i, s, a]);
        };
      }
    })(window, document);

    window.posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      autocapture: false, // we send events explicitly
      persistence: 'localStorage',
    });
  }, []);

  return null;
}

export function trackServiceEvent(event: string, props: Record<string, any> = {}) {
  if (typeof window === 'undefined' || !window.posthog) return;
  window.posthog.capture(event, props);
}
