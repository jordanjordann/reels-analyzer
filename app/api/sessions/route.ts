import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import { createSession, listSessions, validateUsername } from "@/server/sessions";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ sessions: await listSessions() });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { username?: unknown; title?: unknown } | null;

  if (!validateUsername(body?.username)) {
    return NextResponse.json({ error: "Enter a valid Instagram username." }, { status: 400 });
  }

  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : null;
  const session = await createSession(body.username, title);

  return NextResponse.json({ session }, { status: 201 });
}
