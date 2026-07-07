"use client";

import { cn } from "@/shared/utils";
import { DIMENSION_LABELS } from "@/analysis/constants";
import { qualityBar } from "../../helpers";
import type { StrengthWeaknessColumnProps } from "../../types";

export function StrengthWeaknessColumn({
  title,
  items,
  color,
}: StrengthWeaknessColumnProps) {
  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p
        className={cn("text-xs font-mono uppercase tracking-wider mb-3", color)}
      >
        {title}
      </p>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => {
          const { pct, color: barColor } = qualityBar(item.avgScore);
          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold">
                  {DIMENSION_LABELS[item.dimension] ?? item.dimension}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  ({item.avgScore})
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 mb-2">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{item.insight}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
