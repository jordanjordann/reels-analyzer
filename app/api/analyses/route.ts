import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";

export const runtime = "nodejs";

async function getUserList() {
  const result = await db.execute(`
    SELECT
      r.username,
      COUNT(DISTINCT r.id) AS reel_count,
      COUNT(DISTINCT r.session_id) AS session_count,
      MAX(r.created_at) AS last_analyzed_at
    FROM reels r
    GROUP BY r.username
    ORDER BY last_analyzed_at DESC
  `);

  return result.rows.map((row) => ({
    username: String(row.username),
    reelCount: Number(row.reel_count),
    sessionCount: Number(row.session_count),
    lastAnalyzedAt: String(row.last_analyzed_at),
  }));
}

async function getUserReels(username: string) {
  const result = await db.execute({
    sql: `
      SELECT
        r.id,
        r.session_id,
        r.username,
        r.ig_shortcode,
        r.ig_url,
        r.thumbnail_url,
        r.view_count,
        r.post_date,
        r.caption,
        r.created_at,
        CASE WHEN EXISTS (
          SELECT 1 FROM messages m
          WHERE m.session_id = r.session_id
            AND m.role = 'assistant'
            AND m.content LIKE '%"reels"%'
        ) THEN 1 ELSE 0 END AS has_analysis
      FROM reels r
      WHERE r.username = ?
      ORDER BY r.created_at DESC
    `,
    args: [username.toLowerCase().replace(/^@+/, "")],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    sessionId: String(row.session_id),
    username: String(row.username),
    igShortcode: String(row.ig_shortcode),
    igUrl: String(row.ig_url),
    thumbnailUrl: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    viewCount: typeof row.view_count === "number" ? row.view_count : null,
    postDate: typeof row.post_date === "string" ? row.post_date : null,
    caption: typeof row.caption === "string" ? row.caption : null,
    createdAt: String(row.created_at),
    hasAnalysis: Number(row.has_analysis) === 1,
  }));
}

async function getReelDetail(shortcode: string) {
  const reelResult = await db.execute({
    sql: `
      SELECT
        r.id,
        r.session_id,
        r.username,
        r.ig_shortcode,
        r.ig_url,
        r.thumbnail_url,
        r.view_count,
        r.post_date,
        r.caption,
        r.created_at
      FROM reels r
      WHERE r.ig_shortcode = ?
      LIMIT 1
    `,
    args: [shortcode],
  });

  if (reelResult.rows.length === 0) {
    return null;
  }

  const reel = reelResult.rows[0];
  const sessionId = String(reel.session_id);

  const messagesResult = await db.execute({
    sql: `
      SELECT m.content,
             (SELECT m2.content FROM messages m2 WHERE m2.session_id = ? AND m2.role = 'user' ORDER BY m2.created_at ASC LIMIT 1) AS user_prompt
      FROM messages m
      WHERE m.session_id = ? AND m.role = 'assistant' AND m.content LIKE '%"reels"%'
      ORDER BY m.created_at DESC
      LIMIT 1
    `,
    args: [sessionId, sessionId],
  });

  const message = messagesResult.rows[0];

  // Extract only the matching reel's analysis from the full session JSON
  let reelAnalysis: string | null = null;
  if (typeof message?.content === "string") {
    try {
      const cleaned = message.content
        .replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1")
        .trim();
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr) as { reels?: Array<{ shortcode?: string }>; crossReel?: unknown; overallViralIntelligenceScore?: number };
        const matchingReel = parsed.reels?.find(
          (r) => r.shortcode?.toLowerCase() === shortcode.toLowerCase(),
        );
        if (matchingReel) {
          reelAnalysis = JSON.stringify({
            reels: [matchingReel],
            crossReel: parsed.crossReel,
            overallViralIntelligenceScore: parsed.overallViralIntelligenceScore,
          });
        }
      }
    } catch {
      reelAnalysis = message.content;
    }
  }

  return {
    id: String(reel.id),
    sessionId,
    username: String(reel.username),
    igShortcode: String(reel.ig_shortcode),
    igUrl: String(reel.ig_url),
    thumbnailUrl: typeof reel.thumbnail_url === "string" ? reel.thumbnail_url : null,
    viewCount: typeof reel.view_count === "number" ? reel.view_count : null,
    postDate: typeof reel.post_date === "string" ? reel.post_date : null,
    caption: typeof reel.caption === "string" ? reel.caption : null,
    createdAt: String(reel.created_at),
    hasAnalysis: !!reelAnalysis,
    analysis: reelAnalysis,
    userPrompt: typeof message?.user_prompt === "string" ? message.user_prompt : null,
  };
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "user-list") {
    const users = await getUserList();
    return NextResponse.json({ users });
  }

  if (mode === "user-reels") {
    const username = searchParams.get("username");
    if (!username) {
      return NextResponse.json({ error: "Missing username parameter." }, { status: 400 });
    }
    const reels = await getUserReels(username);
    return NextResponse.json({ username, reels });
  }

  if (mode === "reel-detail") {
    const shortcode = searchParams.get("shortcode");
    if (!shortcode) {
      return NextResponse.json({ error: "Missing shortcode parameter." }, { status: 400 });
    }
    const reel = await getReelDetail(shortcode);
    if (!reel) {
      return NextResponse.json({ error: "Reel not found." }, { status: 404 });
    }
    return NextResponse.json({ reel });
  }

  return NextResponse.json({ error: "Invalid mode. Use user-list, user-reels, or reel-detail." }, { status: 400 });
}
