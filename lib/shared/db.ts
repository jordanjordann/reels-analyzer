import { createClient } from "@libsql/client";

const databaseUrl = process.env.TURSO_DATABASE_URL ?? "file:./reels-analyzer.db";

export const db = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function getSetting(key: string) {
  const result = await db.execute({
    sql: "SELECT value FROM settings WHERE key = ? LIMIT 1",
    args: [key],
  });

  const row = result.rows[0];
  return typeof row?.value === "string" ? row.value : null;
}

export async function setSetting(key: string, value: string) {
  await db.execute({
    sql: `
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `,
    args: [key, value],
  });
}

export async function deleteSettings(keys: string[]) {
  if (keys.length === 0) {
    return;
  }

  await db.execute({
    sql: `DELETE FROM settings WHERE key IN (${keys.map(() => "?").join(", ")})`,
    args: keys,
  });
}
