-- Nepal Najar — Supabase Migration
-- Run this in the Supabase SQL Editor to create all tables.

-- ═══════════════════════════════════════════════
-- 1. PROMISES — mirrors GovernmentPromise type
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS promises (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_ne TEXT NOT NULL,
  category TEXT NOT NULL,
  category_ne TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started',
  progress INTEGER NOT NULL DEFAULT 0,
  linked_projects INTEGER NOT NULL DEFAULT 0,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  last_update DATE,
  description TEXT,
  description_ne TEXT,
  trust_level TEXT NOT NULL DEFAULT 'unverified',
  deadline DATE,
  estimated_budget_npr BIGINT,
  spent_npr BIGINT,
  funding_source TEXT,
  funding_source_ne TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- 2. SCRAPED ARTICLES — real news & government data
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scraped_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  headline TEXT NOT NULL,
  headline_ne TEXT,
  content_excerpt TEXT,
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  language TEXT NOT NULL DEFAULT 'en',
  promise_ids TEXT[] DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.0,
  classification TEXT DEFAULT 'neutral',
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraped_articles_source ON scraped_articles(source_name);
CREATE INDEX IF NOT EXISTS idx_scraped_articles_processed ON scraped_articles(is_processed);
CREATE INDEX IF NOT EXISTS idx_scraped_articles_scraped_at ON scraped_articles(scraped_at DESC);

-- ═══════════════════════════════════════════════
-- 3. SCRAPE RUNS — execution history
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL DEFAULT 'manual',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  sources_attempted INTEGER NOT NULL DEFAULT 0,
  sources_succeeded INTEGER NOT NULL DEFAULT 0,
  articles_found INTEGER NOT NULL DEFAULT 0,
  articles_new INTEGER NOT NULL DEFAULT 0,
  error_log JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_started ON scrape_runs(started_at DESC);

-- ═══════════════════════════════════════════════
-- 4. DATA SOURCES — scraping target registry
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  scrape_config JSONB NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_scraped_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  avg_response_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- 5. PROMISE UPDATES — changelog from scraping
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS promise_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id TEXT NOT NULL REFERENCES promises(id),
  article_id UUID REFERENCES scraped_articles(id),
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promise_updates_promise ON promise_updates(promise_id);

-- ═══════════════════════════════════════════════
-- RPC: increment consecutive failures for a source
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_source_failures(source_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE data_sources
  SET consecutive_failures = consecutive_failures + 1,
      last_scraped_at = NOW()
  WHERE slug = source_slug;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE promise_updates ENABLE ROW LEVEL SECURITY;

-- Allow public read for promises and articles (anon key)
CREATE POLICY "Public read promises" ON promises FOR SELECT USING (true);
CREATE POLICY "Public read articles" ON scraped_articles FOR SELECT USING (true);

-- Service role can do everything (used by API routes)
CREATE POLICY "Service full access promises" ON promises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access articles" ON scraped_articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access runs" ON scrape_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access sources" ON data_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access updates" ON promise_updates FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════
-- 6. GOVERNMENT ORG UNITS — public accountability structure
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS government_org_units (
  unit_id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES government_org_units(unit_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ne TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  lead_title TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  responsibility TEXT NOT NULL,
  scope TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_status TEXT NOT NULL DEFAULT 'fallback',
  source_title TEXT,
  source_snippet TEXT,
  source_checked_at TIMESTAMPTZ,
  source_fetched_from TEXT,
  source_matches TEXT[] NOT NULL DEFAULT '{}',
  promise_categories TEXT[] NOT NULL DEFAULT '{}',
  tracked_projects TEXT[] NOT NULL DEFAULT '{}',
  achievements JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_government_org_units_parent ON government_org_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_government_org_units_type ON government_org_units(unit_type);
CREATE INDEX IF NOT EXISTS idx_government_org_units_checked_at ON government_org_units(source_checked_at DESC);

ALTER TABLE government_org_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read government org units" ON government_org_units FOR SELECT USING (true);
CREATE POLICY "Service full access government org units" ON government_org_units FOR ALL USING (true) WITH CHECK (true);
