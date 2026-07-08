import { uploadReelVideo, analyzeReels } from "./gemini";
import { buildPerMediaSystemInstruction, buildPerMediaUserPrompt, buildPerMediaMetadataOnlyPrompt } from "./prompts";
import { MAX_CONCURRENT_REELS } from "./constants";
import type { ReelRecord } from "@/server/sessions/types";
import type { AnalysisResult, PerMediaAnalysisResult, UserProfileMetadata } from "./types";

class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire() {
    while (this.running >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
  }

  release() {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}

async function runWithLimiter<T>(limiter: ConcurrencyLimiter, fn: () => Promise<T>): Promise<T> {
  await limiter.acquire();
  try {
    return await fn();
  } finally {
    limiter.release();
  }
}

async function uploadReelWithFallback(
  reel: ReelRecord,
  limiter: ConcurrencyLimiter,
): Promise<{ fileUri: string | null; fileExpiresAt: string | null }> {
  if (reel.mediaType !== "reel" || !reel.videoUrl) {
    return { fileUri: null, fileExpiresAt: null };
  }
  const videoUrl: string = reel.videoUrl;
  return runWithLimiter(limiter, async () => {
    const uploadResult = await uploadReelVideo(videoUrl);
    if (!uploadResult) {
      console.warn(`Failed to upload video for post ${reel.igShortcode}`);
    }
    return {
      fileUri: uploadResult?.fileUri ?? null,
      fileExpiresAt: uploadResult?.fileExpiresAt ?? null,
    };
  });
}

async function analyzeMedia(
  reel: ReelRecord,
  prompt: string,
  fileUri: string | null,
  limiter: ConcurrencyLimiter,
  userMetadata: UserProfileMetadata | null,
): Promise<{ analysis: string; rawGemini: string; usedMetadataOnly: boolean }> {
  return runWithLimiter(limiter, async () => {
    const systemInstruction = buildPerMediaSystemInstruction();

    if (fileUri) {
      const userPrompt = buildPerMediaUserPrompt(prompt, reel, userMetadata);
      const geminiResult = await analyzeReels([fileUri], systemInstruction, userPrompt);
      return { analysis: geminiResult.content, rawGemini: geminiResult.rawGemini, usedMetadataOnly: false };
    }

    const hasMetadata = reel.caption || reel.viewCount || reel.postDate || reel.durationSec;
    if (hasMetadata) {
      console.log(`Falling back to metadata-only analysis for post ${reel.igShortcode}`);
      const userPrompt = buildPerMediaMetadataOnlyPrompt(prompt, reel, userMetadata);
      const geminiResult = await analyzeReels([], systemInstruction, userPrompt);
      return { analysis: geminiResult.content, rawGemini: geminiResult.rawGemini, usedMetadataOnly: true };
    }

    throw new Error(`No video and no metadata for post ${reel.igShortcode}`);
  });
}

export async function runPerMediaAnalysis(prompt: string, reels: ReelRecord[], userMetadata: UserProfileMetadata | null): Promise<PerMediaAnalysisResult[]> {
  const maxReels = parseInt(process.env.MAX_REELS_PER_ACCOUNT ?? "10", 10);
  const reelsToAnalyze = reels.slice(0, maxReels);

  console.log(`Per-post analysis: ${reelsToAnalyze.length} posts total (concurrency: ${MAX_CONCURRENT_REELS})`);

  const uploadLimiter = new ConcurrencyLimiter(MAX_CONCURRENT_REELS);
  const analysisLimiter = new ConcurrencyLimiter(MAX_CONCURRENT_REELS);

  // Phase 1: Upload all videos in parallel (skipped for non-reels)
  const uploadResults = await Promise.all(
    reelsToAnalyze.map((reel) => uploadReelWithFallback(reel, uploadLimiter)),
  );

  // Phase 2: Run all Gemini analyses in parallel
  const analysisResults = await Promise.allSettled(
    reelsToAnalyze.map((reel, i) => analyzeMedia(reel, prompt, uploadResults[i].fileUri, analysisLimiter, userMetadata)),
  );

  // Build results, skipping failed analyses
  const results: PerMediaAnalysisResult[] = [];
  for (let i = 0; i < reelsToAnalyze.length; i++) {
    const reel = reelsToAnalyze[i];
    const analysisResult = analysisResults[i];

    if (analysisResult.status === "rejected") {
      console.warn(`Skipping post ${reel.igShortcode}: ${analysisResult.reason instanceof Error ? analysisResult.reason.message : String(analysisResult.reason)}`);
      continue;
    }

    const { analysis, rawGemini, usedMetadataOnly } = analysisResult.value;

    results.push({
      reelId: reel.id,
      shortcode: reel.igShortcode,
      analysis,
      rawGemini,
      geminiFileUri: uploadResults[i].fileUri,
      geminiFileExpiresAt: uploadResults[i].fileExpiresAt,
      usedMetadataOnly,
    });
  }

  console.log(`Per-post analysis complete: ${results.length} of ${reelsToAnalyze.length} posts analyzed`);
  return results;
}

export async function runAnalysis(prompt: string, reels: ReelRecord[], userMetadata: UserProfileMetadata | null): Promise<AnalysisResult> {
  const perReelResults = await runPerMediaAnalysis(prompt, reels, userMetadata);

  const uploadedReels = perReelResults.map((r) => ({
    reelId: r.reelId,
    geminiFileUri: r.geminiFileUri,
    geminiFileExpiresAt: r.geminiFileExpiresAt,
  }));

  const videoCount = perReelResults.filter((r) => !r.usedMetadataOnly).length;
  const totalCount = reels.length;
  const usedMetadataOnly = perReelResults.length > 0 && perReelResults.every((r) => r.usedMetadataOnly);

  const combinedAnalysis = perReelResults
    .map((r) => {
      let prefix = "";
      if (r.usedMetadataOnly) {
        prefix = "⚠️ Video analysis was not available — this response is based on metadata only.\n\n";
      }
      return `${prefix}--- ${r.shortcode} ---\n${r.analysis}`;
    })
    .join("\n\n---\n\n");

  return {
    analysis: combinedAnalysis,
    rawGemini: JSON.stringify(perReelResults.map((r) => r.rawGemini)),
    uploadedReels,
    perReelResults,
    videoCount,
    totalCount,
    usedMetadataOnly,
  };
}
