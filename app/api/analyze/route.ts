import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { scrapeReels } from "@/lib/scraper";
import {
  addMessage,
  createSession,
  getSession,
  normalizeUsername,
  storeReels,
  updateReelGeminiFile,
  updateSessionTitle,
  validatePrompt,
  validateUsername,
} from "@/lib/sessions";
import { runAnalysis } from "@/lib/prompt-router";

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

  const sessionId = session.id;
  const initialReelCount = session.reels.length;

  await addMessage(sessionId, "user", prompt);
  if (!session.title) {
    await updateSessionTitle(sessionId, prompt.slice(0, 80));
  }

  let reelsAnalyzed = initialReelCount;

  if (reelsAnalyzed === 0) {
    try {
      const scraped = await scrapeReels(username);
      await storeReels(sessionId, username, scraped);
      reelsAnalyzed = scraped.length;

      if (reelsAnalyzed === 0) {
        const msg = `Scraped @${username} but found 0 Reels. The account may have no Reels or is unavailable.`;
        await addMessage(sessionId, "assistant", msg);
        return NextResponse.json({ sessionId, username, reelsAnalyzed });
      }

      // Reload session to get stored reels with IDs
      const loaded = await getSession(sessionId);
      if (!loaded) {
        throw new Error("Session not found after storing reels.");
      }
      session = loaded;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const msg = `Failed to scrape Reels for @${username}: ${errMsg}`;
      await addMessage(sessionId, "assistant", msg);
      return NextResponse.json({
        sessionId,
        username,
        reelsAnalyzed: -1,
        error: errMsg,
      });
    }
  }

  // Run Gemini analysis
  try {
    const result = await runAnalysis(prompt, session.reels);

    // Persist Gemini file URIs back to reels
    for (const uploaded of result.uploadedReels) {
      await updateReelGeminiFile(uploaded.reelId, uploaded.geminiFileUri, uploaded.geminiFileExpiresAt);
    }

    let analysisText = result.analysis;
    if (result.usedMetadataOnly) {
      analysisText = `⚠️ Video analysis was not available — this response is based on metadata only.\n\n${result.analysis}`;
    } else if (result.videoCount < result.totalCount) {
      analysisText = `ℹ️ Analyzed ${result.videoCount} of ${result.totalCount} reels (some videos could not be processed).\n\n${result.analysis}`;
    }

    await addMessage(session.id, "assistant", analysisText, result.rawGemini);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const msg = `Analysis failed: ${errMsg}`;
    await addMessage(session.id, "assistant", msg);
    return NextResponse.json({
      sessionId: session.id,
      username,
      reelsAnalyzed,
      error: errMsg,
    });
  }

  return NextResponse.json({
    sessionId: session.id,
    username,
    reelsAnalyzed,
  });
}
