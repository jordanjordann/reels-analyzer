import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";

export const runtime = "nodejs";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
};

async function fetchFreshThumbnailUrl(shortcode: string): Promise<string | null> {
  try {
    const response = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: BROWSER_HEADERS,
    });

    if (!response.ok) return null;

    const html = await response.text();
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/);
    if (!ogImageMatch) return null;

    return ogImageMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&#038;/g, "&");
  } catch {
    return null;
  }
}

async function fetchImage(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": BROWSER_HEADERS["User-Agent"],
        "Referer": "https://www.instagram.com/",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: RouteContext<"/api/analyses/[shortcode]/thumbnail">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shortcode } = await context.params;

  const result = await db.execute({
    sql: "SELECT thumbnail_url, ig_url FROM reels WHERE ig_shortcode = ? LIMIT 1",
    args: [shortcode],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Reel not found" }, { status: 404 });
  }

  const row = result.rows[0] as Record<string, unknown>;
  const thumbnailUrl = typeof row.thumbnail_url === "string" ? row.thumbnail_url : null;
  const igUrl = typeof row.ig_url === "string" ? row.ig_url : null;

  if (!thumbnailUrl) {
    return NextResponse.json({ error: "No thumbnail available" }, { status: 404 });
  }

  let response = await fetchImage(thumbnailUrl);

  if (!response || !response.ok) {
    const freshUrl = await fetchFreshThumbnailUrl(shortcode);
    if (freshUrl) {
      response = await fetchImage(freshUrl);
    }
  }

  if (!response || !response.ok) {
    return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: 502 });
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
