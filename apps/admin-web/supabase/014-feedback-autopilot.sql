-- 014: Feedback autopilot review fields
-- Stores AI triage, approval state, and proposed actions for user feedback.

ALTER TABLE user_feedback
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS ai_usefulness_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS ai_validity_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS ai_actionability_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS ai_priority TEXT CHECK (ai_priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS ai_recommendation TEXT CHECK (
    ai_recommendation IN (
      'ignore',
      'clarify',
      'content_update',
      'bug_fix',
      'feature_request',
      'investigate'
    )
  ),
  ADD COLUMN IF NOT EXISTS ai_review_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    ai_review_status IN ('pending', 'reviewed', 'approved', 'rejected', 'applied')
  ),
  ADD COLUMN IF NOT EXISTS ai_proposed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_handoff_prompt TEXT,
  ADD COLUMN IF NOT EXISTS ai_review_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_review_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_applied_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_feedback_ai_review_status
  ON user_feedback(ai_review_status);

CREATE INDEX IF NOT EXISTS idx_user_feedback_status_created
  ON user_feedback(status, created_at DESC);
