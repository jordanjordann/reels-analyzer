import { type BrowserContext, type Page } from "playwright";

import type { MediaMetadata } from "@/server/analysis/reel-fetcher";
import { visitReelPage } from "@/server/analysis/reel-fetcher";
import { IG_BASE, MAX_CONCURRENT_REELS } from "@/server/analysis/constants";

async function extractReelShortcodes(page: Page): Promise<string[]> {
  const scripts = await page.evaluate(() => {
    const data: string[] = [];
    const scriptTags = document.querySelectorAll("script");
    for (const script of Array.from(scriptTags)) {
      const text = script.textContent || "";
      if (text.includes("__INITIAL_STATE__")) {
        try {
          const jsonMatch = text.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});\s*$/m);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1]);
            const user = parsed.user;
            if (user?.media?.edges) {
              for (const edge of user.media.edges) {
                const node = edge.node;
                if (node?.shortcode) {
                  data.push(node.shortcode);
                }
              }
            }
          }
        } catch {
          // continue
        }
      }
    }
    return data;
  });

  if (scripts.length > 0) return scripts.slice(0, 10);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const shortcodeRe = /\/reel\/([\w-]+)/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = shortcodeRe.exec(bodyText)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches).slice(0, 10);
}

async function extractReelShortcodesFromProfile(page: Page): Promise<string[]> {
  const shortcodes: string[] = [];

  const html = await page.content();
  const shortcodeRe = /\/p\/([\w-]+)|\/reel\/([\w-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = shortcodeRe.exec(html)) !== null) {
    shortcodes.push(match[1] || match[2]);
  }

  return [...new Set(shortcodes)].slice(0, 10);
}

export async function scrapeProfileReels(username: string, context: BrowserContext): Promise<MediaMetadata[]> {
  const page = await context.newPage();
  try {
    const profileUrl = `${IG_BASE}/${username}/reels/`;
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    let shortcodes = await extractReelShortcodes(page);

    if (shortcodes.length === 0) {
      await page.goto(`${IG_BASE}/${username}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);
      shortcodes = await extractReelShortcodesFromProfile(page);
    }

    if (shortcodes.length === 0) {
      throw new Error(`No reels found for @${username}`);
    }

    console.log(`Found ${shortcodes.length} reels for @${username}`);

    const urls = shortcodes.map((sc) => `${IG_BASE}/reel/${sc}/`);
    const results: MediaMetadata[] = [];

    for (let i = 0; i < urls.length; i += MAX_CONCURRENT_REELS) {
      const batch = urls.slice(i, i + MAX_CONCURRENT_REELS);
      const batchResults = await Promise.all(
        batch.map((url) =>
          visitReelPage(url, context).catch((error) => {
            console.warn(`Failed to fetch reel ${url}: ${error instanceof Error ? error.message : String(error)}`);
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
