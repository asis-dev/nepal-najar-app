-- ============================================================
-- 031: Civic Complaints System (voice/text intake + routing + tracking)
-- ============================================================

-- 1) Department routing registry
CREATE TABLE IF NOT EXISTS complaint_departments (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ne TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL DEFAULT 'federal' CHECK (level IN ('federal', 'provincial', 'local', 'autonomous')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO complaint_departments (key, name, name_ne, description, level)
VALUES
  ('infrastructure', 'Physical Infrastructure', 'भौतिक पूर्वाधार', 'Roads, bridges, drainage, public infrastructure works', 'federal'),
  ('transport', 'Transport Management', 'यातायात व्यवस्थापन', 'Public transport, traffic, permits, route operations', 'federal'),
  ('urban', 'Urban Development', 'सहरी विकास', 'Urban planning, settlements, city civil works', 'federal'),
  ('water', 'Water Supply', 'खानेपानी', 'Water supply interruptions, leakage, pipeline concerns', 'local'),
  ('sanitation', 'Sanitation & Waste', 'सरसफाइ तथा फोहर', 'Waste collection, drains, sanitation complaints', 'local'),
  ('electricity', 'Electricity Services', 'विद्युत सेवा', 'Power outages, transformer faults, unsafe lines', 'federal'),
  ('health', 'Public Health Services', 'सार्वजनिक स्वास्थ्य सेवा', 'Hospitals, health posts, medicine availability', 'federal'),
  ('education', 'Education Services', 'शिक्षा सेवा', 'School access, teacher availability, education service issues', 'federal'),
  ('internet', 'Telecom & Internet', 'दूरसञ्चार तथा इन्टरनेट', 'Connectivity, broadband, service quality complaints', 'federal'),
  ('safety', 'Public Safety', 'सार्वजनिक सुरक्षा', 'Street safety, harassment, policing responsiveness', 'federal'),
  ('employment', 'Labour & Employment', 'श्रम तथा रोजगारी', 'Local job center and labour service complaints', 'federal'),
  ('environment', 'Environment & Pollution', 'वातावरण तथा प्रदूषण', 'Air, water, noise, environmental hazards', 'federal'),
  ('local-municipality', 'Local Municipality', 'स्थानीय पालिका', 'General ward/municipality service delivery issues', 'local'),
  ('home-affairs', 'Home Affairs', 'गृह मन्त्रालय', 'Administrative and public order issues', 'federal'),
  ('other', 'General / Unmapped', 'सामान्य / नखुलिएको', 'Fallback routing when a department is unclear', 'local')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  name_ne = EXCLUDED.name_ne,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = TRUE;

-- 2) Core complaint case object
CREATE TABLE IF NOT EXISTS civic_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 220),
  title_ne TEXT,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
  description_ne TEXT,
  raw_transcript TEXT,
  input_mode TEXT NOT NULL DEFAULT 'text' CHECK (input_mode IN ('text', 'voice', 'mixed')),
  language TEXT NOT NULL DEFAULT 'ne',
  issue_type TEXT NOT NULL DEFAULT 'other' CHECK (issue_type IN (
    'roads', 'water', 'electricity', 'health', 'education',
    'sanitation', 'internet', 'safety', 'employment', 'environment', 'other'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'triaged', 'routed', 'acknowledged', 'in_progress',
    'resolved', 'closed', 'needs_info', 'rejected', 'duplicate', 'reopened'
  )),
  trust_level TEXT NOT NULL DEFAULT 'unverified' CHECK (trust_level IN ('unverified', 'partial', 'verified', 'disputed')),
  province TEXT,
  district TEXT,
  municipality TEXT,
  ward_number TEXT,
  location_text TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  department_key TEXT REFERENCES complaint_departments(key),
  ai_route_confidence NUMERIC(4,3) CHECK (ai_route_confidence IS NULL OR (ai_route_confidence >= 0 AND ai_route_confidence <= 1)),
  ai_triage JSONB NOT NULL DEFAULT '{}'::jsonb,
  duplicate_of UUID REFERENCES civic_complaints(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  follower_count INTEGER NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
  evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  updates_count INTEGER NOT NULL DEFAULT 0 CHECK (updates_count >= 0),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_civic_complaints_status_created
  ON civic_complaints(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_complaints_department_status
  ON civic_complaints(department_key, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_complaints_location
  ON civic_complaints(province, district, municipality, ward_number);
CREATE INDEX IF NOT EXISTS idx_civic_complaints_user
  ON civic_complaints(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civic_complaints_public_recent
  ON civic_complaints(is_public, last_activity_at DESC);

-- 3) Complaint timeline / events
CREATE TABLE IF NOT EXISTS complaint_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES civic_complaints(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('citizen', 'ai', 'admin', 'official', 'system')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'submitted', 'triaged', 'routed', 'status_change', 'acknowledged',
    'citizen_update', 'official_update', 'evidence_added',
    'needs_info', 'resolved', 'closed', 'reopened', 'duplicate_marked'
  )),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 2 AND 2000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_events_case_created
  ON complaint_events(complaint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_events_visibility
  ON complaint_events(visibility, created_at DESC);

-- 4) Evidence attached to complaints
CREATE TABLE IF NOT EXISTS complaint_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES civic_complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'link' CHECK (evidence_type IN ('photo', 'video', 'audio', 'document', 'link', 'text')),
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  source_url TEXT,
  note TEXT,
  note_ne TEXT,
  language TEXT NOT NULL DEFAULT 'ne',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_evidence_case
  ON complaint_evidence(complaint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_evidence_user
  ON complaint_evidence(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_evidence_verification
  ON complaint_evidence(verification_status, created_at DESC);

-- 5) Followers / watchers
CREATE TABLE IF NOT EXISTS complaint_followers (
  complaint_id UUID NOT NULL REFERENCES civic_complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (complaint_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_complaint_followers_user
  ON complaint_followers(user_id, created_at DESC);

-- 6) Utility functions + triggers
CREATE OR REPLACE FUNCTION update_civic_complaint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_civic_complaints_updated_at ON civic_complaints;
CREATE TRIGGER trg_civic_complaints_updated_at
  BEFORE UPDATE ON civic_complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_civic_complaint_updated_at();

CREATE OR REPLACE FUNCTION refresh_complaint_follower_count(target_complaint UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE civic_complaints
  SET follower_count = (
    SELECT COUNT(*) FROM complaint_followers WHERE complaint_id = target_complaint
  )
  WHERE id = target_complaint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_complaint_evidence_count(target_complaint UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE civic_complaints
  SET evidence_count = (
    SELECT COUNT(*) FROM complaint_evidence WHERE complaint_id = target_complaint
  )
  WHERE id = target_complaint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_complaint_updates_count(target_complaint UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE civic_complaints
  SET updates_count = (
    SELECT COUNT(*)
    FROM complaint_events
    WHERE complaint_id = target_complaint
      AND visibility = 'public'
      AND event_type IN ('citizen_update', 'official_update', 'status_change', 'acknowledged', 'resolved', 'reopened', 'evidence_added')
  )
  WHERE id = target_complaint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trg_complaint_followers_count_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_complaint_follower_count(COALESCE(NEW.complaint_id, OLD.complaint_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_complaint_followers_count_sync ON complaint_followers;
CREATE TRIGGER trg_complaint_followers_count_sync
  AFTER INSERT OR DELETE ON complaint_followers
  FOR EACH ROW EXECUTE FUNCTION trg_complaint_followers_count_sync();

CREATE OR REPLACE FUNCTION trg_complaint_evidence_count_sync()
RETURNS TRIGGER AS $$
DECLARE
  target UUID;
BEGIN
  target := COALESCE(NEW.complaint_id, OLD.complaint_id);
  PERFORM refresh_complaint_evidence_count(target);
  UPDATE civic_complaints SET last_activity_at = NOW() WHERE id = target;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_complaint_evidence_count_sync ON complaint_evidence;
CREATE TRIGGER trg_complaint_evidence_count_sync
  AFTER INSERT OR DELETE ON complaint_evidence
  FOR EACH ROW EXECUTE FUNCTION trg_complaint_evidence_count_sync();

CREATE OR REPLACE FUNCTION trg_complaint_events_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_complaint_updates_count(NEW.complaint_id);
  UPDATE civic_complaints SET last_activity_at = NOW() WHERE id = NEW.complaint_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_complaint_events_sync ON complaint_events;
CREATE TRIGGER trg_complaint_events_sync
  AFTER INSERT ON complaint_events
  FOR EACH ROW EXECUTE FUNCTION trg_complaint_events_sync();

-- 7) RLS
ALTER TABLE complaint_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_followers ENABLE ROW LEVEL SECURITY;

-- complaint_departments
DROP POLICY IF EXISTS complaint_departments_select_public ON complaint_departments;
CREATE POLICY complaint_departments_select_public ON complaint_departments
  FOR SELECT USING (TRUE);

-- civic_complaints
DROP POLICY IF EXISTS civic_complaints_select_public ON civic_complaints;
CREATE POLICY civic_complaints_select_public ON civic_complaints
  FOR SELECT USING (is_public = TRUE);

DROP POLICY IF EXISTS civic_complaints_select_own ON civic_complaints;
CREATE POLICY civic_complaints_select_own ON civic_complaints
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS civic_complaints_insert_own ON civic_complaints;
CREATE POLICY civic_complaints_insert_own ON civic_complaints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS civic_complaints_update_own ON civic_complaints;
CREATE POLICY civic_complaints_update_own ON civic_complaints
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS civic_complaints_admin_all ON civic_complaints;
CREATE POLICY civic_complaints_admin_all ON civic_complaints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

-- complaint_events
DROP POLICY IF EXISTS complaint_events_select_public ON complaint_events;
CREATE POLICY complaint_events_select_public ON complaint_events
  FOR SELECT USING (
    visibility = 'public'
    AND EXISTS (
      SELECT 1 FROM civic_complaints c
      WHERE c.id = complaint_id AND c.is_public = TRUE
    )
  );

DROP POLICY IF EXISTS complaint_events_select_owner ON complaint_events;
CREATE POLICY complaint_events_select_owner ON complaint_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM civic_complaints c
      WHERE c.id = complaint_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS complaint_events_insert_own ON complaint_events;
CREATE POLICY complaint_events_insert_own ON complaint_events
  FOR INSERT WITH CHECK (auth.uid() = actor_id);

DROP POLICY IF EXISTS complaint_events_admin_all ON complaint_events;
CREATE POLICY complaint_events_admin_all ON complaint_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

-- complaint_evidence
DROP POLICY IF EXISTS complaint_evidence_select_public ON complaint_evidence;
CREATE POLICY complaint_evidence_select_public ON complaint_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM civic_complaints c
      WHERE c.id = complaint_id AND c.is_public = TRUE
    )
  );

DROP POLICY IF EXISTS complaint_evidence_select_own ON complaint_evidence;
CREATE POLICY complaint_evidence_select_own ON complaint_evidence
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS complaint_evidence_insert_own ON complaint_evidence;
CREATE POLICY complaint_evidence_insert_own ON complaint_evidence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS complaint_evidence_update_verifier ON complaint_evidence;
CREATE POLICY complaint_evidence_update_verifier ON complaint_evidence
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );

-- complaint_followers
DROP POLICY IF EXISTS complaint_followers_select_own ON complaint_followers;
CREATE POLICY complaint_followers_select_own ON complaint_followers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS complaint_followers_insert_own ON complaint_followers;
CREATE POLICY complaint_followers_insert_own ON complaint_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS complaint_followers_delete_own ON complaint_followers;
CREATE POLICY complaint_followers_delete_own ON complaint_followers
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS complaint_followers_admin_all ON complaint_followers;
CREATE POLICY complaint_followers_admin_all ON complaint_followers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'verifier')
    )
  );
