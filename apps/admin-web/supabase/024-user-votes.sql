-- 024-user-votes.sql
-- Dedicated user_votes table for fine-grained voting on commitments, signals, evidence, and comments.
-- Complements the existing public_votes table by providing a simpler per-target vote model.

CREATE TABLE IF NOT EXISTS user_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- 'commitment', 'signal', 'evidence', 'comment'
  target_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own votes" ON user_votes
FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Public can read vote counts" ON user_votes
FOR SELECT TO anon USING (true);

CREATE INDEX idx_user_votes_target ON user_votes(target_type, target_id);
