import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { scrapeReels } from "@/lib/scraper";
import {
  addMessage,
  createSession,
  getSession,
  normalizeUsername,
  storeReels,
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

  let reelsAnalyzed = session.reels.length;

  if (reelsAnalyzed === 0) {
    try {
      const scraped = await scrapeReels(username);
      await storeReels(session.id, username, scraped);
      reelsAnalyzed = scraped.length;

      const msg = `Scraped ${scraped.length} Reels from @${username}.\n\nPrompt: "${prompt}"\n\nWaiting for Phase 4 — Gemini video analysis is not connected yet.`;
      await addMessage(session.id, "assistant", msg);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const msg = `Failed to scrape Reels for @${username}: ${errMsg}`;
      await addMessage(session.id, "assistant", msg);
      reelsAnalyzed = -1;
    }
  } else {
    const msg = `Already found ${reelsAnalyzed} Reels for @${username}.\n\nPrompt: "${prompt}"\n\nWaiting for Phase 4 — Gemini video analysis is not connected yet.`;
    await addMessage(session.id, "assistant", msg);
  }

  return NextResponse.json({
    sessionId: session.id,
    username,
    reelsAnalyzed,
  });
}
