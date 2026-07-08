"use client";

import { EyeIcon, PlayIcon } from "lucide-react";
import { cn } from "@/shared/utils";
import type { ReelCardProps } from "./types";
import { formatDate, formatViews, scoreColor } from "./helpers";

export function ReelCard({
  reel,
  onClick,
}: ReelCardProps) {
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
          src={`/api/analyses/${encodeURIComponent(reel.igShortcode)}/thumbnail`}
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

      {reel.hasAnalysis && reel.analysisScore != null && (
        <div className={cn("absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-xs font-mono font-bold", scoreColor(reel.analysisScore))}>
          {reel.analysisScore}
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
