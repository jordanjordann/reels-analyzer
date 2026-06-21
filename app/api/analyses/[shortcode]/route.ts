import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: RouteContext<"/api/analyses/[shortcode]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shortcode } = await context.params;

  const reelResult = await db.execute({
    sql: "SELECT id FROM reels WHERE ig_shortcode = ? LIMIT 1",
    args: [shortcode],
  });

  if (reelResult.rows.length === 0) {
    return NextResponse.json({ error: "Reel not found." }, { status: 404 });
  }

  const reelId = String(reelResult.rows[0].id);

  await db.execute({
    sql: "DELETE FROM analyses WHERE reel_id = ?",
    args: [reelId],
  });

  await db.execute({
    sql: "DELETE FROM reels WHERE id = ?",
    args: [reelId],
  });

  return NextResponse.json({ success: true });
}
