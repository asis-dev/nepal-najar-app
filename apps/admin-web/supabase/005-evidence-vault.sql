-- Evidence Vault Schema
-- Nepal Najar — quotes, statements, and evidence from officials about the 35 promises

CREATE TABLE IF NOT EXISTS evidence_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- WHO said it
  official_name TEXT NOT NULL,
  official_title TEXT,
  official_id UUID REFERENCES officials(id),
  -- WHAT they said
  quote_text TEXT NOT NULL,
  quote_summary TEXT, -- brief AI-generated summary
  quote_context TEXT, -- surrounding context
  language TEXT DEFAULT 'en', -- 'en' or 'ne'
  -- WHERE they said it
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'facebook', 'twitter', 'tiktok', 'news_interview', 'press_conference', 'parliament', 'official_statement')),
  source_url TEXT NOT NULL,
  source_title TEXT, -- video/article/post title
  timestamp_seconds INTEGER, -- for video: exact second where quote appears
  timestamp_url TEXT, -- e.g. youtube.com/watch?v=xxx&t=123
  -- WHEN
  spoken_date TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT now(),
  -- ABOUT which promise
  promise_ids INTEGER[] DEFAULT '{}',
  -- TYPE of statement
  statement_type TEXT CHECK (statement_type IN ('commitment', 'claim', 'excuse', 'update', 'contradiction', 'denial', 'deflection', 'acknowledgment')),
  -- VERIFICATION
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'false')),
  corroborating_evidence JSONB DEFAULT '[]', -- links to other evidence
  -- METADATA
  signal_id UUID REFERENCES intelligence_signals(id),
  sentiment REAL, -- -1.0 to 1.0
  importance_score REAL DEFAULT 0.5,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_official ON evidence_vault(official_name);
CREATE INDEX IF NOT EXISTS idx_evidence_promises ON evidence_vault USING GIN(promise_ids);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_vault(statement_type);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence_vault(source_type);
CREATE INDEX IF NOT EXISTS idx_evidence_date ON evidence_vault(spoken_date DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_verification ON evidence_vault(verification_status);

-- RLS
ALTER TABLE evidence_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read evidence" ON evidence_vault FOR SELECT USING (true);
CREATE POLICY "Service write evidence" ON evidence_vault FOR ALL USING (auth.role() = 'service_role');
