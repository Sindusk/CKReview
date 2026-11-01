// app/api/sessions/[id]/route.ts
//
// GET: the owner, or a member of a static it was added to (`owned` says
// which). PUT: the owner only. See lib/session-access.ts.

import { NextRequest, NextResponse } from "next/server";
import { readSession, writeSession } from "@/lib/session-store";
import type { SavedSession } from "@/types/Session";
import { sanitizeDutyOverrides } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { sessionAccess } from "@/lib/session-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  let session: SavedSession | null;
  try {
    session = await readSession(id);
  } catch {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }
  // Not found and not yours look the same, so ids can't be probed.
  const access = session ? await sessionAccess(id, session, user.id) : null;
  if (!session || !access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id, session, owned: access === "owner" });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const existing = await readSession(id).catch(() => null);
  if (!existing || (await sessionAccess(id, existing, user.id)) !== "owner") {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }

  const body = await req.json();
  const session: SavedSession = {
    createdAt:    existing.createdAt,
    reportUrl:    typeof body.reportUrl === "string" ? body.reportUrl : "",
    vods:         Array.isArray(body.vods) ? body.vods : [],
    wipeCalls:    body.wipeCalls && typeof body.wipeCalls === "object" ? body.wipeCalls : {},
    manualErrors: body.manualErrors && typeof body.manualErrors === "object" ? body.manualErrors : {},
    dutyOverrides: sanitizeDutyOverrides(body.dutyOverrides),
    ownerUserId:  user.id,
  };

  await writeSession(id, session);

  return NextResponse.json({ id, session, owned: true });
}
