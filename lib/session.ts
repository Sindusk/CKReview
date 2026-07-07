// lib/session.ts
//
// Everything the client needs to save/restore/reattach a session: fetch
// wrappers around the /api/sessions routes (formerly session-client.ts),
// plus pure helpers for turning Pull[] wipe-call state into/from the
// SavedSession.wipeCalls map (formerly session-helpers.ts). Both are
// small, client-safe, and operate on the same SavedSession shape, so they
// belong together. lib/session-store.ts stays separate — it's server-only
// (uses `fs`) and must never be imported from a "use client" file.

import type { SavedSession, SavedManualError } from "@/types/Session";
import type { Pull } from "@/types/Pull";
import {
  createCallWipeError,
  CALL_WIPE_RULE_ID,
  MANUAL_ERROR_RULE_ID,
  type PullError,
} from "@/types/PullError";

// ─── Fetch wrappers around /api/sessions ────────────────────────────────────

export type SessionLookupMatch = {
  id:        string;
  createdAt: number;
  vodCount:  number;
  wipeCount: number;
};

export async function lookupSessionForLog(
  source: "wcl" | "ffl",
  code:   string
): Promise<SessionLookupMatch | null> {
  try {
    const res = await fetch(`/api/sessions/lookup?source=${source}&code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.match ?? null;
  } catch {
    return null;
  }
}

export async function fetchSession(id: string): Promise<SavedSession | null> {
  try {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.session as SavedSession;
  } catch {
    return null;
  }
}

export async function createSession(session: Omit<SavedSession, "createdAt">): Promise<string> {
  const res = await fetch(`/api/sessions`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(session),
  });
  const data = await res.json();
  return data.id as string;
}

export async function updateSession(id: string, session: Omit<SavedSession, "createdAt">): Promise<void> {
  await fetch(`/api/sessions/${id}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(session),
  });
}

// ─── Wipe-call map helpers ───────────────────────────────────────────────────
//
// Keyed by fightId (stable across re-imports of the same report) rather
// than Pull.id (just an incrementing index assigned fresh at every import).

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

// ─── Manual-error map helpers ────────────────────────────────────────────────
//
// Same shape of problem as wipeCalls above — pulls are always rebuilt from
// scratch on import, so manually-added errors need to be extracted before a
// re-import and reattached after, keyed by fightId (stable across
// re-imports) rather than Pull.id (just an incrementing index).

export function buildManualErrorsMap(pulls: Pull[]): Record<number, SavedManualError[]> {
  const map: Record<number, SavedManualError[]> = {};

  for (const pull of pulls) {
    const manual = pull.errors.filter((e) => e.ruleId === MANUAL_ERROR_RULE_ID);
    if (manual.length === 0) continue;

    map[pull.fightId] = manual.map((e) => ({
      id:          e.id!,
      severity:    e.severity,
      name:        e.name,
      description: e.description,
      timestamp:   e.timestamp,
      player:      e.player,
    }));
  }

  return map;
}

/**
 * Re-applies previously-saved manual errors onto a freshly-transformed
 * Pull[], matching on fightId. Player class/specId/role are re-resolved
 * against the newly-imported roster by name — if the player no longer
 * appears in the roster (renamed, log re-imported differently), the error
 * still applies but without those fields.
 */
export function applyPendingManualErrors<T extends Pull>(
  pulls:        T[],
  manualErrors: Record<number, SavedManualError[]> | undefined
): T[] {
  if (!manualErrors || Object.keys(manualErrors).length === 0) return pulls;

  return pulls.map((pull) => {
    const saved = manualErrors[pull.fightId];
    if (!saved || saved.length === 0) return pull;

    const existingIds = new Set(
      pull.errors.filter((e) => e.ruleId === MANUAL_ERROR_RULE_ID).map((e) => e.id)
    );
    const toAdd = saved.filter((s) => !existingIds.has(s.id));
    if (toAdd.length === 0) return pull;

    const newErrors: PullError[] = toAdd.map((s) => {
      const playerInfo = s.player ? pull.players.find((p) => p.name === s.player) : undefined;
      return {
        id:          s.id,
        ruleId:      MANUAL_ERROR_RULE_ID,
        severity:    s.severity,
        name:        s.name,
        description: s.description,
        timestamp:   s.timestamp,
        player:      s.player,
        class:       playerInfo?.className,
        specId:      playerInfo?.specId,
        role:        playerInfo?.role,
        abilityId:   0,
        abilityName: s.name,
      };
    });

    const updatedErrors = [...pull.errors, ...newErrors].sort((a, b) => a.timestamp - b.timestamp);
    return { ...pull, errors: updatedErrors };
  });
}
