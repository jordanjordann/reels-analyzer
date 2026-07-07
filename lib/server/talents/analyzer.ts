import { randomUUID } from "node:crypto";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { initBrowser, loadOrCreateContext, closeBrowser } from "@/server/analysis/ig-session";
import { fetchUserProfile } from "@/server/analysis/reel-fetcher";
import { scrapeProfileReels } from "./scraper";
import { buildTalentAnalysisSystemInstruction } from "@/server/analysis/talent-prompt";
import { runPerReelAnalysis } from "@/server/analysis/prompt-router";
import { withRetry } from "@/server/analysis/gemini-retry";
import { parseStructuredAnalysis } from "@/analysis/analysis-parser";
import { parseProfileAnalysis } from "@/analysis/profile-types";
import type { ProfileAnalysis } from "@/analysis/profile-types";
import type { ReelRecord } from "@/server/sessions/types";
import type { ReelMetadata } from "@/server/analysis/reel-fetcher";
import type { UserProfileMetadata } from "@/server/analysis/types";

function metadataToReelRecord(meta: ReelMetadata, username: string): ReelRecord {
  return {
    id: randomUUID(),
    sessionId: randomUUID(),
    username,
    igShortcode: meta.shortcode,
    igUrl: meta.url,
    thumbnailUrl: meta.thumbnailUrl,
    videoUrl: meta.videoUrl,
    durationSec: meta.durationSec,
    viewCount: meta.viewCount,
    postDate: meta.postDate,
    caption: meta.caption,
    geminiFileUri: null,
    geminiFileExpiresAt: null,
    createdAt: new Date().toISOString(),
  };
}

function metadataToUserProfile(meta: ReelMetadata): UserProfileMetadata {
  return {
    username: meta.username,
    followers: meta.followerCount ?? null,
    following: null,
    posts: null,
  };
}

export async function analyzeTalent(
  instagramUsername: string,
  gender: string,
  notes: string,
): Promise<{ analysis: ProfileAnalysis; reelCount: number }> {
  const browser = await initBrowser();
  try {
    const context = await loadOrCreateContext(browser);

    const reels = await scrapeProfileReels(instagramUsername, context);

    if (reels.length === 0) {
      throw new Error(`No reels found for @${instagramUsername}`);
    }

    const profile = await fetchUserProfile(instagramUsername, context);

    const reelRecords = reels.map((r) => metadataToReelRecord(r, instagramUsername));

    const userMetadata: UserProfileMetadata = {
      username: profile.username || instagramUsername,
      followers: profile.followerCount,
      following: profile.followingCount,
      posts: profile.postCount,
    };

    const perReelResults = await runPerReelAnalysis(
      "Analyze this talent's content style and performance",
      reelRecords,
      userMetadata,
    );

    const parsedAnalyses = perReelResults
      .map((r) => ({
        shortcode: r.shortcode,
        analysis: parseStructuredAnalysis(r.analysis),
        score: null as number | null,
      }))
      .filter((a) => a.analysis !== null);

    if (parsedAnalyses.length < 2) {
      throw new Error(
        `Not enough valid per-reel analyses for @${instagramUsername} (${parsedAnalyses.length} valid, need at least 2)`,
      );
    }

    const inputAnalyses = parsedAnalyses.map((a) => a.analysis!);
    const userPrompt = `Here are ${inputAnalyses.length} per-reel analyses for @${instagramUsername}:\n\n${JSON.stringify(inputAnalyses, null, 2)}`;

    const systemInstruction = buildTalentAnalysisSystemInstruction(gender, notes);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      systemInstruction,
    });

    const geminiResult = await withRetry(
      () => model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      }),
      "Talent analysis Gemini call",
    );

    const geminiResponse = geminiResult.response.text();

    const profileAnalysis = parseProfileAnalysis(geminiResponse);

    if (!profileAnalysis) {
      throw new Error(
        `Failed to parse talent analysis for @${instagramUsername}. Raw response: ${geminiResponse.slice(0, 500)}`,
      );
    }

    return {
      analysis: profileAnalysis,
      reelCount: parsedAnalyses.length,
    };
  } finally {
    await closeBrowser(browser);
  }
}
