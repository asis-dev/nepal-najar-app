-- Intelligence Engine Schema
-- Nepal Najar — comprehensive intelligence tracking for 35 government promises

-- Officials tracking
CREATE TABLE IF NOT EXISTS officials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_ne TEXT,
  title TEXT NOT NULL,
  title_ne TEXT,
  ministry TEXT,
  party TEXT,
  province_number INTEGER,
  social_twitter TEXT,
  social_facebook TEXT,
  social_youtube TEXT,
  promise_ids INTEGER[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Intelligence sources (expanded beyond just scrapers)
CREATE TABLE IF NOT EXISTS intelligence_sources (
  id TEXT PRIMARY KEY, -- slug like 'youtube-pm-channel'
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'youtube_channel', 'youtube_search', 'twitter_account', 'facebook_page', 'google_news', 'government_site', 'parliament', 'gazette', 'podcast')),
  url TEXT NOT NULL,
  config JSONB DEFAULT '{}', -- source-specific config (channel_id, search terms, etc.)
  priority INTEGER DEFAULT 5, -- 1=highest priority, 10=lowest
  related_promise_ids INTEGER[] DEFAULT '{}',
  related_official_ids INTEGER[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_found_at TIMESTAMPTZ,
  check_frequency_hours INTEGER DEFAULT 12,
  consecutive_failures INTEGER DEFAULT 0,
  total_signals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Raw signals (before AI processing)
CREATE TABLE IF NOT EXISTS intelligence_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id TEXT REFERENCES intelligence_sources(id),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('article', 'video', 'tweet', 'post', 'document', 'speech', 'press_release', 'budget_doc', 'hansard')),
  external_id TEXT, -- YouTube video ID, tweet ID, etc.
  title TEXT NOT NULL,
  title_ne TEXT,
  content TEXT, -- full text content
  content_summary TEXT, -- AI-generated summary
  url TEXT NOT NULL,
  author TEXT,
  author_official_id INTEGER REFERENCES officials(id),
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  -- Processing state
  tier1_processed BOOLEAN DEFAULT false,
  tier2_processed BOOLEAN DEFAULT false,
  tier3_processed BOOLEAN DEFAULT false,
  -- AI analysis results
  relevance_score REAL DEFAULT 0, -- 0-1 how relevant to any promise
  matched_promise_ids INTEGER[] DEFAULT '{}',
  classification TEXT, -- 'confirms', 'contradicts', 'neutral', 'budget_allocation', 'policy_change', 'statement'
  confidence REAL DEFAULT 0,
  reasoning TEXT, -- AI reasoning chain
  extracted_data JSONB DEFAULT '{}', -- structured data: amounts, dates, percentages
  -- Cross-reference
  corroborated_by UUID[], -- other signal IDs that confirm this
  contradicted_by UUID[], -- other signal IDs that contradict this
  -- Metadata
  language TEXT DEFAULT 'en',
  media_type TEXT, -- 'text', 'video', 'audio', 'pdf'
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}', -- extra data (view count, likes, etc.)
  UNIQUE(source_id, external_id)
);

-- Sweep runs (track each intelligence sweep)
CREATE TABLE IF NOT EXISTS intelligence_sweeps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sweep_type TEXT NOT NULL CHECK (sweep_type IN ('scheduled', 'manual', 'targeted')),
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  -- Stats
  sources_checked INTEGER DEFAULT 0,
  signals_discovered INTEGER DEFAULT 0,
  signals_relevant INTEGER DEFAULT 0,
  promises_updated INTEGER DEFAULT 0,
  -- Tier breakdown
  tier1_signals INTEGER DEFAULT 0,
  tier2_enriched INTEGER DEFAULT 0,
  tier3_analyzed INTEGER DEFAULT 0,
  -- Cost tracking
  ai_tokens_used INTEGER DEFAULT 0,
  ai_cost_usd REAL DEFAULT 0,
  -- Details
  error_log JSONB DEFAULT '[]',
  summary TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signals_source ON intelligence_signals(source_id);
CREATE INDEX IF NOT EXISTS idx_signals_published ON intelligence_signals(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_relevance ON intelligence_signals(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_signals_tier ON intelligence_signals(tier1_processed, tier2_processed, tier3_processed);
CREATE INDEX IF NOT EXISTS idx_signals_promises ON intelligence_signals USING GIN(matched_promise_ids);
CREATE INDEX IF NOT EXISTS idx_officials_ministry ON officials(ministry);
CREATE INDEX IF NOT EXISTS idx_sources_type ON intelligence_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_active ON intelligence_sources(is_active, last_checked_at);

-- Enable RLS
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_sweeps ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read officials" ON officials FOR SELECT USING (true);
CREATE POLICY "Public read sources" ON intelligence_sources FOR SELECT USING (true);
CREATE POLICY "Public read signals" ON intelligence_signals FOR SELECT USING (true);
CREATE POLICY "Public read sweeps" ON intelligence_sweeps FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service write officials" ON officials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write sources" ON intelligence_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write signals" ON intelligence_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write sweeps" ON intelligence_sweeps FOR ALL USING (true) WITH CHECK (true);
