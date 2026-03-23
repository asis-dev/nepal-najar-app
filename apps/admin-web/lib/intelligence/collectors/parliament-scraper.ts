/**
 * Parliament & Gazette Collector
 * Scrapes Nepal Parliament, Nepal Gazette (Rajpatra), and National Planning
 * Commission for bills, acts, resolutions, official notices, and policy documents.
 *
 * These are authoritative government sources, so signals get a higher base
 * relevance (0.6). HTML is parsed with regex (no cheerio dependency).
 * Rate-limited to 5 seconds between page fetches.
 */
import { getSupabase } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentSignal {
  title: string;
  url: string;
  date: string | null;
  description: string | null;
  status: string | null; // introduced / passed / enacted / published
  category: string | null;
  gazetteNumber: string | null;
}

interface ScraperSource {
  id: string;
  name: string;
  baseUrl: string;
  pages: { path: string; label: string }[];
  language: 'en' | 'ne';
  sourceId: string;
  /** Promise IDs this source is related to */
  relatedPromiseIds: number[];
}

// ---------------------------------------------------------------------------
// Source definitions
// ---------------------------------------------------------------------------

const SOURCES: ScraperSource[] = [
  {
    id: 'parliament-bills',
    name: 'Federal Parliament — Bills',
    baseUrl: 'https://parliament.gov.np',
    pages: [
      { path: '/en/', label: 'main' },
      { path: '/en/post/bill', label: 'bills' },
      { path: '/en/post/act', label: 'acts' },
    ],
    language: 'en',
    sourceId: 'parliament-bills',
    relatedPromiseIds: [1, 2, 4, 5, 29, 30],
  },
  {
    id: 'nepal-gazette',
    name: 'Nepal Gazette (Rajpatra)',
    baseUrl: 'https://rajpatra.dop.gov.np',
    pages: [{ path: '/', label: 'main' }],
    language: 'ne',
    sourceId: 'nepal-gazette',
    relatedPromiseIds: [1, 2, 3, 4, 5],
  },
  {
    id: 'npc-plans',
    name: 'National Planning Commission',
    baseUrl: 'https://npc.gov.np',
    pages: [{ path: '/en', label: 'main' }],
    language: 'en',
    sourceId: 'npc-plans',
    relatedPromiseIds: [3, 8],
  },
];

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 5_000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Failure tracking (exponential backoff, same pattern as gov-portal)
// ---------------------------------------------------------------------------

const sourceFailures: Map<string, number> = new Map();

// ---------------------------------------------------------------------------
// HTML extraction helpers (regex-based, no cheerio)
// ---------------------------------------------------------------------------

/** Decode common HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '');
}

/** Strip HTML tags from a string */
function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

/**
 * Try to extract a date string from text.
 * Handles common formats: YYYY-MM-DD, DD/MM/YYYY, Month DD YYYY, BS dates, etc.
 */
