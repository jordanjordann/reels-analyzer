"use client";

import type { ReplicationAdviceSectionProps } from "../../types";

export function ReplicationAdviceSection({
  advice,
}: ReplicationAdviceSectionProps) {
  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
        Replication Advice
      </p>
      <p className="text-sm text-muted-foreground">{advice}</p>
    </div>
  );
}
