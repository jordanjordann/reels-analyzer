import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { initBrowser, loadOrCreateContext, closeBrowser } from "@/server/analysis/ig-session";
import { fetchAllMedia, fetchUserProfile } from "@/server/analysis/reel-fetcher";
import {
  addMessage,
  createSession,
  getSession,
  getSessionByUsername,
  normalizeUsername,
  storeReels,
  syncProfileTracking,
  updateReelGeminiFile,
  updateSessionTitle,
  upsertProfile,
  storeAnalysis,
} from "@/server/sessions";
import { parseStructuredAnalysis } from "@/analysis/analysis-parser";
import type { ScrapedReel } from "@/server/analysis/types";
import { runAnalysis } from "@/server/analysis/prompt-router";
import { generateProfileAnalysis } from "@/server/analysis/profile-analysis";

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

  const urls = (body?.urls ?? []) as string[];
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const confirmBudget = body?.confirmBudget === true;
  let session = typeof body.sessionId === "string" ? await getSession(body.sessionId) : null;

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

    const { success, failed } = await fetchAllMedia(urls, context);

    if (success.length === 0) {
      const errorDetails = failed
        .map((f) => `Reel ${f.index}: ${f.error}`)
        .join("; ");
      const msg = `All reel URLs failed: ${errorDetails}`;

      if (!session) {
        session = await createSession("unknown", prompt.slice(0, 80) || "Reel analysis");
      }
      if (prompt) {
        await addMessage(session.id, "user", prompt);
      }
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
      session = await createSession(username, prompt.slice(0, 80) || "Reel analysis");
    }

    const sessionId = session.id;

    // Scrape full profile data (followers, following, posts) before analysis
    let profileData: { followerCount: number | null; followingCount: number | null; postCount: number | null };
    try {
      const profile = await fetchUserProfile(username, context);
      if (profile.followerCount == null || profile.followingCount == null || profile.postCount == null) {
        const missing: string[] = [];
        if (profile.followerCount == null) missing.push("followers");
        if (profile.followingCount == null) missing.push("following");
        if (profile.postCount == null) missing.push("posts");
        throw new Error(`Could not extract ${missing.join(", ")} from profile page.`);
      }
      profileData = {
        followerCount: profile.followerCount,
        followingCount: profile.followingCount,
        postCount: profile.postCount,
      };
      await upsertProfile(username, profile.followerCount, profile.followingCount, profile.postCount);
    } catch (error) {
      const msg = `Profile scraping failed for @${username}: ${error instanceof Error ? error.message : error}. Analysis cannot proceed without complete profile data.`;
      if (!session) {
        session = await createSession(username, prompt.slice(0, 80) || "Reel analysis");
      }
      if (prompt) {
        await addMessage(session.id, "user", prompt);
      }
      await addMessage(session.id, "assistant", msg);
      return NextResponse.json({
        sessionId: session.id,
        username,
        reelsAnalyzed: 0,
        failedReels: [],
        error: msg,
      });
    }

    if (prompt) {
      await addMessage(sessionId, "user", prompt);
    }
    if (!session.title) {
      await updateSessionTitle(sessionId, prompt.slice(0, 80) || "Reel analysis");
    }

    // Always store newly fetched reels (deduped by shortcode)
    const existingShortcodes = new Set(session.reels.map((r) => r.igShortcode));
    const newReels = success.filter((r) => !existingShortcodes.has(r.shortcode));

    if (newReels.length > 0) {
      const reelsToStore: ScrapedReel[] = newReels.map((r) => ({
        shortcode: r.shortcode,
        url: r.url,
        mediaType: r.mediaType,
        thumbnailUrl: r.thumbnailUrl,
        videoUrl: r.videoUrl,
        caption: r.caption,
        viewCount: r.viewCount,
        postDate: r.postDate,
        durationSec: r.durationSec,
      }));

      await storeReels(sessionId, username, reelsToStore);

      await syncProfileTracking(username);

      const loaded = await getSession(sessionId);
      if (!loaded) {
        throw new Error("Session not found after storing reels.");
      }
      session = loaded;
    }

    // Analyze ONLY the newly submitted reels, not all stored reels
    const reelsToAnalyze = session.reels.filter((r) =>
      success.some((s) => s.shortcode === r.igShortcode)
    );

    if (reelsToAnalyze.length === 0) {
      const msg = `Found 0 usable reels from ${urls.length} URLs.`;
      await addMessage(sessionId, "assistant", msg);
      return NextResponse.json({
        sessionId,
        username,
        reelsAnalyzed: 0,
        failedReels: failed,
      });
    }

    const reelsAnalyzed = reelsToAnalyze.length;

    // Budget check — only on first run (not when user confirms)
    if (!confirmBudget) {
      const totalDurationSec = reelsToAnalyze.reduce(
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

    // Build user metadata from scraped profile data
    const userMetadata = {
      username,
      followers: profileData.followerCount,
      following: profileData.followingCount,
      posts: profileData.postCount,
    };

    const result = await runAnalysis(prompt, reelsToAnalyze, userMetadata);

    for (const uploaded of result.uploadedReels) {
      await updateReelGeminiFile(uploaded.reelId, uploaded.geminiFileUri, uploaded.geminiFileExpiresAt);
    }

    // Store each per-reel analysis in the analyses table
    for (const perReel of result.perReelResults) {
      const structured = parseStructuredAnalysis(perReel.analysis);
      const score = structured?.viralIntelligenceScore ?? null;
      await storeAnalysis(
        perReel.reelId,
        sessionId,
        perReel.analysis,
        perReel.rawGemini,
        prompt,
        score,
      );
    }

    // Also store a summary message for backward compatibility
    const analysisText = `Analyzed ${result.perReelResults.length} reel(s) individually.`;
    await addMessage(session.id, "assistant", analysisText);

    // Fire-and-forget profile analysis regeneration
    if (username && result.perReelResults.length > 0) {
      generateProfileAnalysis(username).catch((err) => {
        console.error(`Profile analysis failed for ${username}:`, err);
      });
    }

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