function extractDate(text: string): string | null {
  // ISO-like: 2024-03-15
  const iso = text.match(/(\d{4}-\d{1,2}-\d{1,2})/);
  if (iso) return iso[1];

  // Slash format: 15/03/2024 or 03/15/2024
  const slash = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const [, a, b, year] = slash;
    // Assume DD/MM/YYYY (common in Nepal)
    return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  }

  // Month name: March 15, 2024 or 15 March 2024
  const monthNames =
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i;
  const mName = text.match(monthNames);
  if (mName) {
    try {
      const d = new Date(mName[0]);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Detect whether text contains Nepali (Devanagari) characters.
 */
function isNepaliText(text: string): boolean {
  // Devanagari Unicode range: U+0900-U+097F
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  return devanagariCount > 5;
}

// ---------------------------------------------------------------------------
// Parliament page extractors
// ---------------------------------------------------------------------------

/**
 * Extract document links from Nepal Parliament pages.
 * Looks for links inside <article>, <table>, or <div class="post-..."> structures.
 */
function extractParliamentDocuments(
  html: string,
  baseUrl: string,
  pageLabel: string,
): DocumentSignal[] {
  const documents: DocumentSignal[] = [];
  const seen = new Set<string>();

  // Strategy 1: Look for links inside table rows (bills/acts pages often use tables)
  const tableRowRegex =
    /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = tableRowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    const linkMatch = row.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    let href = linkMatch[1].trim();
    const title = stripTags(linkMatch[2]);
    if (!title || title.length < 5) continue;

    // Resolve relative URLs
    if (href.startsWith('/')) {
      href = `${baseUrl}${href}`;
    } else if (!href.startsWith('http')) {
      continue;
    }

    if (seen.has(href)) continue;
    seen.add(href);

    // Try to extract date and status from remaining cells
    const cellTexts = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const cellContents = cellTexts.map((c) => stripTags(c));
    const date = cellContents.map(extractDate).find(Boolean) ?? null;

    // Detect status keywords
    const rowText = cellContents.join(' ').toLowerCase();
    let status: string | null = null;
    if (rowText.includes('enacted') || rowText.includes('passed')) status = 'enacted';
    else if (rowText.includes('introduced') || rowText.includes('pending')) status = 'introduced';
    else if (pageLabel === 'acts') status = 'enacted';
    else if (pageLabel === 'bills') status = 'introduced';

    documents.push({
      title,
      url: href,
      date,
      description: null,
      status,
      category: pageLabel,
      gazetteNumber: null,
    });
  }

  // Strategy 2: Look for article/post blocks (common on CMS news pages)
  const articleRegex =
    /<(?:article|div)\s+[^>]*class=["'][^"']*(?:post|news|item|entry|card)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div)>/gi;
  let articleMatch;
  while ((articleMatch = articleRegex.exec(html)) !== null) {
    const block = articleMatch[1];
    const linkMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    let href = linkMatch[1].trim();
    const title = stripTags(linkMatch[2]);
    if (!title || title.length < 5) continue;

    if (href.startsWith('/')) {
      href = `${baseUrl}${href}`;
    } else if (!href.startsWith('http')) {
      continue;
    }

    if (seen.has(href)) continue;
    seen.add(href);

    const blockText = stripTags(block);
    const date = extractDate(blockText);

    documents.push({
      title,
      url: href,
      date,
      description: blockText.length > title.length + 20
        ? blockText.slice(0, 300)
        : null,
      status: pageLabel === 'acts' ? 'enacted' : pageLabel === 'bills' ? 'introduced' : null,
      category: pageLabel,
      gazetteNumber: null,
    });
  }

  // Strategy 3: General heading + link patterns (h2/h3/h4 with links)
  const headingLinkRegex =
    /<h[2-4][^>]*>\s*<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h[2-4]>/gi;
  let hlMatch;
  while ((hlMatch = headingLinkRegex.exec(html)) !== null) {
    let href = hlMatch[1].trim();
    const title = stripTags(hlMatch[2]);
    if (!title || title.length < 5) continue;

    if (href.startsWith('/')) {
      href = `${baseUrl}${href}`;
    } else if (!href.startsWith('http')) {
      continue;
    }

    if (seen.has(href)) continue;
    seen.add(href);

    documents.push({
      title,
      url: href,
      date: null,
      description: null,
      status: pageLabel === 'acts' ? 'enacted' : pageLabel === 'bills' ? 'introduced' : null,
      category: pageLabel,
      gazetteNumber: null,
    });
  }

  return documents;
}

// ---------------------------------------------------------------------------
// Gazette page extractor
// ---------------------------------------------------------------------------

/**
 * Extract gazette notices from rajpatra.dop.gov.np.
 * The gazette site often lists notices in tables or list structures.
 */
function extractGazetteDocuments(
  html: string,
  baseUrl: string,
): DocumentSignal[] {
  const documents: DocumentSignal[] = [];
  const seen = new Set<string>();

  // Look for links in the page — gazette entries typically link to PDFs or detail pages
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1].trim();
    const rawTitle = stripTags(match[2]);
    if (!rawTitle || rawTitle.length < 5) continue;

    // Resolve relative URLs
    if (href.startsWith('/')) {
      href = `${baseUrl}${href}`;
    } else if (!href.startsWith('http')) {
      continue;
    }

    // Filter for gazette-relevant links (PDFs, detail pages, notices)
    const isRelevant =
      /\.(pdf)$/i.test(href) ||
      /rajpatra|gazette|notice|detail|view/i.test(href) ||
      /\/\d+$/.test(href) ||
      /part|bhag|khand/i.test(href);

    if (!isRelevant) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    // Try to extract gazette number from title or surrounding text
    const gazetteNumMatch = rawTitle.match(
      /(?:Vol|Part|भाग|खण्ड|no\.?|अंक)\s*[\.:]*\s*(\d+[\d\-/]*)/i,
    );

    // Try date
    const date = extractDate(rawTitle);

    documents.push({
      title: rawTitle,
      url: href,
      date,
      description: null,
      status: 'published',
      category: 'gazette',
      gazetteNumber: gazetteNumMatch?.[1] ?? null,
    });
  }

  // Also look for table-based listings
  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = tableRowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    const linkMatch = row.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    let href = linkMatch[1].trim();
    const title = stripTags(linkMatch[2]);
    if (!title || title.length < 5) continue;

    if (href.startsWith('/')) {
      href = `${baseUrl}${href}`;
    } else if (!href.startsWith('http')) {
      continue;
    }

    if (seen.has(href)) continue;
    seen.add(href);

    const cellTexts = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const cellContents = cellTexts.map((c) => stripTags(c));
    const date = cellContents.map(extractDate).find(Boolean) ?? null;
    const gazetteNumMatch = cellContents
      .join(' ')
      .match(/(?:Vol|Part|भाग|खण्ड|no\.?|अंक)\s*[\.:]*\s*(\d+[\d\-/]*)/i);

    documents.push({
      title,
      url: href,
      date,
      description: null,
      status: 'published',
      category: 'gazette',
      gazetteNumber: gazetteNumMatch?.[1] ?? null,
    });
  }

  return documents;
}

