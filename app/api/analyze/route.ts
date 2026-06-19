import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import {
  addMessage,
  buildPlaceholderAssistantResponse,
  createSession,
  getSession,
  normalizeUsername,
  updateSessionTitle,
  validatePrompt,
  validateUsername,
} from "@/lib/sessions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    prompt?: unknown;
    sessionId?: unknown;
  } | null;

  if (!validateUsername(body?.username)) {
    return NextResponse.json({ error: "Enter a valid Instagram username." }, { status: 400 });
  }

  if (!validatePrompt(body?.prompt)) {
    return NextResponse.json({ error: "Enter a prompt under 4,000 characters." }, { status: 400 });
  }

  const username = normalizeUsername(body.username);
  const prompt = body.prompt.trim();
  let session = typeof body.sessionId === "string" ? await getSession(body.sessionId) : null;

  if (session?.username !== username) {
    session = null;
  }

  if (!session) {
    session = await createSession(username, prompt.slice(0, 80));
  }

  await addMessage(session.id, "user", prompt);
  if (!session.title) {
    await updateSessionTitle(session.id, prompt.slice(0, 80));
  }

  const response = buildPlaceholderAssistantResponse(username, prompt);
  await addMessage(session.id, "assistant", response, JSON.stringify({ phase: 2, placeholder: true }));

  return NextResponse.json({
    sessionId: session.id,
    username,
    reelsAnalyzed: 0,
    response,
  });
}
