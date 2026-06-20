import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext } from "playwright";

import { IG_BASE } from "./constants";

const SESSION_FILE = join(tmpdir(), "opencode-ig-session.json");

async function getCredentials() {
  const igUser = process.env.INSTAGRAM_USERNAME;
  const igPass = process.env.INSTAGRAM_PASSWORD;
  if (!igUser || !igPass) {
    throw new Error("INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD environment variables must be set.");
  }
  return { igUser, igPass };
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

export async function initBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
}

export async function loadOrCreateContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  if (existsSync(SESSION_FILE)) {
    try {
      const data = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
      if (data.cookies?.length) {
        context.addCookies(data.cookies);
        return context;
      }
    } catch {
      // corrupted file, proceed with login
    }
  }

  await login(context);
  return context;
}

export async function login(context: BrowserContext): Promise<void> {
  const { igUser, igPass } = await getCredentials();
  const page = await context.newPage();

  try {
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
    await saveCookies(context);
  } finally {
    await page.close();
  }
}

export async function saveCookies(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  writeFileSync(SESSION_FILE, JSON.stringify({ cookies }), "utf-8");
}

export async function closeBrowser(browser: Browser): Promise<void> {
  await browser.close();
}
