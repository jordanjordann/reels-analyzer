"use client";

import { useTalentDetail } from "@/api/talents/hooks";
import type { TalentAnalysisSectionProps } from "../../../types";
import { PersonalStyleSection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/PersonalStyleSection";
import { AverageScorecardSection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/AverageScorecardSection";
import { StrengthsWeaknessesSection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/StrengthsWeaknessesSection";
import { QualityBreakdownSection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/QualityBreakdownSection";
import { ViralFormulaSection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/ViralFormulaSection";
import { AudiencePsychologySection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/AudiencePsychologySection";
import { RecurringRedFlagsCard } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/cards/RecurringRedFlagsCard";
import { ReplicationAdviceSection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/ReplicationAdviceSection";
import { TopBottomReelsSection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/TopBottomReelsSection";
import { GrowthSuggestionsSection } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/sections/GrowthSuggestionsSection";
import { ScoreRingCard } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/components/cards/ScoreRingCard";
import { formatTimeAgo } from "@/app/profile/[username]/components/sections/ProfileAnalysisSection/helpers";

export function TalentAnalysisSection({ talentId }: TalentAnalysisSectionProps) {
  const { data, isFetching } = useTalentDetail(talentId);
  const talent = data?.talent ?? null;
  const analysis = talent?.analysis ?? null;

  const isLoading = isFetching && !analysis;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <p className="text-sm">Loading analysis...</p>
      </div>
    );
  }

  if (!analysis || !talent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <p className="text-sm">No analysis available yet</p>
        <p className="mt-1 text-xs">Add a talent and wait for analysis to complete</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-background/30 p-5">
        <div className="flex items-start gap-5">
          <ScoreRingCard
            score={analysis.overallViralIntelligenceScore}
            size={28}
          />
          <div className="flex-1">
            <h3 className="font-heading text-lg font-semibold tracking-tight mb-1">
              Talent Viral Intelligence
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {analysis.summary}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{talent.analysisReelCount} reels analyzed</span>
              <span>·</span>
              <span>Updated {formatTimeAgo(talent.lastAnalyzedAt ?? "")}</span>
            </div>
          </div>
        </div>
      </div>

      {analysis.personalStyle && (
        <PersonalStyleSection style={analysis.personalStyle as Record<string, string>} />
      )}

      <AverageScorecardSection scorecard={analysis.averageScorecard} />

      <StrengthsWeaknessesSection
        strengths={analysis.strengths}
        weaknesses={analysis.weaknesses}
      />

      <QualityBreakdownSection breakdown={analysis.averageQualityBreakdown} />

      <ViralFormulaSection patterns={analysis.viralFormulaPatterns} />

      <AudiencePsychologySection patterns={analysis.audiencePsychologyPatterns} />

      {analysis.recurringRedFlags.length > 0 && (
        <RecurringRedFlagsCard flags={analysis.recurringRedFlags} />
      )}

      {analysis.replicationAdvice && (
        <ReplicationAdviceSection advice={analysis.replicationAdvice} />
      )}

      <TopBottomReelsSection
        topReels={analysis.topReels}
        bottomReels={analysis.bottomReels}
      />

      <GrowthSuggestionsSection suggestions={analysis.growthSuggestions} />

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Based on {talent.analysisReelCount} reels · Updated{" "}
          {formatTimeAgo(talent.lastAnalyzedAt ?? "")}
        </p>
      </div>
    </div>
  );
}
