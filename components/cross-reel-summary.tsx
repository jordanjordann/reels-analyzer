"use client";

import type { CrossReelAnalysis } from "@/shared/analysis/types";
import { SparklesIcon, TrendingUpIcon, LightbulbIcon } from "lucide-react";

export function CrossReelSummary({ summary }: { summary: CrossReelAnalysis }) {
  return (
    <div className="rounded-2xl border bg-accent/5 p-5">
      <h3 className="font-heading text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
        <TrendingUpIcon className="size-4 text-accent" />
        Cross-Reel Analysis
      </h3>

      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <SparklesIcon className="size-3" />
          Recurring Patterns
        </p>
        <ul className="flex flex-col gap-1.5">
          {summary.recurringPatterns.map((pattern, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              {pattern}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
          Hook Effectiveness Trend
        </p>
        <p className="text-sm text-muted-foreground">{summary.hookEffectivenessTrend}</p>
      </div>

      {summary.improvementOpportunities.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <LightbulbIcon className="size-3" />
            Improvement Opportunities
          </p>
          <ul className="flex flex-col gap-1.5">
            {summary.improvementOpportunities.map((opp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-yellow-400" />
                {opp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
