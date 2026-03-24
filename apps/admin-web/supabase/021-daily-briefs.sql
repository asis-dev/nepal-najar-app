-- Daily Briefs table for Nepal Najar daily intelligence summaries
-- Stores AI-generated daily briefings with English/Nepali summaries,
-- top stories, commitment movements, and activity stats.

CREATE TABLE IF NOT EXISTS daily_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  pulse INTEGER DEFAULT 0,
  pulse_label TEXT,
  summary_en TEXT,
  summary_ne TEXT,
  top_stories JSONB DEFAULT '[]',
  commitments_moved JSONB DEFAULT '[]',
  stats JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT now(),
  regenerated_count INTEGER DEFAULT 0
);

CREATE INDEX idx_daily_briefs_date ON daily_briefs(date);

-- Public read access
ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read daily briefs" ON daily_briefs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role can manage briefs" ON daily_briefs FOR ALL TO service_role USING (true);
