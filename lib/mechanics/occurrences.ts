// lib/mechanics/occurrences.ts
//
// Every instance of a mechanic a pull reached, failed or not — the
// denominator for the Statics analysis ("failed 4 of the 9 times it
// happened", docs/static-player-analysis-plan.md step 6). Carried on
// Pull.mechanicOccurrences and stored per pull at import.
//
// Each instance is anchored on the boss's own completed cast (enemyCasts),
// so a pull that wiped before the cast never counts as a chance. Detection
// output is untouched: this only reads casts the modules already key on.
//
// mechanicKey must match lib/mechanics/rule-meta.ts (a grouped mechanic's
// key, or a rule id for a rule that is its own mechanic). A boss or
// mechanic without anchors here falls back to phase-level exposure.
//
// Anchors were checked 2026-10-06 against the cast timeline of a 1129 s
// Dancing Mad pull (dQ8wmb1VhKt6yBXk) and against every error in the eight
// full-capture Dancing Mad sample reports: none precedes its mechanic's
// instance by more than OCCURRENCE_LEAD_MS. Two mechanics are one long
// instance by design: Black Hole (errors up to ~2 min after the opener) and
// Confetti (its second positioning round, ~67 s in). Some casts have more
// than one id (Catastrophic Choice: Quake 49742 / Tornado 49743); list
// every variant, or the pulls that drew the other one look like the
// mechanic never happened.
//
// Late-start sample captures (--from-minutes) have no casts before their
// start, so their early mechanics show no instances; that is the capture,
// not the anchors.

import type { EnemyEvent } from "@/types/PullError";

export type MechanicOccurrence = {
  mechanicKey: string;
  /** 1-based instance number within the pull. */
  occurrence:  number;
  /** ms into the pull. */
  timestamp:   number;
};

type Anchor = {
  /**
   * One key: every cast cluster is the next instance of that mechanic.
   * Several keys: the nth cluster is instance 1 of the nth key (one boss
   * cast reused for different mechanics, e.g. the three Graven Images).
   */
  mechanicKey: string | string[];
  /** Boss casts that start an instance. */
  abilityIds:  number[];
  /** Casts closer together than this are one instance. */
  gapMs?:      number;
};

const DEFAULT_GAP_MS = 3_000;

/**
 * An error can be logged a little before its anchor cast completes (a
 * debuff or bait position read just ahead of the resolution), so it still
 * belongs to an instance that starts within this window after it.
 */
export const OCCURRENCE_LEAD_MS = 3_000;

// ── Dancing Mad (FFXIV) ─────────────────────────────────────────────────────

const DANCING_MAD: Anchor[] = [
  // P1
  { mechanicKey: "dm-revolting-ruin", abilityIds: [50179] },                        // Revolting Ruin III, x2
  { mechanicKey: ["dm-graven-1", "dm-graven-2", "dm-graven-3"], abilityIds: [48370] }, // Graven Image
  { mechanicKey: "dm-wave-cannon", abilityIds: [47784] },                           // Wave Cannon
  { mechanicKey: "dm-confetti", abilityIds: [47782] },                              // Double-Trouble Trap
  { mechanicKey: "ffxiv-phase1-hyperdrive-out-of-position", abilityIds: [49739] },  // Hyperdrive, x2
  { mechanicKey: "dm-tele-trouncing", abilityIds: [47801] },                        // Tele-Trouncing
  // P2: Forsaken's eight resolutions (towers every set, cones every set,
  // the stack every other set)
  { mechanicKey: "dm-forsaken-towers", abilityIds: [47806] },                       // The Path of Light
  { mechanicKey: "dm-forsaken-cones", abilityIds: [47810] },                        // Spellwave
  { mechanicKey: "dm-forsaken-stack", abilityIds: [47808] },                        // Spelldriver
  // P3
  { mechanicKey: "ffxiv-exdeath-thunder3-wrong-tank", abilityIds: [47881] },        // Thunder III (tankbuster)
  { mechanicKey: "ffxiv-exdeath-shockwave-silent-kill", abilityIds: [47871] },      // Shockwave, x2
  { mechanicKey: "dm-limit-cut", abilityIds: [47843], gapMs: 30_000 },              // Ultima Blaster
  { mechanicKey: "dm-black-hole", abilityIds: [50545, 47867], gapMs: 30_000 },      // Earthquake opener, Black Hole
  { mechanicKey: "dm-stompies", abilityIds: [47887, 47855], gapMs: 10_000 },        // Blizzard III bait, Stomp-a-Mole
  // P5
  { mechanicKey: "dm-uk-fell-forces", abilityIds: [50771, 50772, 50773], gapMs: 5_000 }, // Fell Forces, four sets
  { mechanicKey: "dm-uk-flood", abilityIds: [49471] },                              // Flood
  { mechanicKey: "dm-uk-orchestra", abilityIds: [47952] },                          // Maddening Orchestra, x2
  { mechanicKey: "dm-uk-towers", abilityIds: [47938] },                             // Celestriad
  { mechanicKey: "dm-uk-choice", abilityIds: [49742, 49743] },                      // Catastrophic Choice (Quake / Tornado), x2
  { mechanicKey: "ffxiv-uk-apocalypse", abilityIds: [47931] },                      // Stray Apocalypse
  { mechanicKey: "dm-uk-forsaken", abilityIds: [47925] },                           // Forsaken (P5)
];

const ANCHORS_BY_BOSS: Record<string, Anchor[]> = {
  "Dancing Mad": DANCING_MAD,
};

/** Instances of every anchored mechanic in the pull, or undefined for a boss without anchors. */
export function computeMechanicOccurrences(bossName: string, enemyCasts: EnemyEvent[]): MechanicOccurrence[] | undefined {
  const anchors = ANCHORS_BY_BOSS[bossName];
  if (!anchors) return undefined;

  const out: MechanicOccurrence[] = [];
  for (const anchor of anchors) {
    const ids = new Set(anchor.abilityIds);
    const gap = anchor.gapMs ?? DEFAULT_GAP_MS;
    const times = enemyCasts.filter((c) => ids.has(c.abilityId)).map((c) => c.timestamp).sort((a, b) => a - b);

    const starts: number[] = [];
    let last = -Infinity;
    for (const t of times) {
      if (t - last > gap) starts.push(t);
      last = t;
    }

    starts.forEach((timestamp, i) => {
      if (Array.isArray(anchor.mechanicKey)) {
        const key = anchor.mechanicKey[i];
        if (key) out.push({ mechanicKey: key, occurrence: 1, timestamp });
      } else {
        out.push({ mechanicKey: anchor.mechanicKey, occurrence: i + 1, timestamp });
      }
    });
  }
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * The instance an error at `timestampMs` belongs to: the latest one starting
 * no later than OCCURRENCE_LEAD_MS after it. Null when the mechanic has no
 * instance that early (or no anchors at all).
 */
export function occurrenceForError(
  occurrences: MechanicOccurrence[] | undefined,
  mechanicKey: string,
  timestampMs: number,
): number | null {
  if (!occurrences) return null;
  let found: number | null = null;
  for (const o of occurrences) {
    if (o.mechanicKey !== mechanicKey) continue;
    if (o.timestamp <= timestampMs + OCCURRENCE_LEAD_MS) found = o.occurrence;
  }
  return found;
}
