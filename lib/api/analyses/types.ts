export type AnalysisUserSummary = {
  username: string;
  reelCount: number;
  sessionCount: number;
  lastAnalyzedAt: string;
};

export type AnalysisReelSummary = {
  id: string;
  sessionId: string;
  username: string;
  igShortcode: string;
  igUrl: string;
  thumbnailUrl: string | null;
  viewCount: number | null;
  postDate: string | null;
  caption: string | null;
  createdAt: string;
  hasAnalysis: boolean;
  analysisScore: number | null;
};

export type AnalysisReelDetail = AnalysisReelSummary & {
  analysis: string | null;
  userPrompt: string | null;
};

export type AnalysesUserListResponse = {
  users: AnalysisUserSummary[];
};

export type AnalysesUserReelsResponse = {
  username: string;
  reels: AnalysisReelSummary[];
};

export type AnalysesReelDetailResponse = {
  reel: AnalysisReelDetail;
};
