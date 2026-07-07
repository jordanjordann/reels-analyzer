"use client";

import type { RecurringRedFlagsCardProps } from "../../types";

export function RecurringRedFlagsCard({ flags }: RecurringRedFlagsCardProps) {
  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-orange-400 mb-3">
        Recurring Red Flags
      </p>
      <div className="flex flex-wrap gap-2">
        {flags.map((flag, i) => (
          <span
            key={i}
            className="rounded-md bg-orange-400/10 px-3 py-1.5 text-xs text-orange-400"
          >
            {flag}
          </span>
        ))}
      </div>
    </div>
  );
}
