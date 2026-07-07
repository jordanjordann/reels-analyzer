import type { StructuredAnalysis } from "./types";

function extractJsonFromText(text: string): string | null {
  let cleaned = text.trim();

  const codeFenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeFenceMatch) {
    cleaned = codeFenceMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned || null;
}

function validateReelAnalysis(parsed: unknown): StructuredAnalysis | null {
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.shortcode !== "string") return null;

  const scorecard = obj.scorecard as Record<string, unknown>;
  if (!scorecard) return null;
  const requiredScores = [
    "performanceScore",
    "creativeScore",
    "replicationScore",
    "viralIntelligenceScore",
    "viralQualityScore",
  ];
  for (const key of requiredScores) {
    if (typeof scorecard[key] !== "number") return null;
  }

  const qualityBreakdown = obj.qualityBreakdown as Record<string, unknown>;
  if (!qualityBreakdown) return null;
  const requiredQuality = [
    "hookStrength",
    "retentionDesign",
    "shareability",
    "audiencePainDesireFit",
    "ideaSharpness",
    "executionQuality",
    "emotionalTrigger",
    "commentTrigger",
    "saveValue",
    "brandTransferability",
  ];
  for (const key of requiredQuality) {
    if (typeof qualityBreakdown[key] !== "number") return null;
  }

  return {
    reel: obj as StructuredAnalysis["reel"],
    viralIntelligenceScore: typeof scorecard.viralIntelligenceScore === "number"
      ? scorecard.viralIntelligenceScore
      : 0,
  };
}

export function parseStructuredAnalysis(text: string): StructuredAnalysis | null {
  try {
    const jsonStr = extractJsonFromText(text);
    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);
    return validateReelAnalysis(parsed);
  } catch {
    return null;
  }
}
