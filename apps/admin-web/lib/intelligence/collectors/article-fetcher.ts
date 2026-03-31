/**
 * Full Article Fetcher
 *
 * Fetches the complete article content from a URL, not just the RSS snippet.
 * Uses multiple extraction strategies to find the main article body.
 */
import { getSupabase } from '@/lib/supabase/server';

interface FullArticle {
  fullText: string;
  wordCount: number;
  author?: string;
  publishedDate?: string;
  images?: string[];
  links?: string[];
  language: 'en' | 'ne' | 'unknown';
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaContent(html: string, nameOrProperty: string): string | null {
  // Match both name="..." and property="..." meta tags
  const patterns = [
    new RegExp(
      `<meta[^>]*(?:name|property)=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${nameOrProperty}["']`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    try {
      const src = new URL(match[1], baseUrl).href;
      if (!images.includes(src)) images.push(src);
    } catch {
      // Invalid URL, skip
    }
  }
  return images.slice(0, 50); // Cap at 50 images
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = new URL(match[1], baseUrl).href;
      // Only include outbound links (different hostname)
      const baseHost = new URL(baseUrl).hostname;
      const linkHost = new URL(href).hostname;
      if (linkHost !== baseHost && !links.includes(href)) {
        links.push(href);
      }
    } catch {
      // Invalid URL, skip
    }
  }
  return links.slice(0, 100); // Cap at 100 links
}

function detectLanguage(text: string): 'en' | 'ne' | 'unknown' {
  // Count Devanagari characters (Unicode range: 0900-097F)
  const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;

  if (totalChars === 0) return 'unknown';

  const ratio = devanagariChars / totalChars;
  if (ratio > 0.3) return 'ne';
  if (ratio < 0.05) return 'en';
  return 'unknown';
}

function extractTagContent(html: string, selector: string): string | null {
  let pattern: RegExp;

  if (selector.startsWith('[')) {
    // Attribute selector like [itemprop="articleBody"]
    const attrMatch = selector.match(/\[(\w+)=["']([^"']+)["']\]/);
    if (!attrMatch) return null;
    pattern = new RegExp(
      `<[^>]+${attrMatch[1]}=["']${attrMatch[2]}["'][^>]*>([\\s\\S]*?)<\\/`,
      'i',
    );
  } else if (selector.startsWith('.')) {
    // Class selector like .post-content
    const className = selector.slice(1);
    pattern = new RegExp(
      `<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)(?=<\\/div>|<\\/section>|<\\/article>)`,
      'i',
    );
  } else {
    // Tag selector like article
    pattern = new RegExp(
      `<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`,
      'i',
    );
  }

  const match = pattern.exec(html);
  if (!match?.[1]) return null;

  const text = stripHtml(match[1]);
  return text.length > 100 ? text : null;
}

function extractLargestParagraphDiv(html: string): string | null {
  // Find all <div> blocks and pick the one with the most <p> tags
  const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
  let bestText = '';
  let bestPCount = 0;
  let match;

  while ((match = divRegex.exec(html)) !== null) {
    const inner = match[1];
    const pCount = (inner.match(/<p[\s>]/gi) || []).length;
    if (pCount > bestPCount) {
      const text = stripHtml(inner);
      if (text.length > bestText.length) {
        bestText = text;
        bestPCount = pCount;
      }
    }
  }

  return bestText.length > 200 ? bestText : null;
}

function extractAllParagraphs(html: string): string | null {
  // Try <main> first, then <body>
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const searchArea = mainMatch?.[1] || html;

  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = pRegex.exec(searchArea)) !== null) {
    const text = stripHtml(match[1]);
    if (text.length > 20) paragraphs.push(text);
  }

  const combined = paragraphs.join(' ');
  return combined.length > 200 ? combined : null;
}

// ── Main fetcher ──────────────────────────────────────────────────────────────

