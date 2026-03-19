/**
 * Scraper type definitions for Nepal Najar data pipeline
 */

/** Raw scraped article before promise matching */
export interface ScrapedArticle {
  source_name: string;
  source_url: string;
  source_type: 'news' | 'government';
  headline: string;
  headline_ne?: string;
  content_excerpt: string;
  published_at: string | null;
  language: 'en' | 'ne';
  raw_html?: string;
}

/** Result of a single source scrape */
export interface ScrapeResult {
  source: string;
  success: boolean;
  articlesFound: number;
  articlesNew: number;
  durationMs: number;
  error?: string;
}

/** Source scraper interface — each source implements this */
export interface SourceScraper {
  name: string;
  slug: string;
  url: string;
  type: 'news' | 'government';
  language: 'en' | 'ne';
  scrape: () => Promise<ScrapedArticle[]>;
}

/** Scrape run record (mirrors Supabase scrape_runs table) */
export interface ScrapeRun {
  id: string;
  run_type: 'scheduled' | 'manual' | 'retry';
  trigger_source: 'github_actions' | 'vercel_cron' | 'manual';
  started_at: string;
  finished_at?: string;
  status: 'running' | 'completed' | 'partial' | 'failed';
  sources_attempted: number;
  sources_succeeded: number;
  articles_found: number;
  articles_new: number;
  error_log: Array<{ source: string; error: string; timestamp: string }>;
}

/** Data source registry record */
export interface DataSource {
  id: string;
  name: string;
  slug: string;
  url: string;
  source_type: 'news' | 'government';
  scrape_config: Record<string, unknown>;
  language: 'en' | 'ne';
  is_active: boolean;
  last_scraped_at?: string;
  last_success_at?: string;
  consecutive_failures: number;
  avg_response_ms?: number;
}

/** Article matched to promises */
export interface MatchedArticle {
  promise_ids: string[];
  confidence: number;
  classification: 'confirms' | 'contradicts' | 'neutral';
}
