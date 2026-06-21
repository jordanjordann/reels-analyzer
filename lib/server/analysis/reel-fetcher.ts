import { type BrowserContext, type Page } from "playwright";

import { extractVideoUrl as extractVideoUrlYtDlp } from "./downloader";
import { MAX_CONCURRENT_REELS, IG_BASE } from "./constants";

export interface ReelMetadata {
  url: string;
  shortcode: string;
  username: string;
  caption: string | null;
  viewCount: number | null;
  postDate: string | null;
  durationSec: number | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  followerCount: number | null;
}

export interface FailedReel {
  url: string;
  index: number;
  error: string;
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

function extractShortcode(url: string): string {
  const match = url.match(/\/reel\/([\w-]+)/);
  return match ? match[1] : "";
}

async function extractMetadata(page: Page): Promise<{
  username: string;
  caption: string | null;
  viewCount: number | null;
  postDate: string | null;
  durationSec: number | null;
  thumbnailUrl: string | null;
  followerCount: number | null;
}> {
  const result = {
    username: "",
    caption: null as string | null,
    viewCount: null as number | null,
    postDate: null as string | null,
    durationSec: null as number | null,
    thumbnailUrl: null as string | null,
    followerCount: null as number | null,
  };

  if (page.url().includes("accounts/login")) {
    throw new Error("Redirected to Instagram login page. Session may be expired.");
  }

  const bodyText = await page.evaluate(() => document.body.innerText);
  if (
    bodyText.includes("Profile isn't available") ||
    bodyText.includes("This page isn't available") ||
    bodyText.includes("Sorry, this page")
  ) {
    throw new Error("Reel not found or account is private.");
  }

  const jsonData = await page.evaluate(() => {
    const data = {
      username: "",
      caption: null as string | null,
      viewCount: null as number | null,
      postDate: null as string | null,
      durationSec: null as number | null,
      thumbnailUrl: null as string | null,
      followerCount: null as number | null,
    };

    const scripts = document.querySelectorAll("script");
    for (const script of Array.from(scripts)) {
      const text = script.textContent || "";
      if (text.includes("edge_media_to_caption") || text.includes("shortcode_media")) {
        try {
          const jsonMatch = text.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});\s*$/m) ||
                           text.match(/window\._sharedData\s*=\s*({.+?});\s*$/m);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1]);
            const entryData = parsed.entry_data?.PostPage?.[0] || parsed.entry_data?.ReelsMedia?.[0];
            if (entryData) {
              const media = entryData.graphql?.shortcode_media || entryData.graphql?.reels_media?.[0];
              if (media) {
                data.username = media.owner?.username || "";
                const captionEdges = media.edge_media_to_caption?.edges;
                if (captionEdges?.[0]?.node?.text) {
                  data.caption = captionEdges[0].node.text;
                }
                if (typeof media.video_view_count === "number") {
                  data.viewCount = media.video_view_count;
                }
                if (typeof media.taken_at_timestamp === "number") {
                  data.postDate = new Date(media.taken_at_timestamp * 1000).toISOString();
                }
                if (typeof media.video_duration === "number") {
                  data.durationSec = Math.round(media.video_duration);
                }
                if (media.display_url) {
                  data.thumbnailUrl = media.display_url;
                }
                if (typeof media.owner?.edge_followed_by?.count === "number") {
                  data.followerCount = media.owner.edge_followed_by.count;
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

  result.username = result.username || jsonData.username;
  result.caption = result.caption || jsonData.caption;
  result.viewCount = result.viewCount || jsonData.viewCount;
  result.postDate = result.postDate || jsonData.postDate;
  result.durationSec = result.durationSec || jsonData.durationSec;
  result.thumbnailUrl = result.thumbnailUrl || jsonData.thumbnailUrl;
  result.followerCount = result.followerCount || jsonData.followerCount;

  const metaTags = await page.evaluate(() => {
    const data = {
      username: "",
      caption: null as string | null,
      viewCount: null as number | null,
      postDate: null as string | null,
      thumbnailUrl: null as string | null,
    };

    // Strategy 1: og:description split by " · "
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
    if (ogDesc) {
      const parts = ogDesc.split(" · ");
      if (parts.length > 1) {
        data.username = parts[0];
        data.caption = parts.slice(1).join(" · ");
      } else {
        data.caption = ogDesc;
      }
    }

    // Strategy 2: og:url contains /username/reel/...
    if (!data.username) {
      const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
      if (ogUrl) {
        const match = ogUrl.match(/instagram\.com\/([^/]+)\/reel\//);
        if (match) data.username = match[1];
      }
    }

    // Strategy 3: canonical link contains /username/reel/...
    if (!data.username) {
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
      if (canonical) {
        const match = canonical.match(/instagram\.com\/([^/]+)\/reel\//);
        if (match) data.username = match[1];
      }
    }

    // Strategy 4: article:author meta tag
    if (!data.username) {
      const articleAuthor = document.querySelector('meta[property="article:author"]')?.getAttribute("content");
      if (articleAuthor) {
        // Could be a URL or @username
        const match = articleAuthor.match(/instagram\.com\/([^/]+)/) || articleAuthor.match(/^@?(.+)$/);
        if (match) data.username = match[1].replace(/^@/, "");
      }
    }

    // Strategy 5: profile:username meta tag
    if (!data.username) {
      const profileUsername = document.querySelector('meta[property="profile:username"]')?.getAttribute("content");
      if (profileUsername) data.username = profileUsername;
    }

    // Strategy 6: document.title often contains "@username on Instagram"
    if (!data.username) {
      const title = document.title;
      const match = title.match(/^(@?\w+)\s+on\s+Instagram/i) || title.match(/^(@?\w+)\s*[:•·]/i);
      if (match) data.username = match[1].replace(/^@/, "");
    }

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

    const articleTime = document.querySelector('meta[property="article:published_time"]')?.getAttribute("content");
    if (articleTime) data.postDate = articleTime;

    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (ogImage) data.thumbnailUrl = ogImage;

    return data;
  });

  result.username = result.username || metaTags.username;
  result.caption = result.caption || metaTags.caption;
  result.viewCount = result.viewCount || metaTags.viewCount;
  result.postDate = result.postDate || metaTags.postDate;
  result.thumbnailUrl = result.thumbnailUrl || metaTags.thumbnailUrl;

  const pageTextData = await page.evaluate(() => {
    const data = {
      username: "",
      viewCount: null as number | null,
      postDate: null as string | null,
      durationSec: null as number | null,
    };

    const bodyText = document.body.innerText;

    // Try to extract username from body text patterns like "@username" near the top
    const usernameMatch = bodyText.match(/^(@?\w+)/m) || bodyText.match(/Instagram\s+post[:\s]+(@?\w+)/i);
    if (usernameMatch) data.username = usernameMatch[1].replace(/^@/, "");

    const viewPatterns = [
      /(\d+(?:\.\d+)?[KMB]?)\s*views?/i,
      /(\d+(?:\.\d+)?[KMB])\s*plays?/i,
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

    const timeEl = document.querySelector("time");
    if (timeEl) {
      data.postDate = timeEl.getAttribute("datetime") ?? timeEl.textContent ?? null;
    }

    const video = document.querySelector("video");
    if (video && video.duration && isFinite(video.duration)) {
      data.durationSec = Math.round(video.duration);
    }

    return data;
  });

  result.username = result.username || pageTextData.username;
  result.viewCount = result.viewCount || pageTextData.viewCount;
  result.postDate = result.postDate || pageTextData.postDate;
  result.durationSec = result.durationSec || pageTextData.durationSec;

  if (!result.username) {
    throw new Error("Could not extract username from reel page.");
  }

  return result;
}

async function extractVideoUrl(page: Page, reelUrl: string): Promise<string | null> {
  try {
    const ytDlpUrl = await extractVideoUrlYtDlp(reelUrl);
    if (ytDlpUrl) return ytDlpUrl;
  } catch (error) {
    console.warn(`yt-dlp extraction failed for ${reelUrl}: ${error instanceof Error ? error.message : error}`);
  }

  const capturedUrls: string[] = [];
  const routeHandler = async (route: import("playwright").Route) => {
    const requestUrl = route.request().url();
    if (requestUrl.includes("/graphql") || requestUrl.includes("/reels") || requestUrl.includes("/reel")) {
      route.continue();
      route.fetch().then(async (response) => {
        try {
          const body = await response.text();
          const re = /https?:[^"'\s<>]*?(?:cdninstagram|fbcdn\.net)[^"'\s<>]*\.mp4[^"'\s<>]*/g;
          const matches = body.match(re);
          if (matches) capturedUrls.push(...matches);
        } catch {
          // continue
        }
      }).catch(() => {});
    } else {
      route.continue();
    }
  };
  await page.route("**/*", routeHandler);

  try {
    const response = await page.goto(reelUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    if (capturedUrls.length > 0) {
      return decodeIgUrl(capturedUrls[0]);
    }

    if (response) {
      const rawHtml = await response.text();
      const videoRe = /https?:[^"'\s<>]*?(?:cdninstagram|fbcdn\.net)[^"'\s<>]*\.mp4[^"'\s<>]*/g;
      const matches = rawHtml.match(videoRe);
      if (matches?.length) return decodeIgUrl(matches[0]);
    }

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
        } catch {
          // continue
        }
      }
      return null;
    });
    if (stateVideoUrl) return decodeIgUrl(stateVideoUrl);

    const pageContent = await page.content();
    const domRe = /https?:[^"'\s<>]*?(?:cdninstagram|fbcdn\.net)[^"'\s<>]*\.mp4[^"'\s<>]*/g;
    const domMatches = pageContent.match(domRe);
    if (domMatches?.length) return decodeIgUrl(domMatches[0]);

    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector("video");
      if (video) {
        const src = video.querySelector("source")?.getAttribute("src") ?? video.getAttribute("src");
        if (src && !src.startsWith("blob:") && !src.startsWith("data:")) return src;
      }
      return null;
    });
    if (videoSrc) return videoSrc;

    return null;
  } finally {
    await page.unroute("**/*", routeHandler);
  }
}

export interface ProfileData {
  username: string;
  followerCount: number | null;
  followingCount: number | null;
  postCount: number | null;
}

async function extractProfileData(page: Page): Promise<ProfileData> {
  const result = {
    username: "",
    followerCount: null as number | null,
    followingCount: null as number | null,
    postCount: null as number | null,
  };

  const bodyText = await page.evaluate(() => document.body.innerText);
  if (
    bodyText.includes("Profile isn't available") ||
    bodyText.includes("This page isn't available") ||
    bodyText.includes("Sorry, this page") ||
    bodyText.includes("No posts yet")
  ) {
    throw new Error("Profile not found or account is private.");
  }

  const ogDesc = await page.evaluate(() => {
    return document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
  });

  if (ogDesc) {
    const followersMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Followers?/i);
    const followingMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Following/i);
    const postsMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Posts?/i);

