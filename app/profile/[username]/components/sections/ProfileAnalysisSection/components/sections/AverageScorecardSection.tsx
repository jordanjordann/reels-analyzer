"use client";

import { SCORE_DESCRIPTIONS } from "@/analysis/constants";
import { ScoreCard } from "../cards/ScoreCard";
import type { AverageScorecardSectionProps } from "../../types";

export function AverageScorecardSection({
  scorecard,
}: AverageScorecardSectionProps) {
  return (
    <div className="rounded-2xl border bg-background/30 p-5">
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
        Average Scorecard
      </p>
      <div className="grid grid-cols-4 gap-3">
        <ScoreCard
          label="Performance"
          score={scorecard.performanceScore}
          description={SCORE_DESCRIPTIONS.performanceScore}
        />
        <ScoreCard
          label="Creative"
          score={scorecard.creativeScore}
          description={SCORE_DESCRIPTIONS.creativeScore}
        />
        <ScoreCard
          label="Replication"
          score={scorecard.replicationScore}
          description={SCORE_DESCRIPTIONS.replicationScore}
        />
        <ScoreCard
          label="Viral Quality"
          score={scorecard.viralQualityScore}
          description={SCORE_DESCRIPTIONS.viralQualityScore}
        />
      </div>
    </div>
  );
}
