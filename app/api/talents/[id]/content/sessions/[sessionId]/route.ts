import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string; sessionId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: talentId, sessionId } = await context.params;

  const sessionResult = await db.execute({
    sql: `
      SELECT id, talent_id, mode, content_type, topic, created_at, updated_at
      FROM content_sessions
      WHERE id = ? AND talent_id = ?
      LIMIT 1
    `,
    args: [sessionId, talentId],
  });

  if (sessionResult.rows.length === 0) {
    return NextResponse.json({ session: null });
  }

  const row = sessionResult.rows[0] as Record<string, unknown>;

  const messagesResult = await db.execute({
    sql: `
      SELECT id, session_id, role, content, created_at
      FROM content_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `,
    args: [sessionId],
  });

  const messages = messagesResult.rows.map((msg) => ({
    id: String(msg.id),
    sessionId: String(msg.session_id),
    role: String(msg.role) as "user" | "assistant",
    content: String(msg.content),
    createdAt: String(msg.created_at),
  }));

  const session = {
    id: String(row.id),
    mode: String(row.mode) as "templated" | "custom",
    contentType: row.content_type ? (String(row.content_type) as "video" | "carousel" | null) : null,
    topic: typeof row.topic === "string" ? row.topic : "",
    lastMessagePreview: messages.length > 0 ? messages[messages.length - 1].content.slice(0, 150) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    messages,
  };

  return NextResponse.json({ session });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; sessionId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: talentId, sessionId } = await context.params;

  const existing = await db.execute({
    sql: "SELECT id FROM content_sessions WHERE id = ? AND talent_id = ? LIMIT 1",
    args: [sessionId, talentId],
  });

  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await db.execute({
    sql: "DELETE FROM content_sessions WHERE id = ?",
    args: [sessionId],
  });

  return NextResponse.json({ success: true });
}
