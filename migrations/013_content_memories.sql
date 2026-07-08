CREATE TABLE IF NOT EXISTS content_memories (
  id TEXT PRIMARY KEY,
  talent_id TEXT NOT NULL REFERENCES talents(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.8,
  source TEXT NOT NULL DEFAULT 'implicit',
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(talent_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_content_memories_talent ON content_memories(talent_id);
CREATE INDEX IF NOT EXISTS idx_content_memories_category ON content_memories(talent_id, category);
