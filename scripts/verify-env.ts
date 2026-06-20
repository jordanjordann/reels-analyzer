import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Load .env file if it exists
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  }
}

import { readFileSync } from "node:fs";

type CheckResult = {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

const results: CheckResult[] = [];

function check(name: string, status: "pass" | "warn" | "fail", message: string) {
  results.push({ name, status, message });
  const icon = status === "pass" ? "✓" : status === "warn" ? "⚠" : "✗";
  console.log(`${icon} ${name}: ${message}`);
}

async function main() {
  console.log("🔍 Environment Verification\n");

  // 1. Environment variables
  const requiredEnvVars = [
    "TURSO_DATABASE_URL",
    "GEMINI_API_KEY",
    "INSTAGRAM_USERNAME",
    "INSTAGRAM_PASSWORD",
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value) {
      check(envVar, "fail", "Not set");
    } else {
      const masked = value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : "***";
      check(envVar, "pass", `Set (${masked})`);
    }
  }

  // Optional env vars
  const optionalEnvVars = [
    { name: "GEMINI_MODEL", default: "gemini-2.5-flash" },
    { name: "MAX_REELS_PER_ACCOUNT", default: "12" },
  ];

  for (const { name, default: defaultVal } of optionalEnvVars) {
    const value = process.env[name];
    if (!value) {
      check(name, "pass", `Not set (default: ${defaultVal})`);
    } else {
      check(name, "pass", `Set to: ${value}`);
    }
  }

  // 2. ffmpeg
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegPath = require("ffmpeg-static") as string;
    if (existsSync(ffmpegPath)) {
      const version = execSync(`"${ffmpegPath}" -version`, { encoding: "utf8" }).split("\n")[0];
      check("ffmpeg", "pass", version);
    } else {
      check("ffmpeg", "fail", `Binary not found at ${ffmpegPath}`);
    }
  } catch (e) {
    check("ffmpeg", "fail", `Not installed: ${e instanceof Error ? e.message : e}`);
  }

  // 3. yt-dlp
  try {
    const ytDlpPaths = [
      process.env.YTDLP_PATH,
      "/Users/jordanatha/.local/python/bin/yt-dlp",
      "/usr/local/bin/yt-dlp",
      "/opt/homebrew/bin/yt-dlp",
      "yt-dlp",
    ].filter(Boolean) as string[];

    let found = false;
    for (const path of ytDlpPaths) {
      try {
        const version = execSync(`"${path}" --version`, { encoding: "utf8", env: { ...process.env, PATH: `${process.env.PATH}:/Users/jordanatha/.local/python/bin` } }).trim();
        check("yt-dlp", "pass", `v${version} (${path})`);
        found = true;
        break;
      } catch {
        // try next path
      }
    }
    if (!found) {
      check("yt-dlp", "fail", "Not found in any known path");
    }
  } catch (e) {
    check("yt-dlp", "fail", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // 4. Python version
  try {
    const pythonPaths = [
      "/Users/jordanatha/.local/python/bin/python3",
      "/Users/jordanatha/.local/python/bin/python3.12",
      "python3",
      "python",
    ];

    let found = false;
    for (const path of pythonPaths) {
      try {
        const version = execSync(`"${path}" --version`, { encoding: "utf8" }).trim();
        const versionMatch = version.match(/Python (\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1], 10);
          const minor = parseInt(versionMatch[2], 10);
          if (major >= 3 && minor >= 10) {
            check("Python", "pass", `${version} (${path})`);
          } else {
            check("Python", "warn", `${version} — 3.10+ recommended (yt-dlp may warn about deprecation)`);
          }
          found = true;
          break;
        }
      } catch {
        // try next path
      }
    }
    if (!found) {
      check("Python", "fail", "Not found");
    }
  } catch (e) {
    check("Python", "fail", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // 5. Database connectivity
  try {
    const { db } = await import("../lib/shared/db");
    const result = await db.execute("SELECT 1 as test");
    if (result.rows.length > 0 && result.rows[0].test === 1) {
      check("Database", "pass", "Connected");
    } else {
      check("Database", "fail", "Query returned unexpected result");
    }
    db.close();
  } catch (e) {
    check("Database", "fail", `Connection failed: ${e instanceof Error ? e.message : e}`);
  }

  // 6. Playwright browsers
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    check("Playwright", "pass", "Chromium available");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Executable doesn't exist")) {
      check("Playwright", "fail", "Browsers not installed. Run: npx playwright install chromium");
    } else {
      check("Playwright", "fail", `Error: ${msg}`);
    }
  }

  // 7. Temp directory
  const tempDir = join(tmpdir(), "reels-analyzer");
  if (existsSync(tempDir)) {
    check("Temp directory", "pass", tempDir);
  } else {
    check("Temp directory", "warn", `Does not exist yet (will be created on first run): ${tempDir}`);
  }

  // Summary
  console.log("\n---");
  const passes = results.filter((r) => r.status === "pass").length;
  const warns = results.filter((r) => r.status === "warn").length;
  const fails = results.filter((r) => r.status === "fail").length;
  console.log(`${passes} passed, ${warns} warnings, ${fails} failed`);

  if (fails > 0) {
    console.log("\n❌ Environment has issues that must be resolved before running.");
    process.exit(1);
  } else if (warns > 0) {
    console.log("\n⚠️  Environment has warnings. The app should work, but consider addressing them.");
  } else {
    console.log("\n✅ Environment looks good!");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
