/**
 * Scraper for Ministry of Energy, Water Resources & Irrigation — moewri.gov.np
 * Energy projects, hydropower, and irrigation updates.
 */
import * as cheerio from 'cheerio';
import type { ScrapedArticle, SourceScraper } from '../types';

export const moewriGovScraper: SourceScraper = {
  name: 'Ministry of Energy & Water',
  slug: 'moewri-gov',
  url: 'https://moewri.gov.np',
  type: 'government',
  language: 'ne',

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

    const selectors = ['.single__row-wrapper', '.news-item', '.notice-item', 'article', 'table tr'];

    for (const selector of selectors) {
      if (articles.length > 0) break;
      $(selector).each((_, el) => {
        const $el = $(el);
        const headline = $el.find('h4 a, h3 a, h2 a, td a, .title a').first().text().trim();
        const href = $el.find('h4 a, h3 a, h2 a, td a, .title a').first().attr('href');
        if (headline && href && headline.length > 5 && !seen.has(href)) {
          seen.add(href);
          const fullUrl = href.startsWith('http') ? href : `https://moewri.gov.np${href}`;
          articles.push({
            source_name: 'Ministry of Energy & Water',
            source_url: fullUrl,
            source_type: 'government',
            headline,
            content_excerpt: '',
            published_at: null,
            language: 'ne',
          });
        }
      });
    }

    return articles.slice(0, 15);
  },
};
