"use client";

import { cn } from "@/shared/utils";
import { scoreRing, scoreColor } from "../../helpers";
import type { ScoreRingCardProps } from "../../types";

export function ScoreRingCard({ score, size = 24 }: ScoreRingCardProps) {
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size * 2, height: size * 2 }}>
      <svg className="size-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="currentColor"
          className="text-muted/30"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={cn("transition-all duration-700", scoreRing(score))}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-xl font-mono font-bold", scoreColor(score))}>
          {score}
        </span>
      </div>
    </div>
  );
}
