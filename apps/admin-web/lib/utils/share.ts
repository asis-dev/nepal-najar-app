/**
 * Unified sharing system for Nepal Republic.
 *
 * Every share flows through `shareToPlatform(platform, payload)`.
 * Platform-specific formatting ensures:
 *   - X: short text + URL (X auto-generates link card from OG tags)
 *   - WhatsApp: short text + clean URL (WhatsApp fetches OG preview)
 *   - Copy: short text + clean URL to clipboard
 *   - Native: text + URL + optional image file (for Instagram Stories etc.)
 */

const DEFAULT_SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org').replace(/\/+$/, '');

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

export type SharePlatform = 'x' | 'whatsapp' | 'facebook' | 'copy' | 'native';

/** OG image params for native share (Instagram, etc.) */
export interface ShareImageParams {
  ogTitle?: string;
  ogSubtitle?: string;
  ogSection?: string;
  ogProgress?: number;
  ogStatus?: string;
}

/** Everything needed to share a piece of content */
export interface SharePayload {
  /** Page URL to share (relative like /corruption/slug or absolute) */
  url: string;
  /** Short share text — 1-2 lines, no URL, no brand name */
  text: string;
  /** Page title for navigator.share title field */
  title: string;
  /** OG image params — only used for native share to attach image */
  ogParams?: ShareImageParams;
}

/* ═══════════════════════════════════════════
   URL HELPERS
   ═══════════════════════════════════════════ */

function detectOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return DEFAULT_SITE_URL;
}

/** Turn a relative path into a full URL */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_SITE_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = detectOrigin();
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/** Add UTM tracking params (only for platform intent URLs, never visible to user) */
function withUtm(url: string, platform: SharePlatform): string {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', platform);
    u.searchParams.set('utm_medium', 'social');
    u.searchParams.set('utm_campaign', 'share');
    return u.toString();
  } catch {
    return url;
  }
}

/** Strip UTM params for clean URLs (WhatsApp, clipboard) */
function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    return u.toString();
  } catch {
    return url;
  }
}

/* ═══════════════════════════════════════════
   SHARE TEXT GENERATORS
   Short, punchy, no brand name, no URL.
   The link card handles branding + visuals.
   ═══════════════════════════════════════════ */

function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function commitmentShareText(opts: {
  title: string;
  progress: number;
  status: string;
  locale?: string;
}): string {
  const { title, progress, status, locale } = opts;
  const short = shorten(title, 60);

  if (locale === 'ne') {
    if (status === 'stalled') return `⚠️ "${short}" — ${progress}% मा रोकिएको`;
    if (status === 'delivered') return `✅ "${short}" — पूरा भयो!`;
    return `📊 "${short}" — ${progress}% प्रगति`;
  }
  if (status === 'stalled') return `⚠️ "${short}" is stuck at ${progress}%`;
  if (status === 'delivered') return `✅ "${short}" — delivered`;
  return `📊 "${short}" — ${progress}% progress`;
}

export function corruptionShareText(opts: { title: string; locale?: string }): string {
  const short = shorten(opts.title, 55);
  if (opts.locale === 'ne') return `🔍 "${short}" — भ्रष्टाचार अनुसन्धान`;
  return `🔍 "${short}" — corruption case tracked`;
}

export function scorecardShareText(opts: {
  grade?: string;
  score?: number;
  locale?: string;
}): string {
  if (opts.locale === 'ne') {
    return opts.grade
      ? `नेपाल सरकारको ग्रेड: ${opts.grade} (${opts.score}/100)`
      : `सरकारी प्रतिबद्धता ट्र्याक हुँदैछ`;
  }
  return opts.grade
    ? `Nepal's government scored ${opts.grade} (${opts.score}/100)`
    : `Government commitments are being tracked`;
}

export function reportCardShareText(opts: { locale?: string }): string {
  if (opts.locale === 'ne') return `नेपाल सरकारको रिपोर्ट कार्ड — AI द्वारा स्कोर गरिएको`;
  return `Nepal's government report card — scored by AI`;
}

export function dailyBriefShareText(opts: { date: string; locale?: string }): string {
  if (opts.locale === 'ne') return `आजको नेपाल ब्रिफ (${opts.date})`;
  return `Today's Nepal brief (${opts.date})`;
}

export function complaintShareText(opts: { locale?: string }): string {
  if (opts.locale === 'ne') return `नागरिक समस्या रिपोर्ट गर्नुहोस्`;
  return `Report civic issues — AI monitors resolution`;
}

/* ═══════════════════════════════════════════
   OG IMAGE (for native share / Instagram)
   ═══════════════════════════════════════════ */

export function ogImageUrl(opts: {
  title?: string;
  subtitle?: string;
  progress?: number;
  status?: string;
  section?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.title) params.set('title', opts.title);
  if (opts.subtitle) params.set('subtitle', opts.subtitle);
  if (opts.progress != null) params.set('progress', String(opts.progress));
  if (opts.status) params.set('status', opts.status);
  if (opts.section) params.set('section', opts.section);
  return `/api/og?${params.toString()}`;
}

