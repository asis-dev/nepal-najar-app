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

export type SharePlatform = 'x' | 'whatsapp' | 'facebook' | 'instagram' | 'copy' | 'native';

/** OG image params for native share (Instagram, etc.) */
export interface ShareImageParams {
  ogTitle?: string;
  ogSubtitle?: string;
  ogSection?: string;
  ogProgress?: number;
  ogStatus?: string;
  /** Pipe-separated context facts for the story image, e.g. "5 sources found|Day 9 of tracking" */
  ogFacts?: string;
  /** Locale for image rendering — 'en' or 'ne' */
  ogLocale?: string;
  /** Context type for data-fetching OG routes — renders rich images with real data */
  ogType?: 'commitment' | 'corruption' | 'minister' | 'scorecard' | 'report-card' | 'daily' | 'generic';
  /** Slug/ID for data-fetching routes */
  ogSlug?: string;
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
    u.searchParams.set('utm_campaign', 'community_share');
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
  dayInTerm?: number;
}): string {
  // Early phase — no grade, show day count
  if (!opts.grade && opts.dayInTerm != null) {
    if (opts.locale === 'ne') return `दिन ${opts.dayInTerm} — सरकारी प्रतिबद्धता ट्र्याक हुँदैछ`;
    return `Day ${opts.dayInTerm} — tracking government commitments`;
  }
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

export function complaintShareText(opts: {
  locale?: string;
  title?: string;
  status?: string;
  issueType?: string;
  municipality?: string | null;
  aiAuthority?: string | null;
  assignedDepartment?: string | null;
  ministryName?: string | null;
  ministerName?: string | null;
}): string {
  const isNe = opts.locale === 'ne';
  const title = opts.title ? shorten(opts.title, 56) : null;
  const status = opts.status ? shorten(opts.status, 22) : null;
  const issue = opts.issueType ? shorten(opts.issueType.replace(/_/g, ' '), 20) : null;
  const place = opts.municipality ? shorten(opts.municipality, 26) : null;
  const aiAuthority = opts.aiAuthority ? shorten(opts.aiAuthority, 34) : null;
  const assigned = opts.assignedDepartment
    ? shorten(opts.assignedDepartment.replace(/_/g, ' '), 30)
    : null;
  const ministry = opts.ministryName ? shorten(opts.ministryName, 34) : null;
  const minister = opts.ministerName ? shorten(opts.ministerName, 30) : null;

  if (isNe) {
    const parts = [
      title ? `📢 ${title}` : '📢 नागरिक समस्या ट्र्याक',
      status ? `स्थिति: ${status}` : null,
      issue ? `विषय: ${issue}` : null,
      place ? `स्थान: ${place}` : null,
      aiAuthority ? `AI रुटिङ: ${aiAuthority}` : null,
      assigned ? `जिम्मा: ${assigned}` : null,
      ministry ? `मन्त्रालय: ${ministry}` : null,
      minister ? `मन्त्री: ${minister}` : null,
    ].filter(Boolean);
    return shorten(parts.join(' · '), 200);
  }

  const parts = [
    title ? `📢 ${title}` : '📢 Civic issue tracker',
    status ? `Status: ${status}` : null,
    issue ? `Issue: ${issue}` : null,
    place ? `Location: ${place}` : null,
    aiAuthority ? `AI routed to: ${aiAuthority}` : null,
    assigned ? `Assigned to: ${assigned}` : null,
    ministry ? `Ministry: ${ministry}` : null,
    minister ? `Minister: ${minister}` : null,
  ].filter(Boolean);

  return shorten(parts.join(' · '), 200);
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

/** Build URL for Instagram story/reel format (1080x1920 portrait) */
export function storyImageUrl(opts: {
  title?: string;
  subtitle?: string;
  progress?: number;
  status?: string;
  section?: string;
  format?: 'story' | 'post';
  facts?: string;
  locale?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.title) params.set('title', opts.title);
  if (opts.subtitle) params.set('subtitle', opts.subtitle);
  if (opts.progress != null) params.set('progress', String(opts.progress));
  if (opts.status) params.set('status', opts.status);
  if (opts.section) params.set('section', opts.section);
  if (opts.format) params.set('format', opts.format);
  if (opts.facts) params.set('facts', opts.facts);
  if (opts.locale) params.set('locale', opts.locale);
  return `/api/og/story?${params.toString()}`;
}

function normalizeSection(section?: string): string | undefined {
  if (!section) return undefined;
  const key = section.trim().toLowerCase();

  if (key === 'daily') return 'stories';
  if (key === 'what-changed') return 'stories';
  if (key === 'evidence') return 'articles';

  return section;
}

/**
 * Build the best image URL for the given share context.
 * Prefers data-fetching routes (rich images) when ogType + ogSlug are provided.
 * Falls back to generic story route with query params.
 */
function resolveShareImageUrl(ogParams: ShareImageParams): string {
  const locale = ogParams.ogLocale || 'en';
  const normalizedSection = normalizeSection(ogParams.ogSection);

  // Data-fetching routes — fetch real data server-side, render rich images
  if (ogParams.ogType && ogParams.ogSlug) {
    switch (ogParams.ogType) {
      case 'commitment':
        return `/api/og/commitment?id=${encodeURIComponent(ogParams.ogSlug)}&lang=${locale}&format=story`;
      case 'report-card':
        return `/api/og/report-card?format=story&locale=${locale}`;
      case 'corruption':
        return `/api/og/corruption?${ogParams.ogSlug ? `slug=${encodeURIComponent(ogParams.ogSlug)}&` : ''}lang=${locale}&format=story`;
      case 'minister':
        return `/api/og/minister?slug=${encodeURIComponent(ogParams.ogSlug)}&lang=${locale}&format=story`;
      // Not yet on dedicated data routes — render via rich generic story route.
      case 'scorecard':
      case 'daily':
        break;
    }
  }

  // Report card without slug still gets the rich route
  if (ogParams.ogType === 'report-card') {
    return `/api/og/report-card?format=story&locale=${locale}`;
  }

  // Corruption dashboard (no slug) still gets the rich route
  if (ogParams.ogType === 'corruption') {
    return `/api/og/corruption?lang=${locale}&format=story`;
  }

  // Fallback to generic story route
  return storyImageUrl({
    title: ogParams.ogTitle,
    subtitle: ogParams.ogSubtitle,
    progress: ogParams.ogProgress,
    status: ogParams.ogStatus,
    section: normalizedSection,
    facts: ogParams.ogFacts,
    locale,
  });
}

/**
 * Fetch a share image. Uses context-specific data-fetching routes when available,
 * or falls back to the generic story format (1080x1920) for Instagram.
 */
export async function fetchShareImage(ogParams?: ShareImageParams): Promise<File | null> {
  if (!ogParams) return null;
  try {
    const imgUrl = resolveShareImageUrl(ogParams);
    const origin = detectOrigin();
    const fullUrl = imgUrl.startsWith('/') ? `${origin}${imgUrl}` : imgUrl;
    const res = await fetch(fullUrl, { signal: AbortSignal.timeout(12000) });
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
  // Use clean URL — UTM params create a "new" URL Facebook hasn't scraped → no OG image
  const clean = cleanUrl(pageUrl);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(clean)}`;
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

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // --- X: open intent URL ---
  if (platform === 'x') {
    const intentUrl = xIntentUrl(payload.text, fullUrl);
    if (isMobile) {
      // On mobile, window.open creates a blank tab that stays behind when
      // the X app opens. Use location.href so the current tab navigates
      // and the user just taps "back" to return.
      window.location.href = intentUrl;
    } else {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    }
    return 'opened';
  }

  // --- WhatsApp: open intent URL ---
  if (platform === 'whatsapp') {
    const intentUrl = whatsappIntentUrl(payload.text, fullUrl);
    if (isMobile) {
      window.location.href = intentUrl;
    } else {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    }
    return 'opened';
  }

  // --- Facebook: share clean URL so OG image shows up ---
  // Facebook caches OG data per exact URL. Using UTM params creates a "new"
  // URL that Facebook hasn't scraped yet → no image preview.
  // Solution: share the clean canonical URL (no UTM) so Facebook's existing
  // scrape cache kicks in. Also copy marketing text to clipboard since
  // sharer.php doesn't support pre-filling text.
  if (platform === 'facebook') {
    const clean = cleanUrl(fullUrl);
    const shareMessage = `${shorten(payload.text, 280)}\n\n${clean}`;

    // Copy the marketing message + link to clipboard
    try {
      await navigator.clipboard.writeText(shareMessage);
    } catch {
      // Clipboard failed — still open Facebook
    }

    // Use clean URL (no UTM) — Facebook must recognise the exact URL it scraped
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(clean)}`;
    if (isMobile) {
      window.location.href = fbUrl;
    } else {
      window.open(fbUrl, 'facebook-share', 'width=600,height=500,noopener,noreferrer');
    }
    return 'copied';
  }

  // --- Copy: clean URL only (for easy pasting on Instagram, etc.) ---
  if (platform === 'copy') {
    const clean = cleanUrl(fullUrl);
    try {
      await navigator.clipboard.writeText(clean);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  // --- Instagram: share OG image via native share (mobile) or download (desktop) ---
  if (platform === 'instagram') {
    const imageFile = await fetchShareImage(payload.ogParams);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Mobile: use navigator.share with image file — opens share sheet with Instagram Stories
    if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const shareData: ShareData = {
          title: payload.title,
          text: payload.text,
        };

        // Try sharing with the image file first (for Instagram Stories)
        if (imageFile) {
          try {
            await navigator.share({ ...shareData, files: [imageFile] });
            return 'shared';
          } catch {
            // If file sharing fails, fall through to share without file
          }
        }

        // Share without file — still shows Instagram in the share sheet
        await navigator.share({ ...shareData, url: fullUrl });
        return 'shared';
      } catch {
        return 'failed';
      }
    }

    // Desktop: download the OG image so user can upload to Instagram manually
    if (imageFile) {
      try {
        const blobUrl = URL.createObjectURL(imageFile);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'nepal-republic-share.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return 'shared';
      } catch {
        return 'failed';
      }
    }

    // Last resort: open OG image in new tab
    window.open(`${detectOrigin()}/api/og?title=${encodeURIComponent(payload.title)}`, '_blank');
    return 'opened';
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
