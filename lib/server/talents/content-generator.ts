import { GoogleGenerativeAI } from "@google/generative-ai";

import { withRetry } from "@/server/analysis/gemini-retry";
import type { ContentMemory, ContentMessage } from "@/api/talents/content/types";

type ContentType = "video" | "carousel" | null;
type GeminiContentRole = "user" | "model";
type GeminiContent = { role: GeminiContentRole; parts: [{ text: string }] };

type ReferenceProfile = {
  username: string;
  analysisContent: string;
};

export function buildContentSystemInstruction(
  analysisContent: string,
  _contentType: ContentType,
  extraContext: string,
  topic: string,
  referenceProfiles: ReferenceProfile[],
  memories: ContentMemory[],
): string {
  const parts = [
    "You are a creative content strategist. Use the following talent analysis to inform your responses. Write in the talent's voice and style.",
    "Adapt your output format based on the user's request (e.g., video script, carousel slides, caption ideas).",
    "\nIMPORTANT — Match the Talent's Speaking Style (Gaya Ngomong):",
    "- Use the EXACT pronouns they use (gue/elu, aku/kamu, saya/anda, etc.)",
    "- Match their formality level (formal, semi-formal, santai, very-santai)",
    "- Use their preferred word choices (e.g. 'butuh' not 'perlu' if they say 'butuh', 'banget' not 'sangat' if they say 'banget')",
    "- Include their characteristic particles (deh, sih, dong, lah, kok, kan, ya, nih, tuh) if they use them",
    "- Mirror their sentence structure patterns and pacing",
    "- Use their common expressions and catchphrases naturally",
    "- Match their code-switching ratio (Bahasa Indonesia + English mix) if applicable",
    "- Match their directness level and humor style",
    "- NEVER use a different register than what the talent naturally uses",
  ];

  parts.push(`\nHere is the talent's analysis:\n${analysisContent}`);

  if (referenceProfiles.length > 0) {
    const refParts = referenceProfiles.map(
      (ref) =>
        `\nReference profile @${ref.username} (use their style as inspiration, but write in the primary talent's voice):\n${ref.analysisContent}`,
    );
    parts.push("Reference profiles for style inspiration:", ...refParts);
  }

  if (topic) {
    parts.push(`\nTopic for this session:\n${topic}`);
  }

  if (extraContext) {
    parts.push(`\nAdditional context provided by the user:\n${extraContext}`);
  }

  if (memories.length > 0) {
    parts.push(formatMemoriesForPrompt(memories));
  }

  parts.push(
    "\nOutput format: Plain text script (not JSON). Write in Bahasa Indonesia.",
    "\nIMPORTANT — Video Requests: If the user asks for a video script (Reels/Shorts), you MUST include:",
    "1. A table with columns: Detik, Visual, Teks Popup.",
    "2. A section 'Insight: Why This Works' explaining psychological triggers and retention strategy.",
    "3. A section '3 Caption Suggestions' with hooks, hashtags, and CTAs.",
    "\nIMPORTANT — Markdown Tables: When generating a table, follow these rules strictly:",
    "- Each row MUST be on exactly ONE line — no newlines inside any cell.",
    "- Use `<br>` for line breaks within a cell (e.g., `Line 1<br>Line 2`).",
    "- Separate every cell with ` | ` (space-pipe-space).",
    "- The header separator row must use `---` between each `|`.",
    "- Keep rows consecutive (no blank lines) — spacing is handled by CSS.",
    "Example of a correct table:",
    "```",
    "| Detik | Visual | Teks popup |",
    "|---|---|---|",
    "| Value 1 | Value 2 | Value 3 |",
    "| Value 4 | Line A<br>Line B | Value 6 |",
    "```",
  );

  return parts.join("\n\n");
}

function formatMemoriesForPrompt(memories: ContentMemory[]): string {
  const grouped: Record<string, ContentMemory[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  let result = "\nLearned preferences (auto-updated from previous sessions):";
  for (const [category, items] of Object.entries(grouped)) {
    result += `\n\n${category.toUpperCase()}:`;
    for (const item of items) {
      result += `\n- ${item.key}: ${item.value}`;
    }
  }
  return result;
}

function formatMessageHistory(messages: ContentMessage[]): GeminiContent[] {
  return messages.map((msg) => ({
    role:
      msg.role === "assistant"
        ? ("model" as GeminiContentRole)
        : ("user" as GeminiContentRole),
    parts: [{ text: msg.content }],
  }));
}

function createModel(apiKey: string, systemInstruction: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction,
  });
}

export async function generateContent(
  analysisContent: string,
  contentType: ContentType,
  messageHistory: ContentMessage[],
  userMessage: string,
  extraContext: string,
  topic: string,
  referenceProfiles: ReferenceProfile[],
  memories: ContentMemory[],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const systemInstruction = buildContentSystemInstruction(
    analysisContent,
    contentType,
    extraContext,
    topic,
    referenceProfiles,
    memories,
  );

  console.log("=== CONTENT GENERATOR SYSTEM PROMPT ===");
  console.log(systemInstruction);
  console.log("=== END SYSTEM PROMPT ===");
  console.log(
    "Reference profiles:",
    referenceProfiles.map((r) => r.username),
  );
  console.log("Topic:", topic);
  console.log("User message:", userMessage);

  const model = createModel(apiKey, systemInstruction);

  const history = formatMessageHistory(messageHistory);
  const contents: GeminiContent[] = [
    ...history,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const result = await withRetry(
    () => model.generateContent({ contents }),
    "Content generator Gemini call",
  );

  return result.response.text();
}

export async function* generateContentStream(
  analysisContent: string,
  contentType: ContentType,
  messageHistory: ContentMessage[],
  userMessage: string,
  extraContext: string,
  topic: string,
  referenceProfiles: ReferenceProfile[],
  memories: ContentMemory[],
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const systemInstruction = buildContentSystemInstruction(
    analysisContent,
    contentType,
    extraContext,
    topic,
    referenceProfiles,
    memories,
  );

  const model = createModel(apiKey, systemInstruction);

  const history = formatMessageHistory(messageHistory);
  const contents: GeminiContent[] = [
    ...history,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const result = await withRetry(
    () => model.generateContentStream({ contents }),
    "Content generator Gemini stream call",
  );

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}
