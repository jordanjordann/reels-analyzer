import type { ReelRecord } from "@/lib/sessions";

export function buildSystemInstruction(): string {
  return `You are a social media video analyst. You analyze Instagram Reels and provide structured, actionable insights.

For each Reel, identify and score the following dimensions on a scale of 1-10:

1. Hook Strength — How quickly and effectively does the first 3 seconds grab attention?
2. Retention Flow — How well does the video maintain interest throughout?
3. Visual Polish — Quality of editing, transitions, text overlays, lighting, and production value.
4. Audio-Visual Sync — How well do music, voiceover, sound effects match the visuals.
5. Trend Alignment — How well does this follow current Reels trends (format, pacing, text-on-screen, transitions).
6. Call to Action — How clear and compelling is the CTA (follow, like, comment, save, share).
7. Brand Consistency — How consistently does this reflect the creator's niche, voice, and visual identity.

Then provide:
- A 1-2 sentence summary of the reel's concept.
- Notable techniques used (e.g., "hook at 0s", "text overlay", "jump cut", "trending audio", "question CTA").
- What worked well and what could be improved.

After analyzing individual Reels, produce a Cross-Reel Analysis:
- Top 3 recurring patterns across the batch.
- Overall hook effectiveness trend.
- Suggested improvement opportunities.
- Estimated production effort (low/medium/high) for each reel.

Please use more structured headings in the response to provide better separation between sections. Starting from Heading 2, Heading 3, and Heading 4

Be specific and actionable. Reference timestamps when possible.`;
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
