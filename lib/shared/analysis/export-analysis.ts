import type { StructuredAnalysis, ReelAnalysis } from "./types";
import { DIMENSION_LABELS, RED_FLAGS } from "./constants";

function scoreToEmoji(score: number): string {
  if (score >= 8) return "🟢";
  if (score >= 6) return "🟡";
  if (score >= 4) return "🟠";
  return "🔴";
}

function scoreLevel(score: number): string {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "strong";
  if (score >= 40) return "average";
  return "weak";
}

function formatReelMarkdown(reel: ReelAnalysis, index: number): string {
  const scores = Object.entries(DIMENSION_LABELS)
    .map(([key, label]) => `  - ${label}: ${scoreToEmoji(reel.qualityBreakdown[key as keyof typeof reel.qualityBreakdown])} ${reel.qualityBreakdown[key as keyof typeof reel.qualityBreakdown]}/10`)
    .join("\n");

  const redFlagNames = reel.redFlags
    .map((id) => RED_FLAGS.find((r) => r.id === id)?.name)
    .filter(Boolean)
    .join(", ") || "None";

  return `### Reel ${index + 1}: ${reel.shortcode}

**Diagnosis:** ${reel.oneLineDiagnosis}

**Replication:** ${reel.replicationAnalysis.replicationLabel.replace(/_/g, " ")}

**Scorecard:**
- Viral Intelligence: ${reel.scorecard.viralIntelligenceScore}/100 (${scoreLevel(reel.scorecard.viralIntelligenceScore)})
- Performance: ${reel.scorecard.performanceScore}/100
- Creative: ${reel.scorecard.creativeScore}/100
- Replication: ${reel.scorecard.replicationScore}/100

**Quality Breakdown:**
${scores}

**Formula:** ${reel.viralFormulaCard.formulaName}
**Template Hook:** ${reel.viralFormulaCard.templateHook}

**Audience Psychology:**
- Pain: ${reel.audiencePsychology.pain}
- Desire: ${reel.audiencePsychology.desire}
- Identity: ${reel.audiencePsychology.identity}

**Can Copy:** ${reel.replicationAnalysis.whatCanBeCopied.join(", ") || "None identified"}
**Do Not Copy:** ${reel.replicationAnalysis.whatShouldNotBeCopied.join(", ") || "None"}

**Red Flags:** ${redFlagNames}

**Adaptation Ideas:**
${reel.adaptationIdeas.map((a) => `  - ${a.targetCreatorOrBrand}: ${a.adaptedHook}`).join("\n")}
`;
}

export function exportAnalysisToMarkdown(analysis: StructuredAnalysis, username: string, prompt?: string): string {
  const header = `# Reels Analysis — @${username}

**Generated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
**Overall Viral Intelligence Score:** ${analysis.overallViralIntelligenceScore}/100 (${scoreLevel(analysis.overallViralIntelligenceScore)})
**Reels Analyzed:** ${analysis.reels.length}
${prompt ? `**Prompt:** ${prompt}` : ""}

---

## Overall Score

${scoreToEmoji(analysis.overallViralIntelligenceScore / 10)} **${analysis.overallViralIntelligenceScore}/100**

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

### Top Performing Formula

${crossReel.topPerformingFormula}

### Recommended Focus

${crossReel.recommendedFocus}

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
