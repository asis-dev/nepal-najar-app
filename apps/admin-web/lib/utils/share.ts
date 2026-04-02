/**
 * Unified share text generation for Nepal Republic.
 * Every share should include: brand context + specific insight + URL.
 */

const BRAND = 'Nepal Republic';
const SITE = 'nepalrepublic.org';
const DEFAULT_SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org').replace(/\/+$/, '');

type SharePlatform = 'x' | 'facebook' | 'whatsapp' | 'copy' | 'native';

/** Generate share text for a commitment/promise */
export function commitmentShareText(opts: {
  title: string;
  progress: number;
  status: string;
  locale?: string;
}): string {
  const { title, progress, status, locale } = opts;
  const short = title.length > 60 ? title.slice(0, 57) + '...' : title;

  if (locale === 'ne') {
    if (status === 'stalled') return `⚠️ "${short}" — ${progress}% मा रोकिएको। ${BRAND} मा हेर्नुहोस्`;
    if (status === 'delivered') return `✅ "${short}" — पूरा भयो! ${BRAND} मा प्रमाणित`;
    return `📊 "${short}" — ${progress}% प्रगति। ${BRAND} मा हेर्नुहोस्`;
  }

  if (status === 'stalled') return `⚠️ "${short}" is stuck at ${progress}%. Verified by AI on ${BRAND}`;
  if (status === 'delivered') return `✅ "${short}" — delivered. Verified on ${BRAND}`;
  if (progress >= 70) return `📊 "${short}" is ${progress}% done. See the evidence on ${BRAND}`;
  return `📊 "${short}" — ${progress}% progress. See the evidence on ${BRAND}`;
}

/** Generate share text for the overall scorecard/home */
export function scorecardShareText(opts: {
  grade?: string;
  score?: number;
  dayInTerm?: number;
  locale?: string;
}): string {
  const { grade, score, dayInTerm, locale } = opts;

  if (locale === 'ne') {
    return grade
      ? `नेपाल सरकारको ग्रेड: ${grade} (${score}/100)। AI-प्रमाण सहित ट्र्याक गरिएको। ${SITE}`
      : `दिन ${dayInTerm}: सरकारी प्रतिबद्धता र प्रगति ट्र्याक हुँदैछ। ${SITE}`;
  }

  return grade
    ? `Nepal's government scored ${grade} (${score}/100) — tracked with AI-backed evidence. ${SITE}`
    : `Day ${dayInTerm}: Government commitments are being tracked with evidence. ${SITE}`;
}

/** Generate share text for report card */
export function reportCardShareText(opts: { locale?: string }): string {
  if (opts.locale === 'ne') {
    return `नेपाल सरकारको साप्ताहिक रिपोर्ट कार्ड — AI द्वारा स्कोर गरिएको। ${SITE}`;
  }
  return `Nepal's weekly government report card — scored by AI. ${SITE}`;
}

/** Generate share text for daily brief */
export function dailyBriefShareText(opts: { date: string; locale?: string }): string {
  if (opts.locale === 'ne') {
    return `आजको नेपाल ब्रिफ (${opts.date}) — AI-सहायता र सार्वजनिक प्रमाणमा आधारित। ${SITE}`;
  }
  return `Today's Nepal brief (${opts.date}) — AI-assisted and evidence-grounded. ${SITE}`;
}

/** Generate share text for corruption case */
export function corruptionShareText(opts: { title: string; locale?: string }): string {
  const short = opts.title.length > 50 ? opts.title.slice(0, 47) + '...' : opts.title;
  if (opts.locale === 'ne') {
    return `🔍 "${short}" — ${BRAND} मा भ्रष्टाचार अनुसन्धान हेर्नुहोस्`;
  }
  return `🔍 "${short}" — Follow the money on ${BRAND}`;
}

