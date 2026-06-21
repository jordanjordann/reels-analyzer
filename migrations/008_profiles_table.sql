CREATE TABLE IF NOT EXISTS profiles (
  username TEXT PRIMARY KEY,
  follower_count INTEGER,
  following_count INTEGER,
  post_count INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Migrate existing data from sessions to profiles
INSERT OR IGNORE INTO profiles (username, follower_count, following_count, post_count, updated_at)
SELECT DISTINCT username, follower_count, following_count, post_count, updated_at
FROM sessions
WHERE follower_count IS NOT NULL OR following_count IS NOT NULL OR post_count IS NOT NULL;
