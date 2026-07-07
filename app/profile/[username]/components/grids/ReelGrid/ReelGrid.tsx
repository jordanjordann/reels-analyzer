"use client";

import { FilmIcon, LoaderCircleIcon } from "lucide-react";
import { ReelCard } from "../../cards/ReelCard";
import type { ReelGridProps } from "./types";

export function ReelGrid({ reels, loading, onReelClick }: ReelGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-secondary text-accent">
          <FilmIcon className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-heading text-xl font-semibold tracking-[-0.04em]">No reels found</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            This account hasn&apos;t been analyzed yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} onClick={() => onReelClick(reel)} />
      ))}
    </div>
  );
}
