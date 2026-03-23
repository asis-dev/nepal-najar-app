-- 020-watchlist.sql
-- Dedicated watchlist table with proper relational structure + RLS

CREATE TABLE IF NOT EXISTS user_watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promise_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, promise_id)
);

-- RLS
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
ON user_watchlist FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to watchlist"
ON user_watchlist FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from watchlist"
ON user_watchlist FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_user_watchlist_user ON user_watchlist(user_id);
