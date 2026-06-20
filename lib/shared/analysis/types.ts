export type DimensionScores = {
  hookStrength: number;
  retentionFlow: number;
  visualPolish: number;
  audioVisualSync: number;
  trendAlignment: number;
  callToAction: number;
  brandConsistency: number;
};

export type ReelAnalysis = {
  shortcode: string;
  scores: DimensionScores;
  averageScore: number;
  concept: string;
  notableTechniques: string[];
  whatWorked: string;
  whatToImprove: string;
  productionEffort: "low" | "medium" | "high";
};

export type CrossReelAnalysis = {
  recurringPatterns: string[];
  hookEffectivenessTrend: string;
  improvementOpportunities: string[];
  productionEfforts: Record<string, "low" | "medium" | "high">;
};

export type StructuredAnalysis = {
  reels: ReelAnalysis[];
  crossReel: CrossReelAnalysis;
  overallAverageScore: number;
};
