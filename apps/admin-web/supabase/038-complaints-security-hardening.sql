-- ============================================================
-- 038: Complaints Security Hardening
-- Tighten trust boundaries for status/evidence/events at DB layer.
-- ============================================================

-- 1) Public evidence must be reviewer-approved.
DROP POLICY IF EXISTS complaint_evidence_select_public ON complaint_evidence;
CREATE POLICY complaint_evidence_select_public ON complaint_evidence
  FOR SELECT USING (
    verification_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM civic_complaints c
      WHERE c.id = complaint_id AND c.is_public = TRUE
    )
  );

-- 2) Citizens can only insert pending evidence; elevated users can insert any state.
DROP POLICY IF EXISTS complaint_evidence_insert_own ON complaint_evidence;
CREATE POLICY complaint_evidence_insert_own ON complaint_evidence
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      verification_status = 'pending'
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
      )
    )
  );

-- 3) Citizens can only post citizen_update events; elevated users keep full event control.
DROP POLICY IF EXISTS complaint_events_insert_own ON complaint_events;
CREATE POLICY complaint_events_insert_own ON complaint_events
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id
    AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
      )
      OR (
        actor_type = 'citizen'
        AND event_type = 'citizen_update'
        AND visibility = 'public'
      )
    )
  );

-- 4) Ensure owner update policy also validates target row ownership after update.
DROP POLICY IF EXISTS civic_complaints_update_own ON civic_complaints;
CREATE POLICY civic_complaints_update_own ON civic_complaints
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5) Trigger guard: block non-elevated direct updates to protected workflow fields.
-- Service-role/API writes remain allowed.
CREATE OR REPLACE FUNCTION enforce_civic_complaints_owner_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  elevated BOOLEAN;
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'verifier')
  )
  INTO elevated;

  IF elevated THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() OR OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.trust_level IS DISTINCT FROM OLD.trust_level
    OR NEW.department_key IS DISTINCT FROM OLD.department_key
    OR NEW.assigned_department_key IS DISTINCT FROM OLD.assigned_department_key
    OR NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id
    OR NEW.duplicate_of IS DISTINCT FROM OLD.duplicate_of
    OR NEW.sla_policy_key IS DISTINCT FROM OLD.sla_policy_key
    OR NEW.sla_target_hours IS DISTINCT FROM OLD.sla_target_hours
    OR NEW.sla_due_at IS DISTINCT FROM OLD.sla_due_at
    OR NEW.sla_breached_at IS DISTINCT FROM OLD.sla_breached_at
    OR NEW.sla_paused_at IS DISTINCT FROM OLD.sla_paused_at
    OR NEW.sla_pause_reason IS DISTINCT FROM OLD.sla_pause_reason
    OR NEW.sla_total_paused_minutes IS DISTINCT FROM OLD.sla_total_paused_minutes
    OR NEW.department_response_at IS DISTINCT FROM OLD.department_response_at
    OR NEW.first_acknowledged_at IS DISTINCT FROM OLD.first_acknowledged_at
    OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
    OR NEW.closed_at IS DISTINCT FROM OLD.closed_at
    OR NEW.escalation_level IS DISTINCT FROM OLD.escalation_level
    OR NEW.reopened_count IS DISTINCT FROM OLD.reopened_count
    OR NEW.citizen_satisfaction IS DISTINCT FROM OLD.citizen_satisfaction
    OR NEW.citizen_satisfaction_note IS DISTINCT FROM OLD.citizen_satisfaction_note
    OR NEW.satisfaction_submitted_at IS DISTINCT FROM OLD.satisfaction_submitted_at
    OR NEW.ai_route_confidence IS DISTINCT FROM OLD.ai_route_confidence
    OR NEW.ai_triage IS DISTINCT FROM OLD.ai_triage
  THEN
    RAISE EXCEPTION 'Only reviewers can modify workflow/status fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_civic_complaints_owner_update ON civic_complaints;
CREATE TRIGGER trg_enforce_civic_complaints_owner_update
  BEFORE UPDATE ON civic_complaints
  FOR EACH ROW
  EXECUTE FUNCTION enforce_civic_complaints_owner_update();
