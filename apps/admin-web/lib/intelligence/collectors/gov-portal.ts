/**
 * Government Portal Collector
 * Monitors Nepal government ministry and institutional websites for
 * press releases, policy announcements, and official notices.
 *
 * These sites don't have RSS feeds, so we scrape their news/press-release pages
 * and extract headline links.
 */
import { getSupabase } from '@/lib/supabase/server';

interface GovPortal {
  id: string;
  name: string;
  url: string;
  newsPath: string; // path to the news/press releases page
  language: 'en' | 'ne';
  relatedPromiseIds: number[];
  /** CSS-like patterns to help identify headlines (used in regex) */
  headlinePatterns?: string[];
}

const GOV_PORTALS: GovPortal[] = [
  {
    id: 'gov-opmcm',
    name: 'Office of PM & Council of Ministers',
    url: 'https://opmcm.gov.np',
    newsPath: '/en/latest-news',
    language: 'ne',
    relatedPromiseIds: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'gov-mof',
    name: 'Ministry of Finance',
    url: 'https://mof.gov.np',
    newsPath: '/en/news',
    language: 'ne',
    relatedPromiseIds: [8, 10, 11, 21],
  },
  {
    id: 'gov-moest',
    name: 'Ministry of Education',
    url: 'https://moest.gov.np',
    newsPath: '/en/news',
    language: 'ne',
    relatedPromiseIds: [24, 25, 26],
  },
  {
    id: 'gov-mohp',
    name: 'Ministry of Health',
    url: 'https://mohp.gov.np',
    newsPath: '/en/latest-news',
    language: 'ne',
    relatedPromiseIds: [22, 23],
  },
  {
    id: 'gov-moewri',
    name: 'Ministry of Energy',
    url: 'https://moewri.gov.np',
    newsPath: '/en/news',
    language: 'ne',
    relatedPromiseIds: [12, 13, 28],
  },
  {
    id: 'gov-npc',
    name: 'National Planning Commission',
    url: 'https://npc.gov.np',
    newsPath: '/en/news-events',
    language: 'ne',
    relatedPromiseIds: [3, 8],
  },
  {
    id: 'gov-nrb',
    name: 'Nepal Rastra Bank',
    url: 'https://www.nrb.org.np',
    newsPath: '/contents/news',
    language: 'en',
    relatedPromiseIds: [8, 10, 21],
  },
  {
    id: 'gov-parliament',
    name: 'Federal Parliament',
    url: 'https://hr.parliament.gov.np',
    newsPath: '/en/news',
    language: 'ne',
    relatedPromiseIds: [1, 2, 4, 5, 29, 30],
  },
  {
    id: 'gov-ciaa',
    name: 'CIAA (Anti-Corruption)',
    url: 'https://ciaa.gov.np',
    newsPath: '/en/news',
    language: 'ne',
    relatedPromiseIds: [4],
  },
  {
    id: 'gov-ppmo',
    name: 'PPMO (Procurement)',
    url: 'https://ppmo.gov.np',
    newsPath: '/news',
    language: 'ne',
    relatedPromiseIds: [7],
  },
];

interface HeadlineLink {
  title: string;
  url: string;
}

/** Track consecutive failures per portal for exponential backoff */
const portalFailures: Map<string, number> = new Map();

/**
 * Extract headline links from raw HTML.
 * Looks for <a href="...">text</a> patterns and filters for news-like URLs.
 */
