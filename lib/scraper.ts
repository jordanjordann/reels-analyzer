import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { extractVideoUrl as extractVideoUrlYtDlp } from "@/lib/downloader";

const IG_BASE = "https://www.instagram.com";
const SESSION_FILE = join(tmpdir(), "opencode-ig-session.json");

export type ScrapedReel = {
  shortcode: string;
  url: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  caption: string | null;
  viewCount: number | null;
  postDate: string | null;
  durationSec: number | null;
};

async function getCredentials() {
  const igUser = process.env.INSTAGRAM_USERNAME;
  const igPass = process.env.INSTAGRAM_PASSWORD;

  if (!igUser || !igPass) {
    throw new Error("INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD environment variables must be set.");
  }

  return { igUser, igPass };
}

function decodeIgUrl(url: string): string {
  return url
    .replace(/\\u0026/g, "&")
    .replace(/\\u0025/g, "%")
    .replace(/\\u002F/g, "/")
    .replace(/\\u00253A/g, ":")
    .replace(/\\u00252F/g, "/")
    .replace(/\\u00253F/g, "?")
    .replace(/\\u00253D/g, "=");
}

function findVideoUrlInJson(obj: unknown, depth = 0): string | null {
  if (depth > 10) return null;
  if (typeof obj === "string") {
    const match = obj.match(/https?:[^"'\s<>]*?(?:cdninstagram|fbcdn\.net)[^"'\s<>]*\.mp4[^"'\s<>]*/);
    return match ? decodeIgUrl(match[0]) : null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findVideoUrlInJson(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (obj && typeof obj === "object") {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = findVideoUrlInJson(val, depth + 1);
      if (found) return found;
    }
    return null;
  }
  return null;
}

async function extractVideoUrl(page: import("playwright").Page, reelUrl: string): Promise<string | null> {
  const result = await extractReelData(page, reelUrl);
  return result.videoUrl;
}

type ReelPageData = {
  videoUrl: string | null;
  caption: string | null;
  viewCount: number | null;
  postDate: string | null;
  durationSec: number | null;
};

async function extractReelData(page: import("playwright").Page, reelUrl: string): Promise<ReelPageData> {
  const result: ReelPageData = {
    videoUrl: null,
    caption: null,
    viewCount: null,
    postDate: null,
    durationSec: null,
  };

  // Strategy 0: Use yt-dlp for reliable URL extraction
  try {
    const ytDlpUrl = await extractVideoUrlYtDlp(reelUrl);
    if (ytDlpUrl) {
      result.videoUrl = ytDlpUrl;
    }
  } catch (error) {
    console.warn(`yt-dlp extraction failed for ${reelUrl}: ${error instanceof Error ? error.message : error}`);
  }

  // Strategy 1: Capture video URLs from API responses during navigation
  const capturedUrls: string[] = [];
  const routeHandler = async (route: import("playwright").Route) => {
    const url = route.request().url();
    if (url.includes("/graphql") || url.includes("/reels") || url.includes("/reel")) {
      route.continue();
      route.fetch().then(async (response) => {
        try {
          const body = await response.text();
          const re = /https?:[^"'\s<>]*?(?:cdninstagram|fbcdn\.net)[^"'\s<>]*\.mp4[^"'\s<>]*/g;
          const matches = body.match(re);
          if (matches) capturedUrls.push(...matches);
        } catch {}
      }).catch(() => {});
    } else {
      route.continue();
    }
  };
  await page.route("**/*", routeHandler);

  try {
    const response = await page.goto(reelUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    // Check if we hit a login page
    if (page.url().includes("accounts/login")) {
      console.warn(`Redirected to login at ${reelUrl}`);
      return result;
    }

    // Strategy A: Extract metadata from embedded JSON data (most reliable)
    const jsonData = await page.evaluate(() => {
      const data: { caption: string | null; viewCount: number | null; postDate: string | null; durationSec: number | null } = {
        caption: null,
        viewCount: null,
        postDate: null,
        durationSec: null,
      };

      // Try to find embedded JSON in script tags
      const scripts = document.querySelectorAll("script");
      for (const script of Array.from(scripts)) {
        const text = script.textContent || "";

        // Look for __INITIAL_STATE__ or similar embedded data
        if (text.includes("edge_media_to_caption") || text.includes("edge_media_preview_like")) {
          try {
            // Extract JSON from window._sharedData or similar patterns
            const jsonMatch = text.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});\s*$/m) ||
                             text.match(/window\._sharedData\s*=\s*({.+?});\s*$/m);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1]);
              // Navigate Instagram's nested structure
              const entryData = parsed.entry_data?.PostPage?.[0] || parsed.entry_data?.ReelsMedia?.[0];
              if (entryData) {
                const media = entryData.graphql?.shortcode_media || entryData.graphql?.reels_media?.[0];
                if (media) {
                  // Caption
                  const captionEdges = media.edge_media_to_caption?.edges;
                  if (captionEdges?.[0]?.node?.text) {
                    data.caption = captionEdges[0].node.text;
                  }
                  // View count
                  const videoViews = media.video_view_count ?? media.edge_media_preview_like?.count;
                  if (typeof videoViews === "number") {
                    data.viewCount = videoViews;
                  }
                  // Post date
                  const timestamp = media.taken_at_timestamp ?? media.edge_media_to_comment?.count;
                  if (typeof media.taken_at_timestamp === "number") {
                    data.postDate = new Date(media.taken_at_timestamp * 1000).toISOString();
                  }
                  // Duration
                  if (typeof media.video_duration === "number") {
                    data.durationSec = Math.round(media.video_duration);
                  }
                }
              }
            }
          } catch {}
        }

        // Look for JSON-LD or other structured data
        if (text.includes('"@type":"VideoObject"') || text.includes('"@type":"ImageObject"')) {
          try {
            const jsonLdMatch = text.match(/({\s*"@context"[\s\S]*?"@type"\s*:\s*"VideoObject"[\s\S]*?})\s*<\/script>/);
            if (jsonLdMatch) {
              const parsed = JSON.parse(jsonLdMatch[1]);
              if (parsed.description && !data.caption) data.caption = parsed.description;
              if (parsed.uploadDate && !data.postDate) data.postDate = parsed.uploadDate;
              if (parsed.duration && !data.durationSec) {
                // ISO 8601 duration like PT30S
                const durMatch = parsed.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (durMatch) {
                  data.durationSec = (parseInt(durMatch[1] || "0") * 3600) + (parseInt(durMatch[2] || "0") * 60) + parseInt(durMatch[3] || "0");
                }
              }
            }
          } catch {}
        }
      }

      return data;
    });

    result.caption = result.caption || jsonData.caption;
    result.viewCount = result.viewCount || jsonData.viewCount;
    result.postDate = result.postDate || jsonData.postDate;
    result.durationSec = result.durationSec || jsonData.durationSec;

    // Strategy B: Extract metadata from meta tags (server-rendered, reliable)
    const metaTags = await page.evaluate(() => {
      const data: { caption: string | null; viewCount: number | null; postDate: string | null; durationSec: number | null } = {
        caption: null,
        viewCount: null,
        postDate: null,
        durationSec: null,
      };

      // og:description often contains the caption
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
      if (ogDesc) {
        // Instagram og:description format: "Username · Caption" or just "Caption"
        const parts = ogDesc.split(" · ");
        data.caption = parts.length > 1 ? parts.slice(1).join(" · ") : ogDesc;
      }

      // og:title sometimes has view count info
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
      if (ogTitle) {
        const viewMatch = ogTitle.match(/(\d+(?:\.\d+)?[KMB]?)\s*views?/i);
        if (viewMatch) {
          const raw = viewMatch[1];
          const num = parseFloat(raw.replace(/[KMB]/i, ""));
          const suffix = raw.slice(-1).toUpperCase();
          if (suffix === "K") data.viewCount = Math.round(num * 1000);
          else if (suffix === "M") data.viewCount = Math.round(num * 1000000);
          else if (suffix === "B") data.viewCount = Math.round(num * 1000000000);
          else data.viewCount = num;
        }
      }

      // article:published_time
      const articleTime = document.querySelector('meta[property="article:published_time"]')?.getAttribute("content");
      if (articleTime) data.postDate = articleTime;

      // twitter:description as fallback for caption
      if (!data.caption) {
        const twitterDesc = document.querySelector('meta[name="twitter:description"]')?.getAttribute("content");
        if (twitterDesc) data.caption = twitterDesc;
      }

      return data;
    });

    result.caption = result.caption || metaTags.caption;
    result.viewCount = result.viewCount || metaTags.viewCount;
    result.postDate = result.postDate || metaTags.postDate;
    result.durationSec = result.durationSec || metaTags.durationSec;

    // Strategy C: Extract from page text content (fallback)
    const pageTextData = await page.evaluate(() => {
      const data: { viewCount: number | null; postDate: string | null; durationSec: number | null } = {
        viewCount: null,
        postDate: null,
        durationSec: null,
      };

      const bodyText = document.body.innerText;

      // View count patterns: "123.4K views", "1.2M views", "123K", "1.2M"
      const viewPatterns = [
        /(\d+(?:\.\d+)?[KMB]?)\s*views?/i,
        /(\d+(?:\.\d+)?[KMB])\s*plays?/i,
        /^(\d+(?:\.\d+)?[KMB])$/m,  // standalone number with K/M suffix
      ];
      for (const pattern of viewPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          const raw = match[1];
          const num = parseFloat(raw.replace(/[KMB]/i, ""));
          const suffix = raw.slice(-1).toUpperCase();
          if (suffix === "K") data.viewCount = Math.round(num * 1000);
          else if (suffix === "M") data.viewCount = Math.round(num * 1000000);
          else if (suffix === "B") data.viewCount = Math.round(num * 1000000000);
          else data.viewCount = num;
          break;
        }
      }

      // Time element
      const timeEl = document.querySelector("time");
      if (timeEl) {
        data.postDate = timeEl.getAttribute("datetime") ?? timeEl.textContent ?? null;
      }

      // Video duration
      const video = document.querySelector("video");
      if (video && video.duration && isFinite(video.duration)) {
        data.durationSec = Math.round(video.duration);
      }

      return data;
    });

    result.viewCount = result.viewCount || pageTextData.viewCount;
    result.postDate = result.postDate || pageTextData.postDate;
    result.durationSec = result.durationSec || pageTextData.durationSec;

    // Try captured API responses for video URL
    if (!result.videoUrl && capturedUrls.length > 0) {
      result.videoUrl = decodeIgUrl(capturedUrls[0]);
    }

    // Strategy 2: Search raw server HTML for video URLs
    if (!result.videoUrl && response) {
      const rawHtml = await response.text();
      const videoRe = /https?:[^"'\s<>]*?(?:cdninstagram|fbcdn\.net)[^"'\s<>]*\.mp4[^"'\s<>]*/g;
      const matches = rawHtml.match(videoRe);
      if (matches && matches.length > 0) {
        result.videoUrl = decodeIgUrl(matches[0]);
      }
    }

    // Strategy 3: Search embedded page state via evaluate
    if (!result.videoUrl) {
      const stateVideoUrl = await page.evaluate(() => {
        const igRe = /https?:[^"'\s<>]*?(?:cdninstagram|fbcdn\.net)[^"'\s<>]*\.mp4[^"'\s<>]*/;
        function search(obj: unknown, depth: number): string | null {
          if (depth > 10) return null;
          if (typeof obj === "string") {
            const match = obj.match(igRe);
            return match ? match[0] : null;
          }
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = search(item, depth + 1);
              if (found) return found;
            }
            return null;
          }
          if (obj && typeof obj === "object") {
            for (const val of Object.values(obj as Record<string, unknown>)) {
              const found = search(val, depth + 1);
              if (found) return found;
            }
            return null;
          }
          return null;
        }
        const stateKeys = ["__INITIAL_STATE__", "__PRELOADED_STATE__", "__NEXT_DATA__", "__remixContext"];
        for (const key of stateKeys) {
          try {
            const raw = (window as unknown as Record<string, unknown>)[key];
            if (!raw) continue;
            const data = typeof raw === "string" ? JSON.parse(raw) : raw;
            const found = search(data, 0);
            if (found) return found;
          } catch {}
        }
        return null;
      });
      if (stateVideoUrl) result.videoUrl = decodeIgUrl(stateVideoUrl);
    }

    // Strategy 4: Search the live DOM for CDN video URLs
    if (!result.videoUrl) {
      const pageContent = await page.content();
      const domRe = /https?:[^"'\s<>]*?(?:cdninstagram|fbcdn\.net)[^"'\s<>]*\.mp4[^"'\s<>]*/g;
      const domMatches = pageContent.match(domRe);
      if (domMatches && domMatches.length > 0) {
        result.videoUrl = decodeIgUrl(domMatches[0]);
      }
    }

    // Strategy 5: Try DOM video element
    if (!result.videoUrl) {
      const videoSrc = await page.evaluate(() => {
        const video = document.querySelector("video");
        if (video) {
          const src = video.querySelector("source")?.getAttribute("src") ?? video.getAttribute("src");
          if (src && !src.startsWith("blob:") && !src.startsWith("data:")) return src;
        }
        return null;
      });
      if (videoSrc) result.videoUrl = videoSrc;
    }

    if (!result.videoUrl) {
      console.warn(`All extraction strategies failed for ${reelUrl}`);
    }

    console.log(`Metadata for ${reelUrl}: caption=${!!result.caption}, views=${result.viewCount}, date=${!!result.postDate}, duration=${result.durationSec}`);

    return result;
  } catch (error) {
    console.warn(`extractReelData error for ${reelUrl}: ${error instanceof Error ? error.message : error}`);
    return result;
  } finally {
    await page.unroute("**/*", routeHandler);
  }
}

