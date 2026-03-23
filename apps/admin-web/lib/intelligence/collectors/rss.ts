/**
 * RSS Feed Collector
 * Fetches and parses RSS/Atom feeds from news sites
 * More reliable than HTML scraping for news sources
 */
import { getSupabase } from '@/lib/supabase/server';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
}

interface RSSSource {
  id: string;
  name: string;
  feedUrl: string;
  language: 'en' | 'ne';
  relatedPromiseIds: number[];
}

// Nepal news RSS feeds (18 active sources: 10 English, 8 Nepali — 4 commented out due to feed/site issues)
export const RSS_FEEDS: RSSSource[] = [
  // ── English feeds ──────────────────────────────────────
  {
    id: 'rss-kathmandu-post',
    name: 'Kathmandu Post',
    feedUrl: 'https://kathmandupost.com/rss',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-online-khabar-en',
    name: 'Online Khabar (EN)',
    feedUrl: 'https://english.onlinekhabar.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-khabarhub-en',
    name: 'Khabarhub (EN)',
    feedUrl: 'https://english.khabarhub.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-ratopati-en',
    name: 'Ratopati (EN)',
    feedUrl: 'https://english.ratopati.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-himalayan-times',
    name: 'The Himalayan Times',
    feedUrl: 'https://thehimalayantimes.com/rssFeed/14',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-myrepublica',
    name: 'myRepublica',
    feedUrl: 'https://myrepublica.nagariknetwork.com/feeds',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepali-times',
    name: 'Nepali Times',
    feedUrl: 'https://www.nepalitimes.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-annapurna-express',
    name: 'The Annapurna Express',
    feedUrl: 'https://theannapurnaexpress.com/rss',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-rising-nepal',
    name: 'The Rising Nepal',
    feedUrl: 'https://risingnepaldaily.com/rss',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepal-news-en',
    name: 'Nepal News (EN)',
    feedUrl: 'https://english.nepalnews.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  // NOTE: Nepal Live Today (nepallivetoday.com) – domain no longer resolves (DNS failure). Site appears permanently down. Commented out 2026-03-22.
  // {
  //   id: 'rss-nepal-live-today',
  //   name: 'Nepal Live Today',
  //   feedUrl: 'https://nepallivetoday.com/feed/',
  //   language: 'en',
  //   relatedPromiseIds: [],
  // },

  // ── Nepali feeds ───────────────────────────────────────
  {
    id: 'rss-setopati-ne',
    name: 'Setopati (NE)',
    feedUrl: 'https://setopati.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-ekantipur',
    name: 'eKantipur',
    feedUrl: 'https://ekantipur.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nagarik',
    name: 'Nagarik News',
    feedUrl: 'https://nagariknews.nagariknetwork.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-annapurna-post',
    name: 'Annapurna Post',
    feedUrl: 'https://annapurnapost.com/rss',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-gorkhapatra',
    name: 'Gorkhapatra Online',
    feedUrl: 'https://gorkhapatraonline.com/rss',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-onlinekhabar-ne',
    name: 'Online Khabar (NE)',
    feedUrl: 'https://www.onlinekhabar.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  // NOTE: Ratopati Nepali (ratopati.com/feed) – returns 403 with message "contact administration for access". RSS feed deliberately restricted. Commented out 2026-03-22.
  // {
  //   id: 'rss-ratopati-ne',
  //   name: 'Ratopati (NE)',
  //   feedUrl: 'https://ratopati.com/feed',
  //   language: 'ne',
  //   relatedPromiseIds: [],
  // },
  // NOTE: Ujyaalo Online (ujyaaloonline.com) – Cloudflare bot protection blocks all automated feed access (403). Commented out 2026-03-22.
  // {
  //   id: 'rss-ujyaalo',
  //   name: 'Ujyaalo Online',
  //   feedUrl: 'https://ujyaaloonline.com/feed',
  //   language: 'ne',
  //   relatedPromiseIds: [],
  // },
  // NOTE: Naya Patrika (nayapatrikadaily.com) – site returns 502/403 errors on all endpoints including homepage. Appears down or misconfigured. Commented out 2026-03-22.
  // {
  //   id: 'rss-nayapatrika',
  //   name: 'Naya Patrika',
  //   feedUrl: 'https://nayapatrikadaily.com/feed',
  //   language: 'ne',
  //   relatedPromiseIds: [],
  // },
  {
    id: 'rss-bbc-nepali',
    name: 'BBC Nepali',
    feedUrl: 'https://feeds.bbci.co.uk/nepali/rss.xml',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-khabarhub-ne',
    name: 'Khabarhub (NE)',
    feedUrl: 'https://khabarhub.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },

  // ── Additional English feeds ──────────────────────────────────────────────
  {
    id: 'ujyaalo-en',
    name: 'Ujyaalo Online',
    feedUrl: 'https://ujyaaloonline.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'nepal-press',
    name: 'Nepal Press',
    feedUrl: 'https://nepalpress.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'reporters-nepal',
    name: 'Reporters Nepal',
    feedUrl: 'https://reportersnepal.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'himal-south',
    name: 'Himal Southasian',
    feedUrl: 'https://www.himalmag.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'record-nepal',
    name: 'The Record Nepal',
    feedUrl: 'https://www.recordnepal.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepal-agency',
    name: 'RSS Nepal (National News Agency)',
    feedUrl: 'https://www.rssnepal.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },

  // ── Additional Nepali feeds ─────────────────────────────────────────────
  {
    id: 'pahilopost-ne',
    name: 'PahiloPost',
    feedUrl: 'https://pahilopost.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'naya-patrika-ne',
    name: 'Naya Patrika',
    feedUrl: 'https://nayapatrikadaily.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'baahrakhari-ne',
    name: 'Baahrakhari',
    feedUrl: 'https://baahrakhari.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'deshsanchar-ne',
    name: 'Deshsanchar',
    feedUrl: 'https://deshsanchar.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'lokpath-ne',
    name: 'Lokpath',
    feedUrl: 'https://lokpath.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'nepal-samaya-ne',
    name: 'Nepal Samaya',
    feedUrl: 'https://nepalsamaya.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },

  // ── Independent / Opinion ──────────────────────────────────────────────────
  {
    id: 'sasmit-pokhrel',
    name: 'Sasmit Pokhrel',
    feedUrl: 'https://sasmitpokhrel.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },
];

function parseXML(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Simple regex-based XML parsing (no dependency needed)
  // Match both RSS <item> and Atom <entry> formats
  const itemRegex =
    /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] || match[2] || '';

    const title = extractTag(block, 'title');
    const link =
      extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const description =
      extractTag(block, 'description') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content');
    const pubDate =
      extractTag(block, 'pubDate') ||
      extractTag(block, 'published') ||
      extractTag(block, 'updated');
    const author =
      extractTag(block, 'author') || extractTag(block, 'dc:creator');

    // Extract categories
    const categories: string[] = [];
    const catRegex =
      /<category[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/gi;
    let catMatch;
    while ((catMatch = catRegex.exec(block)) !== null) {
      categories.push(catMatch[1].trim());
    }

    if (title && link) {
      items.push({
        title: cleanCDATA(title),
        link: cleanCDATA(link),
        description: description
          ? cleanCDATA(description).slice(0, 1000)
          : undefined,
        pubDate: pubDate || undefined,
        author: author ? cleanCDATA(author) : undefined,
        categories: categories.length > 0 ? categories : undefined,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    'i',
  );
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function extractAttr(
  xml: string,
  tag: string,
  attr: string,
): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = regex.exec(xml);
  return match ? match[1] : null;
}

function cleanCDATA(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export async function collectRSS(
  source: RSSSource,
): Promise<{
  items: RSSItem[];
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const res = await fetch(source.feedUrl, {
      headers: {
        'User-Agent':
          'NepalNajar/2.0 (intelligence-engine; +https://nepalnajar.com)',
        Accept:
          'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      errors.push(`${source.name}: HTTP ${res.status}`);
      return { items: [], errors };
    }

    const xml = await res.text();
    const items = parseXML(xml);

    return { items, errors };
  } catch (err) {
    errors.push(
      `${source.name}: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
    return { items: [], errors };
  }
}

export async function collectAllRSS(): Promise<{
  totalItems: number;
  newItems: number;
  errors: string[];
}> {
  const supabase = getSupabase();
  let totalItems = 0;
  let newItems = 0;
  const allErrors: string[] = [];

  for (const source of RSS_FEEDS) {
    const { items, errors } = await collectRSS(source);
    allErrors.push(...errors);
    totalItems += items.length;

    for (const item of items) {
      // Upsert as intelligence signal
      const { error } = await supabase
        .from('intelligence_signals')
        .upsert(
          {
            source_id: source.id,
            signal_type: 'article',
            external_id: item.link,
            title: item.title,
            content: item.description || null,
            url: item.link,
            author: item.author || null,
            published_at: item.pubDate
              ? new Date(item.pubDate).toISOString()
              : null,
            discovered_at: new Date().toISOString(),
            language: source.language,
            media_type: 'text',
            metadata: { categories: item.categories || [] },
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
        id: source.id,
        name: source.name,
        source_type: 'rss' as const,
        url: source.feedUrl,
        related_promise_ids: source.relatedPromiseIds,
        is_active: true,
        last_checked_at: new Date().toISOString(),
        ...(items.length > 0
          ? { last_found_at: new Date().toISOString() }
          : {}),
      },
      { onConflict: 'id' },
    );

    // Be polite
    await new Promise((r) => setTimeout(r, 500));
  }

  return { totalItems, newItems, errors: allErrors };
}
