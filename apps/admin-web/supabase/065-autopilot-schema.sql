-- ============================================================
-- 065: AI Autopilot schema additions
-- Adds tables for triage, drafts, submissions, document
-- extractions, field provenance, and feedback tracking.
-- ============================================================

-- 1. Service task triage results
CREATE TABLE IF NOT EXISTS service_task_triage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES service_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  domain text NOT NULL DEFAULT 'general',
  subdomain text,
  urgency text NOT NULL DEFAULT 'routine',
  severity text NOT NULL DEFAULT 'low',
  target_member_type text DEFAULT 'self',
  safe_next_action text,
  requires_emergency boolean DEFAULT false,
  clarification_needed boolean DEFAULT false,
  clarification_question text,
  suggested_service_slugs text[] DEFAULT '{}',
  confidence numeric(3,2) DEFAULT 0,
  triage_reason text,
  safety_flags text[] DEFAULT '{}',
  raw_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_triage_user ON service_task_triage(user_id);
CREATE INDEX IF NOT EXISTS idx_triage_task ON service_task_triage(task_id);

-- 2. Service task drafts (AI-generated form drafts)
CREATE TABLE IF NOT EXISTS service_task_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES service_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  service_slug text NOT NULL,
  service_title text,
  draft_data jsonb NOT NULL DEFAULT '{}',
  completeness integer DEFAULT 0,
  ready_for_review boolean DEFAULT false,
  missing_required text[] DEFAULT '{}',
  warnings text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_drafts_user ON service_task_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_task ON service_task_drafts(task_id);

-- 3. Service submissions (approved and submitted applications)
CREATE TABLE IF NOT EXISTS service_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES service_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  service_slug text NOT NULL,
  reference_number text,
  reference_type text DEFAULT 'application_id',
  submission_method text DEFAULT 'assisted',
  submitted_values jsonb DEFAULT '{}',
  submission_target text,
  status text DEFAULT 'submitted',
  submitted_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON service_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_task ON service_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_ref ON service_submissions(reference_number);

-- 4. Submission attempts (audit trail)
CREATE TABLE IF NOT EXISTS submission_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES service_tasks(id) ON DELETE CASCADE,
  success boolean DEFAULT false,
  reference_number text,
  error_message text,
  method text,
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_task ON submission_attempts(task_id);

-- 5. Document extractions (OCR/AI extraction results)
CREATE TABLE IF NOT EXISTS document_extractions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  vault_doc_id uuid,
  document_type text NOT NULL,
  classification_confidence numeric(3,2) DEFAULT 0,
  extracted_fields jsonb DEFAULT '{}',
  raw_text text,
  suggested_profile_updates jsonb DEFAULT '{}',
  suggested_workflows text[] DEFAULT '{}',
  warnings text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extractions_user ON document_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_extractions_vault ON document_extractions(vault_doc_id);

-- 6. Profile field provenance (tracks where each profile field value came from)
CREATE TABLE IF NOT EXISTS profile_field_provenance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  field_name text NOT NULL,
  field_value text,
  source text NOT NULL DEFAULT 'user_input',
  confidence numeric(3,2) DEFAULT 1.0,
  source_ref text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_provenance_user ON profile_field_provenance(user_id);

-- 7. Service feedback (learning loop)
CREATE TABLE IF NOT EXISTS service_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_id uuid,
  service_slug text,
  feedback_type text NOT NULL,
  original_value text,
  corrected_value text,
  user_comment text,
  context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON service_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON service_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_service ON service_feedback(service_slug);

-- 8. Add new columns to service_tasks if they don't exist
DO $$
BEGIN
  -- Triage-related columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'triage_domain') THEN
    ALTER TABLE service_tasks ADD COLUMN triage_domain text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'triage_urgency') THEN
    ALTER TABLE service_tasks ADD COLUMN triage_urgency text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'triage_severity') THEN
    ALTER TABLE service_tasks ADD COLUMN triage_severity text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'triage_safety_flags') THEN
    ALTER TABLE service_tasks ADD COLUMN triage_safety_flags text[] DEFAULT '{}';
  END IF;

  -- Submission-related columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'submission_ref') THEN
    ALTER TABLE service_tasks ADD COLUMN submission_ref text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'submission_ref_type') THEN
    ALTER TABLE service_tasks ADD COLUMN submission_ref_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'submitted_at') THEN
    ALTER TABLE service_tasks ADD COLUMN submitted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'sla_deadline') THEN
    ALTER TABLE service_tasks ADD COLUMN sla_deadline timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_tasks' AND column_name = 'draft_completeness') THEN
    ALTER TABLE service_tasks ADD COLUMN draft_completeness integer DEFAULT 0;
  END IF;
END $$;

-- 9. RLS policies for new tables

ALTER TABLE service_task_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_task_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_field_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_feedback ENABLE ROW LEVEL SECURITY;

-- Triage: users see own, service role sees all
DROP POLICY IF EXISTS "triage_own" ON service_task_triage;
CREATE POLICY "triage_own" ON service_task_triage FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "triage_service" ON service_task_triage;
CREATE POLICY "triage_service" ON service_task_triage FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Drafts
DROP POLICY IF EXISTS "drafts_own" ON service_task_drafts;
CREATE POLICY "drafts_own" ON service_task_drafts FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "drafts_service" ON service_task_drafts;
CREATE POLICY "drafts_service" ON service_task_drafts FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Submissions
DROP POLICY IF EXISTS "submissions_own" ON service_submissions;
CREATE POLICY "submissions_own" ON service_submissions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "submissions_service" ON service_submissions;
CREATE POLICY "submissions_service" ON service_submissions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Attempts
DROP POLICY IF EXISTS "attempts_own" ON submission_attempts;
CREATE POLICY "attempts_own" ON submission_attempts FOR ALL USING (
  task_id IN (SELECT id FROM service_tasks WHERE owner_id = auth.uid())
);
DROP POLICY IF EXISTS "attempts_service" ON submission_attempts;
CREATE POLICY "attempts_service" ON submission_attempts FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Extractions
DROP POLICY IF EXISTS "extractions_own" ON document_extractions;
CREATE POLICY "extractions_own" ON document_extractions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "extractions_service" ON document_extractions;
CREATE POLICY "extractions_service" ON document_extractions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Provenance
DROP POLICY IF EXISTS "provenance_own" ON profile_field_provenance;
CREATE POLICY "provenance_own" ON profile_field_provenance FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "provenance_service" ON profile_field_provenance;
CREATE POLICY "provenance_service" ON profile_field_provenance FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Feedback
DROP POLICY IF EXISTS "feedback_own" ON service_feedback;
CREATE POLICY "feedback_own" ON service_feedback FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "feedback_service" ON service_feedback;
CREATE POLICY "feedback_service" ON service_feedback FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
