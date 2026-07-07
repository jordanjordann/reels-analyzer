CREATE TABLE IF NOT EXISTS content_sessions (
  id TEXT PRIMARY KEY,
  talent_id TEXT NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK(mode IN ('templated', 'custom')),
  content_type TEXT CHECK(content_type IN ('video', 'carousel', NULL)),
  topic TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_sessions_talent_id ON content_sessions(talent_id);

CREATE TABLE IF NOT EXISTS content_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES content_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_messages_session_id ON content_messages(session_id);
