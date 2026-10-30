// lib/login-throttle.ts
//
// Bounded, temporary throttling for PIN attempts, ported from Stonks'
// lib/loginThrottle.js (read its header for the full reasoning). A
// four-digit PIN is 10,000 possibilities, so an unthrottled login is
// guessable in minutes.
//
// - Failures are counted per username and per request source over a
//   sliding 15-minute window; a successful login clears the username's
//   counter, so nobody can lock an owner out for longer than the window.
// - Successful signups are counted per source over a day, since creating a
//   fresh account never fails and would otherwise be unbounded.
// - reserveCreation() checks and consumes a signup slot in one synchronous
//   step: hashPin is deliberately slow scrypt, and checking before it and
//   recording after it would let every concurrent request through.
//
// Counters live in memory, which matches the single PM2 process. Each app
// keeps its own counters, so Stonks and this app throttle independently.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_USERNAME = 5;
const MAX_FAILURES_PER_SOURCE = 20;

const SIGNUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SIGNUPS_PER_SOURCE = 5;

export type ThrottleVerdict =
  | { allowed: true }
  | { allowed: false; scope: "username" | "source" | "signup"; retryAfterSeconds: number };

export type CreationReservation =
  | { allowed: true; commit: () => void; release: () => void }
  | { allowed: false; scope: "username" | "source" | "signup"; retryAfterSeconds: number };

function createLoginThrottle() {
  // key -> timestamps, oldest first
  const buckets = new Map<string, number[]>();

  function recent(key: string, at: number, keepForMs = WINDOW_MS): number[] {
    const timestamps = buckets.get(key);
    if (!timestamps) return [];
    const cutoff = at - keepForMs;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) timestamps.shift();
    if (timestamps.length === 0) {
      buckets.delete(key);
      return [];
    }
    return timestamps;
  }

  function retryAfterSeconds(timestamps: number[], at: number, keepForMs = WINDOW_MS): number {
    return Math.max(1, Math.ceil((timestamps[0] + keepForMs - at) / 1000));
  }

  function push(key: string, at: number, keepForMs = WINDOW_MS) {
    const timestamps = recent(key, at, keepForMs);
    timestamps.push(at);
    buckets.set(key, timestamps);
  }

  // A null source (no X-Real-IP, see requestSource) skips every source counter.
  type Attempt = { username: string; source: string | null };

  function check({ username, source }: Attempt): ThrottleVerdict {
    const at = Date.now();
    const counters: ["username" | "source", string, number][] = [
      ["username", `user:${username}`, MAX_FAILURES_PER_USERNAME],
    ];
    if (source) counters.push(["source", `source:${source}`, MAX_FAILURES_PER_SOURCE]);
    for (const [scope, key, limit] of counters) {
      const timestamps = recent(key, at);
      if (timestamps.length >= limit) {
        return { allowed: false, scope, retryAfterSeconds: retryAfterSeconds(timestamps, at) };
      }
    }
    return { allowed: true };
  }

  return {
    check,

    recordFailure({ username, source }: Attempt) {
      const at = Date.now();
      push(`user:${username}`, at);
      if (source) push(`source:${source}`, at);
    },

    /** A failure that says nothing about the username's owner (signup of a taken name). */
    recordSourceFailure({ source }: { source: string | null }) {
      if (source) push(`source:${source}`, Date.now());
    },

    /** Clears the username counter; the source counter deliberately survives. */
    recordSuccess({ username }: { username: string }) {
      buckets.delete(`user:${username}`);
    },

    reserveCreation({ username, source }: Attempt): CreationReservation {
      const verdict = check({ username, source });
      // `in` rather than `!verdict.allowed`: the project isn't strict, so
      // the boolean discriminant doesn't narrow.
      if ("retryAfterSeconds" in verdict) return verdict;
      if (!source) return { allowed: true, commit: () => {}, release: () => {} };

      const at = Date.now();
      const key = `created:${source}`;
      const created = recent(key, at, SIGNUP_WINDOW_MS);
      if (created.length >= MAX_SIGNUPS_PER_SOURCE) {
        return { allowed: false, scope: "signup", retryAfterSeconds: retryAfterSeconds(created, at, SIGNUP_WINDOW_MS) };
      }
      push(key, at, SIGNUP_WINDOW_MS);

      let settled = false;
      return {
        allowed: true,
        // Call the moment the row exists: later steps can still throw, and
        // refunding a slot for a real account is how the budget leaks.
        commit: () => { settled = true; },
        release: () => {
          if (settled) return;
          settled = true;
          const timestamps = buckets.get(key);
          if (!timestamps) return;
          timestamps.pop();
          if (timestamps.length === 0) buckets.delete(key);
        },
      };
    },
  };
}

export const loginThrottle = createLoginThrottle();

/**
 * The address an attempt came from. Next.js route handlers don't expose the
 * socket address, so this relies on nginx setting `X-Real-IP $remote_addr`
 * (which overwrites anything the client sent). Without that header this
 * returns null and the source counters are skipped: one shared "unknown"
 * source would let twenty failed logins lock out the whole site. The
 * per-username counter still protects each account either way.
 */
export function requestSource(req: Request): string | null {
  return req.headers.get("x-real-ip")?.trim() || null;
}
