// lib/log-url.ts
//
// Shared WCL/FFLogs report-URL parsing. Used by page.tsx (to dispatch an
// import) and by the session lookup API route (to match a pasted URL
// against saved sessions' stored reportUrl) — both need to agree on what
// counts as "the same log", e.g. with or without a trailing ?fight=N.

export type LogSource = "wcl" | "ffl";

export function parseLogUrl(input: string): { source: LogSource; code: string } | null {
  const trimmed = input.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathMatch = parsed.pathname.match(/^\/reports\/([a-zA-Z0-9]+)/);
  if (!pathMatch) return null;

  const code = pathMatch[1];

  if (hostname === "www.warcraftlogs.com" || hostname === "warcraftlogs.com") {
    return { source: "wcl", code };
  }

  if (hostname === "www.fflogs.com" || hostname === "fflogs.com") {
    return { source: "ffl", code };
  }

  return null;
}