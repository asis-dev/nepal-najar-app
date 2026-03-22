-- ============================================================
-- Nepal Najar — Citizen Features (Evidence, Verification, Notifications)
-- Run AFTER 006-community-proposals.sql
-- ============================================================

-- ============================================================
-- 1. CITIZEN EVIDENCE (photos, links proving/disproving promises)
-- ============================================================
CREATE TABLE IF NOT EXISTS citizen_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promise_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL DEFAULT 'photo' CHECK (evidence_type IN ('photo', 'video', 'document', 'link')),
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  caption TEXT CHECK (char_length(caption) <= 500),
  caption_ne TEXT,
  classification TEXT NOT NULL CHECK (classification IN ('confirms', 'contradicts', 'neutral')),
  latitude NUMERIC,
  longitude NUMERIC,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT TRUE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. EVIDENCE VOTES (community validation)
-- ============================================================
CREATE TABLE IF NOT EXISTS citizen_evidence_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES citizen_evidence(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evidence_id, user_id)
);

-- ============================================================
-- 3. PROGRESS VERIFICATIONS (true or false on government claims)
-- ============================================================
CREATE TABLE IF NOT EXISTS progress_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promise_id TEXT NOT NULL,
  verification TEXT NOT NULL CHECK (verification IN ('accurate', 'disputed', 'partially_true')),
  reason TEXT,
  evidence_urls TEXT[],
  province TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, promise_id)
);

-- ============================================================
-- 4. USER NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'promise_update', 'evidence_added', 'official_statement',
    'proposal_accepted', 'proposal_comment', 'area_trending',
    'weekly_digest', 'system'
  )),
  title TEXT NOT NULL,
  title_ne TEXT,
  body TEXT,
  body_ne TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================

-- citizen_evidence
CREATE INDEX IF NOT EXISTS idx_citizen_evidence_promise ON citizen_evidence(promise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_citizen_evidence_user ON citizen_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_citizen_evidence_classification ON citizen_evidence(classification);

-- citizen_evidence_votes
CREATE INDEX IF NOT EXISTS idx_evidence_votes_evidence ON citizen_evidence_votes(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_votes_user ON citizen_evidence_votes(user_id);

-- progress_verifications
CREATE INDEX IF NOT EXISTS idx_verifications_promise ON progress_verifications(promise_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON progress_verifications(user_id);

-- user_notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON user_notifications(user_id, created_at DESC);

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- --- citizen_evidence ---
ALTER TABLE citizen_evidence ENABLE ROW LEVEL SECURITY;

-- Public can read approved evidence
CREATE POLICY "evidence_select_public" ON citizen_evidence
  FOR SELECT USING (is_approved = TRUE);

-- Users can read their own evidence (even unapproved)
CREATE POLICY "evidence_select_own" ON citizen_evidence
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can insert evidence
CREATE POLICY "evidence_insert" ON citizen_evidence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "evidence_admin" ON citizen_evidence
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --- citizen_evidence_votes ---
ALTER TABLE citizen_evidence_votes ENABLE ROW LEVEL SECURITY;

-- Public can read votes
CREATE POLICY "evidence_votes_select" ON citizen_evidence_votes
  FOR SELECT USING (true);

-- Authenticated users can insert votes
CREATE POLICY "evidence_votes_insert" ON citizen_evidence_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "evidence_votes_update_own" ON citizen_evidence_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own votes (for toggle behavior)
CREATE POLICY "evidence_votes_delete_own" ON citizen_evidence_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "evidence_votes_admin" ON citizen_evidence_votes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --- progress_verifications ---
ALTER TABLE progress_verifications ENABLE ROW LEVEL SECURITY;

-- Public can read verifications
CREATE POLICY "verifications_select_public" ON progress_verifications
  FOR SELECT USING (true);

-- Authenticated users can insert verifications
CREATE POLICY "verifications_insert" ON progress_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own verification
CREATE POLICY "verifications_update_own" ON progress_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "verifications_admin" ON progress_verifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --- user_notifications ---
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "notifications_select_own" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can insert notifications for anyone
CREATE POLICY "notifications_insert_admin" ON user_notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- System/service role can insert (for triggers)
CREATE POLICY "notifications_insert_service" ON user_notifications
  FOR ALL USING (true);

-- Admins have full access
CREATE POLICY "notifications_admin" ON user_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 7. TRIGGER: Auto-update evidence vote counts
-- ============================================================
CREATE OR REPLACE FUNCTION update_evidence_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_evidence_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_evidence_id := OLD.evidence_id;
  ELSE
    target_evidence_id := NEW.evidence_id;
  END IF;

  UPDATE citizen_evidence SET
    upvote_count = (SELECT COUNT(*) FROM citizen_evidence_votes WHERE evidence_id = target_evidence_id AND vote_type = 'up'),
    downvote_count = (SELECT COUNT(*) FROM citizen_evidence_votes WHERE evidence_id = target_evidence_id AND vote_type = 'down')
  WHERE id = target_evidence_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_evidence_vote_counts ON citizen_evidence_votes;
CREATE TRIGGER trg_evidence_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON citizen_evidence_votes
  FOR EACH ROW EXECUTE FUNCTION update_evidence_vote_counts();
