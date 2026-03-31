/**
 * Web Search Collector
 *
 * Runs targeted searches for each promise topic to find
 * evidence from sources we don't directly scrape.
 * Uses Google Custom Search API or SearXNG (self-hosted, free)
 */

import {
  getAllPromiseSearchQueries,
  getSearchQueryBatch,
} from './search-query-generator';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
}

// Search queries mapped to promises — the AI agent's "investigation list"
export const PROMISE_SEARCH_QUERIES: {
  promiseId: number;
  queries: string[];
}[] = [
  {
    promiseId: 1,
    queries: [
      'Nepal directly elected executive system 2082',
      'Nepal constitutional amendment discussion paper',
      'नेपाल प्रत्यक्ष निर्वाचित कार्यकारी',
    ],
  },
  {
    promiseId: 2,
    queries: [
      'Nepal Westminster parliamentary reform',
      'Nepal parliamentary system change proposal',
    ],
  },
  {
    promiseId: 3,
    queries: [
      'Nepal national development plan 2082',
      'Nepal planning commission long term plan',
    ],
  },
  {
    promiseId: 4,
    queries: [
      'Nepal anti corruption bill 2082',
      'Nepal CIAA reform',
      'भ्रष्टाचार नियन्त्रण विधेयक',
    ],
  },
  {
    promiseId: 5,
    queries: [
      'Nepal judicial independence reform',
      'Nepal judiciary reform bill',
    ],
  },
  {
    promiseId: 6,
    queries: [
      'Nepal bureaucracy merit based reform',
      'Nepal civil service reform 2082',
    ],
  },
  {
    promiseId: 7,
    queries: [
      'Nepal e-procurement system',
      'Nepal public procurement reform',
    ],
  },
  {
    promiseId: 8,
    queries: [
      'Nepal GDP growth target 2082',
      'Nepal economic development plan',
    ],
  },
  {
    promiseId: 9,
    queries: [
      'Nepal youth employment program 2082',
      'Nepal foreign employment reform',
      'नेपाल युवा रोजगारी',
    ],
  },
  {
    promiseId: 10,
    queries: [
      'Nepal trade deficit reduction plan',
      'Nepal export promotion',
    ],
  },
  {
    promiseId: 11,
    queries: ['Nepal tax reform 2082', 'Nepal digital tax system'],
  },
  {
    promiseId: 12,
    queries: [
      'Nepal 30000 MW hydropower plan',
      'Nepal hydropower development 2082',
      'नेपाल जलविद्युत विकास',
    ],
  },
  {
    promiseId: 13,
    queries: [
      'Nepal clean drinking water project',
      'Nepal Melamchi water supply update',
      'काठमाडौं खानेपानी',
    ],
  },
  {
    promiseId: 14,
    queries: [
      'Nepal smart city development',
      'Nepal urban development plan',
    ],
  },
  {
    promiseId: 15,
    queries: [
      'Nepal east west highway 4 lane',
      'Nepal highway expansion project',
      'पूर्व पश्चिम राजमार्ग',
    ],
  },
  {
    promiseId: 16,
    queries: [
      'Nepal federal governance implementation',
      'Nepal local government capacity',
    ],
  },
  {
    promiseId: 17,
    queries: [
      'Nepal international airport construction',
      'Pokhara Bhairahawa Nijgadh airport',
    ],
  },
  {
    promiseId: 18,
    queries: [
      'Nepal digital Nepal framework',
      'Nepal e-governance implementation',
    ],
  },
  {
    promiseId: 19,
    queries: [
      'Nepal broadband internet connectivity',
      'Nepal fiber optic expansion',
    ],
  },
  {
    promiseId: 20,
    queries: [
      'Nepal IT park development',
      'Nepal digital economy plan',
    ],
  },
  {
    promiseId: 21,
    queries: [
      'Nepal financial inclusion plan',
      'Nepal banking access rural',
    ],
  },
  {
    promiseId: 22,
    queries: [
      'Nepal universal health insurance',
      'Nepal health insurance board coverage',
      'नेपाल स्वास्थ्य बीमा',
    ],
  },
  {
    promiseId: 23,
    queries: [
      'Nepal hospital in every district',
      'Nepal district hospital construction',
    ],
  },
  {
    promiseId: 24,
    queries: [
      'Nepal education reform curriculum',
      'Nepal school education quality',
    ],
  },
  {
    promiseId: 25,
    queries: [
      'Nepal technical vocational training CTEVT',
      'Nepal skill development program',
    ],
  },
  {
    promiseId: 26,
    queries: [
      'Nepal research university establishment',
      'Nepal higher education reform',
    ],
  },
  {
    promiseId: 27,
    queries: [
      'Nepal agriculture modernization',
      'Nepal food security plan',
      'नेपाल कृषि आधुनिकीकरण',
    ],
  },
  {
    promiseId: 28,
    queries: [
      'Nepal climate change policy',
      'Nepal renewable energy carbon neutral',
    ],
  },
  {
    promiseId: 29,
    queries: [
      'Nepal land reform program',
      'Nepal land management system',
    ],
  },
  {
    promiseId: 30,
    queries: [
      'Nepal election reform proportional representation',
      'Nepal electoral system change',
    ],
  },
  {
    promiseId: 31,
    queries: [
      'Nepal cooperative sector reform',
      'Nepal cooperative regulation',
    ],
  },
  {
    promiseId: 32,
    queries: [
      'Nepal tourism recovery plan 2082',
      'Nepal visit Nepal tourism',
      'नेपाल पर्यटन',
    ],
  },
  {
    promiseId: 33,
    queries: [
      'Nepal foreign policy non-aligned',
      'Nepal diplomacy independence',
    ],
  },
  {
    promiseId: 34,
    queries: [
      'Nepal social security expansion',
      'Nepal social protection program',
    ],
  },
  {
    promiseId: 35,
    queries: [
      'Nepal passport service reform',
      'Nepal immigration digital system',
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchGoogle(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX; // Custom Search Engine ID

  if (!apiKey || !cx) return [];

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: '5',
    dateRestrict: 'd30', // last 30 days
    gl: 'np', // Nepal
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params}`,
      {
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) return [];
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items || []).map((item: any) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
      source: new URL(item.link).hostname,
      date:
        item.pagemap?.metatags?.[0]?.['article:published_time'] ||
        undefined,
    }));
  } catch {
    return [];
  }
}

// SearXNG is a free, self-hosted meta search engine — great alternative to Google
async function searchSearXNG(query: string): Promise<SearchResult[]> {
  const baseUrl = process.env.SEARXNG_URL; // e.g., https://search.nepalrepublic.org

  if (!baseUrl) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    categories: 'news',
    language: 'en',
    time_range: 'month',
  });

  try {
    const res = await fetch(`${baseUrl}/search?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || [])
      .slice(0, 5)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        snippet: item.content || '',
        source: item.engine || new URL(item.url).hostname,
        date: item.publishedDate || undefined,
      }));
  } catch {
    return [];
  }
}

