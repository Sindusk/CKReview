// lib/mechanics/ffxiv/dancingmad/mitigation-detection.ts
//
// "Missed Mitigation" detection for Dancing Mad Ultimate, built on top of a
// mitigation-plan.ts MitigationPlan (currently the Ikuya sheet). Grounded in
// deaths per the user's explicit design: a missed mitigation is only an
// error if the raid actually died to that mechanic in THIS pull. Someone
// forgetting their Reprisal on a mechanic the party survives anyway is not
// flagged — there's no way to tell from the log alone whether it mattered,
// and flagging it anyway would just be noise. So the pipeline is:
//
//   1. For each death this pull, find the ONE plan mechanic (across all 5
//      phases) whose name matches the death's killing-ability name and
//      whose sheet timestamp is closest to the death (within a tolerance —
//      real pulls drift from the sheet's idealized timeline).
//   2. For every occurrence of a plan mechanic matched by at least one
//      death, resolve who (by sheet party-slot -> this pull's roster, see
//      mitigation-plan.ts) was assigned to mitigate it, and what ability(s)
//      they were supposed to cast.
//   3. Check that assigned player's own cast list for that ability, in a
//      window anchored on the death (real drift-corrected time, not the
//      sheet's static time). Missing it emits ONE Major, player-attributed
//      PullError per (mechanic occurrence, slot) — not one per missed
//      ability, and not the "Raid" severity originally discussed; the user
//      wants this to read as an individual accountability item, same shelf
//      as Damage Down.
//
// ── WHAT THIS DOES NOT COVER YET (known gaps — flagged explicitly per the
//    user's "iterate after detection exists" direction) ─────────────────────
//
//   - The sheet's separate tank-cooldown table (mitigation-plan.ts's
//     `tank` section) is NOT used here. Its columns are generic slot names
//     ("Kitchen Sink", "40%", "Short Mit", "Invulnerability", ...) that need
//     a per-job real-ability mapping this module doesn't have yet, and P3/
//     P5's columns are invuln-priority orders rather than MT/OT, which
//     resolveMitigationSlots can't disambiguate from the roster at all.
//     Only the 5 phase tabs' MT/OT/healer/DPS columns (mostly real ability
//     names) are checked.
//   - Tentative slot assignments (MT vs OT with two tanks, D1 vs D2 with
//     two melee — see mitigation-plan.ts) are skipped entirely rather than
//     guessed, to avoid accusing the wrong player.
//   - "LB3" and the "✔" Extras marker aren't resolvable to a checkable cast
//     and are always skipped.
//   - Ability-name matching assumes the sheet's (typo-fixed) name is the
//     FFLogs ability's exact display name. This holds for real spell names
//     but is unverified for every entry across all 5 phases — expect some
//     to need alias/spelling fixes once run against real logs.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";
import type { Pull } from "@/types/Pull";
import {
  type MitigationPlan,
  type PlanMechanic,
  type PlanAbility,
  resolveMitigationSlots,
  resolveTankPriorityColumn,
} from "./mitigation-plan";

export const MITIGATION_MISSED_RULE_ID = "ffxiv-mitigation-missed";

// How close (in ms) a death must land to a plan mechanic's sheet timestamp
// to be considered "this mechanic" rather than a coincidence. Generous
// because real pulls drift from the sheet's idealized pacing (extra deaths/
// downtime earlier in the pull push everything later).
export const MECHANIC_MATCH_WINDOW_MS = 30_000;

// Window (anchored on the real death time, not the sheet's static time —
// see header) searched for the assigned player's cast. Mitigation buffs on
// this sheet top out around 20s duration (Temperance), and carry-over
// entries are always chained across mechanics the sheet itself places
// close together, so 45s back comfortably covers a carry-over cast without
// reaching into a different mechanic's window. A few seconds forward covers
// a cast logged just after the damage tick due to event ordering.
export const CAST_LOOKBACK_MS  = 45_000;
export const CAST_LOOKAHEAD_MS = 3_000;

