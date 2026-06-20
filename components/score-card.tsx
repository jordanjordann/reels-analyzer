"use client";

import { cn } from "@/lib/utils";

const DIMENSION_LABELS: Record<string, string> = {
  hookStrength: "Hook Strength",
  retentionFlow: "Retention Flow",
  visualPolish: "Visual Polish",
  audioVisualSync: "Audio-Visual Sync",
  trendAlignment: "Trend Alignment",
  callToAction: "Call to Action",
  brandConsistency: "Brand Consistency",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-green-400";
  if (score >= 6) return "bg-yellow-400";
  if (score >= 4) return "bg-orange-400";
  return "bg-red-400";
}

export function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", scoreBg(score))}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className={cn("w-6 text-right text-xs font-mono font-semibold", scoreColor(score))}>
        {score}
      </span>
    </div>
  );
}

export function ScoreCard({
  scores,
  averageScore,
}: {
  scores: Record<string, number>;
  averageScore: number;
}) {
  return (
    <div className="rounded-xl border bg-background/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Average Score
        </span>
        <span className={cn("text-lg font-mono font-bold", scoreColor(averageScore))}>
          {averageScore.toFixed(1)}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
          <ScoreBar key={key} label={label} score={scores[key] ?? 0} />
        ))}
      </div>
    </div>
  );
}