/** Generate share text for civic complaint */
export function complaintShareText(opts: { locale?: string }): string {
  if (opts.locale === 'ne') {
    return `नागरिक समस्या रिपोर्ट गर्नुहोस् — ${BRAND} मा। ${SITE}`;
  }
  return `Report civic issues — AI monitors resolution. ${BRAND}. ${SITE}`;
}

/** Generate OG image URL with params */
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

function detectWindowOrigin() {
  if (typeof window === 'undefined') return DEFAULT_SITE_URL;
  return window.location.origin;
}

export function normalizeShareUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_SITE_URL;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = detectWindowOrigin();
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${withSlash}`;
}

export function withShareUtm(url: string, platform: SharePlatform): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', platform);
    }
    if (!parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', 'social');
    }
    if (!parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', 'community_share');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function composeShareMessage(opts: {
  title: string;
  text?: string;
  comment?: string;
}): string {
  const { title, text, comment } = opts;
  const parts = [comment, text, title]
    .map((item) => (item ? collapseWhitespace(item) : ''))
    .filter(Boolean);

  return truncate(parts.join('\n\n'), 420);
}

export function shareIntentUrl(platform: Exclude<SharePlatform, 'copy' | 'native'>, opts: {
  title: string;
  text?: string;
  comment?: string;
  url: string;
}): string {
  const normalizedUrl = normalizeShareUrl(opts.url);
  const trackedUrl = withShareUtm(normalizedUrl, platform);
  const message = composeShareMessage(opts);

  if (platform === 'x') {
    const xText = truncate(message, 240);
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(trackedUrl)}`;
  }

  if (platform === 'facebook') {
    const quote = truncate(message, 240);
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackedUrl)}&quote=${encodeURIComponent(quote)}`;
  }

  return `https://wa.me/?text=${encodeURIComponent(`${message}\n${trackedUrl}`)}`;
}

/**
 * Fetch the OG image for a page and return it as a shareable File.
 * The image is dynamically generated with the page's actual title, stats, etc.
 * Falls back to null if anything fails (CORS, timeout, etc.).
 */
async function fetchShareImage(opts: {
  title?: string;
  subtitle?: string;
  section?: string;
  progress?: number;
  status?: string;
}): Promise<File | null> {
  try {
    const imgUrl = ogImageUrl(opts);
    const origin = typeof window !== 'undefined' ? window.location.origin : DEFAULT_SITE_URL;
    const fullUrl = imgUrl.startsWith('/') ? `${origin}${imgUrl}` : imgUrl;

    const res = await fetch(fullUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const blob = await res.blob();
    return new File([blob], 'nepal-republic-share.png', { type: blob.type || 'image/png' });
  } catch {
    return null;
  }
}

/** OG image params that make the share image show page-specific content */
export interface ShareImageParams {
  ogTitle?: string;
  ogSubtitle?: string;
  ogSection?: string;
  ogProgress?: number;
  ogStatus?: string;
}

/** Universal share helper — handles native share + clipboard fallback */
export async function shareOrCopy(opts: {
  title: string;
  text?: string;
  comment?: string;
  url: string;
} & ShareImageParams): Promise<'shared' | 'copied' | 'failed'> {
  const normalizedUrl = normalizeShareUrl(opts.url);
  const trackedNativeUrl = withShareUtm(normalizedUrl, 'native');
  const trackedCopyUrl = withShareUtm(normalizedUrl, 'copy');
  const message = composeShareMessage(opts);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      // Generate a page-specific image so Instagram, Snapchat, etc. show rich content
      let files: File[] | undefined;
      const imageFile = await fetchShareImage({
        title: opts.ogTitle || opts.title,
        subtitle: opts.ogSubtitle || opts.text,
        section: opts.ogSection,
        progress: opts.ogProgress,
        status: opts.ogStatus,
      });

      if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
        files = [imageFile];
      }

      await navigator.share({
        title: opts.title,
        text: message,
        url: trackedNativeUrl,
        ...(files ? { files } : {}),
      });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(`${message}\n${trackedCopyUrl}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