// ── Generic-term resolution ──────────────────────────────────────────────
//
// Most sheet entries are already real FFLogs ability names (Reprisal, Feint,
// Sacred Soil, ...) and match a cast's abilityName directly. A few are sheet
// shorthand for a job-specific real ability or an either-of pair — resolved
// here instead of guessing from the sheet's qualifier text, since deriving
// the requirement from the ASSIGNED PLAYER's actual job is exact where the
// qualifier text ("WAR/PLD" vs "GNB/DRK") would just be redundant.

// Tanks and physical ranged DPS both carry a raid-wide "Party Mit" on their
// job kit — user-confirmed 2026-07-23 for the three ranged jobs (Bard,
// Machinist, Dancer), matching the four tank jobs confirmed earlier.
const PARTY_MIT_BY_JOB: Record<string, string> = {
  Warrior:      "Shake It Off",
  Paladin:      "Divine Veil",
  Gunbreaker:   "Heart of Light",
  "Dark Knight": "Dark Missionary",
  Bard:         "Troubadour",
  Machinist:    "Tactician",
  Dancer:       "Shield Samba",
};

// The tank table (mitigation-plans/ikuya.json's `tank` section) uses
// GENERIC slot names instead of real ability names, each needing a per-job
// resolution the same way "Party Mit" does above.
//   - "90s": a tank's personal ~90s-cooldown mitigation. Only Gunbreaker
//     confirmed so far (2026-07-20: Camouflage) — a DIFFERENT ability from
//     "40%" below, not a duplicate/rename of it.
//   - "40%" ("40% Mit", ~120s cooldown per the user) / "Short Mit" ("Short",
//     a shorter-cooldown, more frequent one) / "Buddy Mit" (targets an
//     ALLY, not the caster — see wasBuffActiveOnHit's header for why
//     checking the assigned player's OWN casts is still correct even for an
//     ally-targeted ability: it's still THEIR cast that's required) /
//     "Invulnerability" — all four confirmed by the user 2026-07-23 for
//     all four tank jobs.
//   - "Kitchen Sink" ("use everything for a huge hit") is NOT one ability —
//     confirmed 2026-07-23 to mean Rampart + "40%" + "Short Mit" all
//     together. Expanded into three independent requirements by
//     `expandRequiredAbilities` (called by every consumer BEFORE this
//     resolver) rather than handled as a single OR-group here, so each of
//     the three can show its own hit/miss mark instead of one combined
//     verdict (see mitigation-review.ts's per-check display).
const NINETY_SECOND_MIT_BY_JOB: Record<string, string> = {
  Gunbreaker: "Camouflage",
};
const FORTY_PERCENT_MIT_BY_JOB: Record<string, string> = {
  Paladin:      "Guardian",
  Gunbreaker:   "Great Nebula",
  Warrior:      "Damnation",
  "Dark Knight": "Shadowed Vigil",
};
const SHORT_MIT_BY_JOB: Record<string, string> = {
  Paladin:      "Holy Sheltron",
  Gunbreaker:   "Heart of Corundum",
  Warrior:      "Bloodwhetting",
  "Dark Knight": "The Blackest Night",
};
// Ally-targeted mitigation — for Paladin/Warrior/Dark Knight a DIFFERENT
// ability from their own Short Mit; Gunbreaker's kit only has one
// self/ally-flexible option (Heart of Corundum serves both roles).
const BUDDY_MIT_BY_JOB: Record<string, string> = {
  Paladin:      "Intervention",
  Gunbreaker:   "Heart of Corundum",
  Warrior:      "Nascent Flash",
  "Dark Knight": "The Blackest Night",
};
const INVULN_BY_JOB: Record<string, string> = {
  Paladin:      "Hallowed Ground",
  Gunbreaker:   "Superbolide",
  Warrior:      "Holmgang",
  "Dark Knight": "Living Dead",
};

// "Kitchen Sink" bundles three independently-required abilities rather
// than being satisfied by any one of them (unlike every other generic term
// here, which is a plain OR-group) — expand it into three synthetic
// PlanAbility entries BEFORE calling resolveRequiredAbilityNames, so each
// becomes its own separately-checked requirement. A no-op for every other
// ability (returns it unchanged, wrapped in a single-element array).
export function expandRequiredAbilities(ability: PlanAbility): PlanAbility[] {
  if (ability.name !== "Kitchen Sink") return [ability];
  return [
    { name: "Rampart" },
    { name: "40%", qualifier: ability.qualifier },
    { name: "Short Mit", qualifier: ability.qualifier },
  ];
}

