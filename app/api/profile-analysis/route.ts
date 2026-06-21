import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { generateProfileAnalysis } from "@/server/analysis/profile-analysis";
import { parseProfileAnalysis } from "@/shared/analysis/profile-types";
import type { ProfileAnalysis } from "@/shared/analysis/profile-types";

export const runtime = "nodejs";

export type ProfileAnalysisResponse = {
  profile: (ProfileAnalysis & { reelCount: number; updatedAt: string }) | null;
};

async function getProfileAnalysisFromDB(username: string): Promise<ProfileAnalysisResponse> {
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

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Missing username parameter." }, { status: 400 });
  }

  const response = await getProfileAnalysisFromDB(username.toLowerCase().replace(/^@+/, ""));
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Missing username parameter." }, { status: 400 });
  }

  const normalized = username.toLowerCase().replace(/^@+/, "");

  try {
    await generateProfileAnalysis(normalized);
    const response = await getProfileAnalysisFromDB(normalized);
    return NextResponse.json(response);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
