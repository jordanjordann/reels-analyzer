import type { ReelRecord } from "@/server/sessions/types";
import { VIRAL_QUALITY_DIMENSIONS, SCORE_GROUPS, RED_FLAGS, NARRATIVE_FORMULAS } from "./constants";

export function buildSystemInstruction(): string {
  const dimensionsDesc = VIRAL_QUALITY_DIMENSIONS.map(
    (d) => `- ${d.name} (weight ${d.weight}%): Evaluate ${d.whatToEvaluate.join(", ")}`
  ).join("\n");

  const formulasDesc = NARRATIVE_FORMULAS.map(
    (f) => `- ${f.name}: ${f.structure}`
  ).join("\n");

  const redFlagsDesc = RED_FLAGS.map(
    (r) => `- ${r.name}: ${r.risk}`
  ).join("\n");

  return `You are a viral content analyst. You analyze Instagram Reels and provide structured, actionable insights about why content works and how its formula can be replicated.

You MUST return your analysis as a JSON object with this exact structure:
{
  "reels": [
    {
      "shortcode": "the reel shortcode from metadata",
      "oneLineDiagnosis": "one sentence explaining why this reel works or doesn't",
      "scorecard": {
        "performanceScore": 0-100,
        "creativeScore": 0-100,
        "replicationScore": 0-100,
        "viralIntelligenceScore": 0-100,
        "viralQualityScore": 0-100
      },
      "qualityBreakdown": {
        "hookStrength": 0-10,
        "retentionDesign": 0-10,
        "shareability": 0-10,
        "audiencePainDesireFit": 0-10,
        "ideaSharpness": 0-10,
        "executionQuality": 0-10,
        "emotionalTrigger": 0-10,
        "commentTrigger": 0-10,
        "saveValue": 0-10,
        "brandTransferability": 0-10
      },
      "creativeBreakdown": {
        "hook": "analysis of the hook mechanism",
        "retentionDesign": "how the video keeps attention",
        "narrativeStructure": "which formula used and how well",
        "emotionalTrigger": "what emotion is targeted and how",
        "executionNotes": "editing, pacing, audio, visual notes"
      },
      "audiencePsychology": {
        "pain": "core audience pain point addressed",
        "desire": "core desire promised",
        "identity": "audience identity validated or attacked",
        "enemyOrObstacle": "what enemy or obstacle is named",
        "emotionalPayoff": "what emotional payoff viewers get"
      },
      "viralFormulaCard": {
        "formulaName": "name of the narrative formula used",
        "templateHook": "the hook template that can be reused",
        "structure": ["step 1", "step 2", "step 3"],
        "whyItWorks": "why this formula is effective",
        "bestFor": ["creator type 1", "creator type 2"],
        "notBestFor": ["creator type that shouldn't use this"],
        "adaptationNotes": "how to adapt for other creators/brands"
      },
      "replicationAnalysis": {
        "replicationLabel": "replicable" | "partially_replicable" | "not_replicable",
        "whatCanBeCopied": ["element 1", "element 2"],
        "whatShouldNotBeCopied": ["element 1"],
        "risks": ["risk 1", "risk 2"],
        "brandSafetyNotes": "brand safety assessment"
      },
      "adaptationIdeas": [
        {
          "targetCreatorOrBrand": "type of creator or brand",
          "adaptedHook": "hook adapted for that audience",
          "adaptedStructure": ["step 1", "step 2"],
          "contentAngle": "the angle to take",
          "commercialBridge": "how to bridge to a product or service"
        }
      ],
      "redFlags": ["flag_id_1", "flag_id_2"],
      "recommendedNextExperiments": ["experiment 1", "experiment 2"]
    }
  ],
  "crossReel": {
    "recurringPatterns": ["pattern1", "pattern2"],
    "topPerformingFormula": "which formula worked best across reels",
    "improvementOpportunities": ["opportunity1", "opportunity2"],
    "recommendedFocus": "what to focus on for next content"
  },
  "overallViralIntelligenceScore": 0-100
}

Scoring dimensions (0-10 scale):
${dimensionsDesc}

Score groups (0-100 scale):
- Performance Score: ${SCORE_GROUPS.performanceScore.description}
  Weights: ${JSON.stringify(SCORE_GROUPS.performanceScore.weights)}
- Creative Score: ${SCORE_GROUPS.creativeScore.description}
  Weights: ${JSON.stringify(SCORE_GROUPS.creativeScore.weights)}
- Replication Score: ${SCORE_GROUPS.replicationScore.description}
  Weights: ${JSON.stringify(SCORE_GROUPS.replicationScore.weights)}

Viral Intelligence Score = performanceScore * 0.40 + creativeScore * 0.35 + replicationScore * 0.25
Viral Quality Score = weighted sum of qualityBreakdown dimensions using their weights

Narrative formulas to identify:
${formulasDesc}

Red flags to check:
${redFlagsDesc}

Available quantitative data: views, followers, comments, duration, caption. Private metrics (shares, saves, watch time) are NOT available — estimate qualitatively from content.

Return ONLY the JSON object. Do not include markdown code fences, explanations, or any text outside the JSON.`;
}

function formatReelMetadata(reel: ReelRecord): string {
  const parts: string[] = [];
  parts.push(`- Shortcode: ${reel.igShortcode}`);
  parts.push(`- URL: ${reel.igUrl}`);
  if (reel.caption) parts.push(`- Caption: ${reel.caption}`);
  if (reel.viewCount) parts.push(`- Views: ${reel.viewCount.toLocaleString()}`);
  if (reel.postDate) parts.push(`- Posted: ${reel.postDate}`);
  if (reel.durationSec) parts.push(`- Duration: ${reel.durationSec}s`);
  return parts.join("\n");
}

export function buildUserPrompt(prompt: string, videoCount: number, reels: ReelRecord[]): string {
  const metadataSection = reels
    .map((r) => formatReelMetadata(r))
    .join("\n\n");

  return `Analyze these ${videoCount} Instagram Reels using the viral content scoring framework.

User's analysis request: ${prompt}

Reel metadata:
${metadataSection}

Note: Private metrics (shares, saves, watch time, completion rate) are NOT available. Estimate performance qualitatively from views, comments, and content analysis.`;
}

export function buildMetadataOnlyPrompt(prompt: string, reels: ReelRecord[]): string {
  const metadataSection = reels
    .map((r) => formatReelMetadata(r))
    .join("\n\n");

  return `Analyze these ${reels.length} Instagram Reels using the viral content scoring framework.

IMPORTANT: Video files were not available. Provide your best analysis using metadata (captions, view counts, dates, durations) combined with your knowledge of Instagram Reels trends and viral patterns. Do NOT refuse to analyze — provide estimated scores and insights based on metadata patterns.

User's analysis request: ${prompt}

Reel metadata:
${metadataSection}

Provide analysis with estimated scores, noting where direct video analysis would have provided additional confidence.`;
}
