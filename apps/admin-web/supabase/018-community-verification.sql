-- ============================================================
-- Nepal Najar — Community Verification System
-- Run AFTER 017 migrations
-- Adds: roles extension, reputation/karma, verifier applications,
--        evidence review audit trail
-- ============================================================

-- ============================================================
-- 1. EXTEND PROFILE ROLES (citizen → observer, add verifier)
-- ============================================================

-- Drop existing CHECK constraint on role (if it exists)
DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add new CHECK with extended roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('citizen', 'observer', 'verifier', 'admin'));

-- Migrate existing citizen → observer
UPDATE profiles SET role = 'observer' WHERE role = 'citizen';

-- Update the handle_new_user trigger to default to 'observer'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.phone,
    'observer'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-create reputation row
  INSERT INTO public.user_reputation (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. USER REPUTATION / KARMA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_reputation (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_karma INTEGER DEFAULT 0,
  evidence_karma INTEGER DEFAULT 0,
  verification_karma INTEGER DEFAULT 0,
  community_karma INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_level ON user_reputation(level DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_karma ON user_reputation(total_karma DESC);

ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

-- Users can read own reputation
CREATE POLICY "rep_read_own" ON user_reputation
  FOR SELECT USING (auth.uid() = user_id);

-- Public can read karma/level (for profile badges)
CREATE POLICY "rep_read_public" ON user_reputation
  FOR SELECT USING (true);

-- Service role can update (for triggers)
CREATE POLICY "rep_update_service" ON user_reputation
  FOR UPDATE USING (true);

-- Insert on signup (via trigger)
CREATE POLICY "rep_insert_service" ON user_reputation
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 3. VERIFIER APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS verifier_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000),
  expertise_area TEXT,
  province TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One active application per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_verifier_app_user
  ON verifier_applications(user_id) WHERE status = 'pending';

ALTER TABLE verifier_applications ENABLE ROW LEVEL SECURITY;

-- Users can read own application
CREATE POLICY "vapp_read_own" ON verifier_applications
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all
CREATE POLICY "vapp_read_admin" ON verifier_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can insert own application
CREATE POLICY "vapp_insert_own" ON verifier_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update (approve/reject)
CREATE POLICY "vapp_update_admin" ON verifier_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. EVIDENCE REVIEW ACTIONS (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES citizen_evidence(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'request_info')),
  note TEXT,
  proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_actions_evidence ON evidence_review_actions(evidence_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_reviewer ON evidence_review_actions(reviewer_id);

ALTER TABLE evidence_review_actions ENABLE ROW LEVEL SECURITY;

-- Verifiers and admins can read
CREATE POLICY "review_read_verifier" ON evidence_review_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('verifier', 'admin'))
  );

-- Verifiers and admins can insert
CREATE POLICY "review_insert_verifier" ON evidence_review_actions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('verifier', 'admin'))
  );

-- ============================================================
-- 5. EXTEND CITIZEN_EVIDENCE for review workflow
-- ============================================================
ALTER TABLE citizen_evidence
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_note TEXT;

-- Change default: new evidence goes to pending (not auto-approved)
ALTER TABLE citizen_evidence ALTER COLUMN is_approved SET DEFAULT FALSE;

-- Allow verifiers to update evidence (approve/reject)
DO $$ BEGIN
  CREATE POLICY "evidence_update_verifier" ON citizen_evidence
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('verifier', 'admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for pending evidence queue
CREATE INDEX IF NOT EXISTS idx_evidence_pending
  ON citizen_evidence(is_approved, created_at DESC) WHERE is_approved = FALSE;

-- ============================================================
-- 6. KARMA COMPUTATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION compute_karma_level(karma INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF karma >= 2000 THEN RETURN 10;
  ELSIF karma >= 1500 THEN RETURN 9;
  ELSIF karma >= 1000 THEN RETURN 8;
  ELSIF karma >= 500 THEN RETURN 7;
  ELSIF karma >= 350 THEN RETURN 6;
  ELSIF karma >= 200 THEN RETURN 5;
  ELSIF karma >= 100 THEN RETURN 4;
  ELSIF karma >= 50 THEN RETURN 3;
  ELSIF karma >= 20 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 7. KARMA UPDATE TRIGGER (on evidence approval)
-- ============================================================
CREATE OR REPLACE FUNCTION update_karma_on_evidence_review()
RETURNS trigger AS $$
BEGIN
  -- Evidence was approved
  IF NEW.is_approved = TRUE AND (OLD.is_approved = FALSE OR OLD.is_approved IS NULL) THEN
    UPDATE user_reputation
    SET evidence_karma = evidence_karma + 10,
        total_karma = total_karma + 10,
        level = compute_karma_level(total_karma + 10),
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  -- Evidence was rejected (went from pending to explicitly rejected via flag)
  IF NEW.is_flagged = TRUE AND OLD.is_flagged = FALSE THEN
    UPDATE user_reputation
    SET evidence_karma = GREATEST(evidence_karma - 5, 0),
        total_karma = GREATEST(total_karma - 5, 0),
        level = compute_karma_level(GREATEST(total_karma - 5, 0)),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_karma_evidence_review ON citizen_evidence;
CREATE TRIGGER trg_karma_evidence_review
  AFTER UPDATE ON citizen_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_karma_on_evidence_review();

-- ============================================================
-- 8. KARMA UPDATE TRIGGER (on evidence votes)
-- ============================================================
CREATE OR REPLACE FUNCTION update_karma_on_evidence_vote()
RETURNS trigger AS $$
DECLARE
  evidence_owner UUID;
BEGIN
  -- Get the evidence owner
  SELECT user_id INTO evidence_owner FROM citizen_evidence WHERE id = NEW.evidence_id;

  IF evidence_owner IS NOT NULL THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE user_reputation
      SET evidence_karma = evidence_karma + 2,
          total_karma = total_karma + 2,
          level = compute_karma_level(total_karma + 2),
          updated_at = NOW()
      WHERE user_id = evidence_owner;
    ELSIF NEW.vote_type = 'down' THEN
      UPDATE user_reputation
      SET evidence_karma = GREATEST(evidence_karma - 1, 0),
          total_karma = GREATEST(total_karma - 1, 0),
          level = compute_karma_level(GREATEST(total_karma - 1, 0)),
          updated_at = NOW()
      WHERE user_id = evidence_owner;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_karma_evidence_vote ON citizen_evidence_votes;
CREATE TRIGGER trg_karma_evidence_vote
  AFTER INSERT ON citizen_evidence_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_karma_on_evidence_vote();

-- ============================================================
-- 9. KARMA UPDATE TRIGGER (on progress verification)
-- ============================================================
CREATE OR REPLACE FUNCTION update_karma_on_verification()
RETURNS trigger AS $$
BEGIN
  UPDATE user_reputation
  SET verification_karma = verification_karma + 5,
      total_karma = total_karma + 5,
      level = compute_karma_level(total_karma + 5),
      last_activity_at = NOW(),
      updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_karma_verification ON progress_verifications;
CREATE TRIGGER trg_karma_verification
  AFTER INSERT ON progress_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_karma_on_verification();

-- ============================================================
-- 10. CREATE REPUTATION ROWS FOR EXISTING USERS
-- ============================================================
INSERT INTO user_reputation (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_reputation)
ON CONFLICT (user_id) DO NOTHING;
