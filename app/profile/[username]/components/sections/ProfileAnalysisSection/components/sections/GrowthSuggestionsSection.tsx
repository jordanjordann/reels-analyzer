"use client";

import type { GrowthSuggestionsSectionProps } from "../../types";

export function GrowthSuggestionsSection({
  suggestions,
}: GrowthSuggestionsSectionProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-blue-400 mb-3">
        Growth Suggestions
      </p>
      <ol className="flex flex-col gap-2">
        {suggestions.map((suggestion, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-400/10 text-xs font-mono text-blue-400">
              {i + 1}
            </span>
            {suggestion}
          </li>
        ))}
      </ol>
    </div>
  );
}
