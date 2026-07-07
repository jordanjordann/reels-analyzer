import type { AnalysisStage } from "./types";

export const STAGE_LABELS: Record<AnalysisStage, string> = {
  idle: "",
  fetching: "Fetching reel metadata...",
  uploading: "Uploading videos to Gemini...",
  analyzing: "Running analysis against rubric...",
};

export const REEL_URL_REGEX = /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+/i;
