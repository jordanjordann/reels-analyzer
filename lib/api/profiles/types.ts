import type { ProfileAnalysis } from "@/analysis/profile-types";

export type ProfileSummary = {
  username: string;
  reelCount: number;
  sessionCount: number;
  lastAnalyzedAt: string | null;
  followerCount: number | null;
  followingCount: number | null;
  postCount: number | null;
};

export type ProfileDetail = {
  metadata: {
    followerCount: number | null;
    followingCount: number | null;
    postCount: number | null;
    reelCount: number;
    sessionCount: number;
    lastAnalyzedAt: string | null;
  };
  analysis: (ProfileAnalysis & { reelCount: number; updatedAt: string }) | null;
};

export type ProfilesListResponse = {
  profiles: ProfileSummary[];
};

export type ProfileDetailResponse = {
  profile: ProfileDetail | null;
};
