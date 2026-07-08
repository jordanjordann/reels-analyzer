import { NextResponse } from "next/server";

import { isAuthenticated } from "@/server/auth";
import {
  getAllMemories,
  updateMemoryValue,
  deleteMemory,
  clearMemories,
  summarizeMemoryValue,
} from "@/server/talents/content-memory";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/talents/[id]/memories">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const memories = await getAllMemories(id);

  return NextResponse.json({ memories });
}

export async function PUT(request: Request, context: RouteContext<"/api/talents/[id]/memories">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const { category, key, value } = body as { category: string; key: string; value: string };

  if (!category || !key || !value) {
    return NextResponse.json({ error: "category, key, and value are required" }, { status: 400 });
  }

  const summarized = await summarizeMemoryValue(value);

  await updateMemoryValue(id, category, key, summarized);

  return NextResponse.json({ success: true, value: summarized });
}

export async function DELETE(request: Request, context: RouteContext<"/api/talents/[id]/memories">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all");

  if (all === "true") {
    await clearMemories(id);
    return NextResponse.json({ success: true });
  }

  const body = await request.json().catch(() => ({}));
  const { category, key } = body as { category?: string; key?: string };

  if (!category || !key) {
    return NextResponse.json({ error: "category and key are required" }, { status: 400 });
  }

  await deleteMemory(id, category, key);

  return NextResponse.json({ success: true });
}
