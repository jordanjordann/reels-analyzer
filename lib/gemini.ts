import { readFileSync } from "node:fs";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { downloadVideo, cleanupFile } from "@/lib/downloader";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("429") || msg.includes("rate limit") || msg.includes("quota exceeded") || msg.includes("resource_exhausted");
  }
  return false;
}

function getRetryDelay(attempt: number, error: unknown): number {
  if (error instanceof Error && error.message.includes("429")) {
    // For 429, use longer base delay
    return BASE_DELAY_MS * Math.pow(2, attempt) * 2;
  }
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

async function withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      const delay = getRetryDelay(attempt, error);
      console.warn(`${context} rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${context} failed after ${MAX_RETRIES} retries`);
}

export type GeminiUploadResult = {
  fileUri: string;
  fileExpiresAt: string;
};

export type GeminiAnalysisResult = {
  content: string;
  rawGemini: string;
};

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return { apiKey };
}

export async function uploadReelVideo(videoUrl: string): Promise<GeminiUploadResult | null> {
  const { apiKey } = getClient();
  const fileManager = new GoogleAIFileManager(apiKey);

  let tempPath: string | null = null;
  try {
    const downloadResult = await downloadVideo(videoUrl);
    if (!downloadResult) {
      console.warn(`Failed to download video via yt-dlp: ${videoUrl}`);
      return null;
    }

    tempPath = downloadResult.filePath;
    console.log(`Downloaded video (${downloadResult.fileSize} bytes) to ${tempPath}`);

    const uploadResult = await withRetry(
      () => fileManager.uploadFile(tempPath!, {
        mimeType: "video/mp4",
        displayName: `Reel ${videoUrl.split("/").pop()?.slice(0, 20) ?? "unknown"}`,
      }),
      "Gemini file upload"
    );

    let file = await withRetry(
      () => fileManager.getFile(uploadResult.file.name),
      "Gemini file status"
    );
    let pollCount = 0;
    const maxPolls = 30;

    while (file.state === FileState.PROCESSING && pollCount < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      file = await withRetry(
        () => fileManager.getFile(uploadResult.file.name),
        "Gemini file status poll"
      );
      pollCount++;
    }

    if (file.state === FileState.FAILED) {
      console.warn(`Gemini file processing failed for ${videoUrl}`);
      return null;
    }

    if (file.state !== FileState.ACTIVE) {
      console.warn(`Gemini file stuck in ${file.state} state for ${videoUrl}`);
      return null;
    }

    return {
      fileUri: file.uri,
      fileExpiresAt: file.expirationTime ?? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.warn(`Failed to upload reel video to Gemini: ${error instanceof Error ? error.message : error}`);
    return null;
  } finally {
    if (tempPath) {
      await cleanupFile(tempPath);
    }
  }
}

export async function analyzeReels(
  fileUris: string[],
  systemInstruction: string,
  userPrompt: string,
): Promise<GeminiAnalysisResult> {
  const { apiKey } = getClient();
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction,
  });

  const videoParts = fileUris.map((uri) => ({
    fileData: { fileUri: uri, mimeType: "video/mp4" },
  }));

  const result = await withRetry(
    () => model.generateContent({
      contents: [{ role: "user", parts: [...videoParts, { text: userPrompt }] }],
    }),
    "Gemini analysis"
  );

  const response = result.response;
  const content = response.text();

  return {
    content,
    rawGemini: JSON.stringify(response),
  };
}
