import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { analyzeTalent } from "@/server/talents/analyzer";
import { parseProfileAnalysis } from "@/analysis/profile-types";
import type { ProfileAnalysis } from "@/analysis/profile-types";

export const runtime = "nodejs";

type TalentRow = {
  id: string;
  instagram_username: string;
  name: string;
  gender: string;
  notes: string;
  overall_score: number | null;
  analysis_content: string | null;
  analysis_raw_gemini: string | null;
  analysis_user_prompt: string | null;
  analysis_reel_count: number;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToDetail(row: Record<string, unknown>) {
  const analysisContent = typeof row.analysis_content === "string" ? row.analysis_content : null;
  const parsedAnalysis = analysisContent ? parseProfileAnalysis(analysisContent) : null;

  return {
    id: String(row.id),
    instagramUsername: String(row.instagram_username),
    name: String(row.name),
    gender: String(row.gender),
    notes: typeof row.notes === "string" ? row.notes : "",
    overallScore: typeof row.overall_score === "number" ? row.overall_score : null,
    analysisContent: analysisContent,
    analysis: parsedAnalysis,
    analysisReelCount: typeof row.analysis_reel_count === "number" ? row.analysis_reel_count : 0,
    lastAnalyzedAt: typeof row.last_analyzed_at === "string" ? row.last_analyzed_at : null,
    createdAt: String(row.created_at),
  };
}

export async function GET(_request: Request, context: RouteContext<"/api/talents/[id]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const result = await db.execute({
    sql: "SELECT * FROM talents WHERE id = ? LIMIT 1",
    args: [id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ talent: null });
  }

  return NextResponse.json({ talent: rowToDetail(result.rows[0] as Record<string, unknown>) });
}

export async function POST(_request: Request, context: RouteContext<"/api/talents/[id]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const existing = await db.execute({
    sql: "SELECT * FROM talents WHERE id = ? LIMIT 1",
    args: [id],
  });

  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Talent not found" }, { status: 404 });
  }

  const row = existing.rows[0] as Record<string, unknown>;

  try {
    const { analysis, reelCount } = await analyzeTalent(
      String(row.instagram_username),
      String(row.gender),
      typeof row.notes === "string" ? row.notes : "",
    );

    await db.execute({
      sql: `
        UPDATE talents
        SET
          overall_score = ?,
          analysis_content = ?,
          analysis_reel_count = ?,
          last_analyzed_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ?
      `,
      args: [analysis.overallViralIntelligenceScore, JSON.stringify(analysis), reelCount, id],
    });

    const updated = await db.execute({
      sql: "SELECT * FROM talents WHERE id = ? LIMIT 1",
      args: [id],
    });

    return NextResponse.json({ talent: rowToDetail(updated.rows[0] as Record<string, unknown>) });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/talents/[id]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const existing = await db.execute({
    sql: "SELECT id FROM talents WHERE id = ? LIMIT 1",
    args: [id],
  });

  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Talent not found" }, { status: 404 });
  }

  await db.execute({
    sql: "DELETE FROM talents WHERE id = ?",
    args: [id],
  });

  return NextResponse.json({ success: true });
}
