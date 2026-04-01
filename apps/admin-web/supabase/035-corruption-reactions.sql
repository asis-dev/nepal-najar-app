-- ═══════════════════════════════════════════════
-- 035 — Corruption Reactions + Comments
-- ═══════════════════════════════════════════════

-- Reactions on corruption cases (emoji-style, like Facebook)
CREATE TABLE IF NOT EXISTS corruption_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_slug   TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL CHECK (reaction IN ('angry', 'shocked', 'sad', 'clap', 'eyes')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_slug, user_id)  -- one reaction per user per case
);

CREATE INDEX IF NOT EXISTS idx_corruption_reactions_slug ON corruption_reactions(case_slug);
CREATE INDEX IF NOT EXISTS idx_corruption_reactions_user ON corruption_reactions(user_id);

-- Comments on corruption cases (reuse same pattern as commitment comments)
CREATE TABLE IF NOT EXISTS corruption_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_slug    TEXT NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_approved  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corruption_comments_slug ON corruption_comments(case_slug, is_approved);
CREATE INDEX IF NOT EXISTS idx_corruption_comments_user ON corruption_comments(user_id);

-- RLS
ALTER TABLE corruption_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corruption_comments ENABLE ROW LEVEL SECURITY;

-- Reactions: anyone can read, authenticated users can insert/update/delete own
CREATE POLICY "reactions_read" ON corruption_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON corruption_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_update" ON corruption_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON corruption_reactions FOR DELETE USING (auth.uid() = user_id);

-- Comments: read approved OR own, insert own, admin manage
CREATE POLICY "corruption_comments_read" ON corruption_comments FOR SELECT
  USING (is_approved = TRUE OR auth.uid() = user_id);
CREATE POLICY "corruption_comments_insert" ON corruption_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "corruption_comments_update" ON corruption_comments FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "corruption_comments_delete" ON corruption_comments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
