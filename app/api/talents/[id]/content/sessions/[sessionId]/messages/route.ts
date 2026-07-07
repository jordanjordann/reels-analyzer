import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { generateContent } from "@/server/talents/content-generator";
import { validateFile, extractFileContent } from "@/server/talents/file-processor";
import type { ContentMessage } from "@/api/talents/content/types";

export const runtime = "nodejs";

const MENTION_REGEX = /@([\w-]+)/g;

export async function POST(request: Request, context: { params: Promise<{ id: string; sessionId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: talentId, sessionId } = await context.params;

  let content: string;
  let fileExtraContext = "";

  const contentTypeHeader = request.headers.get("content-type") ?? "";

  if (contentTypeHeader.includes("multipart/form-data")) {
    const formData = await request.formData();
    content = String(formData.get("content") ?? "").trim();
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const validationError = validateFile(file);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      try {
        fileExtraContext = await extractFileContent(file);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `Failed to process file: ${errMsg}` }, { status: 400 });
      }
    }
  } else {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    content = typeof body.content === "string" ? body.content.trim() : "";
  }

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const sessionResult = await db.execute({
    sql: "SELECT * FROM content_sessions WHERE id = ? AND talent_id = ? LIMIT 1",
    args: [sessionId, talentId],
  });

  if (sessionResult.rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = sessionResult.rows[0] as Record<string, unknown>;

  const talentResult = await db.execute({
    sql: "SELECT analysis_content FROM talents WHERE id = ? LIMIT 1",
    args: [talentId],
  });

  if (talentResult.rows.length === 0) {
    return NextResponse.json({ error: "Talent not found" }, { status: 404 });
  }

  const analysisContent = String((talentResult.rows[0] as Record<string, unknown>).analysis_content ?? "");

  if (!analysisContent) {
    return NextResponse.json({ error: "Talent has no analysis. Run an analysis first." }, { status: 400 });
  }

  const userMessageId = randomUUID();
  await db.execute({
    sql: "INSERT INTO content_messages (id, session_id, role, content) VALUES (?, ?, 'user', ?)",
    args: [userMessageId, sessionId, content],
  });

  const previousMessagesResult = await db.execute({
    sql: "SELECT id, session_id, role, content, created_at FROM content_messages WHERE session_id = ? AND id != ? ORDER BY created_at ASC",
    args: [sessionId, userMessageId],
  });

  const previousMessages: ContentMessage[] = previousMessagesResult.rows.map((msg) => ({
    id: String(msg.id),
    sessionId: String(msg.session_id),
    role: String(msg.role) as "user" | "assistant",
    content: String(msg.content),
    createdAt: String(msg.created_at),
  }));

  const mentionedUsernames = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
  while ((match = regex.exec(content)) !== null) {
    mentionedUsernames.add(match[1]);
  }

  const referenceProfiles: { username: string; analysisContent: string }[] = [];
  if (mentionedUsernames.size > 0) {
    const placeholders = Array.from(mentionedUsernames).map(() => "?").join(", ");
    const refResult = await db.execute({
      sql: `SELECT pa.username, pa.content FROM profile_analyses pa WHERE pa.username IN (${placeholders})`,
      args: Array.from(mentionedUsernames),
    });
    for (const row of refResult.rows) {
      const username = String(row.username);
      const ac = String(row.content ?? "");
      if (ac) {
        referenceProfiles.push({ username, analysisContent: ac });
      }
    }
  }

  let assistantContent: string;
  try {
    console.log("=== API: SEND MESSAGE TO GEMINI ===");
    console.log("User message:", content);
    console.log("Session content_type:", session.content_type);
    console.log("Session topic:", session.topic);
    console.log("Session extra_context:", session.extra_context ? String(session.extra_context).slice(0, 200) : "(none)");
    console.log("File extra_context:", fileExtraContext ? fileExtraContext.slice(0, 200) : "(none)");
    console.log("Mentioned usernames:", Array.from(mentionedUsernames));
    console.log("Reference profiles:", referenceProfiles.map((p) => p.username));
    console.log("Previous messages count:", previousMessages.length);

    const combinedExtraContext = [String(session.extra_context ?? ""), fileExtraContext].filter(Boolean).join("\n\n");

    assistantContent = await generateContent(
      analysisContent,
      session.content_type ? String(session.content_type) as "video" | "carousel" | null : null,
      previousMessages,
      content,
      combinedExtraContext,
      String(session.topic ?? ""),
      referenceProfiles,
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  const assistantMessageId = randomUUID();
  await db.execute({
    sql: "INSERT INTO content_messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)",
    args: [assistantMessageId, sessionId, assistantContent],
  });

  await db.execute({
    sql: "UPDATE content_sessions SET updated_at = datetime('now') WHERE id = ?",
    args: [sessionId],
  });

  const userMessage: ContentMessage = {
    id: userMessageId,
    sessionId,
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };

  const assistantMessage: ContentMessage = {
    id: assistantMessageId,
    sessionId,
    role: "assistant",
    content: assistantContent,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ userMessage, assistantMessage });
}
