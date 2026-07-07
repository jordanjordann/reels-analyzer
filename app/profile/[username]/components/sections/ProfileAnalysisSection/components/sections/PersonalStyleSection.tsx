"use client";

import type { PersonalStyleSectionProps } from "../../types";

export function PersonalStyleSection({ style }: PersonalStyleSectionProps) {
  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-purple-400 mb-4">
        Personal Style
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(style).map(([key, value]) => (
          <div
            key={key}
            className="rounded-lg border border-purple-400/20 bg-purple-400/5 p-4"
          >
            <p className="text-xs font-semibold text-purple-400 mb-1.5">
              {key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (s) => s.toUpperCase())}
            </p>
            <p className="text-sm text-muted-foreground">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
