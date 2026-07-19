// app/api/sample-report/[source]/[code]/meta/route.ts
//
// Lightweight existence/metadata check for a report already saved to disk
// (see lib/sample-report-store.ts) — reads only meta.json (KBs) instead of
// the full per-fight event data (which can run into the hundreds of MB),
// so the "local sample data found, load it?" import prompt is cheap to
// show even before the user decides whether to actually load it.

import { NextRequest, NextResponse } from "next/server";
import { loadSampleReportMeta, type SampleSource } from "@/lib/sample-report-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ source: string; code: string }> }
) {
  const { source, code } = await params;

  if (source !== "wcl" && source !== "ffl") {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const meta = await loadSampleReportMeta(source as SampleSource, code);
  if (!meta) {
    return NextResponse.json({ error: "No local sample data for this report" }, { status: 404 });
  }

  return NextResponse.json(meta);
}
