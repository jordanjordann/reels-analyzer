import type { ProfileAnalysis } from "@/analysis/profile-types";

export type TalentSummary = {
  id: string;
  instagramUsername: string;
  name: string;
  gender: string;
  notes: string;
  overallScore: number | null;
  lastAnalyzedAt: string | null;
};

export type TalentDetail = TalentSummary & {
  analysisContent: string | null;
  analysis: ProfileAnalysis | null;
  analysisReelCount: number;
  createdAt: string;
};

export type TalentsListResponse = { talents: TalentSummary[] };
export type TalentDetailResponse = { talent: TalentDetail | null };

export type AddTalentFormData = {
  instagramUsername: string;
  name: string;
  gender: string;
  notes: string;
};
