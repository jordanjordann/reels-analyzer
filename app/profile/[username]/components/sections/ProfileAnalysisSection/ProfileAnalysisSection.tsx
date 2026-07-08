"use client";

import { RefreshCwIcon, UserIcon } from "lucide-react";
import {
  useProfileDetail,
  useRefreshProfileAnalysis,
} from "@/api/profiles/hooks";
import { cn } from "@/shared/utils";
import type { ProfileAnalysis } from "@/analysis/profile-types";
import type { ProfileAnalysisSectionProps } from "./types";
import { formatTimeAgo } from "./helpers";
import { PersonalStyleSection } from "./components/sections/PersonalStyleSection";
import { AverageScorecardSection } from "./components/sections/AverageScorecardSection";
import { StrengthsWeaknessesSection } from "./components/sections/StrengthsWeaknessesSection";
import { QualityBreakdownSection } from "./components/sections/QualityBreakdownSection";
import { ViralFormulaSection } from "./components/sections/ViralFormulaSection";
import { AudiencePsychologySection } from "./components/sections/AudiencePsychologySection";
import { RecurringRedFlagsCard } from "./components/cards/RecurringRedFlagsCard";
import { ReplicationAdviceSection } from "./components/sections/ReplicationAdviceSection";
import { TopBottomReelsSection } from "./components/sections/TopBottomReelsSection";
import { GrowthSuggestionsSection } from "./components/sections/GrowthSuggestionsSection";
import { ScoreRingCard } from "./components/cards/ScoreRingCard";

type ProfileContentData = ProfileAnalysis & {
  reelCount: number;
  updatedAt: string;
};

export function ProfileContent({
  profile,
}: {
  profile: ProfileContentData;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-background/30 p-5">
        <div className="flex items-start gap-5">
          <ScoreRingCard
            score={profile.overallViralIntelligenceScore}
            size={28}
          />
          <div className="flex-1">
            <h3 className="font-heading text-lg font-semibold tracking-tight mb-1">
              Profile Viral Intelligence
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {profile.summary}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{profile.reelCount} reels analyzed</span>
              <span>·</span>
              <span>Updated {formatTimeAgo(profile.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {profile.personalStyle && (
        <PersonalStyleSection style={profile.personalStyle as unknown as Record<string, string | Record<string, string>>} />
      )}

      <AverageScorecardSection scorecard={profile.averageScorecard} />

      <StrengthsWeaknessesSection
        strengths={profile.strengths}
        weaknesses={profile.weaknesses}
      />

      <QualityBreakdownSection breakdown={profile.averageQualityBreakdown} />

      <ViralFormulaSection patterns={profile.viralFormulaPatterns} />

      <AudiencePsychologySection patterns={profile.audiencePsychologyPatterns} />

      {profile.recurringRedFlags.length > 0 && (
        <RecurringRedFlagsCard flags={profile.recurringRedFlags} />
      )}

      {profile.replicationAdvice && (
        <ReplicationAdviceSection advice={profile.replicationAdvice} />
      )}

      <TopBottomReelsSection
        topReels={profile.topReels}
        bottomReels={profile.bottomReels}
      />

      <GrowthSuggestionsSection suggestions={profile.growthSuggestions} />
    </div>
  );
}

export function ProfileAnalysisSection({
  username,
}: ProfileAnalysisSectionProps) {
  const { data, isFetching } = useProfileDetail(username);
  const { mutate: refresh, isPending: isMutationPending } = useRefreshProfileAnalysis(username);

  const isLoading = isFetching && !data?.profile?.analysis;
  const isGenerating = isMutationPending || isLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <UserIcon className="size-10 animate-pulse" aria-hidden="true" />
        <p className="text-sm">Analyzing profile...</p>
      </div>
    );
  }

  if (!data?.profile?.analysis) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <UserIcon className="size-10 animate-pulse" aria-hidden="true" />
        <div>
          <p className="text-sm">{isGenerating ? "Generating analysis..." : "No profile analysis yet"}</p>
          <p className="mt-1 text-xs">
            {isGenerating ? "This may take a moment" : "Analyze at least 2 reels to see profile insights"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isGenerating}
          className="mt-2 flex items-center gap-2 rounded-lg border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50"
        >
          <RefreshCwIcon
            className={cn("size-4", isGenerating && "animate-spin")}
            aria-hidden="true"
          />
          {isGenerating ? "Generating..." : "Generate Analysis"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileContent profile={data.profile.analysis} />

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Based on {data.profile.analysis.reelCount} reels · Updated{" "}
          {formatTimeAgo(data.profile.analysis.updatedAt)}
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isMutationPending}
          className="flex items-center gap-2 rounded-lg border bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50"
        >
          <RefreshCwIcon
            className={cn("size-3.5", isMutationPending && "animate-spin")}
            aria-hidden="true"
          />
          {isMutationPending ? "Refreshing..." : "Refresh Analysis"}
        </button>
      </div>
    </div>
  );
}
