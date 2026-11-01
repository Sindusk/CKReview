// app/api/sessions/lookup/route.ts
//
// Given a parsed {source, code}, returns the EARLIEST saved session whose
// stored reportUrl parses to the same log — so pasting a URL with or
// without a trailing ?fight=N still matches the same session, and if
// someone insisted on creating multiple sessions for one log, we always
// suggest the oldest one. Only the caller's own sessions match
// (lib/session-access.ts); a logged-out caller never gets one.

import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/session-store";
import { parseLogUrl } from "@/lib/url-parsers";
import { getCurrentUser } from "@/lib/auth";
import { resolveSessionOwner } from "@/lib/session-access";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ match: null });

  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const code = searchParams.get("code");

  if (!source || !code) {
    return NextResponse.json({ error: "Missing source or code" }, { status: 400 });
  }

  const all = await listSessions();

  const sameLog = all.filter(({ session }) => {
    const parsed = parseLogUrl(session.reportUrl);
    return parsed?.source === source && parsed?.code === code;
  });
  const matches = [];
  for (const m of sameLog) {
    if ((await resolveSessionOwner(m.id, m.session)) === user.id) matches.push(m);
  }

  if (matches.length === 0) {
    return NextResponse.json({ match: null });
  }

  matches.sort((a, b) => a.session.createdAt - b.session.createdAt);
  const earliest = matches[0];

  return NextResponse.json({
    match: {
      id:        earliest.id,
      createdAt: earliest.session.createdAt,
      vodCount:  earliest.session.vods.length,
      wipeCount: Object.keys(earliest.session.wipeCalls).length,
    },
  });
}
