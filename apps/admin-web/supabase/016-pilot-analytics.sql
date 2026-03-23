-- Nepal Najar — pilot analytics and product event tracking

CREATE TABLE IF NOT EXISTS pilot_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL CHECK (
    event_name IN (
      'page_view',
      'watchlist_add',
      'watchlist_remove',
      'hometown_set',
      'feedback_submit',
      'evidence_submit',
      'verify_progress'
    )
  ),
  page_path TEXT,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pilot_events_created_at
  ON pilot_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_events_event_name_created
  ON pilot_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_events_page_created
  ON pilot_events(page_path, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pilot_events_visitor_created
  ON pilot_events(visitor_id, created_at DESC);

ALTER TABLE pilot_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service write pilot events" ON pilot_events FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