export async function fetchFullArticle(url: string): Promise<FullArticle | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'NepalRepublic/2.0 (civic-tracker; +https://nepalrepublic.org)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ne;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Extract article content using priority strategies
    const selectors = [
      'article',
      '[itemprop="articleBody"]',
      '.post-content',
      '.entry-content',
      '.article-body',
      '.story-body',
      '.content-area',
    ];

    let fullText: string | null = null;

    for (const selector of selectors) {
      fullText = extractTagContent(html, selector);
      if (fullText) break;
    }

    // Fallback: largest div with mostly <p> tags
    if (!fullText) {
      fullText = extractLargestParagraphDiv(html);
    }

    // Final fallback: all <p> tags from <main> or <body>
    if (!fullText) {
      fullText = extractAllParagraphs(html);
    }

    if (!fullText || fullText.length < 200) return null;

    // Cap at 10000 chars
    fullText = fullText.slice(0, 10_000);

    // Extract metadata
    const author =
      extractMetaContent(html, 'author') ||
      extractMetaContent(html, 'article:author') ||
      extractMetaContent(html, 'dc.creator') ||
      undefined;

    const publishedDate =
      extractMetaContent(html, 'article:published_time') ||
      extractMetaContent(html, 'datePublished') ||
      extractMetaContent(html, 'date') ||
      undefined;

    const images = extractImages(html, url);
    const links = extractLinks(html, url);
    const language = detectLanguage(fullText);
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      fullText,
      wordCount,
      author,
      publishedDate,
      images: images.length > 0 ? images : undefined,
      links: links.length > 0 ? links : undefined,
      language,
    };
  } catch (err) {
    console.warn(
      `[ArticleFetcher] Failed to fetch ${url}: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    return null;
  }
}

// ── Enrichment ────────────────────────────────────────────────────────────────

export async function enrichSignalWithFullContent(
  signalId: string,
  url: string,
): Promise<boolean> {
  const article = await fetchFullArticle(url);
  if (!article) return false;

  const supabase = getSupabase();

  const { error } = await supabase
    .from('intelligence_signals')
    .update({
      content: article.fullText,
      metadata: {
        content_enriched: true,
        word_count: article.wordCount,
        images: article.images || [],
        outbound_links: article.links || [],
        ...(article.author ? { enriched_author: article.author } : {}),
        ...(article.publishedDate
          ? { enriched_published_date: article.publishedDate }
          : {}),
      },
    })
    .eq('id', signalId);

  if (error) {
    console.warn(`[ArticleFetcher] Failed to update signal ${signalId}: ${error.message}`);
    return false;
  }

  return true;
}

export async function enrichUnprocessedSignals(
  limit = 100,
): Promise<{ enriched: number; failed: number; skipped: number }> {
  const supabase = getSupabase();

  // Find signals that need enrichment:
  // - content_enriched is null or false
  // - content is short (< 500 chars) or null
  // - has a URL to fetch
  const { data: signals, error } = await supabase
    .from('intelligence_signals')
    .select('id, url, content, metadata')
    .or(
      'metadata.is.null,metadata->>content_enriched.is.null,metadata->>content_enriched.eq.false',
    )
    .not('url', 'is', null)
    .eq('signal_type', 'article')
    .order('discovered_at', { ascending: false })
    .limit(limit);

  if (error || !signals) {
    console.warn(`[ArticleFetcher] Query error: ${error?.message || 'no data'}`);
    return { enriched: 0, failed: 0, skipped: 0 };
  }

  // Filter to only short-content signals
  const toEnrich = signals.filter((s) => {
    const contentLen = (s.content || '').length;
    return contentLen < 500;
  });

  let enriched = 0;
  let failed = 0;
  const skipped = signals.length - toEnrich.length;

  for (const signal of toEnrich) {
    try {
      const success = await enrichSignalWithFullContent(signal.id, signal.url);
      if (success) {
        enriched++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // Be polite — 1s delay between fetches
    await new Promise((r) => setTimeout(r, 1_000));
  }

  return { enriched, failed, skipped };
}
