"use client";

import { RefreshCwIcon, UserIcon } from "lucide-react";
import { useMutationState } from "@tanstack/react-query";
import {
  useProfileAnalysis,
  useRefreshProfileAnalysis,
  PROFILE_ANALYSIS_KEYS,
} from "@/api/profile-analysis/hooks";
import {
  DIMENSION_LABELS,
  SCORE_DESCRIPTIONS,
} from "@/shared/analysis/constants";
import { cn } from "@/shared/utils";
import type { ProfileAnalysis } from "@/shared/analysis/profile-types";

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function scoreRing(score: number): string {
  if (score >= 80) return "stroke-green-400";
  if (score >= 60) return "stroke-yellow-400";
  if (score >= 40) return "stroke-orange-400";
  return "stroke-red-400";
}

function qualityBar(score: number) {
  const pct = score * 10;
  const color =
    pct >= 80
      ? "bg-green-400"
      : pct >= 60
        ? "bg-yellow-400"
        : pct >= 40
          ? "bg-orange-400"
          : "bg-red-400";
  return { pct, color };
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function ScoreRing({ score, size = 24 }: { score: number; size?: number }) {
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

function ScoreCard({
  label,
  score,
  description,
}: {
  label: string;
  score: number;
  description?: string;
}) {
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

function DimensionBar({ label, score }: { label: string; score: number }) {
  const { pct, color } = qualityBar(score);
  return (
    <div className="flex items-center gap-2">
      <span className="w-40 truncate text-xs text-muted-foreground">
        {DIMENSION_LABELS[label] ?? label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-mono">{score}</span>
    </div>
  );
}

function StrengthWeaknessColumn({
  title,
  items,
  color,
}: {
  title: string;
  items: Array<{ dimension: string; avgScore: number; insight: string }>;
  color: string;
}) {
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

function ProfileContent({
  profile,
}: {
  profile: ProfileAnalysis & { reelCount: number; updatedAt: string };
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Score Header */}
      <div className="rounded-2xl border bg-background/30 p-5">
        <div className="flex items-start gap-5">
          <ScoreRing score={profile.overallViralIntelligenceScore} size={28} />
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

      {/* Personal Style */}
      {profile.personalStyle && (
        <div className="rounded-2xl border bg-background/30 p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-purple-400 mb-4">
            Personal Style
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(profile.personalStyle).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-purple-400/20 bg-purple-400/5 p-4"
              >
                <p className="text-xs font-semibold text-purple-400 mb-1.5">
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (s) => s.toUpperCase())}
                </p>
                <p className="text-sm text-muted-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scorecard Averages */}
      <div className="rounded-2xl border bg-background/30 p-5">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Average Scorecard
        </p>
        <div className="grid grid-cols-4 gap-3">
          <ScoreCard
            label="Performance"
            score={profile.averageScorecard.performanceScore}
            description={SCORE_DESCRIPTIONS.performanceScore}
          />
          <ScoreCard
            label="Creative"
            score={profile.averageScorecard.creativeScore}
            description={SCORE_DESCRIPTIONS.creativeScore}
          />
          <ScoreCard
            label="Replication"
            score={profile.averageScorecard.replicationScore}
            description={SCORE_DESCRIPTIONS.replicationScore}
          />
          <ScoreCard
            label="Viral Quality"
            score={profile.averageScorecard.viralQualityScore}
            description={SCORE_DESCRIPTIONS.viralQualityScore}
          />
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      {profile.strengths.length > 0 && profile.weaknesses.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <StrengthWeaknessColumn
            title="Strengths"
            items={profile.strengths}
            color="text-green-400"
          />
          <StrengthWeaknessColumn
            title="Weaknesses"
            items={profile.weaknesses}
            color="text-red-400"
          />
        </div>
      )}

      {/* Quality Breakdown */}
      <div className="rounded-2xl border bg-background/30 p-5">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Quality Breakdown (Averages)
        </p>
        <div className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
          {Object.entries(profile.averageQualityBreakdown).map(([key, val]) => (
            <DimensionBar key={key} label={key} score={val} />
          ))}
        </div>
      </div>

      {/* Viral Formula Patterns */}
      {profile.viralFormulaPatterns.length > 0 && (
        <div className="rounded-2xl border bg-background/30 p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-accent mb-3">
            Viral Formula Patterns
          </p>
          <div className="flex flex-col gap-3">
            {profile.viralFormulaPatterns.map((pattern, i) => (
              <div
                key={i}
                className="rounded-lg border border-accent/20 bg-accent/5 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-accent">
                    {pattern.formulaName}
                  </span>
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs text-accent">
                    {pattern.frequency} reels
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pattern.insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audience Psychology */}
      {profile.audiencePsychologyPatterns.length > 0 && (
        <div className="rounded-2xl border bg-background/30 p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-blue-400 mb-3">
            Audience Psychology Patterns
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {profile.audiencePsychologyPatterns.map((pattern, i) => (
              <div
                key={i}
                className="rounded-lg border border-blue-400/20 bg-blue-400/5 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-blue-400">
                    {pattern.theme}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[10px] font-mono",
                      pattern.type === "pain"
                        ? "border-red-400/30 text-red-400 bg-red-400/10"
                        : pattern.type === "desire"
                          ? "border-green-400/30 text-green-400 bg-green-400/10"
                          : "border-yellow-400/30 text-yellow-400 bg-yellow-400/10",
                    )}
                  >
                    {pattern.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pattern.insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring Red Flags */}
      {profile.recurringRedFlags.length > 0 && (
        <div className="rounded-2xl border bg-background/30 p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-orange-400 mb-3">
            Recurring Red Flags
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.recurringRedFlags.map((flag, i) => (
              <span
                key={i}
                className="rounded-md bg-orange-400/10 px-3 py-1.5 text-xs text-orange-400"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Replication Advice */}
      {profile.replicationAdvice && (
        <div className="rounded-2xl border bg-background/30 p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
            Replication Advice
          </p>
          <p className="text-sm text-muted-foreground">
            {profile.replicationAdvice}
          </p>
        </div>
      )}

      {/* Top / Bottom Reels */}
      {(profile.topReels.length > 0 || profile.bottomReels.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {profile.topReels.length > 0 && (
            <div className="rounded-2xl border bg-background/30 p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-green-400 mb-3">
                Top Reels
              </p>
              <div className="flex flex-col gap-2">
                {profile.topReels.map((reel, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-green-400/5 px-3 py-2"
                  >
                    <span className="text-xs font-mono">{reel.shortcode}</span>
                    <span
                      className={cn(
                        "text-sm font-mono font-bold",
                        scoreColor(reel.score),
                      )}
                    >
                      {reel.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {profile.bottomReels.length > 0 && (
            <div className="rounded-2xl border bg-background/30 p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-red-400 mb-3">
                Bottom Reels
              </p>
              <div className="flex flex-col gap-2">
                {profile.bottomReels.map((reel, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-red-400/5 px-3 py-2"
                  >
                    <span className="text-xs font-mono">{reel.shortcode}</span>
                    <span
                      className={cn(
                        "text-sm font-mono font-bold",
                        scoreColor(reel.score),
                      )}
                    >
                      {reel.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Growth Suggestions */}
      {profile.growthSuggestions.length > 0 && (
        <div className="rounded-2xl border bg-background/30 p-5">
          <p className="text-xs font-mono uppercase tracking-wider text-blue-400 mb-3">
            Growth Suggestions
          </p>
          <ol className="flex flex-col gap-2">
            {profile.growthSuggestions.map((suggestion, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-400/10 text-xs font-mono text-blue-400">
                  {i + 1}
                </span>
                {suggestion}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function ProfileAnalysisTab({ username }: { username: string }) {
  const { data, isFetching } = useProfileAnalysis(username);
  const { mutate: refresh } = useRefreshProfileAnalysis(username);
  const isRefreshing =
    useMutationState({
      filters: {
        mutationKey: [...PROFILE_ANALYSIS_KEYS.all, "refresh", username],
        status: "pending",
      },
    }).length > 0;

  if (isFetching && !data?.profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <UserIcon className="size-10 animate-pulse" aria-hidden="true" />
        <p className="text-sm">Analyzing profile...</p>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
        <UserIcon className="size-10" aria-hidden="true" />
        <div>
          <p className="text-sm">No profile analysis yet</p>
          <p className="mt-1 text-xs">
            Analyze at least 2 reels to see profile insights
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isRefreshing}
          className="mt-2 flex items-center gap-2 rounded-lg border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50"
        >
          <RefreshCwIcon
            className={cn("size-4", isRefreshing && "animate-spin")}
            aria-hidden="true"
          />
          {isRefreshing ? "Generating..." : "Generate Analysis"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileContent profile={data.profile} />

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Based on {data.profile.reelCount} reels · Updated{" "}
          {formatTimeAgo(data.profile.updatedAt)}
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50"
        >
          <RefreshCwIcon
            className={cn("size-3.5", isRefreshing && "animate-spin")}
            aria-hidden="true"
          />
          {isRefreshing ? "Refreshing..." : "Refresh Analysis"}
        </button>
      </div>
    </div>
  );
}
