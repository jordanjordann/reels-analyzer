import type { ReelRecord } from "@/lib/sessions";

export type DimensionScores = {
  hookStrength: number;
  retentionFlow: number;
  visualPolish: number;
  audioVisualSync: number;
  trendAlignment: number;
  callToAction: number;
  brandConsistency: number;
};

export type ReelAnalysis = {
  shortcode: string;
  scores: DimensionScores;
  averageScore: number;
  concept: string;
  notableTechniques: string[];
  whatWorked: string;
  whatToImprove: string;
  productionEffort: "low" | "medium" | "high";
};

export type CrossReelAnalysis = {
  recurringPatterns: string[];
  hookEffectivenessTrend: string;
  improvementOpportunities: string[];
  productionEfforts: Record<string, "low" | "medium" | "high">;
};

export type StructuredAnalysis = {
  reels: ReelAnalysis[];
  crossReel: CrossReelAnalysis;
  overallAverageScore: number;
};

export function buildSystemInstruction(): string {
  return `You are a social media video analyst. You analyze Instagram Reels and provide structured, actionable insights.

You MUST return your analysis as a JSON object with this exact structure:
{
  "reels": [
    {
      "shortcode": "the reel shortcode from metadata",
      "scores": {
        "hookStrength": 1-10,
        "retentionFlow": 1-10,
        "visualPolish": 1-10,
        "audioVisualSync": 1-10,
        "trendAlignment": 1-10,
        "callToAction": 1-10,
        "brandConsistency": 1-10
      },
      "averageScore": number (average of all 7 scores, rounded to 1 decimal),
      "concept": "1-2 sentence summary of the reel's concept",
      "notableTechniques": ["technique1", "technique2", ...],
      "whatWorked": "what worked well",
      "whatToImprove": "what could be improved",
      "productionEffort": "low" | "medium" | "high"
    }
  ],
  "crossReel": {
    "recurringPatterns": ["pattern1", "pattern2", "pattern3"],
    "hookEffectivenessTrend": "description of overall hook effectiveness",
    "improvementOpportunities": ["opportunity1", "opportunity2", ...],
    "productionEfforts": {"shortcode": "low"|"medium"|"high", ...}
  },
  "overallAverageScore": number (average across all reels, rounded to 1 decimal)
}

Scoring dimensions:
1. Hook Strength — How quickly and effectively does the first 3 seconds grab attention?
2. Retention Flow — How well does the video maintain interest throughout?
3. Visual Polish — Quality of editing, transitions, text overlays, lighting, and production value.
4. Audio-Visual Sync — How well do music, voiceover, sound effects match the visuals.
5. Trend Alignment — How well does this follow current Reels trends (format, pacing, text-on-screen, transitions).
6. Call to Action — How clear and compelling is the CTA (follow, like, comment, save, share).
7. Brand Consistency — How consistently does this reflect the creator's niche, voice, and visual identity.

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

  return `Analyze these ${videoCount} Instagram Reels based on the rubric above.

User's analysis request: ${prompt}

Reel metadata for the videos being analyzed:
${metadataSection}

Provide a comprehensive analysis covering each reel individually and a cross-reel summary.`;
}

export function buildMetadataOnlyPrompt(prompt: string, reels: ReelRecord[]): string {
  const metadataSection = reels
    .map((r) => formatReelMetadata(r))
    .join("\n\n");

  return `Analyze these ${reels.length} Instagram Reels based on the rubric above.

IMPORTANT: Video files were not available for direct viewing. You must provide your best analysis using the available metadata (captions, view counts, dates, durations) combined with your knowledge of Instagram Reels trends, patterns, and best practices. Do NOT refuse to analyze — provide estimated scores and insights based on the metadata patterns and your training knowledge.

User's analysis request: ${prompt}

Reel metadata:
${metadataSection}

Provide analysis with estimated scores, noting where direct video analysis would have provided additional confidence.`;
}
