/**
 * Deep article reader — follows article URLs and extracts full text content.
 * Used after initial headline scraping to get the actual article body for AI analysis.
 */
import * as cheerio from 'cheerio';

/** Extracted article content */
export interface ArticleContent {
  url: string;
  headline: string;
  fullText: string;
  publishedDate?: string;
  author?: string;
  language: 'en' | 'ne';
  wordCount: number;
}

/**
 * Read full article content from a URL.
 * Extracts the main body text, stripping navigation, ads, and boilerplate.
 */
export async function readFullArticle(
  url: string,
  language: 'en' | 'ne' = 'en'
): Promise<ArticleContent | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'NepalRepublic/2.0 (civic-tracker; +https://nepalrepublic.org)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $(
      'script, style, nav, header, footer, .sidebar, .ads, .ad, .social-share, ' +
        '.related-posts, .comments, .comment, .newsletter, .popup, .modal, ' +
        'iframe, .breadcrumb, .pagination, .tag-list, .share-buttons'
    ).remove();

    // Try multiple strategies to find the main article content
    let fullText = '';
    let headline = '';
    let publishedDate: string | undefined;
    let author: string | undefined;

    // Strategy 1: Look for article/content specific selectors
    const contentSelectors = [
      'article .entry-content',
      'article .post-content',
      'article .article-content',
      'article .story-content',
      '.article-body',
      '.post-body',
      '.story-body',
      '.entry-content',
      '.post-content',
      'article',
      '.content-area main',
      '#content',
      'main',
    ];

    for (const selector of contentSelectors) {
      const $content = $(selector);
      if ($content.length > 0) {
        const text = $content
          .find('p')
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((t) => t.length > 20) // skip short paragraphs (captions, etc.)
          .join('\n\n');

        if (text.length > 100) {
          fullText = text;
          break;
        }
      }
    }

    // Strategy 2: Fallback — grab all substantial paragraphs
    if (fullText.length < 100) {
      fullText = $('p')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 30)
        .join('\n\n');
    }

    // Extract headline
    const headlineSelectors = [
      'h1.entry-title',
      'h1.post-title',
      'h1.article-title',
      'article h1',
      '.article-header h1',
      'h1',
    ];
    for (const sel of headlineSelectors) {
      const h = $(sel).first().text().trim();
      if (h && h.length > 10) {
        headline = h;
        break;
      }
    }

    // Extract published date
    const dateSelectors = [
      'time[datetime]',
      '.published-date',
      '.post-date',
      '.article-date',
      '.date',
      'meta[property="article:published_time"]',
    ];
    for (const sel of dateSelectors) {
      const $date = $(sel).first();
      const dateVal =
        $date.attr('datetime') ||
        $date.attr('content') ||
        $date.text().trim();
      if (dateVal && dateVal.length > 5) {
        publishedDate = dateVal;
        break;
      }
    }

    // Extract author
    const authorSelectors = [
      '.author-name',
      '.byline',
      '.post-author',
      'meta[name="author"]',
      '.article-author',
    ];
    for (const sel of authorSelectors) {
      const $author = $(sel).first();
      const authorVal = $author.attr('content') || $author.text().trim();
      if (authorVal && authorVal.length > 2 && authorVal.length < 100) {
        author = authorVal;
        break;
      }
    }

    // Cap content to avoid token overload (keep first ~3000 chars)
    const trimmedText = fullText.slice(0, 4000);
    const wordCount = trimmedText.split(/\s+/).length;

    if (trimmedText.length < 50) return null; // Too little content

    return {
      url,
      headline: headline || '',
      fullText: trimmedText,
      publishedDate,
      author,
      language,
      wordCount,
    };
  } catch (err) {
    console.warn(`[deep-reader] Failed to read ${url}:`, err);
    return null;
  }
}

/**
 * Read multiple articles in sequence with a polite delay between requests.
 */
export async function readArticles(
  urls: Array<{ url: string; language: 'en' | 'ne' }>,
  maxArticles = 10
): Promise<ArticleContent[]> {
  const results: ArticleContent[] = [];

  for (const { url, language } of urls.slice(0, maxArticles)) {
    const content = await readFullArticle(url, language);
    if (content) {
      results.push(content);
    }
    // Polite delay: 1s between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
