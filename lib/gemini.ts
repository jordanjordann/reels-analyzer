import { readFileSync } from "node:fs";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { downloadVideo, cleanupFile } from "@/lib/downloader";

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

    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: "video/mp4",
      displayName: `Reel ${videoUrl.split("/").pop()?.slice(0, 20) ?? "unknown"}`,
    });

    let file = await fileManager.getFile(uploadResult.file.name);
    let pollCount = 0;
    const maxPolls = 30;

    while (file.state === FileState.PROCESSING && pollCount < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      file = await fileManager.getFile(uploadResult.file.name);
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
    model: "gemini-2.5-flash",
    systemInstruction,
  });

  const videoParts = fileUris.map((uri) => ({
    fileData: { fileUri: uri, mimeType: "video/mp4" },
  }));

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [...videoParts, { text: userPrompt }] }],
  });

  const response = result.response;
  const content = response.text();

  return {
    content,
    rawGemini: JSON.stringify(response),
  };
}
