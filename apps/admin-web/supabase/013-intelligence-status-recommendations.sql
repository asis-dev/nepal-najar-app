-- Nepal Najar — persisted status recommendations + expanded job types

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

CREATE TABLE IF NOT EXISTS intelligence_status_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id TEXT NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
  promise_title TEXT,
  current_status TEXT NOT NULL,
  recommended_status TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  signal_count INTEGER NOT NULL DEFAULT 0,
  confirms_count INTEGER NOT NULL DEFAULT 0,
  contradicts_count INTEGER NOT NULL DEFAULT 0,
  review_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_state IN ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  source_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_recommendations_review_state
  ON intelligence_status_recommendations(review_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_recommendations_promise
  ON intelligence_status_recommendations(promise_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_status_recommendations_pending_unique
  ON intelligence_status_recommendations(promise_id)
  WHERE review_state = 'pending';
