-- Intelligence review workflow + quality metrics

ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS review_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected','edited')),
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_signals_review_required
  ON intelligence_signals(review_required, review_status, confidence);

CREATE TABLE IF NOT EXISTS intelligence_review_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved','rejected','edited')),
  reviewer TEXT,
  previous_classification TEXT,
  new_classification TEXT,
  previous_confidence REAL,
  new_confidence REAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_audit_signal
  ON intelligence_review_audit(signal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_quality_daily (
  date DATE PRIMARY KEY,
  total_signals INTEGER DEFAULT 0,
  relevant_signals INTEGER DEFAULT 0,
  neutral_signals INTEGER DEFAULT 0,
  confirms_signals INTEGER DEFAULT 0,
  contradicts_signals INTEGER DEFAULT 0,
  avg_confidence REAL DEFAULT 0,
  review_required_count INTEGER DEFAULT 0,
  review_overrides_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
