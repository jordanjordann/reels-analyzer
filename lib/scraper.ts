import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const IG_BASE = "https://www.instagram.com";
const SESSION_FILE = join(tmpdir(), "opencode-ig-session.json");

export type ScrapedReel = {
  shortcode: string;
  url: string;
  thumbnailUrl: string | null;
};

async function getCredentials() {
  const igUser = process.env.INSTAGRAM_USERNAME;
  const igPass = process.env.INSTAGRAM_PASSWORD;

  if (!igUser || !igPass) {
    throw new Error("INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD environment variables must be set.");
  }

  return { igUser, igPass };
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

function saveSession(context: import("playwright").BrowserContext) {
  context.cookies().then((cookies) => {
    writeFileSync(SESSION_FILE, JSON.stringify({ cookies }), "utf-8");
  });
}

export async function scrapeReels(targetUsername: string): Promise<ScrapedReel[]> {
  const { igUser, igPass } = await getCredentials();

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
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const needsLogin = page.url().includes("accounts/login");

    if (needsLogin) {
      if (hadSession) {
        console.warn("Stored Instagram session expired, re-logging in.");
      }

      await page.goto(`${IG_BASE}/accounts/login/`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await page.waitForSelector('input[name="email"]', { timeout: 15000 });

      await page.fill('input[name="email"]', igUser);
      await page.fill('input[name="pass"]', igPass);
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

      saveSession(context);

      await page.goto(`${IG_BASE}/${targetUsername}/reels/`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
    }

    await page.waitForTimeout(3000);
    await dismissDialogues(page);

    // Check if profile exists
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (
      bodyText.includes("Profile isn't available") ||
      bodyText.includes("This page isn't available") ||
      bodyText.includes("Sorry, this page")
    ) {
      return reels;
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
          });
        }
      }

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(2500);
    }
  } finally {
    await browser.close();
  }

  return reels;
}
