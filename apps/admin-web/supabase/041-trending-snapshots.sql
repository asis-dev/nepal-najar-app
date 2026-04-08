-- Persisted trending snapshots for fast homepage pulse/trending reads.
-- Avoids heavy on-demand recomputation on public requests.

CREATE TABLE IF NOT EXISTS intelligence_trending_snapshots (
  id BIGSERIAL PRIMARY KEY,
  period TEXT NOT NULL DEFAULT '24h',
  pulse INTEGER NOT NULL DEFAULT 0 CHECK (pulse >= 0 AND pulse <= 100),
  trending_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  signal_count INTEGER NOT NULL DEFAULT 0,
  source_type_count INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trending_snapshots_period_computed
  ON intelligence_trending_snapshots(period, computed_at DESC);

-- Speed up trending compute scans over recent intelligence_signals rows.
CREATE INDEX IF NOT EXISTS idx_signals_discovered_relevance
  ON intelligence_signals(discovered_at DESC, relevance_score DESC);

-- Helps duplicate filtering when metadata.duplicate_of is used.
CREATE INDEX IF NOT EXISTS idx_signals_duplicate_marker
  ON intelligence_signals((metadata->>'duplicate_of'));

ALTER TABLE intelligence_trending_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read trending snapshots" ON intelligence_trending_snapshots;
CREATE POLICY "Public read trending snapshots" ON intelligence_trending_snapshots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service write trending snapshots" ON intelligence_trending_snapshots;
CREATE POLICY "Service write trending snapshots" ON intelligence_trending_snapshots
  FOR ALL USING (true) WITH CHECK (true);
