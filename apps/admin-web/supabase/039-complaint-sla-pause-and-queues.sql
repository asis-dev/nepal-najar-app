-- ============================================================
-- 039: Complaint SLA Pause/Resume Support
-- Adds pause metadata for needs_info waiting states and updates
-- status timestamp trigger to accumulate paused time.
-- ============================================================

ALTER TABLE civic_complaints
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_pause_reason TEXT,
  ADD COLUMN IF NOT EXISTS sla_total_paused_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (sla_total_paused_minutes >= 0);

CREATE INDEX IF NOT EXISTS idx_civic_complaints_sla_paused
  ON civic_complaints(status, sla_paused_at)
  WHERE sla_paused_at IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_complaint_status_timestamps()
RETURNS TRIGGER AS $$
DECLARE
  paused_minutes INTEGER := 0;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'needs_info' THEN
      NEW.sla_paused_at = COALESCE(OLD.sla_paused_at, NOW());
      NEW.sla_pause_reason = COALESCE(NEW.sla_pause_reason, OLD.sla_pause_reason, 'awaiting_citizen');
      NEW.sla_total_paused_minutes = COALESCE(OLD.sla_total_paused_minutes, 0);
    ELSIF OLD.status = 'needs_info' AND OLD.sla_paused_at IS NOT NULL THEN
      paused_minutes := GREATEST(
        0,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - OLD.sla_paused_at)) / 60)::INTEGER
      );
      NEW.sla_total_paused_minutes = COALESCE(OLD.sla_total_paused_minutes, 0) + paused_minutes;
      NEW.sla_paused_at = NULL;
      NEW.sla_pause_reason = NULL;
    ELSE
      NEW.sla_paused_at = OLD.sla_paused_at;
      NEW.sla_pause_reason = OLD.sla_pause_reason;
      NEW.sla_total_paused_minutes = COALESCE(OLD.sla_total_paused_minutes, 0);
    END IF;

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
  ELSE
    NEW.sla_paused_at = COALESCE(NEW.sla_paused_at, OLD.sla_paused_at);
    NEW.sla_pause_reason = COALESCE(NEW.sla_pause_reason, OLD.sla_pause_reason);
    NEW.sla_total_paused_minutes = COALESCE(NEW.sla_total_paused_minutes, OLD.sla_total_paused_minutes, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
