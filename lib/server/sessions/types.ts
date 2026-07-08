import type { MediaType } from "@/server/analysis/reel-fetcher";

export type MessageRole = "user" | "assistant";

export type SessionListItem = {
  id: string;
  username: string;
  title: string | null;
  lastPromptPreview: string | null;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  rawGemini: string | null;
  createdAt: string;
};

export type ReelRecord = {
  id: string;
  sessionId: string;
  username: string;
  igShortcode: string;
  igUrl: string;
  mediaType: MediaType;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  durationSec: number | null;
  viewCount: number | null;
  postDate: string | null;
  caption: string | null;
  geminiFileUri: string | null;
  geminiFileExpiresAt: string | null;
  createdAt: string;
};

export type SessionDetail = {
  id: string;
  username: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  followerCount: number | null;
  followingCount: number | null;
  postCount: number | null;
  reels: ReelRecord[];
  messages: MessageRecord[];
};
