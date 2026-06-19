import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

export type MessageRole = "user" | "assistant";

export type SessionListItem = {
  id: string;
  username: string;
  title: string | null;
  lastPromptPreview: string | null;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  rawGemini: string | null;
  createdAt: string;
};

export type ReelRecord = {
  id: string;
  sessionId: string;
  username: string;
  igShortcode: string;
  igUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  viewCount: number | null;
  postDate: string | null;
  caption: string | null;
  geminiFileUri: string | null;
  geminiFileExpiresAt: string | null;
  createdAt: string;
};

export type SessionDetail = {
  id: string;
  username: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  reels: ReelRecord[];
  messages: MessageRecord[];
};

export async function listSessions(): Promise<SessionListItem[]> {
  const result = await db.execute(`
    SELECT
      s.id,
      s.username,
      s.title,
      s.updated_at,
      (
        SELECT m.content
        FROM messages m
        WHERE m.session_id = s.id AND m.role = 'user'
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_prompt_preview
    FROM sessions s
    ORDER BY s.updated_at DESC
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    username: String(row.username),
    title: typeof row.title === "string" ? row.title : null,
    lastPromptPreview: typeof row.last_prompt_preview === "string" ? row.last_prompt_preview : null,
    updatedAt: String(row.updated_at),
  }));
}

export async function createSession(username: string, title?: string | null) {
  const id = randomUUID();
  const normalizedUsername = normalizeUsername(username);

  await db.execute({
    sql: "INSERT INTO sessions (id, username, title) VALUES (?, ?, ?)",
    args: [id, normalizedUsername, title ?? null],
  });

  const session = await getSession(id);
  if (!session) {
    throw new Error("Session was created but could not be loaded.");
  }

  return session;
}

export async function getSession(id: string): Promise<SessionDetail | null> {
  const sessionResult = await db.execute({
    sql: "SELECT id, username, title, created_at, updated_at FROM sessions WHERE id = ? LIMIT 1",
    args: [id],
  });
  const session = sessionResult.rows[0];

  if (!session) {
    return null;
  }

  const [messagesResult, reelsResult] = await Promise.all([
    db.execute({
      sql: `
        SELECT id, session_id, role, content, raw_gemini, created_at
        FROM messages
        WHERE session_id = ?
        ORDER BY created_at ASC
      `,
      args: [id],
    }),
    db.execute({
      sql: `
        SELECT
          id, session_id, username, ig_shortcode, ig_url, thumbnail_url,
          duration_sec, view_count, post_date, caption, gemini_file_uri,
          gemini_file_expires_at, created_at
        FROM reels
        WHERE session_id = ?
        ORDER BY created_at ASC
      `,
      args: [id],
    }),
  ]);

  return {
    id: String(session.id),
    username: String(session.username),
    title: typeof session.title === "string" ? session.title : null,
    createdAt: String(session.created_at),
    updatedAt: String(session.updated_at),
    reels: reelsResult.rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      username: String(row.username),
      igShortcode: String(row.ig_shortcode),
      igUrl: String(row.ig_url),
      thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
      durationSec: typeof row.duration_sec === "number" ? row.duration_sec : null,
      viewCount: typeof row.view_count === "number" ? row.view_count : null,
      postDate: typeof row.post_date === "string" ? row.post_date : null,
      caption: typeof row.caption === "string" ? row.caption : null,
      geminiFileUri: typeof row.gemini_file_uri === "string" ? row.gemini_file_uri : null,
      geminiFileExpiresAt: typeof row.gemini_file_expires_at === "string" ? row.gemini_file_expires_at : null,
      createdAt: String(row.created_at),
    })),
    messages: messagesResult.rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      role: row.role === "assistant" ? "assistant" : "user",
      content: String(row.content),
      rawGemini: typeof row.raw_gemini === "string" ? row.raw_gemini : null,
      createdAt: String(row.created_at),
    })),
  };
}

export async function addMessage(sessionId: string, role: MessageRole, content: string, rawGemini?: string | null) {
  const id = randomUUID();

  await db.execute({
    sql: "INSERT INTO messages (id, session_id, role, content, raw_gemini) VALUES (?, ?, ?, ?, ?)",
    args: [id, sessionId, role, content, rawGemini ?? null],
  });

  await db.execute({
    sql: "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?",
    args: [sessionId],
  });

  return id;
}

export async function updateSessionTitle(sessionId: string, title: string) {
  await db.execute({
    sql: "UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?",
    args: [title, sessionId],
  });
}

export function normalizeUsername(username: string) {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(username: unknown): username is string {
  if (typeof username !== "string") {
    return false;
  }

  return /^[a-zA-Z0-9._]{1,30}$/.test(normalizeUsername(username));
}

export function validatePrompt(prompt: unknown): prompt is string {
  return typeof prompt === "string" && prompt.trim().length > 0 && prompt.trim().length <= 4000;
}

export function buildPlaceholderAssistantResponse(username: string, prompt: string) {
  return `Phase 2 saved your prompt for @${username}.\n\nPrompt received: "${prompt.trim()}"\n\nInstagram scraping and Gemini video analysis are not connected yet. In Phase 3/4, this same submit flow will fetch recent Reels, upload video context to Gemini, apply the hidden analysis rubric, and replace this placeholder with a grounded response.`;
}