async function dismissDialogues(page: import("playwright").Page) {
  const buttons = [
    'button:has-text("Not now")',
    'div[role="button"]:has-text("Not now")',
    'div[role="button"]:has-text("Save info")',
    'button:has-text("Save Info")',
    'button:has-text("Later")',
  ];

  for (const selector of buttons) {
    try {
      const btn = await page.$(selector);
      if (btn && (await btn.isVisible())) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // element not found
    }
  }
}

async function detectOTP(page: import("playwright").Page): Promise<boolean> {
  const body = await page.evaluate(() => document.body.innerText);
  return (
    body.includes("Enter Confirmation Code") ||
    body.includes("confirm it") ||
    body.includes("confirmation code") ||
    body.includes("We sent a code") ||
    body.includes("challenge")
  );
}

function loadSavedSession(context: import("playwright").BrowserContext) {
  if (!existsSync(SESSION_FILE)) return false;
  try {
    const data = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
    if (data.cookies?.length) {
      context.addCookies(data.cookies);
      return true;
    }
  } catch {
    // corrupted file
  }
  return false;
}

async function saveSession(context: import("playwright").BrowserContext) {
  const cookies = await context.cookies();
  writeFileSync(SESSION_FILE, JSON.stringify({ cookies }), "utf-8");
}