// Sheet ability name -> resolver. Returns candidate real ability names
// (satisfied if the player cast ANY of them) or null if this entry isn't
// checkable for this player (wrong job for a job-gated term, or a term this
// module doesn't support yet — see header).
export function resolveRequiredAbilityNames(ability: PlanAbility, player: PlayerInfo): string[] | null {
  switch (ability.name) {
    case "Party Mit": {
      const name = PARTY_MIT_BY_JOB[player.className];
      return name ? [name] : null;
    }
    case "Spreadlo":
      return player.className === "Scholar" ? ["Succor", "Deployment Tactics"] : null;
    case "Zoe Shields":
      return player.className === "Sage" ? ["Zoe", "Eukrasian Prognosis"] : null;
    case "90s": {
      const name = NINETY_SECOND_MIT_BY_JOB[player.className];
      return name ? [name] : null;
    }
    case "40%": {
      const name = FORTY_PERCENT_MIT_BY_JOB[player.className];
      return name ? [name] : null;
    }
    case "Short Mit":
    case "Short": {
      const name = SHORT_MIT_BY_JOB[player.className];
      return name ? [name] : null;
    }
    case "Buddy Mit": {
      const name = BUDDY_MIT_BY_JOB[player.className];
      return name ? [name] : null;
    }
    case "Invulnerability": {
      const name = INVULN_BY_JOB[player.className];
      return name ? [name] : null;
    }
    case "LB3":       // limit break — logged under the specific LB's own
      return null;    // name per job, not a stable string to check against.
    case "✔":
      return null;
    // Handled by expandRequiredAbilities before reaching here — should
    // never actually be looked up directly, but fall through to
    // "unsupported" rather than crash if it somehow is.
    case "Kitchen Sink":
      return null;
    // Sheet parsing quirk: the qualifier ("During Castbar") got baked into
    // the ability name instead of split out — the real ability is Provoke.
    case "Provoke During Castbar":
      return ["Provoke"];
    default:
      return [ability.name];
  }
}

// ── Death -> mechanic matching ───────────────────────────────────────────

