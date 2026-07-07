import type { Scorecard, QualityBreakdown } from "@/lib/analysis/types";

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function formatScore(score: number): string {
  return score.toString();
}

export function getQualityBreakdownEntries(breakdown: QualityBreakdown): [string, number][] {
  return Object.entries(breakdown) as [string, number][];
}

export function getScorecardEntries(scorecard: Scorecard): [string, number][] {
  return Object.entries(scorecard) as [string, number][];
}
