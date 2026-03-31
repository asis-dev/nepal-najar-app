/**
 * Unified share text generation for Nepal Republic.
 * Every share should include: brand context + specific insight + URL.
 */

const BRAND = 'Nepal Republic';
const SITE = 'nepalrepublic.org';

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
    return `📊 "${short}" — ${progress}% प्रगति। ${BRAND} मा ट्र्याक गर्नुहोस्`;
  }

  if (status === 'stalled') return `⚠️ "${short}" is stuck at ${progress}%. Verified on ${BRAND}`;
  if (status === 'delivered') return `✅ "${short}" — delivered. Verified on ${BRAND}`;
  if (progress >= 70) return `📊 "${short}" is ${progress}% done. Track it on ${BRAND}`;
  return `📊 "${short}" — ${progress}% progress. Track it on ${BRAND}`;
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
      ? `नेपाल सरकारको ग्रेड: ${grade} (${score}/100)। AI ले ८०+ स्रोत स्क्यान गरेर प्रमाणित। ${SITE}`
      : `दिन ${dayInTerm}: AI ले १०९ सरकारी वचनबद्धता ट्र्याक गर्दैछ। ${SITE}`;
  }

  return grade
    ? `Nepal's government scored ${grade} (${score}/100) — verified by AI across 80+ sources. ${SITE}`
    : `Day ${dayInTerm}: AI is tracking 109 government commitments. See what's happening → ${SITE}`;
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
    return `आजको नेपाल ब्रिफ (${opts.date}) — AI ले ८०+ स्रोतबाट संकलित। ${SITE}`;
  }
  return `Today's Nepal brief (${opts.date}) — compiled by AI from 80+ sources. ${SITE}`;
}

/** Generate share text for corruption case */
export function corruptionShareText(opts: { title: string; locale?: string }): string {
  const short = opts.title.length > 50 ? opts.title.slice(0, 47) + '...' : opts.title;
  if (opts.locale === 'ne') {
    return `🔍 "${short}" — ${BRAND} मा भ्रष्टाचार ट्र्याक गर्नुहोस्`;
  }
  return `🔍 "${short}" — tracked on ${BRAND}`;
}

/** Generate share text for civic complaint */
export function complaintShareText(opts: { locale?: string }): string {
  if (opts.locale === 'ne') {
    return `नागरिक समस्या रिपोर्ट गर्नुहोस् — ${BRAND} मा। ${SITE}`;
  }
  return `Report civic issues and track resolution — ${BRAND}. ${SITE}`;
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

/** Universal share helper — handles native share + clipboard fallback */
export async function shareOrCopy(opts: { title: string; text: string; url: string }): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(opts);
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(`${opts.text}\n${opts.url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
