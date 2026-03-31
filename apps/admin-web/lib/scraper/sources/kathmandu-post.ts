/**
 * Scraper for Kathmandu Post — kathmandupost.com/national
 * Nepal's leading English-language daily newspaper.
 */
import * as cheerio from 'cheerio';
import type { ScrapedArticle, SourceScraper } from '../types';

export const kathmanduPostScraper: SourceScraper = {
  name: 'Kathmandu Post',
  slug: 'kathmandu-post',
  url: 'https://kathmandupost.com/national',
  type: 'news',
  language: 'en',

  async scrape(): Promise<ScrapedArticle[]> {
    const res = await fetch(this.url, {
      headers: {
        'User-Agent': 'NepalRepublic/2.0 (civic-tracker; +https://nepalrepublic.org)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} from ${this.url}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: ScrapedArticle[] = [];

    // Multiple selector strategies for resilience
    const selectors = [
      'article',
      '.article-image',
      '.story-card',
      '.block--morenews article',
      '.list--content article',
    ];

    for (const selector of selectors) {
      if (articles.length > 0) break;

      $(selector).each((_, el) => {
        const $el = $(el);
        const headline =
          $el.find('h2 a, h3 a, h4 a, h5 a, .title a').first().text().trim() ||
          $el.find('a').first().text().trim();
        const href =
          $el.find('h2 a, h3 a, h4 a, h5 a, .title a').first().attr('href') ||
          $el.find('a').first().attr('href');
        const excerpt =
          $el.find('.excerpt, .description, p').first().text().trim() || '';

        if (headline && href && headline.length > 10) {
          const fullUrl = href.startsWith('http')
            ? href
            : `https://kathmandupost.com${href}`;

          articles.push({
            source_name: 'Kathmandu Post',
            source_url: fullUrl,
            source_type: 'news',
            headline,
            content_excerpt: excerpt.slice(0, 500),
            published_at: null,
            language: 'en',
          });
        }
      });
    }

    // Fallback: grab all links that look like article URLs
    if (articles.length === 0) {
      $('a[href*="/national/"], a[href*="/politics/"], a[href*="/money/"]').each(
        (_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim();
          if (text.length > 15 && href.includes('/20')) {
            const fullUrl = href.startsWith('http')
              ? href
              : `https://kathmandupost.com${href}`;
            if (!articles.some((a) => a.source_url === fullUrl)) {
              articles.push({
                source_name: 'Kathmandu Post',
                source_url: fullUrl,
                source_type: 'news',
                headline: text,
                content_excerpt: '',
                published_at: null,
                language: 'en',
              });
            }
          }
        }
      );
    }

    return articles.slice(0, 30);
  },
};
