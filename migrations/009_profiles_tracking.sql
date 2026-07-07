-- Add tracking columns to profiles table for user list optimization
ALTER TABLE profiles ADD COLUMN reel_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN session_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_analyzed_at TEXT;

-- Backfill existing data from reels table
UPDATE profiles
SET
  reel_count = (
    SELECT COUNT(DISTINCT r.id)
    FROM reels r
    WHERE r.username = profiles.username
  ),
  session_count = (
    SELECT COUNT(DISTINCT r.session_id)
    FROM reels r
    WHERE r.username = profiles.username
  ),
  last_analyzed_at = (
    SELECT MAX(r.created_at)
    FROM reels r
    WHERE r.username = profiles.username
  );
