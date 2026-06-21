import type { ReelRecord } from "@/server/sessions/types";
import type { UserProfileMetadata } from "@/server/analysis/types";
import { VIRAL_QUALITY_DIMENSIONS, SCORE_GROUPS, RED_FLAGS, NARRATIVE_FORMULAS } from "./constants";

export function buildPerReelSystemInstruction(): string {
  const dimensionsDesc = VIRAL_QUALITY_DIMENSIONS.map(
    (d) => `- ${d.name} (weight ${d.weight}%): Evaluate ${d.whatToEvaluate.join(", ")}`
  ).join("\n");

  const formulasDesc = NARRATIVE_FORMULAS.map(
    (f) => `- ${f.name}: ${f.structure}`
  ).join("\n");

  const redFlagsDesc = RED_FLAGS.map(
    (r) => `- ${r.name}: ${r.risk}`
  ).join("\n");

  return `You are a viral content analyst. You analyze a single Instagram Reel and provide structured, actionable insights about why the content works and how its formula can be replicated.

IMPORTANT: All text values in the JSON must be written in Bahasa Indonesia. Do NOT use English for any text fields.

You MUST return your analysis as a JSON object with this exact structure:
{
  "shortcode": "the reel shortcode from metadata",
  "oneLineDiagnosis": "one sentence explaining why this reel works or doesn't",
  "scoreJustification": "concise explanation (2-3 sentences) of why these scores were given, referencing key strengths and weaknesses",
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

Available quantitative data: views, followers, comments, duration, caption. Private metrics (shares, saves, watch time) are NOT available — estimate qualitatively from content analysis.

When user profile metadata is provided (followers, following, posts), use it to calculate view-to-follower ratio and evaluate performance relative to account size.

Return ONLY the JSON object. Do not include markdown code fences, explanations, or any text outside the JSON. All text fields must be in Bahasa Indonesia.`;
}

function formatReelMetadata(reel: ReelRecord, userMetadata: UserProfileMetadata | null): string {
  const parts: string[] = [];
  parts.push(`- Shortcode: ${reel.igShortcode}`);
  parts.push(`- URL: ${reel.igUrl}`);
  if (reel.caption) parts.push(`- Caption: ${reel.caption}`);
  if (reel.viewCount) parts.push(`- Views: ${reel.viewCount.toLocaleString()}`);
  if (reel.postDate) parts.push(`- Posted: ${reel.postDate}`);
  if (reel.durationSec) parts.push(`- Duration: ${reel.durationSec}s`);
  if (userMetadata) {
    if (userMetadata.followers != null) parts.push(`- Followers: ${userMetadata.followers.toLocaleString()}`);
    if (userMetadata.following != null) parts.push(`- Following: ${userMetadata.following.toLocaleString()}`);
    if (userMetadata.posts != null) parts.push(`- Total Posts: ${userMetadata.posts.toLocaleString()}`);
  }
  return parts.join("\n");
}

export function buildPerReelUserPrompt(prompt: string, reel: ReelRecord, userMetadata: UserProfileMetadata | null): string {
  return `Analyze this Instagram Reel using the viral content scoring framework.

User's analysis request: ${prompt}

Reel metadata:
${formatReelMetadata(reel, userMetadata)}

Note: Private metrics (shares, saves, watch time, completion rate) are NOT available. Estimate performance qualitatively from views, comments, and content analysis.`;
}

export function buildPerReelMetadataOnlyPrompt(prompt: string, reel: ReelRecord, userMetadata: UserProfileMetadata | null): string {
  return `Analyze this Instagram Reel using the viral content scoring framework.

IMPORTANT: Video file was not available. Provide your best analysis using metadata (caption, view count, date, duration) combined with your knowledge of Instagram Reels trends and viral patterns. Do NOT refuse to analyze — provide estimated scores and insights based on metadata patterns.

User's analysis request: ${prompt}

Reel metadata:
${formatReelMetadata(reel, userMetadata)}

Provide analysis with estimated scores, noting where direct video analysis would have provided additional confidence.`;
}
