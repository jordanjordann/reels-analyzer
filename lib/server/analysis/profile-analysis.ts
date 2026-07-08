import { randomUUID } from "node:crypto";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { db } from "@/shared/db";
import { parseStructuredAnalysis } from "@/analysis/analysis-parser";
import { parseProfileAnalysis } from "@/analysis/profile-types";
import type { ProfileAnalysis } from "@/analysis/profile-types";
import { MAX_RETRIES, BASE_DELAY_MS } from "./constants";

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("429") || msg.includes("rate limit") || msg.includes("quota exceeded") || msg.includes("resource_exhausted");
  }
  return false;
}

function getRetryDelay(attempt: number, error: unknown): number {
  if (error instanceof Error && error.message.includes("429")) {
    return BASE_DELAY_MS * Math.pow(2, attempt) * 2;
  }
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

async function withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      const delay = getRetryDelay(attempt, error);
      console.warn(`${context} rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${context} failed after ${MAX_RETRIES} retries`);
}

function buildProfileAnalysisSystemInstruction(): string {
  return `You are a viral content analyst. You are given an array of per-reel analyses for a single Instagram creator. Your job is to synthesize them into a comprehensive profile-level analysis.

IMPORTANT: All text values in the JSON must be written in Bahasa Indonesia. Do NOT use English for any text fields.

You MUST return your analysis as a JSON object with this exact structure:
{
  "overallViralIntelligenceScore": 0-100,
  "summary": "one paragraph summary of this creator's content style and performance",
  "strengths": [
    { "dimension": "Hook Strength", "avgScore": 0-10, "insight": "detailed explanation of what they do well" }
  ],
  "weaknesses": [
    { "dimension": "Retention Design", "avgScore": 0-10, "insight": "detailed explanation of where they struggle" }
  ],
  "averageScorecard": {
    "performanceScore": 0-100,
    "creativeScore": 0-100,
    "replicationScore": 0-100,
    "viralQualityScore": 0-100
  },
  "averageQualityBreakdown": {
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
  "recurringRedFlags": ["flag that appears across multiple reels"],
  "viralFormulaPatterns": [
    { "formulaName": "Problem → Reframe → Solution", "frequency": 3, "insight": "how this pattern shows up in their content" }
  ],
  "audiencePsychologyPatterns": [
    { "theme": "fear of missing out", "type": "pain", "insight": "how this manifests across their content" }
  ],
  "replicationAdvice": "overall advice on what aspects of their style can be replicated",
  "topReels": [{ "shortcode": "ABC123", "score": 85 }],
  "bottomReels": [{ "shortcode": "DEF456", "score": 32 }],
  "growthSuggestions": ["specific experiment or strategy to try next"],
  "personalStyle": {
    "speakingStyle": {
      "overallDescription": "comprehensive description of how this creator speaks — their linguistic personality, register, and verbal identity",
      "formalityLevel": "formal | semi-formal | santai | very-santai | mixed",
      "formalityNotes": "detailed explanation of their formality level — when they shift registers, what triggers formality changes, how consistent they are across content",
      "pronounUsage": "which pronouns they use: gue/elu (Jakarta slang), aku/kamu (informal standard), saya/anda (formal), kita/kita orang, dll — describe their default and any context-dependent switching",
      "pronounExamples": "exact examples of pronoun usage from their content, e.g. 'Gue mau share...', 'Kalian pasti pernah...', 'Aku tuh selalu...'",
      "wordChoicePreferences": "their preferred vocabulary register — e.g. 'butuh' vs 'perlu' vs 'pengen' vs 'ingin', 'banget' vs 'sangat', 'gak' vs 'tidak' vs 'nggak', 'udah' vs 'sudah', 'aja' vs 'saja', 'yang' vs 'yg', 'sama' vs 'dengan'. Describe what level of Bahasa Indonesia they naturally use.",
      "wordChoiceExamples": "exact examples of characteristic word choices from their content, e.g. 'Gue butuh banget...', 'Kamu harus coba...', 'Ini sangat penting...'",
      "slangAndColloquialisms": "slang words, abbreviations, and colloquial expressions they use — e.g. 'btw', 'jujurly', 'which is', 'literally', 'parah', 'gila', 'anjay', 'wkwk', 'guys', 'bestie', 'spill', 'relate', 'valid'. Note any English code-mixing patterns.",
      "sentenceStructure": "typical sentence patterns — short punchy sentences vs long explanations, use of rhetorical questions, how they build arguments, use of filler words like 'jadi', 'nah', 'gitu loh', 'kan', 'ya'",
      "commonExpressions": "recurring phrases, verbal tics, catchphrases, transition words they always use — e.g. 'Oke guys', 'Jadi begini', 'Coba bayangin', 'Trust me', 'Seriusan'",
      "codeSwitching": "how and when they mix languages (Bahasa Indonesia + English, regional languages, etc.) — describe the ratio, context, and naturalness of their code-switching",
      "particleUsage": "how they use Indonesian particles like 'deh', 'sih', 'dong', 'lah', 'kok', 'kan', 'ya', 'nih', 'tuh', 'loh' — which ones they favor and in what contexts",
      "particleExamples": "exact examples showing particle usage, e.g. 'Kan udah gue bilang...', 'Enak aja sih...', 'Coba dong...', 'Gitu loh...'",
      "regionalInfluences": "any regional language influences in their speech — Javanese, Sundanese, Batak, Betawi, Manado, etc. — and how it affects their Indonesian (accent, vocabulary, grammar patterns)",
      "emphasisPatterns": "how they emphasize points — repetition, volume changes, strategic pauses, hand gestures combined with speech, rhetorical questions, direct address",
      "humorStyle": "how they use humor in speech — sarcasm, self-deprecation, wordplay, exaggeration, deadpan, physical comedy — and how natural it feels",
      "pacingAndRhythm": "their speech tempo — fast-paced and energetic, slow and deliberate, varied with dramatic pauses, consistent conversational rhythm",
      "directnessLevel": "how direct or indirect they are — do they say things straight or use metaphors, stories, and indirect approaches? Do they use euphemisms?",
      "politenessMarkers": "how they show politeness or respect — use of 'mas/mbak', 'kak', 'pak/bu', honorifics, softening words, hedging language"
    },
    "interactionStyle": "how they engage audience (questions, humor, authority, etc.)",
    "visualStyle": "editing patterns, text overlay usage, camera framing, aesthetic consistency",
    "contentStructure": "how they organize videos (listicle, story arc, tutorial, etc.)",
    "toneAndVibe": "overall personality (motivational, educational, entertaining, etc.)",
    "signatureElements": "recurring catchphrases, visual motifs, editing quirks, intro/outro patterns"
  }
}

Rules:
- strengths should contain the top 3 dimensions by average score (highest first)
- weaknesses should contain the bottom 3 dimensions by average score (lowest first)
- recurringRedFlags should contain only flags that appear in 2+ reels
- viralFormulaPatterns should list formulas used in 2+ reels, sorted by frequency descending
- audiencePsychologyPatterns should synthesize recurring themes across reels
- topReels should list the 3 highest-scoring reels
- bottomReels should list the 3 lowest-scoring reels
- growthSuggestions should be specific, actionable, and based on the weaknesses identified
- personalStyle should be detailed — especially speakingStyle (gaya ngomong), which must capture their exact pronoun usage, formality level, word choices, particles, and linguistic patterns. Every sub-field must be a substantive paragraph with concrete observed examples.

Return ONLY the JSON object. Do not include markdown code fences, explanations, or any text outside the JSON. All text fields must be in Bahasa Indonesia.`;
}

