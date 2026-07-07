import type { AnalysisReelSummary } from "@/api/analyses/types";

export type ReelCardProps = {
  reel: AnalysisReelSummary;
  onClick: () => void;
};