function extractHeadlineLinks(
  html: string,
  baseUrl: string,
  patterns?: string[],
): HeadlineLink[] {
  const links: HeadlineLink[] = [];
  const seen = new Set<string>();

  // Match <a> tags with href and inner text
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1].trim();
    let title = match[2]
      .replace(/<[^>]+>/g, '') // strip inner HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Skip empty titles or very short ones (likely icons/buttons)
    if (!title || title.length < 10) continue;

    // Resolve relative URLs
    if (href.startsWith('/')) {
      href = `${baseUrl}${href}`;
    } else if (!href.startsWith('http')) {
      continue; // skip javascript:, mailto:, #, etc.
    }

    // Filter for news-like URLs
    const isNewsUrl =
      /\/(news|press-release|notice|latest|update|circular|announcement)/i.test(href) ||
      /\/\d{4}\/\d{1,2}\//.test(href) || // date pattern in URL: /2024/03/
      /\d{4}-\d{2}-\d{2}/.test(href) || // date pattern: 2024-03-15
      /\/\d+$/.test(href); // numeric ID at end

    // Also check custom patterns
    const matchesPattern =
      patterns?.some((p) => new RegExp(p, 'i').test(href)) ?? false;

    if (!isNewsUrl && !matchesPattern) continue;

    // Dedup by URL
    if (seen.has(href)) continue;
    seen.add(href);

    links.push({ title, url: href });
  }

  return links;
}

/**
 * Collect signals from a single government portal.
 */
async function collectPortal(
  portal: GovPortal,
): Promise<{ items: HeadlineLink[]; errors: string[] }> {
  const errors: string[] = [];

  // Exponential backoff: skip if too many consecutive failures
  const failures = portalFailures.get(portal.id) || 0;
  if (failures > 5) {
    errors.push(
      `${portal.name}: skipped (${failures} consecutive failures, backoff active)`,
    );
    return { items: [], errors };
  }

  try {
    const targetUrl = `${portal.url}${portal.newsPath}`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'NepalRepublic/2.0 (civic-tracker; +https://nepalrepublic.org)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      portalFailures.set(portal.id, failures + 1);
      errors.push(`${portal.name}: HTTP ${res.status}`);
      return { items: [], errors };
    }

    const html = await res.text();
    const items = extractHeadlineLinks(
      html,
      portal.url,
      portal.headlinePatterns,
    );

    // Reset failure counter on success
    portalFailures.set(portal.id, 0);

    return { items, errors };
  } catch (err) {
    portalFailures.set(portal.id, failures + 1);
    errors.push(
      `${portal.name}: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
    return { items: [], errors };
  }
}

/**
 * Collect signals from all government portals.
 * Follows the same return pattern as collectAllRSS().
 */
export async function collectGovPortals(): Promise<{
  totalItems: number;
  newItems: number;
  errors: string[];
}> {
  const supabase = getSupabase();
  let totalItems = 0;
  let newItems = 0;
  const allErrors: string[] = [];

  for (const portal of GOV_PORTALS) {
    const { items, errors } = await collectPortal(portal);
    allErrors.push(...errors);
    totalItems += items.length;

    for (const item of items) {
      // Upsert as intelligence signal — dedup on URL as external_id
      const { error } = await supabase
        .from('intelligence_signals')
        .upsert(
          {
            source_id: portal.id,
            signal_type: 'press_release',
            external_id: item.url,
            title: item.title,
            content: null,
            url: item.url,
            author: null,
            published_at: null,
            discovered_at: new Date().toISOString(),
            language: portal.language,
            media_type: 'text',
            metadata: { relatedPromiseIds: portal.relatedPromiseIds },
          },
          {
            onConflict: 'source_id,external_id',
            ignoreDuplicates: true,
          },
        );

      if (!error) newItems++;
    }

    // Update source last_checked
    await supabase.from('intelligence_sources').upsert(
      {
        id: portal.id,
        name: portal.name,
        source_type: 'gov_portal' as const,
        url: `${portal.url}${portal.newsPath}`,
        related_promise_ids: portal.relatedPromiseIds,
        is_active: true,
        last_checked_at: new Date().toISOString(),
        ...(items.length > 0
          ? { last_found_at: new Date().toISOString() }
          : {}),
      },
      { onConflict: 'id' },
    );

    // Rate limit: 2 seconds between portals
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { totalItems, newItems, errors: allErrors };
}

export { GOV_PORTALS, type GovPortal };
