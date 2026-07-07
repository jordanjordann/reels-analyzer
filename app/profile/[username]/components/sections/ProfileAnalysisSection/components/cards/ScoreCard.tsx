"use client";

import { cn } from "@/shared/utils";
import { scoreColor } from "../../helpers";
import type { ScoreCardProps } from "../../types";

export function ScoreCard({
  label,
  score,
  description,
}: ScoreCardProps) {
  return (
    <div className="group relative rounded-lg bg-muted/30 p-3 text-center">
      <p className="text-[10px] font-mono uppercase text-muted-foreground">
        {label
          .replace(/([A-Z])/g, " $1")
          .trim()
          .slice(0, 16)}
      </p>
      <p className={cn("text-2xl font-mono font-bold", scoreColor(score))}>
        {score}
      </p>
      {description && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md group-hover:block">
          {description}
        </div>
      )}
    </div>
  );
}
