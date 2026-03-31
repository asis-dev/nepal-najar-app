-- ============================================================
-- 034: Complaint Clusters
-- Groups duplicate/related complaints into clusters for
-- consolidated tracking, routing, and public pressure.
-- ============================================================

-- Cluster = a group of related complaints about the same issue
CREATE TABLE IF NOT EXISTS complaint_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display
  title TEXT NOT NULL,
  title_ne TEXT,
  summary TEXT,                         -- AI-generated cluster summary
  summary_ne TEXT,

  -- Classification (copied from primary complaint, can be overridden)
  issue_type TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'medium',

  -- Authority routing (from rules engine)
  department_key TEXT REFERENCES complaint_departments(key),
  authority_name TEXT,                  -- e.g. "KUKL" or "KMC Environment"
  authority_name_ne TEXT,
  authority_level TEXT,                 -- federal/provincial/local
  authority_office TEXT,
  routing_reason TEXT,

  -- Location (representative — from primary complaint)
  province TEXT,
  district TEXT,
  municipality TEXT,
  ward_number TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Status & SLA (one SLA per cluster)
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  sla_policy_key TEXT,
  sla_due_at TIMESTAMPTZ,
  sla_breached_at TIMESTAMPTZ,
  first_acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Counters (auto-synced via triggers)
  report_count INT NOT NULL DEFAULT 1,
  evidence_count INT NOT NULL DEFAULT 0,
  follower_count INT NOT NULL DEFAULT 0,

  -- Moderation
  created_by UUID REFERENCES auth.users(id),
  merge_method TEXT NOT NULL DEFAULT 'ai'
    CHECK (merge_method IN ('ai', 'manual', 'auto')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing
CREATE INDEX IF NOT EXISTS idx_complaint_clusters_status ON complaint_clusters(status);
CREATE INDEX IF NOT EXISTS idx_complaint_clusters_issue ON complaint_clusters(issue_type);
CREATE INDEX IF NOT EXISTS idx_complaint_clusters_dept ON complaint_clusters(department_key);
CREATE INDEX IF NOT EXISTS idx_complaint_clusters_municipality ON complaint_clusters(municipality);

-- Link complaints to clusters
-- A complaint can belong to at most one cluster
ALTER TABLE civic_complaints
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES complaint_clusters(id);

CREATE INDEX IF NOT EXISTS idx_civic_complaints_cluster ON civic_complaints(cluster_id)
  WHERE cluster_id IS NOT NULL;

-- Cluster events timeline (mirrors complaint_events pattern)
CREATE TABLE IF NOT EXISTS complaint_cluster_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES complaint_clusters(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL DEFAULT 'system'
    CHECK (actor_type IN ('citizen', 'ai', 'admin', 'official', 'system')),
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'created', 'complaint_added', 'complaint_removed',
      'status_change', 'acknowledged', 'resolved', 'closed',
      'evidence_added', 'summary_updated', 'routed', 'escalated'
    )),
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'internal')),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 2 AND 2000),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cluster_events_cluster ON complaint_cluster_events(cluster_id, created_at DESC);

-- ═══ Auto-update cluster counters when complaints are added/removed ═══

CREATE OR REPLACE FUNCTION fn_sync_cluster_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old cluster if complaint was removed from one
  IF TG_OP = 'UPDATE' AND OLD.cluster_id IS NOT NULL AND OLD.cluster_id IS DISTINCT FROM NEW.cluster_id THEN
    UPDATE complaint_clusters SET
      report_count = (SELECT count(*) FROM civic_complaints WHERE cluster_id = OLD.cluster_id),
      evidence_count = (SELECT coalesce(sum(evidence_count), 0) FROM civic_complaints WHERE cluster_id = OLD.cluster_id),
      updated_at = now()
    WHERE id = OLD.cluster_id;
  END IF;

  -- Update new cluster
  IF NEW.cluster_id IS NOT NULL THEN
    UPDATE complaint_clusters SET
      report_count = (SELECT count(*) FROM civic_complaints WHERE cluster_id = NEW.cluster_id),
      evidence_count = (SELECT coalesce(sum(evidence_count), 0) FROM civic_complaints WHERE cluster_id = NEW.cluster_id),
      updated_at = now()
    WHERE id = NEW.cluster_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cluster_counts ON civic_complaints;
CREATE TRIGGER trg_sync_cluster_counts
  AFTER INSERT OR UPDATE OF cluster_id, evidence_count ON civic_complaints
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_cluster_counts();

-- ═══ RLS ═══

ALTER TABLE complaint_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_cluster_events ENABLE ROW LEVEL SECURITY;

-- Public read for all clusters
CREATE POLICY clusters_public_read ON complaint_clusters
  FOR SELECT USING (true);

-- Admin/verifier can insert/update clusters
CREATE POLICY clusters_elevated_write ON complaint_clusters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'verifier'))
  );

-- Public read for cluster events
CREATE POLICY cluster_events_public_read ON complaint_cluster_events
  FOR SELECT USING (visibility = 'public' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'verifier'))
  );

-- Elevated write for cluster events
CREATE POLICY cluster_events_elevated_write ON complaint_cluster_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'verifier'))
  );
