-- ============================================================
-- Nepal Najar — User Accounts, Profiles, Comments, Submissions
-- Run this AFTER migration.sql (which creates promises, etc.)
-- ============================================================

-- 1. PROFILES (auto-linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  phone TEXT,
  email TEXT,
  province TEXT,
  district TEXT,
  municipality TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but cannot change role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()));

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins can update any profile (including role)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Allow inserts (for trigger)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, phone, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- 2. USER PREFERENCES (cloud-synced)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  watchlist TEXT[] DEFAULT '{}',
  province TEXT,
  district TEXT,
  municipality TEXT,
  streak_data JSONB DEFAULT '{"currentStreak":0,"longestStreak":0,"lastVisitDate":null}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs_select_own" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_update_own" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);


-- 3. COMMENTS (moderated)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_promise ON comments(promise_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_pending ON comments(is_approved) WHERE is_approved = FALSE;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Everyone reads approved comments
CREATE POLICY "comments_select_approved" ON comments
  FOR SELECT USING (is_approved = TRUE);

-- Users read their own (even pending)
CREATE POLICY "comments_select_own" ON comments
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can insert
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can do anything
CREATE POLICY "comments_admin" ON comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- 4. USER SUBMISSIONS (evidence/tips)
CREATE TABLE IF NOT EXISTS user_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promise_id TEXT,
  url TEXT,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  type TEXT NOT NULL CHECK (type IN ('evidence', 'tip')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_promise ON user_submissions(promise_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON user_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON user_submissions(user_id);

ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

-- Users read own submissions
CREATE POLICY "submissions_select_own" ON user_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Users insert submissions
CREATE POLICY "submissions_insert" ON user_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "submissions_admin" ON user_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );


-- 5. ALTER PUBLIC_VOTES for logged-in user support
ALTER TABLE public_votes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public_votes ADD COLUMN IF NOT EXISTS vote_weight INTEGER NOT NULL DEFAULT 1;

-- One vote per authenticated user per topic
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_votes_user_topic
  ON public_votes (topic_type, topic_id, user_id)
  WHERE user_id IS NOT NULL;
