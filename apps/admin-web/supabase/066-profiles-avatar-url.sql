-- Migration: add avatar_url column to profiles table
-- The API (app/api/me/profile/route.ts) already handles this field but the
-- column was never added, causing avatar updates to be silently dropped.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
