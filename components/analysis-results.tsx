"use client";

import type { StructuredAnalysis } from "@/shared/analysis/types";
import { ReelBreakdown } from "@/components/reel-breakdown";
import { CrossReelSummary } from "@/components/cross-reel-summary";
import { TrendingUpIcon } from "lucide-react";
import { cn } from "@/shared/utils";

function overallScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function overallScoreRing(score: number): string {
  if (score >= 80) return "stroke-green-400";
  if (score >= 60) return "stroke-yellow-400";
  if (score >= 40) return "stroke-orange-400";
  return "stroke-red-400";
}

export function AnalysisResults({ analysis }: { analysis: StructuredAnalysis }) {
  const circumference = 2 * Math.PI * 36;
  const score = analysis.overallViralIntelligenceScore;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col gap-5">
      {/* Overall Score Header */}
      <div className="flex items-center gap-4">
        <div className="relative size-20">
          <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="currentColor"
              className="text-muted/30"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className={cn("transition-all duration-700", overallScoreRing(score))}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-xl font-mono font-bold", overallScoreColor(score))}>
              {score}
            </span>
          </div>
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold tracking-tight">Overall Analysis</h3>
          <p className="text-sm text-muted-foreground">
            {analysis.reels.length} reel{analysis.reels.length !== 1 ? "s" : ""} analyzed
          </p>
        </div>
      </div>

      {/* Per-Reel Breakdown */}
      <div>
        <h3 className="font-heading text-base font-semibold tracking-tight mb-3 flex items-center gap-2">
          <TrendingUpIcon className="size-4 text-accent" />
          Per-Reel Breakdown
        </h3>
        <div className="flex flex-col gap-4">
          {analysis.reels.map((reel) => (
            <ReelBreakdown key={reel.shortcode} reel={reel} />
          ))}
        </div>
      </div>

      {/* Cross-Reel Summary */}
      <CrossReelSummary summary={analysis.crossReel} />
    </div>
  );
}