async function callGemini(systemInstruction: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction,
  });

  const result = await withRetry(
    () => model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    }),
    "Profile analysis Gemini call"
  );

  return result.response.text();
}

async function getUserAnalyses(username: string): Promise<Array<{ content: string; shortcode: string; viralIntelligenceScore: number | null }>> {
  const result = await db.execute({
    sql: `
      SELECT a.content, a.viral_intelligence_score, r.ig_shortcode
      FROM reels r
      INNER JOIN analyses a ON a.reel_id = r.id
      WHERE r.username = ?
      ORDER BY r.created_at DESC
    `,
    args: [username],
  });

  return result.rows.map((row) => ({
    content: String(row.content),
    shortcode: String(row.ig_shortcode),
    viralIntelligenceScore: row.viral_intelligence_score != null ? Number(row.viral_intelligence_score) : null,
  }));
}

async function upsertProfileAnalysis(
  username: string,
  content: string,
  rawGemini: string | null,
  userPrompt: string | null,
  reelCount: number,
): Promise<string> {
  const id = randomUUID();
  await db.execute({
    sql: `
      INSERT INTO profile_analyses (id, username, content, raw_gemini, user_prompt, reel_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(username) DO UPDATE SET
        content = excluded.content,
        raw_gemini = excluded.raw_gemini,
        user_prompt = excluded.user_prompt,
        reel_count = excluded.reel_count,
        updated_at = datetime('now')
    `,
    args: [id, username, content, rawGemini, userPrompt, reelCount],
  });
  return id;
}

export async function generateProfileAnalysis(username: string): Promise<ProfileAnalysis | null> {
  console.log(`Generating profile analysis for @${username}...`);

  const analyses = await getUserAnalyses(username);

  if (analyses.length < 2) {
    console.log(`Not enough analyses for @${username} (${analyses.length} reels, need at least 2)`);
    return null;
  }

  const parsedAnalyses = analyses
    .map((a) => ({
      shortcode: a.shortcode,
      analysis: parseStructuredAnalysis(a.content),
      score: a.viralIntelligenceScore,
    }))
    .filter((a) => a.analysis !== null);

  if (parsedAnalyses.length < 2) {
    console.log(`Not enough valid parsed analyses for @${username} (${parsedAnalyses.length} valid)`);
    return null;
  }

  const inputAnalyses = parsedAnalyses.map((a) => a.analysis!);
  const userPrompt = `Here are ${inputAnalyses.length} per-reel analyses for @${username}:\n\n${JSON.stringify(inputAnalyses, null, 2)}`;

  const systemInstruction = buildProfileAnalysisSystemInstruction();
  const geminiResponse = await callGemini(systemInstruction, userPrompt);

  const profileAnalysis = parseProfileAnalysis(geminiResponse);

  if (!profileAnalysis) {
    console.error(`Failed to parse profile analysis for @${username}.`);
    console.error(`Raw response (first 1000 chars): ${geminiResponse.slice(0, 1000)}`);
    return null;
  }

  await upsertProfileAnalysis(
    username,
    JSON.stringify(profileAnalysis),
    geminiResponse,
    userPrompt,
    parsedAnalyses.length,
  );

  console.log(`Profile analysis generated and stored for @${username} (${parsedAnalyses.length} reels)`);
  return profileAnalysis;
}
