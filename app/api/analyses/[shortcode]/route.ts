import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { syncProfileTracking } from "@/server/sessions";

export const runtime = "nodejs";

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

export async function GET(_request: Request, context: RouteContext<"/api/analyses/[shortcode]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shortcode } = await context.params;
  const reel = await getReelDetail(shortcode);

  if (!reel) {
    return NextResponse.json({ error: "Reel not found." }, { status: 404 });
  }

  return NextResponse.json({ reel });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/analyses/[shortcode]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shortcode } = await context.params;

  const reelResult = await db.execute({
    sql: "SELECT id, username FROM reels WHERE ig_shortcode = ? LIMIT 1",
    args: [shortcode],
  });

  if (reelResult.rows.length === 0) {
    return NextResponse.json({ error: "Reel not found." }, { status: 404 });
  }

  const reelId = String(reelResult.rows[0].id);
  const username = String(reelResult.rows[0].username);

  await db.execute({
    sql: "DELETE FROM analyses WHERE reel_id = ?",
    args: [reelId],
  });

  await db.execute({
    sql: "DELETE FROM reels WHERE id = ?",
    args: [reelId],
  });

  await syncProfileTracking(username);

  return NextResponse.json({ success: true });
}
