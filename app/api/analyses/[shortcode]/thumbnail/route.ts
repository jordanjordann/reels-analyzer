import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/analyses/[shortcode]/thumbnail">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shortcode } = await context.params;

  const result = await db.execute({
    sql: "SELECT thumbnail_url FROM reels WHERE ig_shortcode = ? LIMIT 1",
    args: [shortcode],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Reel not found" }, { status: 404 });
  }

  const thumbnailUrl = String(result.rows[0].thumbnail_url);

  if (!thumbnailUrl) {
    return NextResponse.json({ error: "No thumbnail available" }, { status: 404 });
  }

  try {
    const response = await fetch(thumbnailUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.instagram.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: 502 });
  }
}
