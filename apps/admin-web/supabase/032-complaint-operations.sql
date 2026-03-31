-- ============================================================
-- 032: Complaint Operations Layer (SLA, assignment, escalation, dashboard support)
-- ============================================================

-- 1) Expand core complaint record for SLA + ownership workflow
ALTER TABLE civic_complaints
  ADD COLUMN IF NOT EXISTS assigned_department_key TEXT REFERENCES complaint_departments(key),
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_policy_key TEXT,
  ADD COLUMN IF NOT EXISTS sla_target_hours INTEGER CHECK (sla_target_hours IS NULL OR sla_target_hours >= 1),
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS department_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0 CHECK (escalation_level >= 0),
  ADD COLUMN IF NOT EXISTS reopened_count INTEGER NOT NULL DEFAULT 0 CHECK (reopened_count >= 0),
  ADD COLUMN IF NOT EXISTS citizen_satisfaction INTEGER CHECK (citizen_satisfaction BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS citizen_satisfaction_note TEXT,
  ADD COLUMN IF NOT EXISTS satisfaction_submitted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_civic_complaints_assigned_department
  ON civic_complaints(assigned_department_key, status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_complaints_assigned_user
  ON civic_complaints(assigned_user_id, status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_complaints_sla_due
  ON civic_complaints(sla_due_at, status);

-- 2) Department members (official routing ownership)
CREATE TABLE IF NOT EXISTS complaint_department_members (
  department_key TEXT NOT NULL REFERENCES complaint_departments(key) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'agent' CHECK (member_role IN ('owner', 'agent', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (department_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_complaint_department_members_user
  ON complaint_department_members(user_id, is_active);

-- 3) SLA policy registry
CREATE TABLE IF NOT EXISTS complaint_sla_policies (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  issue_type TEXT CHECK (issue_type IS NULL OR issue_type IN (
    'roads', 'water', 'electricity', 'health', 'education',
    'sanitation', 'internet', 'safety', 'employment', 'environment', 'other'
  )),
  severity TEXT CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'critical')),
  department_key TEXT REFERENCES complaint_departments(key) ON DELETE SET NULL,
  ack_hours INTEGER NOT NULL CHECK (ack_hours >= 1),
  resolve_hours INTEGER NOT NULL CHECK (resolve_hours >= 1),
  escalation_hours INTEGER NOT NULL CHECK (escalation_hours >= 1),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO complaint_sla_policies (
  key, label, issue_type, severity, department_key,
  ack_hours, resolve_hours, escalation_hours, priority
)
VALUES
  ('default-critical', 'Critical complaints', NULL, 'critical', NULL, 2, 24, 6, 100),
  ('default-high', 'High severity complaints', NULL, 'high', NULL, 6, 72, 24, 80),
  ('default-medium', 'Medium severity complaints', NULL, 'medium', NULL, 12, 120, 48, 60),
  ('default-low', 'Low severity complaints', NULL, 'low', NULL, 24, 168, 72, 40),
  ('roads-high', 'Road hazards', 'roads', 'high', 'infrastructure', 4, 72, 24, 120),
  ('roads-medium', 'Road maintenance', 'roads', 'medium', 'infrastructure', 12, 168, 72, 95),
  ('water-high', 'Water outage urgent', 'water', 'high', 'water', 3, 48, 12, 125),
  ('sanitation-medium', 'Sanitation issues', 'sanitation', 'medium', 'sanitation', 8, 96, 36, 110),
  ('electricity-high', 'Power outage urgent', 'electricity', 'high', 'electricity', 3, 36, 12, 125),
  ('safety-critical', 'Public safety emergency', 'safety', 'critical', 'safety', 1, 12, 4, 150)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  issue_type = EXCLUDED.issue_type,
  severity = EXCLUDED.severity,
  department_key = EXCLUDED.department_key,
  ack_hours = EXCLUDED.ack_hours,
  resolve_hours = EXCLUDED.resolve_hours,
  escalation_hours = EXCLUDED.escalation_hours,
  priority = EXCLUDED.priority,
  is_active = TRUE,
  updated_at = NOW();

-- 4) Assignment history
CREATE TABLE IF NOT EXISTS complaint_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES civic_complaints(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL REFERENCES complaint_departments(key),
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignment_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_complaint_assignments_active_one
  ON complaint_assignments(complaint_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_complaint_assignments_department
  ON complaint_assignments(department_key, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_assignee
  ON complaint_assignments(assignee_user_id, is_active, created_at DESC);

-- 5) Escalation history
CREATE TABLE IF NOT EXISTS complaint_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES civic_complaints(id) ON DELETE CASCADE,
  from_department_key TEXT REFERENCES complaint_departments(key),
  to_department_key TEXT NOT NULL REFERENCES complaint_departments(key),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'sla_breach', 'stale', 'review')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 2000),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaint_escalations_case
  ON complaint_escalations(complaint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_escalations_status
  ON complaint_escalations(status, created_at DESC);

-- 6) Timestamp triggers
CREATE OR REPLACE FUNCTION update_complaint_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_assignments_updated_at ON complaint_assignments;
CREATE TRIGGER trg_complaint_assignments_updated_at
  BEFORE UPDATE ON complaint_assignments
  FOR EACH ROW EXECUTE FUNCTION update_complaint_assignment_updated_at();

CREATE OR REPLACE FUNCTION sync_complaint_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'acknowledged' THEN
      NEW.first_acknowledged_at = COALESCE(OLD.first_acknowledged_at, NOW());
      NEW.department_response_at = COALESCE(OLD.department_response_at, NOW());
    ELSIF NEW.status = 'in_progress' THEN
      NEW.first_acknowledged_at = COALESCE(OLD.first_acknowledged_at, NOW());
      NEW.department_response_at = COALESCE(OLD.department_response_at, NOW());
    ELSIF NEW.status = 'resolved' THEN
      NEW.resolved_at = COALESCE(OLD.resolved_at, NOW());
    ELSIF NEW.status = 'closed' THEN
      NEW.closed_at = COALESCE(OLD.closed_at, NOW());
    ELSIF NEW.status = 'reopened' THEN
      NEW.reopened_count = COALESCE(OLD.reopened_count, 0) + 1;
      NEW.closed_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_status_timestamps ON civic_complaints;
CREATE TRIGGER trg_complaint_status_timestamps
  BEFORE UPDATE ON civic_complaints
  FOR EACH ROW EXECUTE FUNCTION sync_complaint_status_timestamps();

-- 7) Expand notification type check for complaint lifecycle events
DO $$
DECLARE
  notif_constraint TEXT;
BEGIN
  SELECT c.conname INTO notif_constraint
  FROM pg_constraint c
  WHERE c.conrelid = 'user_notifications'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%type%IN%';

  IF notif_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_notifications DROP CONSTRAINT %I', notif_constraint);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

ALTER TABLE user_notifications
  ADD CONSTRAINT user_notifications_type_check
  CHECK (type IN (
    'promise_update', 'evidence_added', 'official_statement',
    'proposal_accepted', 'proposal_comment', 'area_trending',
    'weekly_digest', 'system',
    'alert', 'info', 'digest', 'escalation', 'verification', 'blocker',
    'complaint_assigned', 'complaint_status', 'complaint_escalated',
    'complaint_resolved', 'complaint_sla_breach', 'complaint_update'
  ));

-- 8) RLS policies
ALTER TABLE complaint_department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_escalations ENABLE ROW LEVEL SECURITY;

-- complaint_department_members
DROP POLICY IF EXISTS complaint_department_members_select ON complaint_department_members;
CREATE POLICY complaint_department_members_select ON complaint_department_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

DROP POLICY IF EXISTS complaint_department_members_admin_all ON complaint_department_members;
CREATE POLICY complaint_department_members_admin_all ON complaint_department_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

-- complaint_sla_policies
DROP POLICY IF EXISTS complaint_sla_policies_select_public ON complaint_sla_policies;
CREATE POLICY complaint_sla_policies_select_public ON complaint_sla_policies
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS complaint_sla_policies_admin_all ON complaint_sla_policies;
CREATE POLICY complaint_sla_policies_admin_all ON complaint_sla_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

-- complaint_assignments
DROP POLICY IF EXISTS complaint_assignments_select ON complaint_assignments;
CREATE POLICY complaint_assignments_select ON complaint_assignments
  FOR SELECT USING (
    assignee_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM civic_complaints c
      WHERE c.id = complaint_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

DROP POLICY IF EXISTS complaint_assignments_admin_all ON complaint_assignments;
CREATE POLICY complaint_assignments_admin_all ON complaint_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

-- complaint_escalations
DROP POLICY IF EXISTS complaint_escalations_select ON complaint_escalations;
CREATE POLICY complaint_escalations_select ON complaint_escalations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM civic_complaints c
      WHERE c.id = complaint_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

DROP POLICY IF EXISTS complaint_escalations_admin_all ON complaint_escalations;
CREATE POLICY complaint_escalations_admin_all ON complaint_escalations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );
