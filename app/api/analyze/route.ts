import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { initBrowser, loadOrCreateContext, closeBrowser } from "@/server/analysis/ig-session";
import { fetchAllReels } from "@/server/analysis/reel-fetcher";
import {
  addMessage,
  createSession,
  getSession,
  getSessionByUsername,
  normalizeUsername,
  storeReels,
  updateReelGeminiFile,
  updateSessionTitle,
  validatePrompt,
} from "@/server/sessions";
import type { ScrapedReel } from "@/server/analysis/types";
import { runAnalysis } from "@/server/analysis/prompt-router";

export const runtime = "nodejs";

const REEL_URL_REGEX = /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+/i;
const MAX_VIDEO_SECONDS_PER_PROMPT = parseInt(process.env.MAX_VIDEO_SECONDS_PER_PROMPT || "900", 10);

function validateUrls(urls: unknown): urls is string[] {
  if (!Array.isArray(urls) || urls.length > 10) return false;
  if (urls.length === 0) return true;
  return urls.every((u) => typeof u === "string" && REEL_URL_REGEX.test(u));
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    urls?: unknown;
    prompt?: unknown;
    sessionId?: unknown;
    confirmBudget?: boolean;
  } | null;

  if (!validateUrls(body?.urls)) {
    return NextResponse.json(
      { error: "Provide 1-10 valid Instagram reel URLs." },
      { status: 400 }
    );
  }

  if (!validatePrompt(body?.prompt)) {
    return NextResponse.json({ error: "Enter a prompt under 4,000 characters." }, { status: 400 });
  }

  const urls = (body?.urls ?? []) as string[];
  const prompt = (body.prompt as string).trim();
  const confirmBudget = body?.confirmBudget === true;
  let session = typeof body.sessionId === "string" ? await getSession(body.sessionId) : null;

  // If no sessionId provided, try to find existing session by username after fetching reels

  if (urls.length === 0 && (!session || session.reels.length === 0)) {
    return NextResponse.json(
      { error: "Provide at least 1 Instagram reel URL." },
      { status: 400 }
    );
  }

  const browser = await initBrowser();
  let context;

  try {
    context = await loadOrCreateContext(browser);

    const { success, failed } = await fetchAllReels(urls, context);

    if (success.length === 0) {
      const errorDetails = failed
        .map((f) => `Reel ${f.index}: ${f.error}`)
        .join("; ");
      const msg = `All reel URLs failed: ${errorDetails}`;

      if (!session) {
        session = await createSession("unknown", prompt.slice(0, 80));
      }
      await addMessage(session.id, "user", prompt);
      await addMessage(session.id, "assistant", msg);

      return NextResponse.json({
        sessionId: session.id,
        username: "unknown",
        reelsAnalyzed: 0,
        failedReels: failed,
        error: msg,
      });
    }

    const username = normalizeUsername(success[0].username);

    if (!session || session.username !== username) {
      session = await getSessionByUsername(username);
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
      const reelsToStore: ScrapedReel[] = success.map((r) => ({
        shortcode: r.shortcode,
        url: r.url,
        thumbnailUrl: r.thumbnailUrl,
        videoUrl: r.videoUrl,
        caption: r.caption,
        viewCount: r.viewCount,
        postDate: r.postDate,
        durationSec: r.durationSec,
      }));

      await storeReels(sessionId, username, reelsToStore);
      reelsAnalyzed = reelsToStore.length;

      if (reelsAnalyzed === 0) {
        const msg = `Found 0 usable reels from ${urls.length} URLs.`;
        await addMessage(sessionId, "assistant", msg);
        return NextResponse.json({
          sessionId,
          username,
          reelsAnalyzed: 0,
          failedReels: failed,
        });
      }

      const loaded = await getSession(sessionId);
      if (!loaded) {
        throw new Error("Session not found after storing reels.");
      }
      session = loaded;
    }

    // Budget check — only on first run (not when user confirms)
    if (!confirmBudget) {
      const totalDurationSec = session.reels.reduce(
        (sum, r) => sum + (r.durationSec ?? 0),
        0,
      );
      const pct = Math.round((totalDurationSec / MAX_VIDEO_SECONDS_PER_PROMPT) * 100);

      if (totalDurationSec > MAX_VIDEO_SECONDS_PER_PROMPT || pct > 70) {
        return NextResponse.json({
          sessionId,
          username,
          reelsAnalyzed,
          failedReels: failed,
          budgetWarning: {
            totalSeconds: totalDurationSec,
            limitSeconds: MAX_VIDEO_SECONDS_PER_PROMPT,
            over: totalDurationSec > MAX_VIDEO_SECONDS_PER_PROMPT,
            pct,
          },
        });
      }
    }

    const result = await runAnalysis(prompt, session.reels);

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

    return NextResponse.json({
      sessionId: session.id,
      username,
      reelsAnalyzed,
      failedReels: failed,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    if (!session) {
      session = await createSession("unknown", prompt.slice(0, 80));
      await addMessage(session.id, "user", prompt);
    }
    await addMessage(session.id, "assistant", `Analysis failed: ${errMsg}`);

    return NextResponse.json({
      sessionId: session.id,
      username: session.username,
      reelsAnalyzed: 0,
      error: errMsg,
    });
  } finally {
    await closeBrowser(browser);
  }
}
