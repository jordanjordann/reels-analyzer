"use client";

import { useState } from "react";
import type { PersonalStyleSectionProps } from "../../types";

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function SpeakingStyleDetail({ style }: { style: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(style);
  const visibleEntries = expanded ? entries : entries.slice(0, 6);

  return (
    <div className="col-span-full rounded-lg border border-purple-400/20 bg-purple-400/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-purple-400">Speaking Style</p>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          {expanded ? "Sembunyikan" : "Lihat Detail"}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleEntries.map(([key, value]) => (
          <div key={key}>
            <p className="text-xs font-medium text-purple-300 mb-1">
              {formatLabel(key)}
            </p>
            <p className="text-sm text-muted-foreground">{value}</p>
          </div>
        ))}
      </div>
      {!expanded && entries.length > 4 && (
        <p className="text-xs text-muted-foreground mt-2">
          +{entries.length - 4} field lainnya...
        </p>
      )}
    </div>
  );
}

export function PersonalStyleSection({ style }: PersonalStyleSectionProps) {
  const { speakingStyle, ...otherStyles } = style as Record<
    string,
    string | Record<string, string>
  >;

  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-purple-400 mb-4">
        Personal Style
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {speakingStyle && typeof speakingStyle === "object" && (
          <SpeakingStyleDetail
            style={speakingStyle as Record<string, string>}
          />
        )}
        {Object.entries(otherStyles).map(([key, value]) => (
          <div
            key={key}
            className="rounded-lg border border-purple-400/20 bg-purple-400/5 p-4"
          >
            <p className="text-xs font-semibold text-purple-400 mb-1.5">
              {formatLabel(key)}
            </p>
            <p className="text-sm text-muted-foreground">{value as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
