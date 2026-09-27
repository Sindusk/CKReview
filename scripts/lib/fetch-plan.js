// scripts/lib/fetch-plan.js
//
// Shared download plan for scripts/fetch-{wow,ff}-report.js:
//
//   - KILLS FIRST. A kill is the clean baseline every detection is tuned
//     against, and big reports hit the WCL rate limit partway (The Coiled
//     Altar lost its kill that way; Ula'tek had to be restarted by hand).
//     Only the download ORDER changes: file names still come from the
//     report's full fight list (buildFightLogLabels), so the kill keeps its
//     real per-boss pull number (e.g. Ula'tek_Pull25.json).
//   - RESUME. A pull whose file already exists is skipped (pass --refetch
//     to download it again). Files are written to a .tmp name and renamed,
//     so an existing file is always a complete one.
//   - WAIT OUT RATE LIMITS. On a rate-limit error the script sleeps until
//     the reported reset (plus a minute) and retries the same pull, instead
//     of exiting and losing the rest of the report.

const fs = require('fs');

/** Kills first (in report order), then everything else (in report order). */
function killsFirst(fights) {
  return [...fights.filter((f) => f.kill), ...fights.filter((f) => !f.kill)];
}

/**
 * Seconds to wait from a rate-limit error message, or null if it isn't one.
 * Messages come from lib/wcl-client.ts / lib/ffl-client.ts via
 * lib/rate-limit.ts: "Retry after ~52m 47s.", "Estimated reset in ~1h 2m.",
 * or "wait a few minutes" when no estimate is known.
 */
function rateLimitWaitSeconds(message) {
  if (!/rate limit/i.test(message)) return null;
  const m = message.match(/~((?:\d+h\s*)?(?:\d+m\s*)?(?:\d+s)?)/);
  if (!m || !m[1].trim()) return 5 * 60;
  const part = (re) => Number((m[1].match(re) ?? [0, 0])[1]);
  return part(/(\d+)h/) * 3600 + part(/(\d+)m/) * 60 + part(/(\d+)s/);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_WAITS = 4; // a few hours of waiting at most, then give up

/** Run `fn`, sleeping through rate limits (up to MAX_WAITS times). */
async function withRateLimitWait(fn, label) {
  for (let waits = 0; ; waits++) {
    try {
      return await fn();
    } catch (err) {
      const seconds = rateLimitWaitSeconds(String(err.message || err));
      if (seconds === null || waits >= MAX_WAITS) throw err;
      const waitMs = (seconds + 60) * 1000;
      const until = new Date(Date.now() + waitMs).toLocaleTimeString();
      console.log(`\n  ${err.message}\n  Waiting ~${Math.round(waitMs / 60000)} min (until ${until}), then retrying ${label}...`);
      await sleep(waitMs);
    }
  }
}

/** Write `data` to `filePath` atomically (a .tmp file renamed into place). */
function writeAtomic(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, filePath);
}

module.exports = { killsFirst, rateLimitWaitSeconds, withRateLimitWait, writeAtomic };
