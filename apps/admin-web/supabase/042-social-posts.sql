-- Social media post tracking — logs all automated posts across platforms
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  platform TEXT NOT NULL,                -- facebook, instagram, tiktok, youtube, twitter
  content_type TEXT NOT NULL DEFAULT 'reel',  -- reel, story, image, carousel, thread
  language TEXT DEFAULT 'ne',            -- ne, en
  post_id TEXT,                          -- platform-specific post ID
  post_url TEXT,
  caption TEXT,
  video_path TEXT,
  status TEXT DEFAULT 'pending',         -- pending, posted, failed
  error_message TEXT,
  engagement JSONB DEFAULT '{}',         -- views, likes, comments, shares (updated by analytics collector)
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_date ON social_posts(date);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);

-- Allow service role full access
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON social_posts FOR ALL USING (true);
