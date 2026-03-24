-- Community-discovered commitments
-- Stores commitments discovered by the intelligence pipeline and approved by reviewers.
-- These are merged with hardcoded commitments at read time via commitments-merged.ts.

CREATE TABLE IF NOT EXISTS community_commitments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  title_ne TEXT,
  description TEXT,
  description_ne TEXT,
  category TEXT NOT NULL,
  category_ne TEXT,
  status TEXT DEFAULT 'not_started',
  progress INTEGER DEFAULT 0,
  assigned_to TEXT,
  department TEXT,
  scope TEXT DEFAULT 'national',
  actors TEXT[] DEFAULT '{}',
  estimated_budget_npr NUMERIC,
  source_signal_id UUID REFERENCES intelligence_signals(id),
  discovered_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_community_commitments_status ON community_commitments(status);
CREATE INDEX idx_community_commitments_category ON community_commitments(category);

ALTER TABLE community_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved commitments"
ON community_commitments FOR SELECT TO anon, authenticated
USING (status != 'rejected');

CREATE POLICY "Service role manages commitments"
ON community_commitments FOR ALL TO service_role USING (true);
