"use client";

import { EyeIcon, PlayIcon, SparklesIcon } from "lucide-react";
import type { AnalysisReelSummary } from "@/api/analyses/types";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatViews(count: number | null) {
  if (count == null) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

export function ReelCard({
  reel,
  onClick,
}: {
  reel: AnalysisReelSummary;
  onClick: () => void;
}) {
  const date = formatDate(reel.postDate);
  const views = formatViews(reel.viewCount);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[9/16] overflow-hidden rounded-xl border bg-secondary transition-all hover:ring-2 hover:ring-accent"
    >
      {reel.thumbnailUrl ? (
        <img
          src={reel.thumbnailUrl}
          alt={`Reel ${reel.igShortcode}`}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <PlayIcon className="size-8" aria-hidden="true" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {reel.hasAnalysis && (
        <div className="absolute right-2 top-2 rounded-md bg-accent/90 p-1 text-white">
          <SparklesIcon className="size-3.5" aria-hidden="true" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-center gap-2 text-xs text-white">
          {views && (
            <div className="flex items-center gap-1">
              <EyeIcon className="size-3" aria-hidden="true" />
              {views}
            </div>
          )}
          {date && <span className="ml-auto font-mono">{date}</span>}
        </div>
      </div>
    </button>
  );
}
