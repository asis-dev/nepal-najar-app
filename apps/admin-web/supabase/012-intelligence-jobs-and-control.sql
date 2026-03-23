-- Nepal Najar — intelligence jobs + stronger commitment control

CREATE TABLE IF NOT EXISTS intelligence_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (
    job_type IN (
      'process_signals_batch',
      'discover_commitment',
      'transcribe_url',
      'run_status_pipeline',
      'review_feedback',
      'summarize_pilot_tracker'
    )
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'canceled')),
  priority INTEGER NOT NULL DEFAULT 0,
  dedupe_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_jobs_queue
  ON intelligence_jobs(status, available_at, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_intelligence_jobs_dedupe
  ON intelligence_jobs(dedupe_key);

ALTER TABLE intelligence_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service write jobs" ON intelligence_jobs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS origin_signal_id UUID REFERENCES intelligence_signals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merged_into_id TEXT REFERENCES promises(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_promises_published_at ON promises(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_promises_merged_into_id ON promises(merged_into_id);
