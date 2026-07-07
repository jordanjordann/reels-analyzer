import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.execute(`
    SELECT
      p.username,
      p.reel_count,
      p.session_count,
      p.last_analyzed_at,
      p.follower_count,
      p.following_count,
      p.post_count
    FROM profiles p
    WHERE p.reel_count > 0
    ORDER BY p.last_analyzed_at DESC
  `);

  const profiles = result.rows.map((row) => ({
    username: String(row.username),
    reelCount: Number(row.reel_count),
    sessionCount: Number(row.session_count),
    lastAnalyzedAt: typeof row.last_analyzed_at === "string" ? row.last_analyzed_at : null,
    followerCount: typeof row.follower_count === "number" ? row.follower_count : null,
    followingCount: typeof row.following_count === "number" ? row.following_count : null,
    postCount: typeof row.post_count === "number" ? row.post_count : null,
  }));

  return NextResponse.json({ profiles });
}
