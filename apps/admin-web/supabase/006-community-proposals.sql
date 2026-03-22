-- ============================================================
-- Nepal Najar — Community Proposals ("Janata Ko Maag")
-- Run AFTER 002-user-accounts.sql (requires profiles table)
-- ============================================================

-- ============================================================
-- 1. COMMUNITY PROPOSALS (main table)
-- ============================================================
CREATE TABLE IF NOT EXISTS community_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  title_ne TEXT,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),
  description_ne TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'infrastructure', 'health', 'education', 'environment', 'transport',
    'technology', 'water_sanitation', 'agriculture', 'tourism',
    'governance', 'social', 'energy', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'open', 'trending', 'under_review',
    'accepted', 'rejected', 'in_progress', 'completed', 'archived'
  )),
  province TEXT NOT NULL,
  district TEXT,
  municipality TEXT,
  related_promise_ids TEXT[] DEFAULT '{}',
  upvote_count INTEGER NOT NULL DEFAULT 0,
  downvote_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  image_urls TEXT[] DEFAULT '{}',
  estimated_cost_npr BIGINT,
  impact_score NUMERIC NOT NULL DEFAULT 0,
  trending_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PROPOSAL VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS proposal_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One vote per authenticated user per proposal
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_votes_user_proposal
  ON proposal_votes (proposal_id, user_id)
  WHERE user_id IS NOT NULL;

-- One vote per device fingerprint per proposal (anonymous)
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_votes_device_proposal
  ON proposal_votes (proposal_id, device_fingerprint)
  WHERE device_fingerprint IS NOT NULL AND user_id IS NULL;

-- ============================================================
-- 3. PROPOSAL COMMENTS (threaded)
-- ============================================================
CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES proposal_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. PROPOSAL UPDATES (status timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS proposal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES community_proposals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'general' CHECK (update_type IN (
    'general', 'status_change', 'official_response', 'milestone'
  )),
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. PROPOSAL FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS proposal_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES community_proposals(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES proposal_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'offensive', 'duplicate', 'misinformation', 'off_topic', 'other'
  )),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'action_taken', 'dismissed'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure at least one target
  CHECK (proposal_id IS NOT NULL OR comment_id IS NOT NULL)
);

-- One flag per user per proposal
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_flags_user_proposal
  ON proposal_flags (proposal_id, reporter_id)
  WHERE proposal_id IS NOT NULL;

-- One flag per user per comment
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_flags_user_comment
  ON proposal_flags (comment_id, reporter_id)
  WHERE comment_id IS NOT NULL;

-- ============================================================
-- 6. PROFILE EXTENSIONS
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS proposal_karma INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS proposals_created INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS proposals_accepted INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 7. INDEXES
-- ============================================================

