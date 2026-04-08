-- 037: Commitment timelines + effort tier classification + time-adjusted scoring
-- Supports AI-powered time-adjusted scoring system

-- 1. Commitment timelines — AI-assigned expected timelines for each commitment
CREATE TABLE IF NOT EXISTS commitment_timelines (
  commitment_id INTEGER PRIMARY KEY,
  complexity_tier TEXT NOT NULL CHECK (complexity_tier IN ('quick-win', 'medium', 'long-term', 'structural')),
  expected_start_by_day INTEGER NOT NULL,
  expected_completion_by_day INTEGER NOT NULL,
  start_milestones TEXT[] DEFAULT '{}',
  completion_milestones TEXT[] DEFAULT '{}',
  rationale TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by_model TEXT,
  admin_override BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Effort tier on signals — classifies signal depth (intent/action/delivery)
ALTER TABLE intelligence_signals
  ADD COLUMN IF NOT EXISTS effort_tier TEXT
    CHECK (effort_tier IN ('intent', 'action', 'delivery'));

-- Backfill effort_tier from existing classifications
UPDATE intelligence_signals
SET effort_tier = CASE
  WHEN classification = 'statement' THEN 'intent'
  WHEN classification IN ('policy_change', 'budget_allocation') THEN 'action'
  WHEN classification IN ('confirms', 'contradicts') THEN 'action'
  ELSE 'intent'
END
WHERE effort_tier IS NULL AND classification IS NOT NULL;

-- 3. Daily time-adjusted scores per commitment
CREATE TABLE IF NOT EXISTS time_adjusted_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commitment_id INTEGER NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT now(),
  day_in_office INTEGER NOT NULL,
  complexity_tier TEXT NOT NULL,
  timeline_phase TEXT NOT NULL CHECK (timeline_phase IN ('pre-start', 'should-start', 'in-window', 'overdue')),
  trajectory TEXT NOT NULL CHECK (trajectory IN ('ahead', 'on-track', 'behind', 'overdue', 'too-early')),
  effort_score REAL NOT NULL DEFAULT 0,
  time_adjusted_score REAL NOT NULL DEFAULT 50,
  intent_signals INTEGER DEFAULT 0,
  action_signals INTEGER DEFAULT 0,
  delivery_signals INTEGER DEFAULT 0,
  data_confidence TEXT NOT NULL DEFAULT 'insufficient',
  UNIQUE(commitment_id, day_in_office)
);

-- 4. Daily government score snapshot
CREATE TABLE IF NOT EXISTS government_score_daily (
  date DATE PRIMARY KEY,
  day_in_office INTEGER NOT NULL,
  score REAL NOT NULL,
  grade TEXT NOT NULL,
  quick_win_score REAL,
  medium_score REAL,
  long_term_score REAL,
  structural_score REAL,
  ahead_count INTEGER DEFAULT 0,
  on_track_count INTEGER DEFAULT 0,
  behind_count INTEGER DEFAULT 0,
  overdue_count INTEGER DEFAULT 0,
  too_early_count INTEGER DEFAULT 0,
  graded_commitments INTEGER DEFAULT 0,
  data_confidence TEXT DEFAULT 'insufficient',
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_adjusted_scores_day ON time_adjusted_scores(day_in_office);
CREATE INDEX IF NOT EXISTS idx_time_adjusted_scores_commitment ON time_adjusted_scores(commitment_id);
CREATE INDEX IF NOT EXISTS idx_signals_effort_tier ON intelligence_signals(effort_tier) WHERE effort_tier IS NOT NULL;
