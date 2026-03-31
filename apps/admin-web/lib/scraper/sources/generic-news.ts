/**
 * Generic news website scraper factory.
 * Works for most Nepali news sites (both English and Nepali).
 */
import * as cheerio from 'cheerio';
import type { ScrapedArticle, SourceScraper } from '../types';

interface NewsSourceConfig {
  name: string;
  slug: string;
  url: string;
  language: 'en' | 'ne';
  /** Additional category pages to scrape */
  categoryPages?: string[];
  /** CSS selectors for article containers */
  selectors?: string[];
  /** URL patterns that look like article URLs */
  articleUrlPatterns?: string[];
  maxArticles?: number;
}

const DEFAULT_NEWS_SELECTORS = [
  'article',
  '.article-item',
  '.story-card',
  '.news-card',
  '.post-card',
  '.list--content article',
  '.block--morenews article',
  '.article-image',
  '.news-item',
  '.media',
  '.card',
  '.teaser',
  '.post-item',
  '.entry-content',
  '.content-list li',
];

export function createNewsScraper(config: NewsSourceConfig): SourceScraper {
  const {
    name,
    slug,
    url,
    language,
    categoryPages = [],
    selectors = DEFAULT_NEWS_SELECTORS,
    articleUrlPatterns = [],
    maxArticles = 30,
  } = config;

  const baseHost = new URL(url).origin;

  return {
    name,
    slug,
    url,
    type: 'news',
    language,

    async scrape(): Promise<ScrapedArticle[]> {
      const allArticles: ScrapedArticle[] = [];
      const seenUrls = new Set<string>();

      const pagesToScrape = [url, ...categoryPages.map(p => p.startsWith('http') ? p : `${baseHost}${p}`)];

      for (const pageUrl of pagesToScrape) {
        try {
          const res = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'NepalRepublic/2.0 (civic-tracker; +https://nepalrepublic.org)',
              Accept: 'text/html',
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!res.ok) continue;
          const html = await res.text();
          const $ = cheerio.load(html);

          // Strategy 1: Structured selectors
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

              if (headline && href && headline.length > 10) {
                const fullUrl = href.startsWith('http') ? href : `${baseHost}${href.startsWith('/') ? '' : '/'}${href}`;
                if (!seenUrls.has(fullUrl)) {
                  seenUrls.add(fullUrl);
                  allArticles.push({
                    source_name: name,
                    source_url: fullUrl,
                    source_type: 'news',
                    headline,
                    content_excerpt: excerpt.slice(0, 500),
                    published_at: null,
                    language,
                  });
                }
              }
            });

            if (allArticles.length > 0) break;
          }

          // Strategy 2: Fallback — links with year patterns
          if (allArticles.length < 5) {
            $('a[href]').each((_, el) => {
              if (allArticles.length >= maxArticles) return;
              const href = $(el).attr('href') || '';
              const text = $(el).text().trim();

              const looksLikeArticle =
                articleUrlPatterns.some(p => href.includes(p)) ||
                href.match(/\/\d{4}\/\d{2}\//) || // /2026/03/
                href.match(/\/\d{4}-\d{2}-/) ||    // /2026-03-
                href.match(/\/news\/\d+/) ||        // /news/12345
                href.match(/\/\d+\//) ||            // /12345/
                href.match(/story_id=\d+/) ||
                href.match(/article_id=\d+/);

              if (
                text.length > 15 &&
                looksLikeArticle &&
                (href.includes(new URL(url).hostname) || href.startsWith('/')) &&
                !href.includes('#') &&
                !href.includes('javascript') &&
                !href.includes('login') &&
                !href.includes('signup')
              ) {
                const fullUrl = href.startsWith('http') ? href : `${baseHost}${href.startsWith('/') ? '' : '/'}${href}`;
                if (!seenUrls.has(fullUrl)) {
                  seenUrls.add(fullUrl);
                  allArticles.push({
                    source_name: name,
                    source_url: fullUrl,
                    source_type: 'news',
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
