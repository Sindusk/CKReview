// lib/rate-limit.ts
//
// Shared helpers for tracking each log provider's GraphQL "points" quota
// (see rateLimitData on the WCL/FFLogs schema) and for backing off requests
// when the provider returns 429. Used by both wcl-client.ts and
// ffl-client.ts — they share the exact same rate-limit shape and retry
// strategy since both APIs run on the same underlying platform.
//
// TWO DIFFERENT THINGS CAN CAUSE A 429 HERE, AND THEY NEED DIFFERENT FIXES:
//
//   1. Cloudflare-level request-rate limiting — too many HTTP requests in
//      too short a window. This is what a big report with many fights each
//      firing several parallel event queries actually tripped (the 429
//      response body is an HTML "Too Many Requests" challenge page, not
//      JSON — see getFFDeaths-Sample.json's sibling error dump for an
//      example). Short exponential backoff can ride this out, and — more
//      importantly — fetching fewer, bigger requests per fight (see the
//      merged FIGHT_EVENTS_QUERY in ffl-client.ts/wcl-client.ts) avoids
//      tripping it in the first place.
//
//   2. The GraphQL API's own hourly "points" quota (rateLimitData) being
//      exhausted. This is a much longer reset window (up to an hour) and
//      backing off for 30 seconds cannot possibly fix it. A 429 gives us no
//      body to read this from directly, so we instead remember the most
//      recent successful response's rateLimitData and use it (adjusted for
//      elapsed time) to recognize "this isn't a burst, the quota is really
//      gone" and fail fast with an accurate estimate instead of retrying
//      pointlessly.

export type RateLimitData = {
  limitPerHour:        number;
  pointsSpentThisHour: number;
  pointsResetIn:       number;   // seconds, AS OF capturedAt
};

type RateLimitSnapshot = RateLimitData & {
  capturedAt: number;   // Date.now() when this snapshot was captured
};

export type RateLimitStatus = {
  limitPerHour:        number;
  pointsSpentThisHour: number;
  secondsUntilReset:   number;   // live-adjusted for time elapsed since capture
};

/**
 * Tracks the most recently observed rateLimitData for one provider.
 */
export class RateLimitTracker {
  private snapshot: RateLimitSnapshot | null = null;

  /** Call with the raw `data` object of any successful GraphQL response. */
  capture(data: unknown): void {
    const r = (data as any)?.rateLimitData;
    if (
      r &&
      typeof r.limitPerHour === "number" &&
      typeof r.pointsSpentThisHour === "number" &&
      typeof r.pointsResetIn === "number"
    ) {
      this.snapshot = {
        limitPerHour:        r.limitPerHour,
        pointsSpentThisHour: r.pointsSpentThisHour,
        pointsResetIn:       r.pointsResetIn,
        capturedAt:          Date.now(),
      };
    }
  }

  /** Last-known status, with secondsUntilReset adjusted for time elapsed since capture. */
  status(): RateLimitStatus | null {
    if (!this.snapshot) return null;

    const elapsedSec = (Date.now() - this.snapshot.capturedAt) / 1000;
    const secondsUntilReset = Math.max(0, Math.round(this.snapshot.pointsResetIn - elapsedSec));

    return {
      limitPerHour:        this.snapshot.limitPerHour,
      pointsSpentThisHour: this.snapshot.pointsSpentThisHour,
      secondsUntilReset,
    };
  }

  /** True once we've seen a snapshot showing the hourly quota is exhausted. */
  isQuotaExhausted(): boolean {
    const s = this.status();
    return !!s && s.pointsSpentThisHour >= s.limitPerHour;
  }
}

export function formatWaitTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Builds the "give up" error message for a persisted/fatal 429, using
 * whatever rate-limit info we've seen most recently (if any).
 */
export function buildRateLimitErrorMessage(
  providerLabel: string,
  status:        RateLimitStatus | null
): string {
  if (!status) {
    return (
      `${providerLabel} rate limit (429) hit and persisted. Unable to determine ` +
      `the exact reset time from a prior response — wait a few minutes before retrying.`
    );
  }

  return (
    `${providerLabel} rate limit hit — the hourly API quota is exhausted ` +
    `(${status.pointsSpentThisHour}/${status.limitPerHour} points used). ` +
    `Estimated reset in ~${formatWaitTime(status.secondsUntilReset)}. Try importing again after that.`
  );
}

// Exponential backoff with jitter, capped at 30s — appropriate for riding
// out a short Cloudflare burst limit. NOT appropriate for waiting out an
// hourly points quota — see SHORT_RETRY_CEILING_SECONDS below.
export function backoffDelayMs(attempt: number): number {
  return Math.min(2 ** attempt * 1000, 30_000) + Math.random() * 1000;
}

// If we already know (from a recent successful response) that the hourly
// quota is exhausted AND the reset is further away than this, don't bother
// spending retries on it — that's not a short burst, it's the real hourly
// limit, and ~30s of backoff cannot fix it. Fail fast with an accurate
// message instead.
export const SHORT_RETRY_CEILING_SECONDS = 60;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
