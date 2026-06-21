CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  reel_id TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  raw_gemini TEXT,
  user_prompt TEXT,
  viral_intelligence_score INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analyses_reel_id ON analyses(reel_id);
CREATE INDEX IF NOT EXISTS idx_analyses_session_id ON analyses(session_id);
