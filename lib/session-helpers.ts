// lib/session-helpers.ts
//
// Pure helpers for turning Pull[] wipe-call state into/from the
// SavedSession.wipeCalls map. Keyed by fightId (stable across re-imports
// of the same report) rather than Pull.id (just an incrementing index
// assigned fresh at every import).

import type { Pull } from "@/types/Pull";
import { createCallWipeError, CALL_WIPE_RULE_ID } from "@/types/PullError";

export function buildWipeCallsMap(pulls: Pull[]): Record<number, number> {
  const map: Record<number, number> = {};

  for (const pull of pulls) {
    const wipeError = pull.errors.find((e) => e.ruleId === CALL_WIPE_RULE_ID);
    if (wipeError) {
      map[pull.fightId] = wipeError.timestamp;
    }
  }

  return map;
}

/**
 * Re-applies previously-saved wipe calls onto a freshly-transformed
 * Pull[], matching on fightId. Pulls are always rebuilt from scratch on
 * import, so saved wipe timestamps need to be reattached after the fact.
 *
 * Generic over T so callers passing the WCL/FFL-specific
 * `Pull & { castEvents: CastEvent[] }` shape get that same shape back,
 * instead of being widened down to the base Pull type.
 */
export function applyPendingWipeCalls<T extends Pull>(
  pulls:     T[],
  wipeCalls: Record<number, number> | undefined
): T[] {
  if (!wipeCalls || Object.keys(wipeCalls).length === 0) return pulls;

  return pulls.map((pull) => {
    const timestamp = wipeCalls[pull.fightId];
    if (timestamp === undefined) return pull;
    if (pull.errors.some((e) => e.ruleId === CALL_WIPE_RULE_ID)) return pull;

    const updatedErrors = [...pull.errors, createCallWipeError(timestamp)]
      .sort((a, b) => a.timestamp - b.timestamp);

    return { ...pull, errors: updatedErrors };
  });
}