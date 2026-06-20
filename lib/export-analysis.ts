import type { StructuredAnalysis, ReelAnalysis } from "@/lib/analysis-rubric";

const DIMENSION_LABELS: Record<string, string> = {
  hookStrength: "Hook Strength",
  retentionFlow: "Retention Flow",
  visualPolish: "Visual Polish",
  audioVisualSync: "Audio-Visual Sync",
  trendAlignment: "Trend Alignment",
  callToAction: "Call to Action",
  brandConsistency: "Brand Consistency",
};

function scoreToEmoji(score: number): string {
  if (score >= 8) return "🟢";
  if (score >= 6) return "🟡";
  if (score >= 4) return "🟠";
  return "🔴";
}

function formatReelMarkdown(reel: ReelAnalysis, index: number): string {
  const scores = Object.entries(DIMENSION_LABELS)
    .map(([key, label]) => `  - ${label}: ${scoreToEmoji(reel.scores[key as keyof typeof reel.scores])} ${reel.scores[key as keyof typeof reel.scores]}/10`)
    .join("\n");

  return `### Reel ${index + 1}: ${reel.shortcode}

**Concept:** ${reel.concept}

**Average Score:** ${reel.averageScore.toFixed(1)}/10

**Scores:**
${scores}

**Notable Techniques:** ${reel.notableTechniques.join(", ") || "None identified"}

**What Worked:**
${reel.whatWorked}

**To Improve:**
${reel.whatToImprove}

**Production Effort:** ${reel.productionEffort}
`;
}

export function exportAnalysisToMarkdown(analysis: StructuredAnalysis, username: string, prompt?: string): string {
  const header = `# Reels Analysis — @${username}

**Generated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
**Overall Score:** ${analysis.overallAverageScore.toFixed(1)}/10
**Reels Analyzed:** ${analysis.reels.length}
${prompt ? `**Prompt:** ${prompt}` : ""}

---

## Overall Score

${scoreToEmoji(analysis.overallAverageScore)} **${analysis.overallAverageScore.toFixed(1)}/10**

---

`;

  const reelsSection = `## Per-Reel Breakdown

${analysis.reels.map((reel, i) => formatReelMarkdown(reel, i)).join("\n---\n\n")}

---

`;

  const crossReel = analysis.crossReel;
  const crossReelSection = `## Cross-Reel Analysis

### Recurring Patterns

${crossReel.recurringPatterns.map((p) => `- ${p}`).join("\n")}

### Hook Effectiveness Trend

${crossReel.hookEffectivenessTrend}

### Improvement Opportunities

${crossReel.improvementOpportunities.map((o) => `- ${o}`).join("\n")}
`;

  return header + reelsSection + crossReelSection;
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
