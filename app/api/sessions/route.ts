// app/api/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { writeSession, generateSessionId } from "@/lib/session-store";
import type { SavedSession } from "@/types/Session";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const session: SavedSession = {
    createdAt: Date.now(),
    reportUrl: typeof body.reportUrl === "string" ? body.reportUrl : "",
    vods:      Array.isArray(body.vods) ? body.vods : [],
    wipeCalls: body.wipeCalls && typeof body.wipeCalls === "object" ? body.wipeCalls : {},
  };

  const id = generateSessionId();
  await writeSession(id, session);

  return NextResponse.json({ id, session });
}