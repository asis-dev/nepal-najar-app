/**
 * Scraper for Ministry of Finance — mof.gov.np
 * Official press releases, notices, budget docs.
 */
import * as cheerio from 'cheerio';
import type { ScrapedArticle, SourceScraper } from '../types';

export const mofGovScraper: SourceScraper = {
  name: 'Ministry of Finance',
  slug: 'mof-gov',
  url: 'https://mof.gov.np',
  type: 'government',
  language: 'ne',

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

    // MoF uses .single__row-wrapper for news/notice items
    const selectors = [
      '.single__row-wrapper',
      '.single__row-info',
      '.block-106 .row',
      'article',
      '.news-item',
      '.notice-item',
    ];

    for (const selector of selectors) {
      if (articles.length > 0) break;

      $(selector).each((_, el) => {
        const $el = $(el);
        const headline =
          $el.find('h4 a, h3 a, h2 a, .title a').first().text().trim() ||
          $el.find('a').first().text().trim();
        const href =
          $el.find('h4 a, h3 a, h2 a, .title a').first().attr('href') ||
          $el.find('a').first().attr('href');
        const dateText = $el.find('.date p, .post-meta .date, time').first().text().trim();

        if (headline && href && headline.length > 5) {
          const fullUrl = href.startsWith('http')
            ? href
            : `https://mof.gov.np${href}`;

          articles.push({
            source_name: 'Ministry of Finance',
            source_url: fullUrl,
            source_type: 'government',
            headline,
            content_excerpt: dateText ? `Published: ${dateText}` : '',
            published_at: null,
            language: 'ne',
          });
        }
      });
    }

    // Fallback: grab all internal links with meaningful text
    if (articles.length === 0) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (
          text.length > 10 &&
          (href.includes('mof.gov.np') || href.startsWith('/')) &&
          !href.includes('#') &&
          !href.includes('javascript')
        ) {
          const fullUrl = href.startsWith('http')
            ? href
            : `https://mof.gov.np${href}`;
          if (!articles.some((a) => a.source_url === fullUrl)) {
            articles.push({
              source_name: 'Ministry of Finance',
              source_url: fullUrl,
              source_type: 'government',
              headline: text,
              content_excerpt: '',
              published_at: null,
              language: 'ne',
            });
          }
        }
      });
    }

    return articles.slice(0, 30);
  },
};
