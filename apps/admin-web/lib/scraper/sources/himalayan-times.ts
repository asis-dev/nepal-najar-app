/**
 * Scraper for The Himalayan Times — thehimalayantimes.com
 * One of Nepal's largest English dailies.
 */
import * as cheerio from 'cheerio';
import type { ScrapedArticle, SourceScraper } from '../types';

export const himalayanTimesScraper: SourceScraper = {
  name: 'Himalayan Times',
  slug: 'himalayan-times',
  url: 'https://thehimalayantimes.com/nepal',
  type: 'news',
  language: 'en',

  async scrape(): Promise<ScrapedArticle[]> {
    const res = await fetch(this.url, {
      headers: {
        'User-Agent': 'NepalNajar/1.0 (governance-tracker; +https://nepalnajar.com)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} from ${this.url}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: ScrapedArticle[] = [];
    const seen = new Set<string>();

    const selectors = ['article', '.post', '.news-item', '.entry', '.card'];

    for (const selector of selectors) {
      if (articles.length > 0) break;
      $(selector).each((_, el) => {
        const $el = $(el);
        const headline = $el.find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim();
        const href = $el.find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href');
        const excerpt = $el.find('.excerpt, .entry-content p, .summary').first().text().trim();
        if (headline && href && headline.length > 10 && !seen.has(href)) {
          seen.add(href);
          const fullUrl = href.startsWith('http')
            ? href
            : `https://thehimalayantimes.com${href}`;
          articles.push({
            source_name: 'Himalayan Times',
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

    if (articles.length === 0) {
      $('a[href*="thehimalayantimes.com/nepal/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (text.length > 15 && !seen.has(href)) {
          seen.add(href);
          articles.push({
            source_name: 'Himalayan Times',
            source_url: href,
            source_type: 'news',
            headline: text,
            content_excerpt: '',
            published_at: null,
            language: 'en',
          });
        }
      });
    }

    return articles.slice(0, 30);
  },
};
