-- Impact Predictions Cache
-- Stores AI-generated impact predictions for each commitment.
-- TTL is managed in application code (7 days default).

CREATE TABLE IF NOT EXISTS impact_predictions (
  commitment_id TEXT PRIMARY KEY REFERENCES promises(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  summary_ne TEXT,
  impacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  before_after JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_completion TEXT,
  primary_beneficiaries JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impact_predictions_generated_at
  ON impact_predictions(generated_at);

ALTER TABLE impact_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read impact predictions"
  ON impact_predictions FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage impact predictions"
  ON impact_predictions FOR ALL
  USING (auth.role() = 'service_role');
