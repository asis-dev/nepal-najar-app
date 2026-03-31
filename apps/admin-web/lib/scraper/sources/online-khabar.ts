/**
 * Scraper for Online Khabar (English) — english.onlinekhabar.com
 * Popular Nepali news portal, English edition.
 */
import * as cheerio from 'cheerio';
import type { ScrapedArticle, SourceScraper } from '../types';

export const onlineKhabarScraper: SourceScraper = {
  name: 'Online Khabar',
  slug: 'online-khabar',
  url: 'https://english.onlinekhabar.com',
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
    const seen = new Set<string>();

    // WordPress-based, try common WP selectors
    const selectors = [
      'article',
      '.ok-news-post',
      '.post-item',
      '.news-card',
      '.category-post',
    ];

    for (const selector of selectors) {
      if (articles.length > 0) break;
      $(selector).each((_, el) => {
        const $el = $(el);
        const headline = $el.find('h2 a, h3 a, h4 a, .entry-title a').first().text().trim();
        const href = $el.find('h2 a, h3 a, h4 a, .entry-title a').first().attr('href');
        const excerpt = $el.find('.excerpt, .entry-summary, p').first().text().trim();
        if (headline && href && headline.length > 10 && !seen.has(href)) {
          seen.add(href);
          articles.push({
            source_name: 'Online Khabar',
            source_url: href,
            source_type: 'news',
            headline,
            content_excerpt: excerpt.slice(0, 500),
            published_at: null,
            language: 'en',
          });
        }
      });
    }

    // Fallback: links containing article-like paths
    if (articles.length === 0) {
      $('a[href*="english.onlinekhabar.com/20"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (text.length > 15 && !seen.has(href)) {
          seen.add(href);
          articles.push({
            source_name: 'Online Khabar',
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
