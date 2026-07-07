import type { AnalysisReelSummary } from "@/api/analyses/types";

export interface ReelGridProps {
  reels: AnalysisReelSummary[];
  loading: boolean;
  onReelClick: (reel: AnalysisReelSummary) => void;
}
