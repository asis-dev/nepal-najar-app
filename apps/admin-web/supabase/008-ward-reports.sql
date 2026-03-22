-- ============================================================
-- Nepal Najar — Ward-Level Reporting ("Mero Ward Ko Halat")
-- Run AFTER 006-community-proposals.sql
-- ============================================================

-- ============================================================
-- 1. WARD REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ward_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  municipality TEXT,
  ward_number TEXT,
  topic TEXT NOT NULL CHECK (topic IN (
    'roads', 'water', 'electricity', 'health', 'education',
    'sanitation', 'internet', 'safety', 'employment', 'other'
  )),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  description TEXT CHECK (char_length(description) <= 1000),
  description_ne TEXT,
  media_urls TEXT[] DEFAULT '{}',
  agree_count INTEGER DEFAULT 0,
  disagree_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT TRUE,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. WARD REPORT VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS ward_report_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES ward_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('agree', 'disagree')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ward_reports_province ON ward_reports(province);
CREATE INDEX IF NOT EXISTS idx_ward_reports_district ON ward_reports(district);
CREATE INDEX IF NOT EXISTS idx_ward_reports_topic ON ward_reports(topic);
CREATE INDEX IF NOT EXISTS idx_ward_reports_created ON ward_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ward_reports_user ON ward_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ward_reports_province_district ON ward_reports(province, district);
CREATE INDEX IF NOT EXISTS idx_ward_report_votes_report ON ward_report_votes(report_id);
CREATE INDEX IF NOT EXISTS idx_ward_report_votes_user ON ward_report_votes(user_id);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

-- --- ward_reports ---
ALTER TABLE ward_reports ENABLE ROW LEVEL SECURITY;

-- Public can read approved reports
CREATE POLICY "ward_reports_select_public" ON ward_reports
  FOR SELECT USING (is_approved = TRUE);

-- Authenticated users can insert their own reports
CREATE POLICY "ward_reports_insert" ON ward_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "ward_reports_update_own" ON ward_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "ward_reports_admin" ON ward_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --- ward_report_votes ---
ALTER TABLE ward_report_votes ENABLE ROW LEVEL SECURITY;

-- Public can read votes
CREATE POLICY "ward_report_votes_select" ON ward_report_votes
  FOR SELECT USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "ward_report_votes_insert" ON ward_report_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "ward_report_votes_update_own" ON ward_report_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "ward_report_votes_admin" ON ward_report_votes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 5. TRIGGER: Auto-update agree/disagree counts
-- ============================================================
CREATE OR REPLACE FUNCTION update_ward_report_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_report_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_report_id := OLD.report_id;
  ELSE
    target_report_id := NEW.report_id;
  END IF;

  UPDATE ward_reports SET
    agree_count = (SELECT COUNT(*) FROM ward_report_votes WHERE report_id = target_report_id AND vote_type = 'agree'),
    disagree_count = (SELECT COUNT(*) FROM ward_report_votes WHERE report_id = target_report_id AND vote_type = 'disagree')
  WHERE id = target_report_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ward_report_vote_counts ON ward_report_votes;
CREATE TRIGGER trg_ward_report_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON ward_report_votes
  FOR EACH ROW EXECUTE FUNCTION update_ward_report_vote_counts();
