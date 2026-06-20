"use client";

import type { ReelAnalysis } from "@/lib/analysis-rubric";
import { ScoreCard } from "@/components/score-card";
import { cn } from "@/lib/utils";

const EFFORT_COLORS: Record<string, string> = {
  low: "text-green-400 bg-green-400/10 border-green-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

export function ReelBreakdown({ reel }: { reel: ReelAnalysis }) {
  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h4 className="font-mono text-sm font-semibold text-foreground">
            Reel: {reel.shortcode}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">{reel.concept}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-mono uppercase",
            EFFORT_COLORS[reel.productionEffort] ?? EFFORT_COLORS.medium,
          )}
        >
          {reel.productionEffort} effort
        </span>
      </div>

      <div className="mb-4">
        <ScoreCard scores={reel.scores} averageScore={reel.averageScore} />
      </div>

      {reel.notableTechniques.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
            Notable Techniques
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reel.notableTechniques.map((tech, i) => (
              <span
                key={i}
                className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-green-400 mb-1">
            What Worked
          </p>
          <p className="text-sm text-muted-foreground">{reel.whatWorked}</p>
        </div>
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-orange-400 mb-1">
            To Improve
          </p>
          <p className="text-sm text-muted-foreground">{reel.whatToImprove}</p>
        </div>
      </div>
    </div>
  );
}
