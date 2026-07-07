CREATE TABLE IF NOT EXISTS talents (
  id TEXT PRIMARY KEY,
  instagram_username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female', 'other')),
  notes TEXT DEFAULT '',
  overall_score INTEGER,
  analysis_content TEXT,
  analysis_raw_gemini TEXT,
  analysis_user_prompt TEXT,
  analysis_reel_count INTEGER DEFAULT 0,
  last_analyzed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
