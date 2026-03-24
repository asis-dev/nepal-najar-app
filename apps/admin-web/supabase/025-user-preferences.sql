-- 025-user-preferences.sql
-- Add JSONB preferences column to profiles table for unified user preferences

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{}';
  END IF;
END $$;