// ---------------------------------------------------------------------------
// NPC page extractor
// ---------------------------------------------------------------------------

/**
 * Extract documents from National Planning Commission.
 * NPC publishes plans, policies, periodic plans, SDG reports, etc.
 */
function extractNPCDocuments(
  html: string,
  baseUrl: string,
): DocumentSignal[] {
  const documents: DocumentSignal[] = [];
  const seen = new Set<string>();

  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1].trim();
    const rawTitle = stripTags(match[2]);
    if (!rawTitle || rawTitle.length < 8) continue;

    if (href.startsWith('/')) {
      href = `${baseUrl}${href}`;
    } else if (!href.startsWith('http')) {
      continue;
    }

    // Filter for document-relevant links
    const isRelevant =
      /\.(pdf)$/i.test(href) ||
      /plan|policy|report|document|publication|sdg|periodic|strategy/i.test(href) ||
      /plan|policy|report|publication|sdg|periodic|strategy|budget/i.test(rawTitle) ||
      /\/\d+$/.test(href);

    if (!isRelevant) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    const date = extractDate(rawTitle);

    // Detect category from title/URL
    let category: string | null = null;
    if (/periodic\s*plan/i.test(rawTitle + href)) category = 'periodic-plan';
    else if (/sdg/i.test(rawTitle + href)) category = 'sdg';
    else if (/budget/i.test(rawTitle + href)) category = 'budget';
    else if (/policy/i.test(rawTitle + href)) category = 'policy';
    else if (/report/i.test(rawTitle + href)) category = 'report';
    else category = 'document';

    documents.push({
      title: rawTitle,
      url: href,
      date,
      description: null,
      status: 'published',
      category,
      gazetteNumber: null,
    });
  }

  return documents;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'NepalNajar/2.0 (intelligence-engine; +https://nepalnajar.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

