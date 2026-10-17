// app/api/sample-report/[source]/[code]/replay/[fight]/route.ts
//
// Serves one pull's replay tracks saved by scripts/fetch-ff-replay.js, so a
// sample-data load can open the replay without a live FFLogs fetch. 404
// when none is saved; the client then fetches live.

import { NextRequest, NextResponse } from "next/server";
import { loadSampleReplay, type SampleSource } from "@/lib/sample-report-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ source: string; code: string; fight: string }> }
) {
  const { source, code, fight } = await params;
  if (source !== "wcl" && source !== "ffl") {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  const body = await loadSampleReplay(source as SampleSource, code, Number(fight));
  if (body === null) {
    return NextResponse.json({ error: "No saved replay for this pull" }, { status: 404 });
  }
  return new NextResponse(body, { headers: { "Content-Type": "application/json" } });
}