// DuckDuckGo HTML search — free fallback when Google and SearXNG are unavailable
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      kl: 'np-en', // Nepal region
      df: 'm', // past month
    });

    const res = await fetch(`https://html.duckduckgo.com/html/?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NepalRepublic/2.0)',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];
    const html = await res.text();

    const results: SearchResult[] = [];
    // Extract results from DDG HTML response
    const resultRegex =
      /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
      const url = decodeURIComponent(
        match[1].replace(/.*uddg=/, '').replace(/&.*/, ''),
      );
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const snippet = match[3].replace(/<[^>]+>/g, '').trim();

      if (url && title && url.startsWith('http')) {
        results.push({
          title,
          url,
          snippet,
          source: new URL(url).hostname,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

export async function searchForPromise(
  promiseId: number,
): Promise<SearchResult[]> {
  const allQueries = getAllPromiseSearchQueries(PROMISE_SEARCH_QUERIES);
  const config = allQueries.find((p) => p.promiseId === promiseId);
  if (!config) return [];

  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of config.queries) {
    // Try Google first, fallback to SearXNG, then DuckDuckGo
    let results = await searchGoogle(query);
    if (results.length === 0) {
      results = await searchSearXNG(query);
    }
    if (results.length === 0) {
      results = await searchDuckDuckGo(query);
    }

    for (const result of results) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allResults.push(result);
      }
    }

    await new Promise((r) => setTimeout(r, 1000)); // Rate limit
  }

  return allResults;
}

export async function collectAllWebSearch(): Promise<{
  queriesRun: number;
  resultsFound: number;
  newSignals: number;
  errors: string[];
}> {
  const { getSupabase } = await import('@/lib/supabase/server');
  const supabase = getSupabase();
  let queriesRun = 0;
  let resultsFound = 0;
  let newSignals = 0;
  const errors: string[] = [];

  // Merge handcrafted (1-35) + auto-generated (36-109) queries
  const allQueries = getAllPromiseSearchQueries(PROMISE_SEARCH_QUERIES);
  // Process ~25 promises per sweep, cycling through all 109
  const batch = getSearchQueryBatch(allQueries);
  console.log(
    `[WebSearch] Processing batch of ${batch.length} promises (IDs: ${batch[0]?.promiseId}-${batch[batch.length - 1]?.promiseId})`,
  );

  for (const config of batch) {
    for (const query of config.queries) {
      queriesRun++;

      try {
        let results = await searchGoogle(query);
        if (results.length === 0) {
          results = await searchSearXNG(query);
        }
        if (results.length === 0) {
          results = await searchDuckDuckGo(query);
        }

        resultsFound += results.length;

        for (const result of results) {
          const sourceId = `search-${config.promiseId}`;

          const { error } = await supabase
            .from('intelligence_signals')
            .upsert(
              {
                source_id: sourceId,
                signal_type: 'article',
                external_id: result.url,
                title: result.title,
                content: result.snippet,
                url: result.url,
                published_at: result.date
                  ? new Date(result.date).toISOString()
                  : null,
                matched_promise_ids: [config.promiseId],
                language: /[\u0900-\u097F]/.test(result.title)
                  ? 'ne'
                  : 'en',
                media_type: 'text',
                metadata: {
                  searchQuery: query,
                  source: result.source,
                },
              },
              {
                onConflict: 'source_id,external_id',
                ignoreDuplicates: true,
              },
            );

          if (!error) newSignals++;
        }
      } catch (err) {
        errors.push(
          `Search "${query}": ${err instanceof Error ? err.message : 'error'}`,
        );
      }

      await new Promise((r) => setTimeout(r, 1500)); // Heavy rate limiting for search APIs
    }
  }

  return { queriesRun, resultsFound, newSignals, errors };
}
