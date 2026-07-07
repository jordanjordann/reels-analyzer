"use client";

import type { ViralFormulaSectionProps } from "../../types";

export function ViralFormulaSection({
  patterns,
}: ViralFormulaSectionProps) {
  if (patterns.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-accent mb-3">
        Viral Formula Patterns
      </p>
      <div className="flex flex-col gap-3">
        {patterns.map((pattern, i) => (
          <div
            key={i}
            className="rounded-lg border border-accent/20 bg-accent/5 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-accent">
                {pattern.formulaName}
              </span>
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent">
                {pattern.frequency} reels
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {pattern.insight}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
