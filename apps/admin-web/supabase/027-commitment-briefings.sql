-- Commitment Briefings Cache
-- Stores AI-generated briefings for each commitment to avoid re-generating on every page load.
-- TTL managed in application code (24h default).

CREATE TABLE IF NOT EXISTS commitment_briefings (
  commitment_id TEXT PRIMARY KEY REFERENCES promises(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  short_summary TEXT NOT NULL,
  full_briefing JSONB NOT NULL DEFAULT '{}',
  full_briefing_ne JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signal_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for TTL-based cache invalidation queries
CREATE INDEX IF NOT EXISTS idx_commitment_briefings_generated_at
  ON commitment_briefings(generated_at);

-- RLS: allow public reads (anon key), restrict writes to service role
ALTER TABLE commitment_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read briefings"
  ON commitment_briefings FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage briefings"
  ON commitment_briefings FOR ALL
  USING (auth.role() = 'service_role');
