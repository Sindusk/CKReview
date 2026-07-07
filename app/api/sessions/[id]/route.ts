// app/api/sessions/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { readSession, writeSession } from "@/lib/session-store";
import type { SavedSession } from "@/types/Session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await readSession(id);
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ id, session });
  } catch {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const existing = await readSession(id).catch(() => null);

  const session: SavedSession = {
    createdAt:    existing?.createdAt ?? Date.now(),
    reportUrl:    typeof body.reportUrl === "string" ? body.reportUrl : "",
    vods:         Array.isArray(body.vods) ? body.vods : [],
    wipeCalls:    body.wipeCalls && typeof body.wipeCalls === "object" ? body.wipeCalls : {},
    manualErrors: body.manualErrors && typeof body.manualErrors === "object" ? body.manualErrors : {},
  };

  await writeSession(id, session);

  return NextResponse.json({ id, session });
}