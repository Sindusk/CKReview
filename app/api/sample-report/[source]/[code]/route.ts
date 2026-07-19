// app/api/sample-report/[source]/[code]/route.ts
//
// Serves a report already saved to disk by scripts/fetch-wow-report.js /
// scripts/fetch-ff-report.js — see lib/sample-report-store.ts. Lets the
// import flow load a previously-fetched report without spending API
// rate-limit points on a re-fetch during iteration testing.

import { NextRequest, NextResponse } from "next/server";
import { sampleReportExists, loadSampleReport, type SampleSource } from "@/lib/sample-report-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ source: string; code: string }> }
) {
  const { source, code } = await params;

  if (source !== "wcl" && source !== "ffl") {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const exists = await sampleReportExists(source as SampleSource, code);
  if (!exists) {
    return NextResponse.json({ error: "No local sample data for this report" }, { status: 404 });
  }

  try {
    const payload = await loadSampleReport(source as SampleSource, code);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
