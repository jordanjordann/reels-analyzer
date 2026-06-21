-- Delete duplicate analyses, keeping only the latest one per reel_id
DELETE FROM analyses
WHERE id NOT IN (
  SELECT id FROM analyses
  WHERE rowid IN (
    SELECT MAX(rowid) FROM analyses GROUP BY reel_id
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_reel_id_unique ON analyses(reel_id);
