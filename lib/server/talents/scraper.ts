import { type BrowserContext, type Page } from "playwright";

import type { MediaMetadata } from "@/server/analysis/reel-fetcher";
import { visitReelPage } from "@/server/analysis/reel-fetcher";
import { IG_BASE, MAX_CONCURRENT_REELS } from "@/server/analysis/constants";

async function extractMediaShortcodes(page: Page): Promise<Array<{ shortcode: string; mediaType: "reel" | "post" }>> {
  await page.waitForTimeout(2000);

  const results = await page.evaluate(() => {
    const items: Array<{ shortcode: string; mediaType: "reel" | "post" }> = [];
    const links = document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]');
    const seen = new Set<string>();
    for (const a of links) {
      const href = a.getAttribute("href");
      if (!href) continue;
      const reelMatch = href.match(/\/reel\/([\w-]+)/);
      if (reelMatch && !seen.has(reelMatch[1])) {
        seen.add(reelMatch[1]);
        items.push({ shortcode: reelMatch[1], mediaType: "reel" });
        continue;
      }
      const postMatch = href.match(/\/p\/([\w-]+)/);
      if (postMatch && !seen.has(postMatch[1])) {
        seen.add(postMatch[1]);
        items.push({ shortcode: postMatch[1], mediaType: "post" });
      }
    }
    return items;
  });

  return results.slice(0, 10);
}

export async function scrapeProfileMedia(username: string, context: BrowserContext): Promise<MediaMetadata[]> {
  const page = await context.newPage();
  try {
    await page.goto(`${IG_BASE}/${username}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    const items = await extractMediaShortcodes(page);

    if (items.length === 0) {
      throw new Error(`No posts found for @${username}`);
    }

    const reelCount = items.filter((i) => i.mediaType === "reel").length;
    const postCount = items.filter((i) => i.mediaType === "post").length;
    console.log(`Found ${items.length} posts for @${username}: ${reelCount} reels, ${postCount} posts`);

    const urls = items.map((item) => ({
      url: item.mediaType === "reel" ? `${IG_BASE}/reel/${item.shortcode}/` : `${IG_BASE}/p/${item.shortcode}/`,
      mediaType: item.mediaType,
    }));

    const results: MediaMetadata[] = [];

    for (let i = 0; i < urls.length; i += MAX_CONCURRENT_REELS) {
      const batch = urls.slice(i, i + MAX_CONCURRENT_REELS);
      const batchResults = await Promise.all(
        batch.map(({ url }) =>
          visitReelPage(url, context).catch((error) => {
            console.warn(`Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
          }),
        ),
      );
      results.push(...batchResults.filter((r): r is MediaMetadata => r !== null));
    }

    return results;
  } finally {
    await page.close();
  }
}
