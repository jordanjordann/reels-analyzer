import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";

export const runtime = "nodejs";

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

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Missing username parameter." }, { status: 400 });
  }

  const reels = await getUserReels(username);
  return NextResponse.json({ username, reels });
}