/**
 * Scrape Nepal Parliament, Nepal Gazette, and National Planning Commission
 * for official documents (bills, acts, gazette notices, plans).
 *
 * Returns summary stats matching the pattern used by other collectors.
 */
export async function scrapeParliamentAndGazette(): Promise<{
  documentsFound: number;
  newDocuments: number;
  errors: string[];
}> {
  const supabase = getSupabase();
  let documentsFound = 0;
  let newDocuments = 0;
  const errors: string[] = [];

  for (const source of SOURCES) {
    // Exponential backoff on repeated failures
    const failures = sourceFailures.get(source.id) || 0;
    if (failures > 5) {
      errors.push(
        `${source.name}: skipped (${failures} consecutive failures, backoff active)`,
      );
      continue;
    }

    let sourceDocCount = 0;
    let sourceHadSuccess = false;

    for (const page of source.pages) {
      const url = `${source.baseUrl}${page.path}`;
      const html = await fetchPage(url);

      if (!html) {
        errors.push(`${source.name} [${page.label}]: failed to fetch ${url}`);
        continue;
      }

      sourceHadSuccess = true;

      // Extract documents based on source type
      let docs: DocumentSignal[];
      if (source.id === 'nepal-gazette') {
        docs = extractGazetteDocuments(html, source.baseUrl);
      } else if (source.id === 'npc-plans') {
        docs = extractNPCDocuments(html, source.baseUrl);
      } else {
        docs = extractParliamentDocuments(html, source.baseUrl, page.label);
      }

      documentsFound += docs.length;
      sourceDocCount += docs.length;

      // Upsert each document as an intelligence signal
      for (const doc of docs) {
        const language = isNepaliText(doc.title) ? 'ne' : source.language;

        const { error } = await supabase
          .from('intelligence_signals')
          .upsert(
            {
              source_id: source.sourceId,
              signal_type: 'official_document',
              external_id: doc.url, // dedup by URL
              title: doc.title,
              content: doc.description,
              url: doc.url,
              author: null,
              published_at: doc.date ? new Date(doc.date).toISOString() : null,
              discovered_at: new Date().toISOString(),
              language,
              media_type: doc.url.endsWith('.pdf') ? 'pdf' : 'text',
              metadata: {
                relatedPromiseIds: source.relatedPromiseIds,
                status: doc.status,
                category: doc.category,
                gazetteNumber: doc.gazetteNumber,
                baseRelevance: 0.6,
              },
            },
            {
              onConflict: 'source_id,external_id',
              ignoreDuplicates: true,
            },
          );

        if (!error) newDocuments++;
      }

      // Rate limit: 5s between page fetches (respectful to gov servers)
      await delay(RATE_LIMIT_MS);
    }

    // Update failure tracking
    if (sourceHadSuccess) {
      sourceFailures.set(source.id, 0);
    } else {
      sourceFailures.set(source.id, failures + 1);
    }

    // Update intelligence_sources tracking
    await supabase.from('intelligence_sources').upsert(
      {
        id: source.id,
        name: source.name,
        source_type: 'gov_portal' as const,
        url: `${source.baseUrl}${source.pages[0].path}`,
        related_promise_ids: source.relatedPromiseIds,
        is_active: true,
        last_checked_at: new Date().toISOString(),
        ...(sourceDocCount > 0
          ? { last_found_at: new Date().toISOString() }
          : {}),
      },
      { onConflict: 'id' },
    );
  }

  return { documentsFound, newDocuments, errors };
}

export { SOURCES as PARLIAMENT_GAZETTE_SOURCES, type DocumentSignal, type ScraperSource };
