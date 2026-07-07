"use client";

import { DIMENSION_LABELS } from "@/analysis/constants";
import { qualityBar } from "../../helpers";
import type { QualityBreakdownSectionProps } from "../../types";

function DimensionBar({ label, score }: { label: string; score: number }) {
  const { pct, color } = qualityBar(score);
  return (
    <div className="flex items-center gap-2">
      <span className="w-40 truncate text-xs text-muted-foreground">
        {DIMENSION_LABELS[label] ?? label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-mono">{score}</span>
    </div>
  );
}

export function QualityBreakdownSection({
  breakdown,
}: QualityBreakdownSectionProps) {
  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
        Quality Breakdown (Averages)
      </p>
      <div className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
        {Object.entries(breakdown).map(([key, val]) => (
          <DimensionBar key={key} label={key} score={val} />
        ))}
      </div>
    </div>
  );
}