export async function scrapeReels(targetUsername: string): Promise<ScrapedReel[]> {
  const { igUser, igPass } = await getCredentials();

  console.log(`Starting scrape for @${targetUsername}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const seen = new Set<string>();
  const reels: ScrapedReel[] = [];

  try {
    const hadSession = loadSavedSession(context);

    // Try navigating directly to reels — if session is valid we skip login
    await page.goto(`${IG_BASE}/${targetUsername}/reels/`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    const needsLogin = page.url().includes("accounts/login");

    if (needsLogin) {
      if (hadSession) {
        console.warn("Stored Instagram session expired, re-logging in.");
      }

      await page.goto(`${IG_BASE}/accounts/login/`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForSelector('input[name="username"], input[name="email"]', { timeout: 15000 });

      const hasUsername = await page.$('input[name="username"]');
      if (hasUsername) {
        await page.fill('input[name="username"]', igUser);
        await page.fill('input[name="password"]', igPass);
      } else {
        await page.fill('input[name="email"]', igUser);
        await page.fill('input[name="pass"]', igPass);
      }
      await page.getByRole("button", { name: "Log In", exact: true }).click();

      await page.waitForTimeout(3000);

      if (await detectOTP(page)) {
        throw new Error(
          "Instagram requires OTP verification. Please log in to instagram.com in a regular browser, complete the verification, and try again."
        );
      }

      await page.waitForURL((url) => !url.pathname.includes("/accounts/login/"), {
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
      await dismissDialogues(page);

      await saveSession(context);

      await page.goto(`${IG_BASE}/${targetUsername}/reels/`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);
    }

    await dismissDialogues(page);

    // Check if profile exists
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (
      bodyText.includes("Profile isn't available") ||
      bodyText.includes("This page isn't available") ||
      bodyText.includes("Sorry, this page")
    ) {
      throw new Error(`Instagram account @${targetUsername} does not exist or is private.`);
    }

    for (let scroll = 0; scroll < 15; scroll++) {
      const links = await page.$$eval('a[href*="/reel/"]', (els) =>
        els.map((el) => ({
          href: (el as HTMLAnchorElement).href,
          shortcode:
            (el as HTMLAnchorElement).href.split("/reel/")[1]?.replace(/\/$/, "") ?? "",
        }))
      );

      for (const link of links) {
        if (link.shortcode && !seen.has(link.shortcode)) {
          seen.add(link.shortcode);
          reels.push({
            shortcode: link.shortcode,
            url: `${IG_BASE}/reel/${link.shortcode}/`,
            thumbnailUrl: null,
            videoUrl: null,
            caption: null,
            viewCount: null,
            postDate: null,
            durationSec: null,
          });
        }
      }

      // Try to extract video URLs from visible video elements on the grid page
      const gridVideoUrls = await page.evaluate(() => {
        const results: Record<string, string> = {};
        const videos = document.querySelectorAll("video");
        for (const video of Array.from(videos)) {
          const src = video.querySelector("source")?.getAttribute("src") ?? video.getAttribute("src");
          if (src && !src.startsWith("blob:") && !src.startsWith("data:")) {
            const link = video.closest('a[href*="/reel/"]');
            if (link) {
              const shortcode = (link as HTMLAnchorElement).href.split("/reel/")[1]?.replace(/\/$/, "");
              if (shortcode) results[shortcode] = src;
            }
          }
        }
        return results;
      });

      for (const reel of reels) {
        if (!reel.videoUrl && gridVideoUrls[reel.shortcode]) {
          reel.videoUrl = gridVideoUrls[reel.shortcode];
        }
      }

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(2500);
    }

    if (reels.length === 0) {
      throw new Error(`No Reels found for @${targetUsername}. The account may have no Reels or is private.`);
    }

    // Extract video URLs and metadata from individual reel pages
    const maxVideos = Math.min(reels.length, parseInt(process.env.MAX_REELS_PER_ACCOUNT ?? "12", 10));
    for (let i = 0; i < maxVideos; i++) {
      const reel = reels[i];
      if (reel) {
        const data = await extractReelData(page, reel.url);
        if (!reel.videoUrl && data.videoUrl) {
          reel.videoUrl = data.videoUrl;
        }
        if (!reel.caption && data.caption) {
          reel.caption = data.caption;
        }
        if (!reel.viewCount && data.viewCount) {
          reel.viewCount = data.viewCount;
        }
        if (!reel.postDate && data.postDate) {
          reel.postDate = data.postDate;
        }
        if (!reel.durationSec && data.durationSec) {
          reel.durationSec = data.durationSec;
        }
        // If redirected to login, session is dead — bail out early
        if (page.url().includes("accounts/login")) {
          console.warn("Instagram session expired while extracting video URLs.");
          break;
        }
      }
    }
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await browser.close();
  }

  const withVideo = reels.filter((r) => r.videoUrl).length;
  console.log(`Scrape complete for @${targetUsername}: ${reels.length} reels found, ${withVideo} with video URLs`);

  return reels;
}
