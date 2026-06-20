import type { StructuredAnalysis } from "./types";

function extractJsonFromText(text: string): string | null {
  let cleaned = text.trim();

  // Remove markdown code fences
  const codeFenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeFenceMatch) {
    cleaned = codeFenceMatch[1].trim();
  }

  // Try to find a JSON object by looking for the outermost braces
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned || null;
}

function fixTrailingCommas(jsonStr: string): string {
  return jsonStr
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
}

function validateStructuredAnalysis(parsed: unknown): StructuredAnalysis | null {
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;
  if (!obj.reels || !Array.isArray(obj.reels) || !obj.crossReel) return null;

  for (const reel of obj.reels) {
    if (!reel || typeof reel !== "object") return null;
    const r = reel as Record<string, unknown>;
    if (typeof r.shortcode !== "string") return null;

    const scorecard = r.scorecard as Record<string, unknown>;
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

    const qualityBreakdown = r.qualityBreakdown as Record<string, unknown>;
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
  }

  return parsed as StructuredAnalysis;
}

export function parseStructuredAnalysis(text: string): StructuredAnalysis | null {
  try {
    const jsonStr = extractJsonFromText(text);
    if (!jsonStr) return null;

    // First attempt: direct parse
    try {
      const parsed = JSON.parse(jsonStr);
      return validateStructuredAnalysis(parsed);
    } catch {
      // Second attempt: fix trailing commas (common Gemini output issue)
      const fixed = fixTrailingCommas(jsonStr);
      if (fixed !== jsonStr) {
        const parsed = JSON.parse(fixed);
        return validateStructuredAnalysis(parsed);
      }
    }

    return null;
  } catch {
    return null;
  }
}
