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
        a.viral_intelligence_score AS analysis_score,
        CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END AS has_analysis
      FROM reels r
      LEFT JOIN analyses a ON a.reel_id = r.id
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
    analysisScore: row.analysis_score != null ? Number(row.analysis_score) : null,
  }));
}

async function getUserProfile(username: string) {
  const result = await db.execute({
    sql: "SELECT follower_count, following_count, post_count FROM profiles WHERE username = ? LIMIT 1",
    args: [username.toLowerCase().replace(/^@+/, "")],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    followerCount: typeof row.follower_count === "number" ? row.follower_count : null,
    followingCount: typeof row.following_count === "number" ? row.following_count : null,
    postCount: typeof row.post_count === "number" ? row.post_count : null,
  };
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
  const reelId = String(reel.id);
  const sessionId = String(reel.session_id);

  const analysisResult = await db.execute({
    sql: `
      SELECT a.content, a.user_prompt
      FROM analyses a
      WHERE a.reel_id = ?
      ORDER BY a.created_at DESC
      LIMIT 1
    `,
    args: [reelId],
  });

  const analysis = analysisResult.rows[0];

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
    hasAnalysis: !!analysis,
    analysis: typeof analysis?.content === "string" ? analysis.content : null,
    userPrompt: typeof analysis?.user_prompt === "string" ? analysis.user_prompt : null,
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

  if (mode === "user-profile") {
    const username = searchParams.get("username");
    if (!username) {
      return NextResponse.json({ error: "Missing username parameter." }, { status: 400 });
    }
    const profile = await getUserProfile(username);
    return NextResponse.json({ username, profile });
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
