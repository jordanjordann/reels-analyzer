export type ProfileStrengthWeakness = {
  dimension: string;
  avgScore: number;
  insight: string;
};

export type ViralFormulaPattern = {
  formulaName: string;
  frequency: number;
  insight: string;
};

export type AudiencePsychologyPattern = {
  theme: string;
  type: "pain" | "desire" | "identity";
  insight: string;
};

export type PersonalStyle = {
  speakingStyle: string;
  interactionStyle: string;
  visualStyle: string;
  contentStructure: string;
  toneAndVibe: string;
  signatureElements: string;
};

export type ProfileAnalysis = {
  overallViralIntelligenceScore: number;
  summary: string;
  strengths: ProfileStrengthWeakness[];
  weaknesses: ProfileStrengthWeakness[];
  averageScorecard: {
    performanceScore: number;
    creativeScore: number;
    replicationScore: number;
    viralQualityScore: number;
  };
  averageQualityBreakdown: Record<string, number>;
  recurringRedFlags: string[];
  viralFormulaPatterns: ViralFormulaPattern[];
  audiencePsychologyPatterns: AudiencePsychologyPattern[];
  replicationAdvice: string;
  topReels: Array<{ shortcode: string; score: number }>;
  bottomReels: Array<{ shortcode: string; score: number }>;
  growthSuggestions: string[];
  personalStyle: PersonalStyle;
};

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

function validateProfileAnalysis(parsed: unknown): ProfileAnalysis | null {
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.overallViralIntelligenceScore !== "number") return null;
  if (typeof obj.summary !== "string") return null;
  if (!Array.isArray(obj.strengths)) return null;
  if (!Array.isArray(obj.weaknesses)) return null;
  if (!obj.averageScorecard || typeof obj.averageScorecard !== "object") return null;

  const scorecard = obj.averageScorecard as Record<string, unknown>;
  const requiredScores = ["performanceScore", "creativeScore", "replicationScore", "viralQualityScore"];
  for (const key of requiredScores) {
    if (typeof scorecard[key] !== "number") return null;
  }

  if (!obj.averageQualityBreakdown || typeof obj.averageQualityBreakdown !== "object") return null;
  if (!Array.isArray(obj.recurringRedFlags)) return null;
  if (!Array.isArray(obj.viralFormulaPatterns)) return null;
  if (!Array.isArray(obj.audiencePsychologyPatterns)) return null;
  if (typeof obj.replicationAdvice !== "string") return null;
  if (!Array.isArray(obj.topReels)) return null;
  if (!Array.isArray(obj.bottomReels)) return null;
  if (!Array.isArray(obj.growthSuggestions)) return null;
  if (!obj.personalStyle || typeof obj.personalStyle !== "object") return null;

  const personalStyle = obj.personalStyle as Record<string, unknown>;
  const requiredStyleFields = ["speakingStyle", "interactionStyle", "visualStyle", "contentStructure", "toneAndVibe", "signatureElements"];
  for (const key of requiredStyleFields) {
    if (typeof personalStyle[key] !== "string") return null;
  }

  return obj as ProfileAnalysis;
}

export function parseProfileAnalysis(text: string): ProfileAnalysis | null {
  try {
    const jsonStr = extractJsonFromText(text);
    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);
    return validateProfileAnalysis(parsed);
  } catch {
    return null;
  }
}