-- community_proposals
CREATE INDEX IF NOT EXISTS idx_proposals_province ON community_proposals(province);
CREATE INDEX IF NOT EXISTS idx_proposals_district ON community_proposals(district);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON community_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_category ON community_proposals(category);
CREATE INDEX IF NOT EXISTS idx_proposals_trending ON community_proposals(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON community_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_author ON community_proposals(author_id);
CREATE INDEX IF NOT EXISTS idx_proposals_province_status ON community_proposals(province, status);
CREATE INDEX IF NOT EXISTS idx_proposals_related_promises ON community_proposals USING GIN(related_promise_ids);

-- proposal_votes
CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_user ON proposal_votes(user_id);

-- proposal_comments
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal ON proposal_comments(proposal_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_user ON proposal_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_parent ON proposal_comments(parent_id);

-- proposal_updates
CREATE INDEX IF NOT EXISTS idx_proposal_updates_proposal ON proposal_updates(proposal_id, created_at DESC);

-- proposal_flags
CREATE INDEX IF NOT EXISTS idx_proposal_flags_proposal ON proposal_flags(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_flags_status ON proposal_flags(status) WHERE status = 'pending';

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

-- --- community_proposals ---
ALTER TABLE community_proposals ENABLE ROW LEVEL SECURITY;

-- Public can read non-hidden, non-draft proposals
CREATE POLICY "proposals_select_public" ON community_proposals
  FOR SELECT USING (is_hidden = FALSE AND status != 'draft');

-- Authors can read their own drafts
CREATE POLICY "proposals_select_own_drafts" ON community_proposals
  FOR SELECT USING (auth.uid() = author_id);

-- Authenticated users can create proposals
CREATE POLICY "proposals_insert" ON community_proposals
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Authors can update their own proposals
CREATE POLICY "proposals_update_own" ON community_proposals
  FOR UPDATE USING (auth.uid() = author_id);

-- Admins have full access
CREATE POLICY "proposals_admin" ON community_proposals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --- proposal_votes ---
ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;

-- Public can read votes
CREATE POLICY "proposal_votes_select" ON proposal_votes
  FOR SELECT USING (true);

-- Authenticated users can insert votes
CREATE POLICY "proposal_votes_insert" ON proposal_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes (change up/down)
CREATE POLICY "proposal_votes_update_own" ON proposal_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "proposal_votes_admin" ON proposal_votes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --- proposal_comments ---
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

-- Public can read approved comments
CREATE POLICY "proposal_comments_select_approved" ON proposal_comments
  FOR SELECT USING (is_approved = TRUE);

-- Users can read their own comments (even pending)
CREATE POLICY "proposal_comments_select_own" ON proposal_comments
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can insert comments
CREATE POLICY "proposal_comments_insert" ON proposal_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Authors can update their own comments
CREATE POLICY "proposal_comments_update_own" ON proposal_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "proposal_comments_admin" ON proposal_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --- proposal_updates ---
ALTER TABLE proposal_updates ENABLE ROW LEVEL SECURITY;

-- Public can read updates
CREATE POLICY "proposal_updates_select" ON proposal_updates
  FOR SELECT USING (true);

-- Proposal author or admin can insert updates
CREATE POLICY "proposal_updates_insert" ON proposal_updates
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND (
      -- Author can post on their own proposals
      EXISTS (SELECT 1 FROM community_proposals cp WHERE cp.id = proposal_id AND cp.author_id = auth.uid())
      OR
      -- Admins can post on any proposal
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  );

-- Admins have full access
CREATE POLICY "proposal_updates_admin" ON proposal_updates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- --- proposal_flags ---
ALTER TABLE proposal_flags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own flags
CREATE POLICY "proposal_flags_insert" ON proposal_flags
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can read their own flags
CREATE POLICY "proposal_flags_select_own" ON proposal_flags
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can read and manage all flags
CREATE POLICY "proposal_flags_admin" ON proposal_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 9. TRIGGER: Auto-update vote counts on proposal_votes changes
-- ============================================================
CREATE OR REPLACE FUNCTION update_proposal_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  target_proposal_id UUID;
BEGIN
  -- Determine which proposal to update
  IF TG_OP = 'DELETE' THEN
    target_proposal_id := OLD.proposal_id;
  ELSE
    target_proposal_id := NEW.proposal_id;
  END IF;

  -- Also handle the old proposal if vote was moved (shouldn't happen but be safe)
  IF TG_OP = 'UPDATE' AND OLD.proposal_id != NEW.proposal_id THEN
    UPDATE community_proposals SET
      upvote_count = (SELECT COUNT(*) FROM proposal_votes WHERE proposal_id = OLD.proposal_id AND vote_type = 'up'),
      downvote_count = (SELECT COUNT(*) FROM proposal_votes WHERE proposal_id = OLD.proposal_id AND vote_type = 'down'),
      updated_at = NOW()
    WHERE id = OLD.proposal_id;
  END IF;

  UPDATE community_proposals SET
    upvote_count = (SELECT COUNT(*) FROM proposal_votes WHERE proposal_id = target_proposal_id AND vote_type = 'up'),
    downvote_count = (SELECT COUNT(*) FROM proposal_votes WHERE proposal_id = target_proposal_id AND vote_type = 'down'),
    updated_at = NOW()
  WHERE id = target_proposal_id;

  -- Auto-promote to trending if net votes >= 20 and currently open
  IF TG_OP != 'DELETE' THEN
    UPDATE community_proposals SET
      status = 'trending',
      updated_at = NOW()
    WHERE id = target_proposal_id
      AND status = 'open'
      AND (upvote_count - downvote_count) >= 20;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_proposal_vote_counts ON proposal_votes;
CREATE TRIGGER trg_proposal_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON proposal_votes
  FOR EACH ROW EXECUTE FUNCTION update_proposal_vote_counts();

-- ============================================================
-- 10. FUNCTION: Compute trending score
-- ============================================================
CREATE OR REPLACE FUNCTION compute_trending_score(
  p_upvotes INTEGER,
  p_downvotes INTEGER,
  p_comments INTEGER,
  p_created_at TIMESTAMPTZ
)
RETURNS NUMERIC AS $$
DECLARE
  age_hours NUMERIC;
  score NUMERIC;
BEGIN
  age_hours := GREATEST(EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600.0, 0.1);
  score := (p_upvotes - p_downvotes * 0.5 + p_comments * 0.3) / POWER(age_hours, 1.8);
  RETURN ROUND(score, 6);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Batch update all trending scores (called by cron or API)
CREATE OR REPLACE FUNCTION refresh_proposal_trending_scores()
RETURNS void AS $$
BEGIN
  UPDATE community_proposals SET
    trending_score = compute_trending_score(upvote_count, downvote_count, comment_count, created_at),
    updated_at = NOW()
  WHERE status IN ('open', 'trending')
    AND is_hidden = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. TRIGGER: Auto-update comment_count on proposal_comments changes
-- ============================================================
CREATE OR REPLACE FUNCTION update_proposal_comment_count()
RETURNS TRIGGER AS $$
DECLARE
  target_proposal_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_proposal_id := OLD.proposal_id;
  ELSE
    target_proposal_id := NEW.proposal_id;
  END IF;

  UPDATE community_proposals SET
    comment_count = (SELECT COUNT(*) FROM proposal_comments WHERE proposal_id = target_proposal_id AND is_approved = TRUE),
    updated_at = NOW()
  WHERE id = target_proposal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_proposal_comment_count ON proposal_comments;
CREATE TRIGGER trg_proposal_comment_count
  AFTER INSERT OR UPDATE OR DELETE ON proposal_comments
  FOR EACH ROW EXECUTE FUNCTION update_proposal_comment_count();

-- ============================================================
-- 12. TRIGGER: Auto-flag proposal when flag_count >= 5
-- ============================================================
CREATE OR REPLACE FUNCTION update_proposal_flag_count()
RETURNS TRIGGER AS $$
DECLARE
  target_proposal_id UUID;
  new_flag_count INTEGER;
BEGIN
  -- Only handle proposal flags (not comment flags)
  target_proposal_id := COALESCE(NEW.proposal_id, OLD.proposal_id);

  IF target_proposal_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  new_flag_count := (
    SELECT COUNT(*) FROM proposal_flags
    WHERE proposal_id = target_proposal_id
      AND status IN ('pending', 'reviewed')
  );

  UPDATE community_proposals SET
    flag_count = new_flag_count,
    is_flagged = (new_flag_count >= 5),
    is_hidden = CASE WHEN new_flag_count >= 5 THEN TRUE ELSE is_hidden END,
    updated_at = NOW()
  WHERE id = target_proposal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_proposal_flag_count ON proposal_flags;
CREATE TRIGGER trg_proposal_flag_count
  AFTER INSERT OR UPDATE OR DELETE ON proposal_flags
  FOR EACH ROW EXECUTE FUNCTION update_proposal_flag_count();

-- ============================================================
-- 13. updated_at auto-touch trigger for community_proposals
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON community_proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON community_proposals
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
