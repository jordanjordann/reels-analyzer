"use client";

import type { ReelAnalysis } from "@/shared/analysis/types";
import { DIMENSION_LABELS, SCORE_DESCRIPTIONS } from "@/shared/analysis/constants";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { cn } from "@/shared/utils";

const LABEL_COLORS: Record<string, string> = {
  replicable: "text-green-400 bg-green-400/10 border-green-400/20",
  partially_replicable: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  not_replicable: "text-red-400 bg-red-400/10 border-red-400/20",
};

function qualityBar(score: number) {
  const pct = score * 10;
  const color = pct >= 80 ? "bg-green-400" : pct >= 60 ? "bg-yellow-400" : pct >= 40 ? "bg-orange-400" : "bg-red-400";
  return { pct, color };
}

export function ReelBreakdown({ reel }: { reel: ReelAnalysis }) {
  const label = reel.replicationAnalysis.replicationLabel;

  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h4 className="font-mono text-sm font-semibold text-foreground">
            Reel: {reel.shortcode}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">{reel.oneLineDiagnosis}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-mono",
            LABEL_COLORS[label] ?? LABEL_COLORS.partially_replicable,
          )}
        >
          {label.replace(/_/g, " ")}
        </span>
      </div>

      {/* Score Justification */}
      {reel.scoreJustification && (
        <div className="mb-4 rounded-lg border border-accent/20 bg-accent/5 p-3">
          <p className="text-xs font-mono uppercase tracking-wider text-accent mb-1">
            Why This Score
          </p>
          <p className="text-sm text-muted-foreground">{reel.scoreJustification}</p>
        </div>
      )}

      {/* Scorecard */}
      <div className="mb-4 grid grid-cols-5 gap-2 text-center">
        {Object.entries(reel.scorecard).map(([key, val]) => {
          const desc = SCORE_DESCRIPTIONS[key];
          return (
            <div key={key} className="group relative rounded-lg bg-muted/30 p-2">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">
                {key.replace(/([A-Z])/g, " $1").trim().slice(0, 12)}
              </p>
              <p className="text-lg font-mono font-bold">{val}</p>
              {desc && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md group-hover:block">
                  {desc}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quality Breakdown */}
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
          Quality Breakdown
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(reel.qualityBreakdown).map(([key, val]) => {
            const { pct, color } = qualityBar(val);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-36 truncate text-xs text-muted-foreground">
                  {DIMENSION_LABELS[key] ?? key}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted/50">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-xs font-mono">{val}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Creative Breakdown */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {Object.entries(reel.creativeBreakdown).map(([key, val]) => (
          <div key={key}>
            <p className="text-xs font-mono uppercase tracking-wider text-accent mb-1">
              {key.replace(/([A-Z])/g, " $1").trim()}
            </p>
            <MarkdownRenderer content={val} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      {/* Viral Formula Card */}
      <div className="mb-4 rounded-lg border border-accent/20 bg-accent/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-accent mb-1">
          Viral Formula: {reel.viralFormulaCard.formulaName}
        </p>
        <p className="text-sm font-mono text-accent mb-2">{reel.viralFormulaCard.templateHook}</p>
        <p className="text-sm text-muted-foreground mb-2">{reel.viralFormulaCard.whyItWorks}</p>
        <div className="flex flex-wrap gap-1">
          {reel.viralFormulaCard.bestFor.map((b, i) => (
            <span key={i} className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent">{b}</span>
          ))}
        </div>
      </div>

      {/* Replication Analysis */}
      {reel.replicationAnalysis.whatCanBeCopied.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-green-400 mb-1.5">
            Can Copy
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reel.replicationAnalysis.whatCanBeCopied.map((item, i) => (
              <span key={i} className="rounded-md bg-green-400/10 px-2 py-0.5 text-xs text-green-400">{item}</span>
            ))}
          </div>
        </div>
      )}

      {reel.replicationAnalysis.whatShouldNotBeCopied.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-red-400 mb-1.5">
            Do Not Copy
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reel.replicationAnalysis.whatShouldNotBeCopied.map((item, i) => (
              <span key={i} className="rounded-md bg-red-400/10 px-2 py-0.5 text-xs text-red-400">{item}</span>
            ))}
          </div>
        </div>
      )}

      {/* Red Flags */}
      {reel.redFlags.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-orange-400 mb-1.5">
            Red Flags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reel.redFlags.map((flag, i) => (
              <span key={i} className="rounded-md bg-orange-400/10 px-2 py-0.5 text-xs text-orange-400">{flag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Adaptation Ideas */}
      {reel.adaptationIdeas.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-blue-400 mb-1.5">
            Adaptation Ideas
          </p>
          <div className="flex flex-col gap-2">
            {reel.adaptationIdeas.map((idea, i) => (
              <div key={i} className="rounded-md bg-blue-400/5 p-2 text-xs">
                <p className="font-semibold text-blue-400">{idea.targetCreatorOrBrand}</p>
                <p className="text-muted-foreground mt-0.5">{idea.adaptedHook}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
