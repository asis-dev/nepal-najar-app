/**
 * Scraper for Nepali Times — nepalitimes.com
 * Quality English weekly focusing on politics & governance.
 */
import * as cheerio from 'cheerio';
import type { ScrapedArticle, SourceScraper } from '../types';

export const nepaliTimesScraper: SourceScraper = {
  name: 'Nepali Times',
  slug: 'nepali-times',
  url: 'https://www.nepalitimes.com',
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

    const selectors = ['article', '.post', '.news-block', '.story-card', '.item'];

    for (const selector of selectors) {
      if (articles.length > 0) break;
      $(selector).each((_, el) => {
        const $el = $(el);
        const headline = $el.find('h2 a, h3 a, h4 a, .title a').first().text().trim();
        const href = $el.find('h2 a, h3 a, h4 a, .title a').first().attr('href');
        const excerpt = $el.find('.excerpt, .summary, .blurb, p').first().text().trim();
        if (headline && href && headline.length > 10 && !seen.has(href)) {
          seen.add(href);
          const fullUrl = href.startsWith('http')
            ? href
            : `https://www.nepalitimes.com${href}`;
          articles.push({
            source_name: 'Nepali Times',
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
      $('a[href*="nepalitimes.com/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (text.length > 15 && !href.includes('#') && !seen.has(href)) {
          seen.add(href);
          articles.push({
            source_name: 'Nepali Times',
            source_url: href.startsWith('http') ? href : `https://www.nepalitimes.com${href}`,
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
