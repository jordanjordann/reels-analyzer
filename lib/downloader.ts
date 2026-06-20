import { execFile } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath = require("ffmpeg-static") as string;

const execFileAsync = promisify(execFile);

const DOWNLOAD_DIR = join(tmpdir(), "reels-analyzer");
const YTDLP_PATHS = [
  process.env.YTDLP_PATH,
  "/Users/jordanatha/.local/python/bin/yt-dlp",
  "/usr/local/bin/yt-dlp",
  "/opt/homebrew/bin/yt-dlp",
  "/Users/jordanatha/Library/Python/3.9/bin/yt-dlp",
  "yt-dlp",
].filter(Boolean) as string[];

function findYtDlp(): string {
  for (const path of YTDLP_PATHS) {
    if (!path) continue;
    try {
      if (path.includes("/") && existsSync(path)) {
        return path;
      } else if (!path.includes("/")) {
        // Try to resolve from PATH
        return path;
      }
    } catch {
      // continue
    }
  }
  throw new Error(
    "yt-dlp not found. Install it via: pip3 install yt-dlp or brew install yt-dlp"
  );
}

export type DownloadResult = {
  filePath: string;
  durationSec: number | null;
  fileSize: number;
};

export async function downloadVideo(
  url: string,
  options?: { cookieFile?: string; maxRetries?: number }
): Promise<DownloadResult | null> {
  const ytdlp = findYtDlp();
  const maxRetries = options?.maxRetries ?? 2;

  if (!existsSync(DOWNLOAD_DIR)) {
    mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const outputPath = join(DOWNLOAD_DIR, `reel-${randomUUID()}.mp4`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const args = [
        "--no-playlist",
        "--format", "mp4",
        "--output", outputPath,
        "--no-warnings",
        "--socket-timeout", "30",
        "--retries", "3",
        "--fragment-retries", "3",
      ];

      if (options?.cookieFile) {
        args.push("--cookies", options.cookieFile);
      }

      // For Instagram URLs, add specific options
      if (url.includes("instagram.com")) {
        args.push("--extractor-args", "instagram:api_timeout=30000");
      }

      args.push(url);

      const { stderr } = await execFileAsync(ytdlp, args, {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          PATH: `${process.env.PATH}:/Users/jordanatha/.local/python/bin`,
          FFMPEG: ffmpegPath,
        },
      });

      if (stderr && !stderr.includes("WARNING")) {
        console.warn(`yt-dlp stderr: ${stderr}`);
      }

      if (!existsSync(outputPath)) {
        console.warn(`yt-dlp completed but output file not found: ${outputPath}`);
        continue;
      }

      const stats = statSync(outputPath);
      if (stats.size === 0) {
        console.warn(`yt-dlp produced empty file for ${url}`);
        continue;
      }

      // Try to extract duration from yt-dlp output
      let durationSec: number | null = null;
      const durationMatch = stderr.match(/Duration: (\d+)/);
      if (durationMatch) {
        durationSec = parseInt(durationMatch[1], 10);
      }

      return {
        filePath: outputPath,
        durationSec,
        fileSize: stats.size,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`yt-dlp attempt ${attempt}/${maxRetries} failed for ${url}: ${msg}`);

      if (attempt === maxRetries) {
        return null;
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }

  return null;
}

export async function cleanupFile(filePath: string): Promise<void> {
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(filePath);
  } catch {
    // File may already be deleted
  }
}

export async function extractVideoUrl(
  url: string,
  options?: { cookieFile?: string }
): Promise<string | null> {
  const ytdlp = findYtDlp();

  try {
    const args = [
      "--no-download",
      "--print", "url",
      "--socket-timeout", "15",
      "--retries", "2",
    ];

    if (options?.cookieFile) {
      args.push("--cookies", options.cookieFile);
    }

    args.push(url);

    const { stdout, stderr } = await execFileAsync(ytdlp, args, {
      timeout: 30000,
      maxBuffer: 5 * 1024 * 1024,
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/Users/jordanatha/.local/python/bin`,
        FFMPEG: ffmpegPath,
      },
    });

    if (stderr) {
      console.warn(`yt-dlp extract stderr: ${stderr}`);
    }

    const extractedUrl = stdout.trim();
    if (extractedUrl && extractedUrl.startsWith("http")) {
      return extractedUrl;
    }

    return null;
  } catch (error) {
    console.warn(`yt-dlp URL extraction failed for ${url}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}
