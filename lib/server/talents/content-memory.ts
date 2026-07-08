import { randomUUID } from "node:crypto";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { db } from "@/shared/db";
import { withRetry } from "@/server/analysis/gemini-retry";
import type { ContentMemory, ContentMessage, ExtractedMemory } from "@/api/talents/content/types";

function rowToMemory(row: Record<string, unknown>): ContentMemory {
  return {
    id: String(row.id),
    talentId: String(row.talent_id),
    category: String(row.category) as ContentMemory["category"],
    key: String(row.key),
    value: String(row.value),
    confidence: Number(row.confidence),
    source: String(row.source) as ContentMemory["source"],
    lastSeenAt: String(row.last_seen_at),
    createdAt: String(row.created_at),
  };
}

export async function upsertMemory(
  talentId: string,
  category: string,
  key: string,
  value: string,
  confidence: number,
  source: string,
): Promise<void> {
  const id = randomUUID();
  await db.execute({
    sql: `
      INSERT INTO content_memories (id, talent_id, category, key, value, confidence, source, last_seen_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, (strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'), (strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'))
      ON CONFLICT(talent_id, category, key) DO UPDATE SET
        value = excluded.value,
        confidence = (excluded.confidence + content_memories.confidence) / 2,
        source = excluded.source,
        last_seen_at = (strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z')
    `,
    args: [id, talentId, category, key, value, confidence, source],
  });
}

export async function getActiveMemories(
  talentId: string,
  limit = 8,
): Promise<ContentMemory[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM content_memories
      WHERE talent_id = ?
      ORDER BY confidence DESC, last_seen_at DESC
      LIMIT ?
    `,
    args: [talentId, limit],
  });

  return result.rows.map(rowToMemory);
}

export async function getAllMemories(talentId: string): Promise<ContentMemory[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM content_memories
      WHERE talent_id = ?
      ORDER BY category, key
    `,
    args: [talentId],
  });

  return result.rows.map(rowToMemory);
}

export async function clearMemories(talentId: string): Promise<void> {
  await db.execute({
    sql: "DELETE FROM content_memories WHERE talent_id = ?",
    args: [talentId],
  });
}

export async function deleteMemory(
  talentId: string,
  category: string,
  key: string,
): Promise<void> {
  await db.execute({
    sql: "DELETE FROM content_memories WHERE talent_id = ? AND category = ? AND key = ?",
    args: [talentId, category, key],
  });
}

export async function updateMemoryValue(
  talentId: string,
  category: string,
  key: string,
  value: string,
): Promise<void> {
  await db.execute({
    sql: `
      UPDATE content_memories
      SET value = ?, source = 'explicit', confidence = 1.0, last_seen_at = (strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z')
      WHERE talent_id = ? AND category = ? AND key = ?
    `,
    args: [value, talentId, category, key],
  });
}

function buildExtractionPrompt(transcript: string): string {
  return `You are a preference extraction assistant. Read this conversation between a user and a content generator.

Extract all preferences, corrections, and style instructions the user gave.
Return as a JSON array of memory objects.

Rules:
1. Only extract things the user explicitly stated or strongly implied
2. Normalize similar requests to the same key (e.g., "jangan pake tabel" and "stop using tables" both map to format:output_format)
3. Use these categories: format, tone, structure, language, avoidance, topic_focus
4. Create new keys if needed, but use descriptive snake_case names
5. Set confidence: 0.95 for explicit statements, 0.7 for implied, 0.85 for corrections
6. Set source: "explicit" if user said directly, "implicit" if inferred, "correction" if correcting output

Known keys (use these if they match):
- format: output_format, length, caption_style, hashtag_style, slide_count
- tone: formality, energy, humor_level
- language: pronouns, code_switching, slang_usage
- structure: hook_style, body_pattern, cta_style
- avoidance: banned_words, banned_formats, banned_topics
- topic_focus: primary_topic, secondary_topics

If user says something new, create a descriptive key.

Conversation:
${transcript}

Return ONLY a JSON array. No markdown, no explanation.`;
}

function parseExtractionResponse(text: string): ExtractedMemory[] {
  try {
    let cleaned = text.trim();
    const codeFenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeFenceMatch) {
      cleaned = codeFenceMatch[1].trim();
    }
    const firstBrace = cleaned.indexOf("[");
    const lastBrace = cleaned.lastIndexOf("]");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m: Record<string, unknown>) =>
        typeof m.category === "string" &&
        typeof m.key === "string" &&
        typeof m.value === "string" &&
        typeof m.confidence === "number" &&
        typeof m.source === "string",
    ) as ExtractedMemory[];
  } catch {
    return [];
  }
}

export async function extractSessionMemories(
  messages: ContentMessage[],
): Promise<ExtractedMemory[]> {
  if (messages.length < 2) return [];

  const transcript = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction: buildExtractionPrompt(transcript),
  });

  const result = await withRetry(
    () => model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Extract preferences from this conversation and return ONLY a JSON array." }] }],
    }),
    "Memory extraction Gemini call",
  );

  return parseExtractionResponse(result.response.text());
}

export async function summarizeMemoryValue(value: string): Promise<string> {
  if (value.length <= 50) return value;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return value.slice(0, 200);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction:
      "Summarize this preference value into concise bullet points. " +
      "Keep it under 50 characters. Use simple, direct language. " +
      "Return ONLY the summarized text, no explanation.",
  });

  try {
    const result = await withRetry(
      () => model.generateContent({
        contents: [{ role: "user", parts: [{ text: value }] }],
      }),
      "Memory summarization Gemini call",
    );
    const summarized = result.response.text().trim();
    return summarized || value.slice(0, 200);
  } catch {
    return value.slice(0, 200);
  }
}
