-- Daily Promise Activity Tracking
-- Rollup table for "Was any work done today?" per promise

CREATE TABLE IF NOT EXISTS promise_daily_activity (
  promise_id TEXT NOT NULL,
  date DATE NOT NULL,
  signal_count INTEGER DEFAULT 0,
  confirms_count INTEGER DEFAULT 0,
  contradicts_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  top_signal_ids UUID[] DEFAULT '{}',
  top_headline TEXT,
  max_confidence REAL DEFAULT 0,
  source_types TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (promise_id, date)
);

CREATE INDEX IF NOT EXISTS idx_pda_date ON promise_daily_activity(date DESC);
CREATE INDEX IF NOT EXISTS idx_pda_promise ON promise_daily_activity(promise_id);
CREATE INDEX IF NOT EXISTS idx_pda_signal_count ON promise_daily_activity(date, signal_count DESC);

ALTER TABLE promises ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS last_activity_signal_count INTEGER DEFAULT 0;

ALTER TABLE promise_daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pda_public_read" ON promise_daily_activity FOR SELECT USING (true);
CREATE POLICY "pda_service_write" ON promise_daily_activity FOR ALL USING (true) WITH CHECK (true);
