import { randomUUID } from "node:crypto";

import { db } from "@/shared/db";
import type { ContentMemory } from "@/api/talents/content/types";

function rowToMemory(row: Record<string, unknown>): ContentMemory {
  return {
    id: String(row.id),
    talentId: String(row.talent_id),
    category: String(row.category) as ContentMemory["category"],
    key: String(row.key),
    value: String(row.value),
    confidence: Number(row.confidence),
    source: String(row.source) as ContentMemory["source"],
    lastSeenAt: String(row.last_seen_at),
    createdAt: String(row.created_at),
  };
}

export async function upsertMemory(
  talentId: string,
  category: string,
  key: string,
  value: string,
  confidence: number,
  source: string,
): Promise<void> {
  const id = randomUUID();
  await db.execute({
    sql: `
      INSERT INTO content_memories (id, talent_id, category, key, value, confidence, source, last_seen_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(talent_id, category, key) DO UPDATE SET
        value = excluded.value,
        confidence = (excluded.confidence + content_memories.confidence) / 2,
        source = excluded.source,
        last_seen_at = datetime('now')
    `,
    args: [id, talentId, category, key, value, confidence, source],
  });
}

export async function getActiveMemories(
  talentId: string,
  limit = 8,
): Promise<ContentMemory[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM content_memories
      WHERE talent_id = ?
      ORDER BY confidence DESC, last_seen_at DESC
      LIMIT ?
    `,
    args: [talentId, limit],
  });

  return result.rows.map(rowToMemory);
}

export async function getAllMemories(talentId: string): Promise<ContentMemory[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM content_memories
      WHERE talent_id = ?
      ORDER BY category, key
    `,
    args: [talentId],
  });

  return result.rows.map(rowToMemory);
}

export async function clearMemories(talentId: string): Promise<void> {
  await db.execute({
    sql: "DELETE FROM content_memories WHERE talent_id = ?",
    args: [talentId],
  });
}

export async function deleteMemory(
  talentId: string,
  category: string,
  key: string,
): Promise<void> {
  await db.execute({
    sql: "DELETE FROM content_memories WHERE talent_id = ? AND category = ? AND key = ?",
    args: [talentId, category, key],
  });
}

export async function updateMemoryValue(
  talentId: string,
  category: string,
  key: string,
  value: string,
): Promise<void> {
  await db.execute({
    sql: `
      UPDATE content_memories
      SET value = ?, source = 'explicit', confidence = 1.0, last_seen_at = datetime('now')
      WHERE talent_id = ? AND category = ? AND key = ?
    `,
    args: [value, talentId, category, key],
  });
}
