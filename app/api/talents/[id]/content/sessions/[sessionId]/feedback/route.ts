import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { upsertMemory, extractSessionMemories } from "@/server/talents/content-memory";
import type { ContentMessage } from "@/api/talents/content/types";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/talents/[id]/content/sessions/[sessionId]/feedback">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: talentId, sessionId } = await context.params;
  const body = await request.json();

  const { type, text } = body as { type: "up" | "down" | "correction"; text?: string };

  if (!type || !["up", "down", "correction"].includes(type)) {
    return NextResponse.json({ error: "type must be 'up', 'down', or 'correction'" }, { status: 400 });
  }

  if (type === "up") {
    const messagesResult = await db.execute({
      sql: "SELECT id, session_id, role, content, created_at FROM content_messages WHERE session_id = ? ORDER BY created_at ASC",
      args: [sessionId],
    });

    const messages = messagesResult.rows.map((msg) => ({
      id: String(msg.id),
      sessionId: String(msg.session_id),
      role: String(msg.role) as "user" | "assistant",
      content: String(msg.content),
      createdAt: String(msg.created_at),
    }));

    const extracted = await extractSessionMemories(messages);

    for (const memory of extracted) {
      await upsertMemory(talentId, memory.category, memory.key, memory.value, Math.min(memory.confidence + 0.1, 1.0), memory.source);
    }

    return NextResponse.json({ success: true, memoriesUpdated: extracted.length });
  }

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "text is required for down/correction feedback" }, { status: 400 });
  }

  const correctionMessages: ContentMessage[] = [
    {
      id: "feedback-prev",
      sessionId,
      role: "assistant",
      content: "(Previous assistant response)",
      createdAt: new Date().toISOString(),
    },
    {
      id: "feedback-user",
      sessionId,
      role: "user",
      content: `Feedback: ${text.trim()}`,
      createdAt: new Date().toISOString(),
    },
  ];

  const extracted = await extractSessionMemories(correctionMessages);

  for (const memory of extracted) {
    await upsertMemory(talentId, memory.category, memory.key, memory.value, 0.95, "correction");
  }

  if (extracted.length === 0) {
    await upsertMemory(talentId, "avoidance", "user_feedback", text.trim(), 0.95, "correction");
  }

  return NextResponse.json({ success: true, memoriesUpdated: extracted.length || 1 });
}
