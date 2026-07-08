import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { db } from "@/shared/db";
import { analyzeTalent } from "@/server/talents/analyzer";
import { normalizeUsername } from "@/server/sessions";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.execute(`
    SELECT
      id,
      instagram_username,
      name,
      gender,
      notes,
      overall_score,
      last_analyzed_at
    FROM talents
    ORDER BY created_at DESC
  `);

  const talents = result.rows.map((row) => ({
    id: String(row.id),
    instagramUsername: String(row.instagram_username),
    name: String(row.name),
    gender: String(row.gender),
    notes: typeof row.notes === "string" ? row.notes : "",
    overallScore: typeof row.overall_score === "number" ? row.overall_score : null,
    lastAnalyzedAt: typeof row.last_analyzed_at === "string" ? row.last_analyzed_at : null,
  }));

  return NextResponse.json({ talents });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const instagramUsername = typeof body.instagramUsername === "string" ? normalizeUsername(body.instagramUsername) : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const gender = typeof body.gender === "string" ? body.gender.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!instagramUsername || !name || !gender) {
    return NextResponse.json(
      { error: "instagramUsername, name, and gender are required" },
      { status: 400 },
    );
  }

  if (!["male", "female", "other"].includes(gender)) {
    return NextResponse.json(
      { error: "gender must be male, female, or other" },
      { status: 400 },
    );
  }

  const existing = await db.execute({
    sql: "SELECT id FROM talents WHERE instagram_username = ? LIMIT 1",
    args: [instagramUsername],
  });

  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: `Talent @${instagramUsername} already exists` },
      { status: 409 },
    );
  }

  const id = randomUUID();

  await db.execute({
    sql: `
      INSERT INTO talents (id, instagram_username, name, gender, notes)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [id, instagramUsername, name, gender, notes],
  });

  try {
    const { analysis, reelCount } = await analyzeTalent(instagramUsername, gender, notes);

    await db.execute({
      sql: `
        UPDATE talents
        SET
          overall_score = ?,
          analysis_content = ?,
          analysis_reel_count = ?,
          last_analyzed_at = (strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z'),
          updated_at = (strftime('%Y-%m-%dT%H:%M:%S', 'now') || 'Z')
        WHERE id = ?
      `,
      args: [analysis.overallViralIntelligenceScore, JSON.stringify(analysis), reelCount, id],
    });

    return NextResponse.json({
      talent: {
        id,
        instagramUsername,
        name,
        gender,
        notes,
        overallScore: analysis.overallViralIntelligenceScore,
        analysisContent: JSON.stringify(analysis),
        analysisReelCount: reelCount,
        lastAnalyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    await db.execute({
      sql: "DELETE FROM talents WHERE id = ?",
      args: [id],
    });

    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
