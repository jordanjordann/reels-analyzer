"use client";

import { cn } from "@/shared/utils";
import type { AudiencePsychologySectionProps } from "../../types";

export function AudiencePsychologySection({
  patterns,
}: AudiencePsychologySectionProps) {
  if (patterns.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-blue-400 mb-3">
        Audience Psychology Patterns
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {patterns.map((pattern, i) => (
          <div
            key={i}
            className="rounded-lg border border-blue-400/20 bg-blue-400/5 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-blue-400">
                {pattern.theme}
              </span>
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[10px] font-mono",
                  pattern.type === "pain"
                    ? "border-red-400/30 text-red-400 bg-red-400/10"
                    : pattern.type === "desire"
                      ? "border-green-400/30 text-green-400 bg-green-400/10"
                      : "border-yellow-400/30 text-yellow-400 bg-yellow-400/10",
                )}
              >
                {pattern.type}
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
