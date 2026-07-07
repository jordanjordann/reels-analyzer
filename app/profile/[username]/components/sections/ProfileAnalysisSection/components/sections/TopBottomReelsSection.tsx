"use client";

import { cn } from "@/shared/utils";
import { scoreColor } from "../../helpers";
import type { TopBottomReelsSectionProps } from "../../types";

export function TopBottomReelsSection({
  topReels,
  bottomReels,
}: TopBottomReelsSectionProps) {
  if (topReels.length === 0 && bottomReels.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {topReels.length > 0 && (
        <div className="rounded-2xl border bg-background/30 p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-green-400 mb-3">
            Top Reels
          </p>
          <div className="flex flex-col gap-2">
            {topReels.map((reel, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-green-400/5 px-3 py-2"
              >
                <span className="text-xs font-mono">{reel.shortcode}</span>
                <span
                  className={cn(
                    "text-sm font-mono font-bold",
                    scoreColor(reel.score),
                  )}
                >
                  {reel.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {bottomReels.length > 0 && (
        <div className="rounded-2xl border bg-background/30 p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-red-400 mb-3">
            Bottom Reels
          </p>
          <div className="flex flex-col gap-2">
            {bottomReels.map((reel, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-red-400/5 px-3 py-2"
              >
                <span className="text-xs font-mono">{reel.shortcode}</span>
                <span
                  className={cn(
                    "text-sm font-mono font-bold",
                    scoreColor(reel.score),
                  )}
                >
                  {reel.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
