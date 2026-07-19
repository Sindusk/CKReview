// lib/sample-report-client.ts
//
// Browser-side wrapper around /api/sample-report/[source]/[code] — see
// lib/sample-report-store.ts for what it serves. Split into a lightweight
// meta check and a separate full-payload fetch, rather than one request
// doing double duty: the "local sample data found, load it?" import
// prompt needs to appear cheaply and immediately, but the full payload
// (all per-fight event data — can run into the hundreds of MB for a big
// report) is only worth paying for once the user actually confirms they
// want it, not on every import attempt just to decide whether to ask.

import type { SampleReportMeta, SampleReportPayload, SampleSource } from "./sample-report-store";

export type { SampleReportMeta, SampleReportPayload, SampleSource };

/**
 * Returns {code, title, fightCount} if scripts/fetch-wow-report.js /
 * fetch-ff-report.js has already saved this report, or null otherwise.
 * Never throws — a network hiccup here shouldn't block the normal live
 * import path, it should just fall through to it.
 */
export async function tryFetchSampleReportMeta(
  source: SampleSource,
  code:   string
): Promise<SampleReportMeta | null> {
  try {
    const res = await fetch(`/api/sample-report/${source}/${code}/meta`);
    if (!res.ok) return null;
    return (await res.json()) as SampleReportMeta;
  } catch {
    return null;
  }
}

/**
 * Fetches the full sample-data payload (report + every fight's event
 * data) for a report already confirmed via tryFetchSampleReportMeta.
 * Throws on failure — unlike the meta check, this only runs after the
 * user has explicitly asked to load it, so a failure here should surface
 * as a real import error rather than silently falling through.
 */
export async function fetchSampleReport(
  source: SampleSource,
  code:   string
): Promise<SampleReportPayload> {
  const res = await fetch(`/api/sample-report/${source}/${code}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Failed to load local sample data (${res.status})`);
  }
  return (await res.json()) as SampleReportPayload;
}
