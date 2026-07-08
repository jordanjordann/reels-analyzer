import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { generateContent, generateContentStream } from "@/server/talents/content-generator";
import { getActiveMemories, extractSessionMemories, upsertMemory } from "@/server/talents/content-memory";
import { validateFile, extractFileContent } from "@/server/talents/file-processor";
import type { ContentMessage } from "@/api/talents/content/types";

export const runtime = "nodejs";

const MENTION_REGEX = /@([\w-]+)/g;

function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

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

  console.log("=== API: SEND MESSAGE TO GEMINI ===");
  console.log("User message:", content);
  console.log("Session content_type:", session.content_type);
  console.log("Session topic:", session.topic);
  console.log("Session extra_context:", session.extra_context ? String(session.extra_context).slice(0, 200) : "(none)");
  console.log("File extra_context:", fileExtraContext ? fileExtraContext.slice(0, 200) : "(none)");
  console.log("Mentioned usernames:", Array.from(mentionedUsernames));
  console.log("Reference profiles:", referenceProfiles.map((p) => p.username));
  console.log("Previous messages count:", previousMessages.length);

  const sessionExtraContext = String(session.extra_context ?? "");
  const contentType = session.content_type ? String(session.content_type) as "video" | "carousel" | null : null;
  const userMessage: ContentMessage = {
    id: userMessageId,
    sessionId,
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };

  const memories = await getActiveMemories(talentId, 8);

  if (request.headers.get("accept")?.includes("text/event-stream")) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let assistantContent = "";

        try {
          controller.enqueue(encoder.encode(formatSse("userMessage", userMessage)));

          for await (const chunk of generateContentStream(
            analysisContent,
            contentType,
            previousMessages,
            content,
            sessionExtraContext,
            String(session.topic ?? ""),
            referenceProfiles,
            memories,
            fileExtraContext || undefined,
          )) {
            assistantContent += chunk;
            controller.enqueue(encoder.encode(formatSse("chunk", { content: chunk })));
          }

          const assistantMessageId = randomUUID();
          await db.execute({
            sql: "INSERT INTO content_messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)",
            args: [assistantMessageId, sessionId, assistantContent],
          });

          await db.execute({
            sql: "UPDATE content_sessions SET updated_at = (strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z') WHERE id = ?",
            args: [sessionId],
          });

          const assistantMessage: ContentMessage = {
            id: assistantMessageId,
            sessionId,
            role: "assistant",
            content: assistantContent,
            createdAt: new Date().toISOString(),
          };

          controller.enqueue(encoder.encode(formatSse("done", { userMessage, assistantMessage })));

          const allMessages = [...previousMessages, userMessage, assistantMessage];
          extractSessionMemories(allMessages)
            .then((extracted) => {
              for (const memory of extracted) {
                upsertMemory(talentId, memory.category, memory.key, memory.value, memory.confidence, memory.source)
                  .catch((err) => console.error("Failed to upsert memory:", err));
              }
            })
            .catch((err) => console.error("Failed to extract memories:", err));
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          controller.enqueue(encoder.encode(formatSse("error", { error: errMsg })));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  let assistantContent: string;
  try {
    assistantContent = await generateContent(
      analysisContent,
      contentType,
      previousMessages,
      content,
      sessionExtraContext,
      String(session.topic ?? ""),
      referenceProfiles,
      memories,
      fileExtraContext || undefined,
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
    sql: "UPDATE content_sessions SET updated_at = (strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z') WHERE id = ?",
    args: [sessionId],
  });

  const assistantMessage: ContentMessage = {
    id: assistantMessageId,
    sessionId,
    role: "assistant",
    content: assistantContent,
    createdAt: new Date().toISOString(),
  };

  const allMessages = [...previousMessages, userMessage, assistantMessage];
  extractSessionMemories(allMessages)
    .then((extracted) => {
      for (const memory of extracted) {
        upsertMemory(talentId, memory.category, memory.key, memory.value, memory.confidence, memory.source)
          .catch((err) => console.error("Failed to upsert memory:", err));
      }
    })
    .catch((err) => console.error("Failed to extract memories:", err));

  return NextResponse.json({ userMessage, assistantMessage });
}
