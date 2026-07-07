import { GoogleGenerativeAI } from "@google/generative-ai";

import { withRetry } from "@/server/analysis/gemini-retry";
import type { ContentMessage } from "@/api/talents/content/types";

type ContentType = "video" | "carousel" | null;
type GeminiContentRole = "user" | "model";
type GeminiContent = { role: GeminiContentRole; parts: [{ text: string }] };

function getContentTypeInstruction(contentType: ContentType): string {
  switch (contentType) {
    case "video":
      return "Write a video script in the talent's voice. Include: hook, body, CTA. Target duration: 30-60 seconds.";
    case "carousel":
      return "Write Instagram carousel slide content in the talent's voice. Each slide should have a headline and body text. Target: 5-10 slides.";
    default:
      return "";
  }
}

type ReferenceProfile = {
  username: string;
  analysisContent: string;
};

export function buildContentSystemInstruction(
  analysisContent: string,
  contentType: ContentType,
  extraContext: string,
  topic: string,
  referenceProfiles: ReferenceProfile[],
): string {
  const typeInstruction = getContentTypeInstruction(contentType);

  const parts = [
    "You are a creative content strategist. Use the following talent analysis to inform your responses. Write in the talent's voice and style.",
  ];

  if (typeInstruction) {
    parts.push(typeInstruction);
  }

  parts.push(
    `\nHere is the talent's analysis:\n${analysisContent}`,
  );

  if (referenceProfiles.length > 0) {
    const refParts = referenceProfiles.map((ref) =>
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

  parts.push(
    "\nOutput format: Plain text script (not JSON). Write in Bahasa Indonesia.",
    "\nIMPORTANT — Markdown Tables: When the user asks for a table, follow these rules strictly:",
    "- Each row MUST be on exactly ONE line — no newlines inside any cell.",
    "- Use `<br>` for line breaks within a cell (e.g., `Line 1<br>Line 2`).",
    "- Separate every cell with ` | ` (space-pipe-space).",
    "- The header separator row must use `---` between each `|`.",
    "- Keep rows consecutive (no blank lines) — spacing is handled by CSS.",
    "Example of a correct table:",
    "```",
    "| Column A | Column B | Column C |",
    "|---|---|---|",
    "| Value 1 | Value 2 | Value 3 |",
    "| Value 4 | Line A<br>Line B | Value 6 |",
    "```",
  );

  return parts.join("\n\n");
}

function formatMessageHistory(messages: ContentMessage[]): GeminiContent[] {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? ("model" as GeminiContentRole) : ("user" as GeminiContentRole),
    parts: [{ text: msg.content }],
  }));
}

export async function generateContent(
  analysisContent: string,
  contentType: ContentType,
  messageHistory: ContentMessage[],
  userMessage: string,
  extraContext: string,
  topic: string,
  referenceProfiles: ReferenceProfile[],
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const systemInstruction = buildContentSystemInstruction(analysisContent, contentType, extraContext, topic, referenceProfiles);

  console.log("=== CONTENT GENERATOR SYSTEM PROMPT ===");
  console.log(systemInstruction);
  console.log("=== END SYSTEM PROMPT ===");
  console.log("Reference profiles:", referenceProfiles.map((r) => r.username));
  console.log("Topic:", topic);
  console.log("User message:", userMessage);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction,
  });

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
