// app/api/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { writeSession, generateSessionId } from "@/lib/session-store";
import type { SavedSession } from "@/types/Session";
import { sanitizeDutyOverrides } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Sessions belong to an account (lib/session-access.ts): none for a
  // logged-out visitor.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json();

  const session: SavedSession = {
    createdAt:    Date.now(),
    reportUrl:    typeof body.reportUrl === "string" ? body.reportUrl : "",
    vods:         Array.isArray(body.vods) ? body.vods : [],
    wipeCalls:    body.wipeCalls && typeof body.wipeCalls === "object" ? body.wipeCalls : {},
    manualErrors: body.manualErrors && typeof body.manualErrors === "object" ? body.manualErrors : {},
    dutyOverrides: sanitizeDutyOverrides(body.dutyOverrides),
    ownerUserId:  user.id,
  };

  const id = generateSessionId();
  await writeSession(id, session);

  return NextResponse.json({ id, session, owned: true });
}
