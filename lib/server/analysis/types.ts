export type ScrapedReel = {
  shortcode: string;
  url: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  caption: string | null;
  viewCount: number | null;
  postDate: string | null;
  durationSec: number | null;
};

export type ReelPageData = {
  videoUrl: string | null;
  caption: string | null;
  viewCount: number | null;
  postDate: string | null;
  durationSec: number | null;
};

export type ReelCacheEntry = {
  shortcode: string;
  videoUrl: string | null;
  caption: string | null;
  viewCount: number | null;
  postDate: string | null;
  durationSec: number | null;
  cachedAt: number;
};

export type ReelCache = Record<string, ReelCacheEntry>;

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

export type AnalysisResult = {
  analysis: string;
  rawGemini: string;
  uploadedReels: { reelId: string; geminiFileUri: string | null; geminiFileExpiresAt: string | null }[];
  videoCount: number;
  totalCount: number;
  usedMetadataOnly: boolean;
};
