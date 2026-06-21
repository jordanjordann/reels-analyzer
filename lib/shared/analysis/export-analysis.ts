import type { StructuredAnalysis } from "./types";
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

export function exportAnalysisToMarkdown(analysis: StructuredAnalysis, username: string, prompt?: string): string {
  const reel = analysis.reel;
  const scores = Object.entries(DIMENSION_LABELS)
    .map(([key, label]) => `  - ${label}: ${scoreToEmoji(reel.qualityBreakdown[key as keyof typeof reel.qualityBreakdown])} ${reel.qualityBreakdown[key as keyof typeof reel.qualityBreakdown]}/10`)
    .join("\n");

  const redFlagNames = reel.redFlags
    .map((id) => RED_FLAGS.find((r) => r.id === id)?.name)
    .filter(Boolean)
    .join(", ") || "None";

  return `# Reel Analysis — @${username} / ${reel.shortcode}

**Generated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
**Viral Intelligence Score:** ${analysis.viralIntelligenceScore}/100 (${scoreLevel(analysis.viralIntelligenceScore)})
**Reel:** ${reel.shortcode}
${prompt ? `**Prompt:** ${prompt}` : ""}

---

## Diagnosis

**One-Line Diagnosis:** ${reel.oneLineDiagnosis}

**Replication:** ${reel.replicationAnalysis.replicationLabel.replace(/_/g, " ")}

## Scorecard

- Viral Intelligence: ${reel.scorecard.viralIntelligenceScore}/100 (${scoreLevel(reel.scorecard.viralIntelligenceScore)})
- Performance: ${reel.scorecard.performanceScore}/100
- Creative: ${reel.scorecard.creativeScore}/100
- Replication: ${reel.scorecard.replicationScore}/100

## Quality Breakdown

${scores}

## Creative Breakdown

- **Hook:** ${reel.creativeBreakdown.hook}
- **Retention Design:** ${reel.creativeBreakdown.retentionDesign}
- **Narrative Structure:** ${reel.creativeBreakdown.narrativeStructure}
- **Emotional Trigger:** ${reel.creativeBreakdown.emotionalTrigger}
- **Execution Notes:** ${reel.creativeBreakdown.executionNotes}

## Viral Formula

**Formula:** ${reel.viralFormulaCard.formulaName}
**Template Hook:** ${reel.viralFormulaCard.templateHook}
**Why It Works:** ${reel.viralFormulaCard.whyItWorks}

## Audience Psychology

- **Pain:** ${reel.audiencePsychology.pain}
- **Desire:** ${reel.audiencePsychology.desire}
- **Identity:** ${reel.audiencePsychology.identity}
- **Enemy/Obstacle:** ${reel.audiencePsychology.enemyOrObstacle}
- **Emotional Payoff:** ${reel.audiencePsychology.emotionalPayoff}

## Replication Analysis

**Can Copy:** ${reel.replicationAnalysis.whatCanBeCopied.join(", ") || "None identified"}
**Do Not Copy:** ${reel.replicationAnalysis.whatShouldNotBeCopied.join(", ") || "None"}
**Risks:** ${reel.replicationAnalysis.risks.join(", ") || "None identified"}
**Brand Safety:** ${reel.replicationAnalysis.brandSafetyNotes}

## Red Flags

${redFlagNames}

## Adaptation Ideas

${reel.adaptationIdeas.map((a) => `- **${a.targetCreatorOrBrand}**: ${a.adaptedHook}`).join("\n")}

## Recommended Next Experiments

${reel.recommendedNextExperiments.map((e) => `- ${e}`).join("\n")}
`;
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
