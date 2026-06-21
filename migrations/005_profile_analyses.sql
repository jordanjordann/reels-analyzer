CREATE TABLE IF NOT EXISTS profile_analyses (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  raw_gemini TEXT,
  user_prompt TEXT,
  reel_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_analyses_username ON profile_analyses(username);
