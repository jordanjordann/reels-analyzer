"use client";

import { XCircleIcon, AlertTriangleIcon } from "lucide-react";

import { cn } from "@/shared/utils";

export interface BudgetWarningData {
  totalSeconds: number;
  limitSeconds: number;
  over: boolean;
  pct: number;
}

export interface FailedReelData {
  url: string;
  index: number;
  error: string;
}

export function BudgetWarning({
  data,
  onContinue,
  onCancel,
}: {
  data: BudgetWarningData;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const minutes = Math.floor(data.totalSeconds / 60);
  const secs = data.totalSeconds % 60;
  const limitMin = Math.floor(data.limitSeconds / 60);

  return (
    <div className={cn(
      "rounded-xl border p-4",
      data.over
        ? "border-destructive/30 bg-destructive/10"
        : "border-amber-500/30 bg-amber-500/10",
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className={cn(
          "mt-0.5 size-5 shrink-0",
          data.over ? "text-destructive" : "text-amber-500",
        )} />
        <div className="flex-1">
          <p className={cn(
            "font-medium",
            data.over ? "text-destructive" : "text-amber-700 dark:text-amber-400",
          )}>
            {data.over ? "Video budget exceeded" : "Approaching video budget limit"}
          </p>
          <p className={cn(
            "mt-1 text-sm",
            data.over ? "text-destructive/80" : "text-amber-600 dark:text-amber-300",
          )}>
            Total video duration: {minutes}m {secs}s ({data.pct}% of {limitMin}m limit).
            {data.over
              ? " Some videos may not be fully analyzed."
              : " Consider removing some reels to stay within budget."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium text-white",
            data.over
              ? "bg-destructive hover:bg-destructive/80"
              : "bg-amber-500 hover:bg-amber-600",
          )}
          onClick={onContinue}
        >
          Continue anyway
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium",
            data.over
              ? "border-destructive/30 text-destructive hover:bg-destructive/10"
              : "border-amber-500/30 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
          )}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function FailedReelsList({
  failedReels,
  onRetry,
}: {
  failedReels: FailedReelData[];
  onRetry: (urls: string[]) => void;
}) {
  if (failedReels.length === 0) return null;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-destructive">
          Failed reels ({failedReels.length})
        </p>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
          onClick={() => onRetry(failedReels.map((f) => f.url))}
        >
          Retry failed
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {failedReels.map((f) => (
          <div key={f.index} className="flex items-center gap-2 text-sm">
            <XCircleIcon className="size-3.5 shrink-0 text-destructive" />
            <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
              {f.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </span>
            <span className="text-xs text-destructive">{f.error}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
