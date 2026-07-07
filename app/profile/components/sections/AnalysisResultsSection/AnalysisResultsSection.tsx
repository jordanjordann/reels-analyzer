"use client";

import { getScoreColor, getQualityBreakdownEntries, getScorecardEntries } from "./helpers";
import type { AnalysisResultsSectionProps } from "./types";

export function AnalysisResultsSection({ analysis }: AnalysisResultsSectionProps) {
  const { reel, viralIntelligenceScore } = analysis;

  return (
    <div className="flex flex-col gap-6">
      {/* Score Summary */}
      <div className="rounded-xl border bg-background/50 p-4">
        <h4 className="mb-3 font-heading text-sm font-semibold">Viral Intelligence Score</h4>
        <div className="flex items-center gap-4">
          <span className={`text-3xl font-mono font-bold ${getScoreColor(viralIntelligenceScore)}`}>
            {viralIntelligenceScore}
          </span>
          <p className="text-sm text-muted-foreground">{reel.oneLineDiagnosis}</p>
        </div>
      </div>

      {/* Scorecard */}
      <div className="rounded-xl border bg-background/50 p-4">
        <h4 className="mb-3 font-heading text-sm font-semibold">Scorecard</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {getScorecardEntries(reel.scorecard).map(([key, value]) => (
            <div key={key} className="flex flex-col items-center rounded-lg bg-secondary p-3">
              <span className={`text-lg font-mono font-bold ${getScoreColor(value)}`}>{value}</span>
              <span className="mt-1 text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Breakdown */}
      <div className="rounded-xl border bg-background/50 p-4">
        <h4 className="mb-3 font-heading text-sm font-semibold">Quality Breakdown</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {getQualityBreakdownEntries(reel.qualityBreakdown).map(([key, value]) => (
            <div key={key} className="flex flex-col items-center rounded-lg bg-secondary p-3">
              <span className={`text-lg font-mono font-bold ${getScoreColor(value)}`}>{value}</span>
              <span className="mt-1 text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Creative Breakdown */}
      <div className="rounded-xl border bg-background/50 p-4">
        <h4 className="mb-3 font-heading text-sm font-semibold">Creative Breakdown</h4>
        <div className="flex flex-col gap-3">
          {Object.entries(reel.creativeBreakdown).map(([key, value]) => (
            <div key={key}>
              <span className="text-xs font-semibold uppercase text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}</span>
              <p className="mt-1 text-sm leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audience Psychology */}
      <div className="rounded-xl border bg-background/50 p-4">
        <h4 className="mb-3 font-heading text-sm font-semibold">Audience Psychology</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(reel.audiencePsychology).map(([key, value]) => (
            <div key={key} className="rounded-lg bg-secondary p-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}</span>
              <p className="mt-1 text-sm leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Red Flags */}
      {reel.redFlags.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <h4 className="mb-3 font-heading text-sm font-semibold text-destructive">Red Flags</h4>
          <ul className="flex flex-col gap-2">
            {reel.redFlags.map((flag, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-destructive">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Experiments */}
      {reel.recommendedNextExperiments.length > 0 && (
        <div className="rounded-xl border bg-background/50 p-4">
          <h4 className="mb-3 font-heading text-sm font-semibold">Recommended Next Experiments</h4>
          <ul className="flex flex-col gap-2">
            {reel.recommendedNextExperiments.map((exp, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                {exp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Suggestions */}
      {reel.improvementSuggestions && reel.improvementSuggestions.length > 0 && (
        <div className="rounded-xl border bg-background/50 p-4">
          <h4 className="mb-3 font-heading text-sm font-semibold">Improvement Suggestions</h4>
          <ul className="flex flex-col gap-2">
            {reel.improvementSuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-yellow-400" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
