-- Nepal Najar — OpenClaw pilot tracker summaries

CREATE TABLE IF NOT EXISTS pilot_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_days INTEGER NOT NULL DEFAULT 14 CHECK (window_days >= 1 AND window_days <= 90),
  summary_headline TEXT NOT NULL,
  summary_body TEXT NOT NULL,
  overall_health TEXT NOT NULL CHECK (overall_health IN ('strong', 'watch', 'needs_attention')),
  confidence REAL NOT NULL DEFAULT 0.5,
  wins JSONB NOT NULL DEFAULT '[]'::jsonb,
  watch_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider TEXT,
  model TEXT,
  generated_by_job_id UUID REFERENCES intelligence_jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pilot_summaries_created_at
  ON pilot_summaries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_summaries_window_created
  ON pilot_summaries(window_days, created_at DESC);

ALTER TABLE pilot_summaries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service write pilot summaries" ON pilot_summaries FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE intelligence_jobs
  DROP CONSTRAINT IF EXISTS intelligence_jobs_job_type_check;

ALTER TABLE intelligence_jobs
  ADD CONSTRAINT intelligence_jobs_job_type_check
  CHECK (
    job_type IN (
      'process_signals_batch',
      'discover_commitment',
      'transcribe_url',
      'run_status_pipeline',
      'review_feedback',
      'summarize_pilot_tracker'
    )
  );