    if (followersMatch) result.followerCount = parseCountString(followersMatch[1]);
    if (followingMatch) result.followingCount = parseCountString(followingMatch[1]);
    if (postsMatch) result.postCount = parseCountString(postsMatch[1]);
  }

  if (result.followerCount == null || result.followingCount == null || result.postCount == null) {
    const followersMatch = bodyText.match(/([\d,.]+[KMB]?)\s*followers?/i);
    const followingMatch = bodyText.match(/([\d,.]+[KMB]?)\s*following/i);
    const postsMatch = bodyText.match(/([\d,.]+[KMB]?)\s*posts?/i);

    if (followersMatch && result.followerCount == null) result.followerCount = parseCountString(followersMatch[1]);
    if (followingMatch && result.followingCount == null) result.followingCount = parseCountString(followingMatch[1]);
    if (postsMatch && result.postCount == null) result.postCount = parseCountString(postsMatch[1]);
  }

  const metaUsername = await page.evaluate(() => {
    return document.querySelector('meta[property="profile:username"]')?.getAttribute("content") || "";
  });
  result.username = metaUsername;

  if (!result.username) {
    const urlMatch = page.url().match(/instagram\.com\/([^/?#]+)/);
    if (urlMatch) result.username = urlMatch[1];
  }

  return result;
}

function parseCountString(str: string): number {
  const cleaned = str.replace(/,/g, "");
  const num = parseFloat(cleaned);
  const suffix = cleaned.slice(-1).toUpperCase();
  if (suffix === "K") return Math.round(num * 1000);
  if (suffix === "M") return Math.round(num * 1000000);
  if (suffix === "B") return Math.round(num * 1000000000);
  return num;
}

export async function fetchUserProfile(username: string, context: BrowserContext): Promise<ProfileData> {
  const page = await context.newPage();
  try {
    const profileUrl = `${IG_BASE}/${username}`;
    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    const profileData = await extractProfileData(page);

    if (!profileData.username) {
      throw new Error("Could not extract username from profile page.");
    }

    return profileData;
  } finally {
    await page.close();
  }
}

export async function visitReelPage(url: string, context: BrowserContext): Promise<ReelMetadata> {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const metadata = await extractMetadata(page);
    const videoUrl = await extractVideoUrl(page, url);

    return {
      url,
      shortcode: extractShortcode(url),
      username: metadata.username,
      caption: metadata.caption,
      viewCount: metadata.viewCount,
      postDate: metadata.postDate,
      durationSec: metadata.durationSec,
      thumbnailUrl: metadata.thumbnailUrl,
      videoUrl,
      followerCount: metadata.followerCount,
    };
  } finally {
    await page.close();
  }
}

export async function fetchAllReels(
  urls: string[],
  context: BrowserContext,
): Promise<{ success: ReelMetadata[]; failed: FailedReel[] }> {
  const success: ReelMetadata[] = [];
  const failed: FailedReel[] = [];
  let expectedUsername = "";

  const processReel = async (url: string, index: number): Promise<void> => {
    try {
      const metadata = await visitReelPage(url, context);

      if (!expectedUsername) {
        expectedUsername = metadata.username;
      } else if (metadata.username !== expectedUsername) {
        failed.push({
          url,
          index,
          error: `Belongs to @${metadata.username}, expected @${expectedUsername}`,
        });
        return;
      }

      success.push(metadata);
    } catch (error) {
      failed.push({
        url,
        index,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  for (let i = 0; i < urls.length; i += MAX_CONCURRENT_REELS) {
    const batch = urls.slice(i, i + MAX_CONCURRENT_REELS);
    await Promise.all(batch.map((url, idx) => processReel(url, i + idx + 1)));
  }

  return { success, failed };
}
