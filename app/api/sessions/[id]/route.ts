import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { deleteSession, getSession } from "@/lib/sessions";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/sessions/[id]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const session = await getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/sessions/[id]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteSession(id);

  if (!deleted) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
