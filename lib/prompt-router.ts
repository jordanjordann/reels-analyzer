import { uploadReelVideo, analyzeReels } from "@/lib/gemini";
import { buildSystemInstruction, buildUserPrompt, buildMetadataOnlyPrompt } from "@/lib/analysis-rubric";
import type { ReelRecord } from "@/lib/sessions";

export type AnalysisResult = {
  analysis: string;
  rawGemini: string;
  uploadedReels: { reelId: string; geminiFileUri: string | null; geminiFileExpiresAt: string | null }[];
  videoCount: number;
  totalCount: number;
  usedMetadataOnly: boolean;
};

export async function runAnalysis(prompt: string, reels: ReelRecord[]): Promise<AnalysisResult> {
  const maxReels = parseInt(process.env.MAX_REELS_PER_ACCOUNT ?? "12", 10);
  const reelsToAnalyze = reels.slice(0, maxReels);
  const reelsWithVideo = reelsToAnalyze.filter((r) => r.videoUrl);

  console.log(`Analysis: ${reelsToAnalyze.length} reels total, ${reelsWithVideo.length} with video URLs`);

  // Validate: we need at least some data to work with
  const reelsWithAnyMetadata = reelsToAnalyze.filter(
    (r) => r.caption || r.viewCount || r.postDate || r.durationSec
  );

  if (reelsWithVideo.length === 0 && reelsWithAnyMetadata.length === 0) {
    throw new Error(
      `Failed to extract any usable data from ${reelsToAnalyze.length} reels. ` +
      `No video URLs and no metadata (captions, views, dates, durations) were found. ` +
      `The account may be private or Instagram's structure may have changed.`
    );
  }

  // Upload each reel video to Gemini File API
  const uploadResults = await Promise.allSettled(
    reelsWithVideo.map((reel) => uploadReelVideo(reel.videoUrl!))
  );

  const uploadedReels: AnalysisResult["uploadedReels"] = [];
  const fileUris: string[] = [];
  let uploadedCount = 0;
  let failedCount = 0;

  // Map upload results back to all reels
  let videoIndex = 0;
  for (const reel of reelsToAnalyze) {
    if (!reel.videoUrl) {
      uploadedReels.push({
        reelId: reel.id,
        geminiFileUri: null,
        geminiFileExpiresAt: null,
      });
      continue;
    }

    const result = uploadResults[videoIndex];
    videoIndex++;

    if (result.status === "fulfilled" && result.value) {
      uploadedReels.push({
        reelId: reel.id,
        geminiFileUri: result.value.fileUri,
        geminiFileExpiresAt: result.value.fileExpiresAt,
      });
      fileUris.push(result.value.fileUri);
      uploadedCount++;
    } else {
      uploadedReels.push({
        reelId: reel.id,
        geminiFileUri: null,
        geminiFileExpiresAt: null,
      });
      failedCount++;
      console.warn(`Failed to upload reel ${reel.igShortcode}: ${result.status === "rejected" ? result.reason : "upload returned null"}`);
    }
  }

  console.log(`Upload complete: ${uploadedCount} succeeded, ${failedCount} failed, ${reelsToAnalyze.length - reelsWithVideo.length} had no video URL`);

  // If we have some videos, proceed with video analysis
  if (fileUris.length > 0) {
    const systemInstruction = buildSystemInstruction();
    const userPrompt = buildUserPrompt(prompt, fileUris.length, reelsToAnalyze);
    const analysisResult = await analyzeReels(fileUris, systemInstruction, userPrompt);

    return {
      analysis: analysisResult.content,
      rawGemini: analysisResult.rawGemini,
      uploadedReels,
      videoCount: fileUris.length,
      totalCount: reelsToAnalyze.length,
      usedMetadataOnly: false,
    };
  }

  // Fallback: metadata-only analysis when no videos could be uploaded
  if (reelsWithAnyMetadata.length === 0) {
    throw new Error(
      `All video uploads failed and no metadata is available for ${reelsToAnalyze.length} reels. ` +
      `Cannot perform analysis without any data.`
    );
  }

  console.log("No videos available, falling back to metadata-only analysis");
  const systemInstruction = buildSystemInstruction();
  const userPrompt = buildMetadataOnlyPrompt(prompt, reelsToAnalyze);
  const analysisResult = await analyzeReels([], systemInstruction, userPrompt);

  return {
    analysis: analysisResult.content,
    rawGemini: analysisResult.rawGemini,
    uploadedReels,
    videoCount: 0,
    totalCount: reelsToAnalyze.length,
    usedMetadataOnly: true,
  };
}
