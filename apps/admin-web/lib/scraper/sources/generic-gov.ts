/**
 * Generic government website scraper factory.
 * Most Nepal .gov.np sites share similar structures.
 * This factory creates scrapers with multiple fallback strategies.
 */
import * as cheerio from 'cheerio';
import type { ScrapedArticle, SourceScraper } from '../types';

interface GovSourceConfig {
  name: string;
  slug: string;
  url: string;
  language: 'en' | 'ne';
  /** Additional pages to scrape (e.g., /news, /notices, /press-release) */
  subPages?: string[];
  /** CSS selectors to try for article containers */
  selectors?: string[];
  /** URL patterns that indicate article/notice pages */
  articleUrlPatterns?: string[];
  /** Maximum articles to return */
  maxArticles?: number;
}

/** Default selectors that work on most Nepal government sites */
const DEFAULT_SELECTORS = [
  '.news-item',
  '.notice-item',
  '.press-release',
  '.single__row-wrapper',
  '.single__row-info',
  '.block-content .row',
  'article',
  '.card',
  '.list-group-item',
  '.media',
  '.post-item',
  '.entry',
  'table.table tbody tr',
  '.content-list li',
  '.news-list li',
  '.notice-list li',
];

/** Default URL patterns for government article links */
const DEFAULT_URL_PATTERNS = [
  '/news/', '/notice/', '/press/', '/publication/', '/report/',
  '/article/', '/detail/', '/post/', '/page/', '/content/',
  '/en/news/', '/en/notice/', '/ne/news/', '/ne/notice/',
  '/category/', '/archives/', '/updates/',
];

export function createGovScraper(config: GovSourceConfig): SourceScraper {
  const {
    name,
    slug,
    url,
    language,
    subPages = [],
    selectors = DEFAULT_SELECTORS,
    articleUrlPatterns = DEFAULT_URL_PATTERNS,
    maxArticles = 30,
  } = config;

  const baseHost = new URL(url).origin;

  return {
    name,
    slug,
    url,
    type: 'government',
    language,

    async scrape(): Promise<ScrapedArticle[]> {
      const allArticles: ScrapedArticle[] = [];
      const seenUrls = new Set<string>();

      // Scrape main page + sub-pages
      const pagesToScrape = [url, ...subPages.map(p => p.startsWith('http') ? p : `${baseHost}${p}`)];

      for (const pageUrl of pagesToScrape) {
        try {
          const res = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'NepalNajar/1.0 (governance-tracker; +https://nepalnajar.com)',
              Accept: 'text/html',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!res.ok) continue;
          const html = await res.text();
          const $ = cheerio.load(html);

          // Strategy 1: Try structured selectors
          for (const selector of selectors) {
            if (allArticles.length >= maxArticles) break;

            $(selector).each((_, el) => {
              if (allArticles.length >= maxArticles) return;
              const $el = $(el);

              const headline =
                $el.find('h2 a, h3 a, h4 a, h5 a, .title a, a.title').first().text().trim() ||
                $el.find('a').first().text().trim();
              const href =
                $el.find('h2 a, h3 a, h4 a, h5 a, .title a, a.title').first().attr('href') ||
                $el.find('a').first().attr('href');
              const excerpt =
                $el.find('.excerpt, .description, .summary, p').first().text().trim() || '';
              const dateText =
                $el.find('.date, time, .post-date, .publish-date, .meta-date').first().text().trim();

              if (headline && href && headline.length > 5) {
                const fullUrl = href.startsWith('http') ? href : `${baseHost}${href.startsWith('/') ? '' : '/'}${href}`;
                if (!seenUrls.has(fullUrl)) {
                  seenUrls.add(fullUrl);
                  allArticles.push({
                    source_name: name,
                    source_url: fullUrl,
                    source_type: 'government',
                    headline,
                    content_excerpt: excerpt.slice(0, 500),
                    published_at: null,
                    language,
                  });
                }
              }
            });

            if (allArticles.length > 0) break; // Found articles with this selector
          }

          // Strategy 2: Fallback — grab all links matching article URL patterns
          if (allArticles.length < 5) {
            $('a[href]').each((_, el) => {
              if (allArticles.length >= maxArticles) return;
              const href = $(el).attr('href') || '';
              const text = $(el).text().trim();

              const isArticleUrl = articleUrlPatterns.some(p => href.includes(p)) ||
                href.match(/\/\d{4}\//) || // Year in URL
                href.match(/id=\d+/); // ID parameter

              if (
                text.length > 10 &&
                isArticleUrl &&
                (href.includes(new URL(url).hostname) || href.startsWith('/')) &&
                !href.includes('#') &&
                !href.includes('javascript')
              ) {
                const fullUrl = href.startsWith('http') ? href : `${baseHost}${href.startsWith('/') ? '' : '/'}${href}`;
                if (!seenUrls.has(fullUrl)) {
                  seenUrls.add(fullUrl);
                  allArticles.push({
                    source_name: name,
                    source_url: fullUrl,
                    source_type: 'government',
                    headline: text,
                    content_excerpt: '',
                    published_at: null,
                    language,
                  });
                }
              }
            });
          }
        } catch (err) {
          console.warn(`[${slug}] Failed to scrape ${pageUrl}:`, err instanceof Error ? err.message : err);
        }
      }

      return allArticles.slice(0, maxArticles);
    },
  };
}