async function fetchShareImage(ogParams?: ShareImageParams): Promise<File | null> {
  if (!ogParams) return null;
  try {
    const imgUrl = ogImageUrl({
      title: ogParams.ogTitle,
      subtitle: ogParams.ogSubtitle,
      progress: ogParams.ogProgress,
      status: ogParams.ogStatus,
      section: ogParams.ogSection,
    });
    const origin = detectOrigin();
    const fullUrl = imgUrl.startsWith('/') ? `${origin}${imgUrl}` : imgUrl;
    const res = await fetch(fullUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], 'nepal-republic.png', { type: blob.type || 'image/png' });
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════
   PLATFORM INTENT URLS
   ═══════════════════════════════════════════ */

function xIntentUrl(text: string, pageUrl: string): string {
  // X: short text only. URL is separate param (auto-shortened to 23 chars by X).
  // X generates the link card from the URL's OG tags automatically.
  const shortText = shorten(text, 200);
  const trackedUrl = withUtm(pageUrl, 'x');
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}&url=${encodeURIComponent(trackedUrl)}`;
}

function whatsappIntentUrl(text: string, pageUrl: string): string {
  // WhatsApp: text + clean URL on a new line. WhatsApp fetches OG preview from the URL.
  const clean = cleanUrl(pageUrl);
  const message = `${shorten(text, 200)}\n\n${clean}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function facebookIntentUrl(pageUrl: string): string {
  const trackedUrl = withUtm(pageUrl, 'facebook');
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackedUrl)}`;
}

/* ═══════════════════════════════════════════
   MAIN SHARE ORCHESTRATOR
   This is the ONLY function UI components
   should call. Everything else is internal.
   ═══════════════════════════════════════════ */

export async function shareToPlatform(
  platform: SharePlatform,
  payload: SharePayload,
): Promise<'shared' | 'copied' | 'opened' | 'failed'> {
  const fullUrl = normalizeUrl(payload.url);

  // --- X: open intent URL in new window ---
  if (platform === 'x') {
    const intentUrl = xIntentUrl(payload.text, fullUrl);
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    return 'opened';
  }

  // --- WhatsApp: open intent URL ---
  if (platform === 'whatsapp') {
    const intentUrl = whatsappIntentUrl(payload.text, fullUrl);
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    return 'opened';
  }

  // --- Facebook: open sharer ---
  if (platform === 'facebook') {
    const intentUrl = facebookIntentUrl(fullUrl);
    window.open(intentUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    return 'opened';
  }

  // --- Copy: text + clean URL to clipboard ---
  if (platform === 'copy') {
    const clean = cleanUrl(fullUrl);
    const copyText = `${payload.text}\n${clean}`;
    try {
      await navigator.clipboard.writeText(copyText);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  // --- Native: navigator.share with optional image (for Instagram etc.) ---
  if (platform === 'native') {
    if (typeof navigator === 'undefined' || !navigator.share) return 'failed';

    try {
      const trackedUrl = withUtm(fullUrl, 'native');

      // Only fetch image for native share (Instagram Stories, Snapchat, etc.)
      let files: File[] | undefined;
      const imageFile = await fetchShareImage(payload.ogParams);
      if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
        files = [imageFile];
      }

      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: trackedUrl,
        ...(files ? { files } : {}),
      });
      return 'shared';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}

/* ═══════════════════════════════════════════
   LEGACY EXPORTS (for gradual migration)
   These wrap the new system so old code
   doesn't break during transition.
   ═══════════════════════════════════════════ */

/** @deprecated Use shareToPlatform() instead */
export async function shareOrCopy(opts: {
  title: string;
  text?: string;
  url: string;
} & ShareImageParams): Promise<'shared' | 'copied' | 'failed'> {
  const payload: SharePayload = {
    url: opts.url,
    text: opts.text || opts.title,
    title: opts.title,
    ogParams: opts.ogTitle ? {
      ogTitle: opts.ogTitle,
      ogSubtitle: opts.ogSubtitle,
      ogSection: opts.ogSection,
      ogProgress: opts.ogProgress,
      ogStatus: opts.ogStatus,
    } : undefined,
  };

  // Try native share first, then clipboard
  const nativeResult = await shareToPlatform('native', payload);
  if (nativeResult === 'shared') return 'shared';

  const copyResult = await shareToPlatform('copy', payload);
  if (copyResult === 'copied') return 'copied';

  return 'failed';
}

/** @deprecated Use normalizeUrl() instead */
export const normalizeShareUrl = normalizeUrl;

/** @deprecated Use shareToPlatform() instead */
export function shareIntentUrl(platform: Exclude<SharePlatform, 'copy' | 'native'>, opts: {
  title: string;
  text?: string;
  comment?: string;
  url: string;
}): string {
  const fullUrl = normalizeUrl(opts.url);
  const text = opts.comment
    ? `${opts.comment}\n\n${opts.text || opts.title}`
    : (opts.text || opts.title);

  if (platform === 'x') return xIntentUrl(text, fullUrl);
  if (platform === 'facebook') return facebookIntentUrl(fullUrl);
  return whatsappIntentUrl(text, fullUrl);
}

/** @deprecated */
export function composeShareMessage(opts: { title: string; text?: string; comment?: string }): string {
  const parts = [opts.comment, opts.text, opts.title].filter(Boolean);
  return shorten(parts.join('\n\n'), 300);
}

/** @deprecated */
export function withShareUtm(url: string, platform: SharePlatform): string {
  return withUtm(url, platform);
}
