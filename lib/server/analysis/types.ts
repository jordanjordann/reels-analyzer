export type UserProfileMetadata = {
  username: string;
  followers: number | null;
  following: number | null;
  posts: number | null;
};

import type { MediaType } from "@/server/analysis/reel-fetcher";

export type ScrapedReel = {
  shortcode: string;
  url: string;
  mediaType: MediaType;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  caption: string | null;
  viewCount: number | null;
  postDate: string | null;
  durationSec: number | null;
};

export type DownloadResult = {
  filePath: string;
  durationSec: number | null;
  fileSize: number;
};

export type GeminiUploadResult = {
  fileUri: string;
  fileExpiresAt: string;
};

export type GeminiAnalysisResult = {
  content: string;
  rawGemini: string;
};

export type PerReelAnalysisResult = {
  reelId: string;
  shortcode: string;
  analysis: string;
  rawGemini: string;
  geminiFileUri: string | null;
  geminiFileExpiresAt: string | null;
  usedMetadataOnly: boolean;
};

export type AnalysisResult = {
  analysis: string;
  rawGemini: string;
  uploadedReels: { reelId: string; geminiFileUri: string | null; geminiFileExpiresAt: string | null }[];
  perReelResults: PerReelAnalysisResult[];
  videoCount: number;
  totalCount: number;
  usedMetadataOnly: boolean;
};
