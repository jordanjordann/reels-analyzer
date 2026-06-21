import { uploadReelVideo, analyzeReels } from "./gemini";
import { buildPerReelSystemInstruction, buildPerReelUserPrompt, buildPerReelMetadataOnlyPrompt } from "@/shared/analysis/analysis-rubric";
import { MAX_CONCURRENT_REELS } from "./constants";
import type { ReelRecord } from "@/server/sessions/types";
import type { AnalysisResult, PerReelAnalysisResult } from "./types";

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
  return runWithLimiter(limiter, async () => {
    if (!reel.videoUrl) {
      return { fileUri: null, fileExpiresAt: null };
    }
    const uploadResult = await uploadReelVideo(reel.videoUrl);
    if (!uploadResult) {
      console.warn(`Failed to upload video for reel ${reel.igShortcode}`);
    }
    return {
      fileUri: uploadResult?.fileUri ?? null,
      fileExpiresAt: uploadResult?.fileExpiresAt ?? null,
    };
  });
}

async function analyzeReel(
  reel: ReelRecord,
  prompt: string,
  fileUri: string | null,
  limiter: ConcurrencyLimiter,
): Promise<{ analysis: string; rawGemini: string; usedMetadataOnly: boolean }> {
  return runWithLimiter(limiter, async () => {
    const systemInstruction = buildPerReelSystemInstruction();

    if (fileUri) {
      const userPrompt = buildPerReelUserPrompt(prompt, reel);
      const geminiResult = await analyzeReels([fileUri], systemInstruction, userPrompt);
      return { analysis: geminiResult.content, rawGemini: geminiResult.rawGemini, usedMetadataOnly: false };
    }

    const hasMetadata = reel.caption || reel.viewCount || reel.postDate || reel.durationSec;
    if (hasMetadata) {
      console.log(`Falling back to metadata-only analysis for reel ${reel.igShortcode}`);
      const userPrompt = buildPerReelMetadataOnlyPrompt(prompt, reel);
      const geminiResult = await analyzeReels([], systemInstruction, userPrompt);
      return { analysis: geminiResult.content, rawGemini: geminiResult.rawGemini, usedMetadataOnly: true };
    }

    throw new Error(`No video and no metadata for reel ${reel.igShortcode}`);
  });
}

export async function runPerReelAnalysis(prompt: string, reels: ReelRecord[]): Promise<PerReelAnalysisResult[]> {
  const maxReels = parseInt(process.env.MAX_REELS_PER_ACCOUNT ?? "10", 10);
  const reelsToAnalyze = reels.slice(0, maxReels);

  console.log(`Per-reel analysis: ${reelsToAnalyze.length} reels total (concurrency: ${MAX_CONCURRENT_REELS})`);

  const uploadLimiter = new ConcurrencyLimiter(MAX_CONCURRENT_REELS);
  const analysisLimiter = new ConcurrencyLimiter(MAX_CONCURRENT_REELS);

  // Phase 1: Upload all videos in parallel
  const uploadResults = await Promise.all(
    reelsToAnalyze.map((reel) => uploadReelWithFallback(reel, uploadLimiter)),
  );

  // Phase 2: Run all Gemini analyses in parallel
  const analysisResults = await Promise.allSettled(
    reelsToAnalyze.map((reel, i) => analyzeReel(reel, prompt, uploadResults[i].fileUri, analysisLimiter)),
  );

  // Build results, skipping failed analyses
  const results: PerReelAnalysisResult[] = [];
  for (let i = 0; i < reelsToAnalyze.length; i++) {
    const reel = reelsToAnalyze[i];
    const analysisResult = analysisResults[i];

    if (analysisResult.status === "rejected") {
      console.warn(`Skipping reel ${reel.igShortcode}: ${analysisResult.reason instanceof Error ? analysisResult.reason.message : String(analysisResult.reason)}`);
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

  console.log(`Per-reel analysis complete: ${results.length} of ${reelsToAnalyze.length} reels analyzed`);
  return results;
}

export async function runAnalysis(prompt: string, reels: ReelRecord[]): Promise<AnalysisResult> {
  const perReelResults = await runPerReelAnalysis(prompt, reels);

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
