// lib/local-log/read-lines.ts
//
// Reads an ACT / IINACT network log (Network_<ver>_<date>.log) line by line
// in the browser, without holding the file in memory. A night's log runs
// 50-300MB (the user's IINACT folder, 2026-10/11), so the file is streamed
// in chunks and every line is handed to `onLine` once; nothing here keeps
// lines. The file never leaves the tab (like local VODs, see
// docs/app-architecture.md's VOD section).
//
// ── LOG FORMAT (checked on the user's IINACT 2.10 logs) ──────────────────
//
// One event per line, pipe-separated: `<type>|<timestamp>|<fields...>|<hash>`.
// The type is the FFXIV_ACT_Plugin's decimal line id ("21" ability, "28"
// waymark, "01" zone change, "261" OverlayPlugin's CombatantMemory...).
// The timestamp is local time with its UTC offset and 7 fractional digits:
// `2026-07-18T19:41:48.0440000-04:00`. ACT and IINACT write the same
// format (IINACT is built on the same plugin and says so in line 253).

/** Epoch ms of an ACT timestamp, or NaN. Date.parse can't take 7 fractional digits. */
export function parseActTimestamp(ts: string): number {
  const m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d+))?([+-]\d\d:\d\d|Z)?$/.exec(ts);
  if (!m) return NaN;
  const frac = (m[2] ?? "").padEnd(3, "0").slice(0, 3);
  return Date.parse(`${m[1]}.${frac}${m[3] ?? "Z"}`);
}

/**
 * Streams `file` and calls `onLine` with each line split on "|" (the
 * trailing hash field included). `onProgress` gets 0..1 every few MB.
 * `wanted`, when given, skips lines whose type isn't in it before
 * splitting, which is most of the cost on a full log.
 */
export async function readLogLines(
  file: Blob,
  onLine: (fields: string[]) => void,
  opts: { wanted?: Set<string>; onProgress?: (f: number) => void; signal?: AbortSignal } = {},
): Promise<void> {
  const { wanted, onProgress, signal } = opts;
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  let rest = "";
  let read = 0;
  let lastReport = 0;
  const handle = (line: string) => {
    if (!line) return;
    if (wanted) {
      const bar = line.indexOf("|");
      if (bar < 0 || !wanted.has(line.slice(0, bar))) return;
    }
    onLine(line.endsWith("\r") ? line.slice(0, -1).split("|") : line.split("|"));
  };
  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await reader.read();
    if (done) break;
    read += value.length;
    const text = rest + value;
    let start = 0;
    for (let nl = text.indexOf("\n"); nl >= 0; nl = text.indexOf("\n", start)) {
      handle(text.slice(start, nl));
      start = nl + 1;
    }
    rest = text.slice(start);
    // `read` counts characters, close enough to bytes for a progress bar.
    if (onProgress && read - lastReport > 4_000_000) {
      lastReport = read;
      onProgress(Math.min(1, read / file.size));
    }
  }
  handle(rest);
  onProgress?.(1);
}
