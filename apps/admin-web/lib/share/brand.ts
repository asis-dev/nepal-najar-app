export const OG_IMAGE_VERSION = '2026-04-10-share-refresh';

export const SHARE_BRAND_TITLE_EN = 'AI-powered citizen platform for Nepal';
export const SHARE_BRAND_TITLE_NE = 'नेपालका लागि एआई-संचालित नागरिक प्लेटफर्म';

export const SHARE_BRAND_SUBTITLE_EN =
  'Get services done, track issues, and follow accountability in one place.';
export const SHARE_BRAND_SUBTITLE_NE =
  'एउटै ठाउँबाट सेवा लिनुहोस्, समस्या ट्र्याक गर्नुहोस्, र जवाफदेहिता पछ्याउनुहोस्।';

export function withOgVersion(url: string): string {
  try {
    const base = url.startsWith('http')
      ? url
      : `https://www.nepalrepublic.org${url.startsWith('/') ? '' : '/'}${url}`;
    const parsed = new URL(base);
    parsed.searchParams.set('v', OG_IMAGE_VERSION);
    const result = `${parsed.pathname}${parsed.search}`;
    return url.startsWith('http') ? parsed.toString() : result;
  } catch {
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}v=${encodeURIComponent(OG_IMAGE_VERSION)}`;
  }
}