// Sheet mechanic names sometimes bundle multiple boss-ability names
// ("Stray Flames/Tsunami", "Stomp-a-Mole + Knock Down") or append a
// non-ability qualifier FFLogs won't have ("Thunder III (1st Set)",
// "Towers II (Past/Future's End)"). Splits into comparable tokens.
//
// Exported — mitigation-review.ts reuses this against boss enemyCast
// ability names (not just death killing-ability names) to anchor each
// mechanic on the boss's own real cast time. Generic string matching, so
// the "name" parameter doesn't care which kind of ability-name string it is.
export function mechanicNameTokens(mechName: string): string[] {
  const stripped = mechName.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return stripped
    .split(/\/|\+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

// Sheet mechanic name -> real boss ability name(s) that ACTUALLY represent
// it, for the rare mechanic the automatic tokenizer (mechanicNameTokens)
// gets wrong. Two known cases, found 2026-07-24 via `scripts/inspect-
// mitigation-anchors.js` (see that script for how to find more):
//   - "Towers I" through "Towers VIII": mechanicNameTokens strips a
//     trailing parenthetical assuming it's a discardable qualifier like
//     "Thunder III (1st Set)" — true there ("Thunder III" is itself a real
//     ability), but false here: "(All Things Ending)" / "(Past/Future's
//     End)" are the ACTUAL cast names, and "Towers I"/"Towers N" alone
//     isn't a real ability at all (it's just the sheet's own raid-comms
//     numbering for the 8 sequential tower resolutions). Rather than parse
//     the qualifier text differently per case, all eight instead share ONE
//     universal raid-wide cast that fires exactly once per tower
//     resolution regardless of which specific type it is — "The Path of
//     Light" — confirmed via real enemyCasts (8 clusters, one per tower,
//     spaced ~10s apart matching the sheet's own timing).
//   - "Light of Judgement" (Phase 2's spelling) vs "Light of Judgment"
//     (Phase 1's spelling, and the real ability's actual spelling) — a
//     sheet-side inconsistency between two occurrences of the same
//     mechanic.
//   - "Black Holes II/III/IV (Nth Tether Set)" (found 2026-07-24, same
//     tool, same root cause as Towers): neither "Black Holes N" nor its
//     "(Nth Tether Set)" qualifier is a real ability — the actual per-
//     tether-set hit is "Nothingness" (ability 47868, per blackhole.ts's
//     module header), confirmed present near EVERY one of the 5 tether-set
//     mechanics the sheet covers (3rd/4th/5th/6th/10th), including the 10th
//     where a different, unrelated cast ("Look upon Me and Despair")
//     happened to land even closer — "Nothingness" was still present just
//     ~0.6s further out, well inside the match window.
const MECHANIC_NAME_ALIASES: Record<string, string[]> = {
  "Towers I":                        ["The Path of Light"],
  "Towers II (Past/Future's End)":   ["The Path of Light"],
  "Towers III (All Things Ending)":  ["The Path of Light"],
  "Towers IV (Past/Future's End)":   ["The Path of Light"],
  "Towers V (All Things Ending)":    ["The Path of Light"],
  "Towers VI (Past/Future's End)":   ["The Path of Light"],
  "Towers VII (All Things Ending)":  ["The Path of Light"],
  "Towers VIII (Past/Future's End)": ["The Path of Light"],
  "Light of Judgement":              ["Light of Judgment"],
  "Black Holes II (3rd Tether Set)":  ["Nothingness"],
  "Black Holes II (4th Tether Set)":  ["Nothingness"],
  "Black Holes II (5th Tether Set)":  ["Nothingness"],
  "Black Holes III (6th Tether Set)": ["Nothingness"],
  "Black Holes IV (10th Tether Set)": ["Nothingness"],
};

export function mechanicMatchesAbilityName(mech: PlanMechanic, abilityName: string): boolean {
  const name = abilityName.trim().toLowerCase();
  if (!name || name.startsWith("unknown")) return false;

  const aliases = MECHANIC_NAME_ALIASES[mech.name];
  if (aliases) return aliases.some((a) => a.toLowerCase() === name);

  return mechanicNameTokens(mech.name).some((t) => t === name || t.includes(name) || name.includes(t));
}

export type FlatMechanic = { phaseTitle: string; mech: PlanMechanic };

export function flattenPhaseMechanics(plan: MitigationPlan): FlatMechanic[] {
  const out: FlatMechanic[] = [];
  for (const phase of plan.data.phases) {
    for (const mech of phase.mechanics) {
      if (mech.timeSeconds === undefined || !mech.assignments) continue;
      out.push({ phaseTitle: phase.title, mech });
    }
  }
  return out;
}

// The tank table (mitigation-plans/ikuya.json's `tank` section) has its
// OWN "Thunder III"-named mechanics at essentially the same timestamps as
// the phase tabs' healer/DPS-column entries for the same real moment —
// they're two different columns of information about the same occurrence,
// not two different occurrences. Kept as a SEPARATE flat list (rather than
// merged into flattenPhaseMechanics' output) specifically so
// matchDeathsToMechanics runs against each independently below — merging
// them would make a death match whichever one's sheet timestamp happens to
// be numerically closer and silently drop the other, losing either the
// healer-side or the tank-side check for that occurrence.
export function flattenTankMechanics(plan: MitigationPlan): FlatMechanic[] {
  const out: FlatMechanic[] = [];
  if (!plan.data.tank) return out;
  for (const section of plan.data.tank.sections) {
    for (const mech of section.mechanics) {
      if (mech.timeSeconds === undefined || !mech.assignments) continue;
      out.push({ phaseTitle: section.title ?? "Tank", mech });
    }
  }
  return out;
}

// One matched occurrence of a mechanic in THIS pull: which sheet mechanic,
// the earliest real timestamp (ms into pull) a death confirmed it at, and
// every player whose death matched it (for the error description — see
// formatPlayerList below).
type MatchedOccurrence = { mech: PlanMechanic; anchorMs: number; victims: string[] };

function matchDeathsToMechanics(deaths: DeathEvent[], flat: FlatMechanic[]): MatchedOccurrence[] {
  const byMechanic = new Map<PlanMechanic, { anchorMs: number; victims: string[] }>();

  for (const death of deaths) {
    let best: { mech: PlanMechanic; diff: number } | null = null;
    for (const { mech } of flat) {
      if (!mechanicMatchesAbilityName(mech, death.cause)) continue;
      const diff = Math.abs(death.timestamp - mech.timeSeconds! * 1000);
      if (diff > MECHANIC_MATCH_WINDOW_MS) continue;
      if (!best || diff < best.diff) best = { mech, diff };
    }
    if (!best) continue;
    const existing = byMechanic.get(best.mech);
    if (!existing) {
      byMechanic.set(best.mech, { anchorMs: death.timestamp, victims: [death.player] });
    } else {
      existing.anchorMs = Math.min(existing.anchorMs, death.timestamp);
      if (!existing.victims.includes(death.player)) existing.victims.push(death.player);
    }
  }

  return [...byMechanic.entries()].map(([mech, { anchorMs, victims }]) => ({ mech, anchorMs, victims }));
}

// "Alice", "Alice and Bob", "Alice, Bob, and Carol" — readable in a
// PullError description regardless of how many players died to one
// mechanic occurrence.
function formatPlayerList(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

// ── Cast checking ─────────────────────────────────────────────────────────

// Returns the player's own real cast name that satisfied `abilityNames`
// (useful for an either-of group like Spreadlo's Succor/Deployment Tactics
// — mitigation-review.ts's Review tab shows exactly which one was actually
// cast rather than a vague "satisfied"), or null if none matched.
export function findCastNear(player: PlayerInfo, abilityNames: string[], anchorMs: number): string | null {
  const wanted = new Set(abilityNames.map((n) => n.toLowerCase()));
  const match = player.casts.find(
    (c) =>
      wanted.has(c.abilityName.toLowerCase()) &&
      c.timestamp >= anchorMs - CAST_LOOKBACK_MS &&
      c.timestamp <= anchorMs + CAST_LOOKAHEAD_MS
  );
  return match?.abilityName ?? null;
}

export function hasCastNear(player: PlayerInfo, abilityNames: string[], anchorMs: number): boolean {
  return findCastNear(player, abilityNames, anchorMs) !== null;
}

// The player's own most recent cast of any of `abilityNames` at or before
// `atMs` — regardless of the hit/miss lookback window (mitigation-
// review.ts's Review tab shows this in a check's tooltip: "Last Cast: X"
// for a hit, or how long ago they last did it even if too stale to count
// for THIS particular requirement, or "Not Cast Yet This Pull" — see
// module callers — when null). Deliberately unbounded on the low end,
// unlike findCastNear/hasCastNear, which only care whether a cast landed
// close enough to satisfy the requirement.
export function findLastCastAtOrBefore(player: PlayerInfo, abilityNames: string[], atMs: number): number | null {
  const wanted = new Set(abilityNames.map((n) => n.toLowerCase()));
  let latest: number | null = null;
  for (const c of player.casts) {
    if (!wanted.has(c.abilityName.toLowerCase())) continue;
    if (c.timestamp > atMs) continue;
    if (latest === null || c.timestamp > latest) latest = c.timestamp;
  }
  return latest;
}

// The killing hit's own `activeBuffNames` (see PlayerEvent in
// types/PlayerInfo.ts) is FFLogs' ground truth for what was actually up on
// the victim at the instant the damage landed — strictly better evidence
// than "was the ability cast at some point in a lookback window," which
// can't tell a mitigation that was cast but already FELL OFF before impact
// (short-duration buffs like Heart of Corundum's 8s) from one that covered
// the hit. Party mitigations (Sacred Soil, Divine Veil, ...) apply their
// buff to allies including the victim, so checking the victim's own list
// also correctly covers the case where the ASSIGNED caster isn't the
// player who died. Returns undefined (not false) when no matching hit with
// buff data could be found, so the caller can fall back to hasCastNear
// instead of wrongly concluding "missed."
function wasBuffActiveOnHit(
  players:      PlayerInfo[],
  deathEvents:  DeathEvent[],
  abilityNames: string[],
  anchorMs:     number
): boolean | undefined {
  const wanted = new Set(abilityNames.map((n) => n.toLowerCase()));

  const death = deathEvents.find((d) => Math.abs(d.timestamp - anchorMs) <= CAST_LOOKAHEAD_MS);
  if (!death) return undefined;
  const victim = players.find((p) => p.name === death.player);
  if (!victim) return undefined;

  const fatalHit = victim.damageTaken.find(
    (e) =>
      e.abilityId === death.killingAbilityGameId &&
      Math.abs(e.timestamp - death.timestamp) <= CAST_LOOKAHEAD_MS
  );
  if (!fatalHit || fatalHit.activeBuffNames === undefined) return undefined;

  const active = fatalHit.activeBuffNames;
  return active.some((n) => wanted.has(n.toLowerCase()));
}

// Best-effort ability id/icon for the missed ability, sourced from ANY
// player's cast history in this pull that used it (for icon display only —
// falls back to 0/none if nobody in this pull ever cast it).
export function findAbilityMeta(players: PlayerInfo[], name: string): { abilityId: number; abilityIcon?: string } {
  for (const p of players) {
    const c = p.casts.find((e) => e.abilityName.toLowerCase() === name.toLowerCase());
    if (c) return { abilityId: c.abilityId, abilityIcon: c.abilityIcon };
  }
  return { abilityId: 0 };
}

// ── "Already dead" exemption ─────────────────────────────────────────────
//
// A player who's already dead when a mitigation comes due couldn't have
// cast it — that's someone else's error (whatever killed them), not theirs
// (user-confirmed 2026-07-21, report rXBbzFV49hd1QPwf pull 3: the WHM's
// "missed" Cyclone mitigation at 8:26 was flagged while they'd already been
// dead for 7+ seconds, from an earlier unrelated Stray Flames death — same
// player, no revival in between). There's no explicit "resurrection" event
// in the data, so revival is inferred from the FIRST sign of activity
// (a cast, a hit taken, or healing received — any of which requires being
// alive/targetable) after their most recent death before the mitigation's
// anchor time. A player with no such activity before the anchor is still
// dead and is exempted entirely; one revived just barely in time (within
// RESURRECTION_GRACE_MS) is also exempted, in case the "first activity"
// proxy is itself catching the very moment of resurrection.
const RESURRECTION_GRACE_MS = 2000;

/** Earliest timestamp, after `afterMs`, that this player shows ANY sign of being alive. */
function firstActivityAfter(player: PlayerInfo, afterMs: number): number | undefined {
  let min: number | undefined;
  for (const stream of [player.casts, player.damageTaken, player.healing]) {
    for (const e of stream) {
      if (e.timestamp > afterMs && (min === undefined || e.timestamp < min)) min = e.timestamp;
    }
  }
  return min;
}

/**
 * True if `player` should be exempted from a mitigation check at `atMs` —
 * either still dead (their most recent death before `atMs` has no evidence
 * of revival before `atMs`), or revived too recently to reasonably expect
 * them to have acted.
 *
 * Strictly BEFORE `atMs`, not at-or-before: a death landing at the exact
 * same instant as the mitigation's own anchor is that mechanic killing
 * them (plausibly BECAUSE the mitigation was missed), not a pre-existing
 * dead state from something else — that player was alive right up until
 * this hit and should still be checked. Only an earlier, already-resolved
 * death exempts them.
 */
export function isDeadOrFreshlyRevived(player: PlayerInfo, deathEvents: DeathEvent[], atMs: number): boolean {
  const lastDeath = deathEvents
    .filter((d) => d.player === player.name && d.timestamp < atMs)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!lastDeath) return false;

  const revivedAt = firstActivityAfter(player, lastDeath.timestamp);
  if (revivedAt === undefined || revivedAt > atMs) return true; // still dead at atMs
  return atMs - revivedAt < RESURRECTION_GRACE_MS;
}

// ── Main entry point ─────────────────────────────────────────────────────

/**
 * Detects missed mitigation assignments for one pull, grounded in deaths:
 * only mechanics the raid actually died to in THIS pull are checked, and
 * only slot assignments the roster can attribute with confidence (see
 * mitigation-plan.ts's `tentative` flag) are flagged.
 */
export function detectMitigationErrors(pull: Pull, plan: MitigationPlan | null): PullError[] {
  if (!plan || pull.game !== "ffxiv" || pull.players.length === 0 || pull.deathEvents.length === 0) {
    return [];
  }

  // Matched as two INDEPENDENT passes (see flattenTankMechanics) so a
  // death confirms both its phase-tab occurrence (healer/DPS columns) and
  // its tank-table occurrence (MT/OT or Chaos/Exdeath columns) rather than
  // whichever sheet timestamp happens to be closer stealing the match.
  const occurrences = [
    ...matchDeathsToMechanics(pull.deathEvents, flattenPhaseMechanics(plan)),
    ...matchDeathsToMechanics(pull.deathEvents, flattenTankMechanics(plan)),
  ];
  if (occurrences.length === 0) return [];

  const slots = resolveMitigationSlots(pull.players, plan);
  const slotByLabel = new Map(slots.map((s) => [s.slot, s]));

  const errors: PullError[] = [];

  for (const { mech, anchorMs, victims } of occurrences) {
    for (const [slotLabel, entries] of Object.entries(mech.assignments!)) {
      if (slotLabel === "Extras") continue;

      // Plain party slots (MT/OT/healer job/D1-D4) resolve via the roster
      // mapping; priority-order columns ("Chaos (WAR > DRK > GNB > PLD)")
      // resolve deterministically via the sheet's own listed order instead
      // — see resolveTankPriorityColumn for why that one isn't "tentative"
      // the way MT/OT is.
      const partySlot = slotByLabel.get(slotLabel);
      let player: PlayerInfo | null;
      if (partySlot) {
        if (!partySlot.player || partySlot.tentative) continue;
        player = partySlot.player;
      } else {
        player = resolveTankPriorityColumn(slotLabel, pull.players);
        if (!player) continue;
      }

      // Already dead (or just barely revived) when this mitigation came
      // due — not their fault they couldn't cast it (see
      // isDeadOrFreshlyRevived's comment above).
      if (isDeadOrFreshlyRevived(player, pull.deathEvents, anchorMs)) continue;

      const missing: string[] = [];
      for (const entry of entries) {
        for (const rawAbility of entry.abilities) {
          // "Kitchen Sink" expands to 3 independent requirements (Rampart +
          // 40% + Short Mit) rather than being one OR-group — see
          // expandRequiredAbilities's header. A no-op for every other term.
          for (const ability of expandRequiredAbilities(rawAbility)) {
            const candidates = resolveRequiredAbilityNames(ability, player);
            if (!candidates) continue; // unsupported term or wrong job — not checkable

            // Ground-truth check first (was it actually active on whoever
            // took the hit); only fall back to the cast-timing heuristic when
            // that can't be determined (no buff data on this event — e.g.
            // older cached sample data, or no matching death for this
            // occurrence at all).
            const activeOnHit = wasBuffActiveOnHit(pull.players, pull.deathEvents, candidates, anchorMs);
            const satisfied = activeOnHit ?? hasCastNear(player, candidates, anchorMs);
            if (!satisfied) missing.push(candidates[0]);
          }
        }
      }
      if (missing.length === 0) continue;

      const meta = findAbilityMeta(pull.players, missing[0]);
      errors.push({
        ruleId:      MITIGATION_MISSED_RULE_ID,
        severity:    "Minor",
        name:        "Missed Mitigation",
        description: `Assigned to cast ${missing.join(", ")} for ${mech.name} (${slotLabel}) — not found before ${formatPlayerList(victims)} died to it.`,
        timestamp:   anchorMs,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   meta.abilityId,
        abilityName: missing.join(", "),
        abilityIcon: meta.abilityIcon,
      });
    }
  }

  return errors;
}
