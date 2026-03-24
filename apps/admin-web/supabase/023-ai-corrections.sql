-- 023: AI Corrections / Feedback Loop
-- Stores human corrections to AI classifications so the system learns over time.

CREATE TABLE IF NOT EXISTS ai_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  correction_type TEXT NOT NULL, -- 'merge', 'reclassify', 'wrong_commitment', 'not_a_commitment', 'wrong_ministry', 'wrong_progress', 'custom'
  signal_id UUID REFERENCES intelligence_signals(id),
  commitment_id INTEGER,
  note TEXT NOT NULL, -- the human's correction note
  action_taken TEXT, -- what was done: 'merged_with_15', 'reclassified_to_neutral', etc.
  original_values JSONB, -- what the AI had before
  corrected_values JSONB, -- what it should be
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  ai_acknowledged BOOLEAN DEFAULT false -- has the AI incorporated this feedback?
);

ALTER TABLE ai_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage corrections" ON ai_corrections
FOR ALL TO service_role USING (true);

CREATE POLICY "Authenticated can read corrections" ON ai_corrections
FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_ai_corrections_type ON ai_corrections(correction_type);
CREATE INDEX idx_ai_corrections_signal ON ai_corrections(signal_id);
CREATE INDEX idx_ai_corrections_commitment ON ai_corrections(commitment_id);
