-- Nepal Najar — dynamic commitment public model
-- Adds a reviewed/public boundary so the intelligence engine can discover
-- candidates without leaking them straight into the public tracker.

ALTER TABLE promises ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS summary_ne TEXT;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'national';
ALTER TABLE promises ADD COLUMN IF NOT EXISTS actors TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE promises ADD COLUMN IF NOT EXISTS review_state TEXT NOT NULL DEFAULT 'reviewed';
ALTER TABLE promises ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS source_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promises ADD COLUMN IF NOT EXISTS last_signal_at TIMESTAMPTZ;

UPDATE promises
SET
  summary = COALESCE(summary, description),
  summary_ne = COALESCE(summary_ne, description_ne),
  scope = COALESCE(scope, 'national'),
  review_state = COALESCE(review_state, 'reviewed'),
  is_public = COALESCE(is_public, TRUE),
  source_count = COALESCE(source_count, 0);

CREATE INDEX IF NOT EXISTS idx_promises_review_state ON promises(review_state);
CREATE INDEX IF NOT EXISTS idx_promises_is_public ON promises(is_public);
CREATE INDEX IF NOT EXISTS idx_promises_scope ON promises(scope);
CREATE INDEX IF NOT EXISTS idx_promises_last_signal_at ON promises(last_signal_at DESC);
