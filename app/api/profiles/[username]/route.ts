import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { generateProfileAnalysis } from "@/server/analysis/profile-analysis";
import { parseProfileAnalysis } from "@/analysis/profile-types";
import type { ProfileAnalysis } from "@/analysis/profile-types";
import { normalizeUsername } from "@/server/sessions";

export const runtime = "nodejs";

async function getProfileAnalysisFromDB(username: string): Promise<{
  profile: (ProfileAnalysis & { reelCount: number; updatedAt: string }) | null;
}> {
  const result = await db.execute({
    sql: `
      SELECT content, raw_gemini, user_prompt, reel_count, updated_at
      FROM profile_analyses
      WHERE username = ?
      LIMIT 1
    `,
    args: [username],
  });

  if (result.rows.length === 0) {
    return { profile: null };
  }

  const row = result.rows[0];
  const content = String(row.content);
  const parsed = parseProfileAnalysis(content);

  if (!parsed) {
    return { profile: null };
  }

  return {
    profile: {
      ...parsed,
      reelCount: Number(row.reel_count),
      updatedAt: String(row.updated_at),
    },
  };
}

async function getProfileMetadata(username: string) {
  const result = await db.execute({
    sql: "SELECT follower_count, following_count, post_count, reel_count, session_count, last_analyzed_at FROM profiles WHERE username = ? LIMIT 1",
    args: [username],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    followerCount: typeof row.follower_count === "number" ? row.follower_count : null,
    followingCount: typeof row.following_count === "number" ? row.following_count : null,
    postCount: typeof row.post_count === "number" ? row.post_count : null,
    reelCount: Number(row.reel_count),
    sessionCount: Number(row.session_count),
    lastAnalyzedAt: typeof row.last_analyzed_at === "string" ? row.last_analyzed_at : null,
  };
}

export async function GET(_request: Request, context: RouteContext<"/api/profiles/[username]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username: rawUsername } = await context.params;
  const username = normalizeUsername(rawUsername);

  const [metadata, analysisResult] = await Promise.all([
    getProfileMetadata(username),
    getProfileAnalysisFromDB(username),
  ]);

  if (!metadata) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({
    profile: {
      metadata,
      analysis: analysisResult.profile,
    },
  });
}

export async function POST(_request: Request, context: RouteContext<"/api/profiles/[username]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username: rawUsername } = await context.params;
  const username = normalizeUsername(rawUsername);

  try {
    await generateProfileAnalysis(username);
    const [metadata, analysisResult] = await Promise.all([
      getProfileMetadata(username),
      getProfileAnalysisFromDB(username),
    ]);

    if (!metadata) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
      profile: {
        metadata,
        analysis: analysisResult.profile,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
