import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { validateFile, extractFileContent } from "@/server/talents/file-processor";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: talentId } = await context.params;

  const result = await db.execute({
    sql: `
      SELECT
        cs.id,
        cs.content_type,
        cs.topic,
        cs.created_at,
        cs.updated_at,
        (SELECT content FROM content_messages WHERE session_id = cs.id ORDER BY created_at DESC LIMIT 1) as last_message_content
      FROM content_sessions cs
      WHERE cs.talent_id = ?
      ORDER BY cs.updated_at DESC
    `,
    args: [talentId],
  });

  const sessions = result.rows.map((row) => ({
    id: String(row.id),
    mode: "custom" as const,
    contentType: row.content_type ? (String(row.content_type) as "video" | "carousel" | null) : null,
    topic: typeof row.topic === "string" ? row.topic : "",
    lastMessagePreview: typeof row.last_message_content === "string" ? row.last_message_content.slice(0, 150) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  return NextResponse.json({ sessions });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: talentId } = await context.params;

  const talentCheck = await db.execute({
    sql: "SELECT id FROM talents WHERE id = ? LIMIT 1",
    args: [talentId],
  });

  if (talentCheck.rows.length === 0) {
    return NextResponse.json({ error: "Talent not found" }, { status: 404 });
  }

  let contentType: string | null = null;
  let topic = "";
  let extraContext = "";

  const contentTypeHeader = request.headers.get("content-type") ?? "";

  if (contentTypeHeader.includes("multipart/form-data")) {
    const formData = await request.formData();
    contentType = formData.get("contentType") ? String(formData.get("contentType")) : null;
    topic = String(formData.get("topic") ?? "").trim();

    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const validationError = validateFile(file);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      try {
        extraContext = await extractFileContent(file);
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

    contentType = typeof body.contentType === "string" ? body.contentType : null;
    topic = typeof body.topic === "string" ? body.topic.trim() : "";
    extraContext = typeof body.extraContext === "string" ? body.extraContext.trim() : "";
  }

  const id = randomUUID();

  await db.execute({
    sql: `
      INSERT INTO content_sessions (id, talent_id, mode, content_type, topic, extra_context)
      VALUES (?, ?, 'custom', ?, ?, ?)
    `,
    args: [id, talentId, contentType, topic, extraContext],
  });

  return NextResponse.json({ session: { id } });
}
