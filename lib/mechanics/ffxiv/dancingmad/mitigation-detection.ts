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
} from "./mitigation-plan";

export const MITIGATION_MISSED_RULE_ID = "ffxiv-mitigation-missed";

// How close (in ms) a death must land to a plan mechanic's sheet timestamp
// to be considered "this mechanic" rather than a coincidence. Generous
// because real pulls drift from the sheet's idealized pacing (extra deaths/
// downtime earlier in the pull push everything later).
const MECHANIC_MATCH_WINDOW_MS = 30_000;

// Window (anchored on the real death time, not the sheet's static time —
// see header) searched for the assigned player's cast. Mitigation buffs on
// this sheet top out around 20s duration (Temperance), and carry-over
// entries are always chained across mechanics the sheet itself places
// close together, so 45s back comfortably covers a carry-over cast without
// reaching into a different mechanic's window. A few seconds forward covers
// a cast logged just after the damage tick due to event ordering.
const CAST_LOOKBACK_MS  = 45_000;
const CAST_LOOKAHEAD_MS = 3_000;

// ── Generic-term resolution ──────────────────────────────────────────────
//
// Most sheet entries are already real FFLogs ability names (Reprisal, Feint,
// Sacred Soil, ...) and match a cast's abilityName directly. A few are sheet
// shorthand for a job-specific real ability or an either-of pair — resolved
// here instead of guessing from the sheet's qualifier text, since deriving
// the requirement from the ASSIGNED PLAYER's actual job is exact where the
// qualifier text ("WAR/PLD" vs "GNB/DRK") would just be redundant.

const PARTY_MIT_BY_JOB: Record<string, string> = {
  Warrior:     "Shake It Off",
  Paladin:     "Divine Veil",
  Gunbreaker:  "Heart of Light",
  "Dark Knight": "Dark Missionary",
};

// Sheet ability name -> resolver. Returns candidate real ability names
// (satisfied if the player cast ANY of them) or null if this entry isn't
// checkable for this player (wrong job for a job-gated term, or a term this
// module doesn't support yet — see header).
function resolveRequiredAbilityNames(ability: PlanAbility, player: PlayerInfo): string[] | null {
  switch (ability.name) {
    case "Party Mit": {
      const name = PARTY_MIT_BY_JOB[player.className];
      return name ? [name] : null;
    }
    case "Spreadlo":
      return player.className === "Scholar" ? ["Succor", "Deployment Tactics"] : null;
    case "Zoe Shields":
      return player.className === "Sage" ? ["Zoe", "Eukrasian Prognosis"] : null;
    case "LB3":       // limit break — logged under the specific LB's own
      return null;    // name per job, not a stable string to check against.
    case "✔":
      return null;
    default:
      return [ability.name];
  }
}

// ── Death -> mechanic matching ───────────────────────────────────────────

// Sheet mechanic names sometimes bundle multiple boss-ability names
// ("Stray Flames/Tsunami", "Stomp-a-Mole + Knock Down") or append a
// non-ability qualifier FFLogs won't have ("Thunder III (1st Set)",
// "Towers II (Past/Future's End)"). Splits into comparable tokens.
function mechanicNameTokens(mechName: string): string[] {
  const stripped = mechName.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return stripped
    .split(/\/|\+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function mechanicMatchesDeathCause(mech: PlanMechanic, deathCause: string): boolean {
  const cause = deathCause.trim().toLowerCase();
  if (!cause || cause.startsWith("unknown")) return false;
  return mechanicNameTokens(mech.name).some((t) => t === cause || t.includes(cause) || cause.includes(t));
}

type FlatMechanic = { phaseTitle: string; mech: PlanMechanic };

function flattenPhaseMechanics(plan: MitigationPlan): FlatMechanic[] {
  const out: FlatMechanic[] = [];
  for (const phase of plan.data.phases) {
    for (const mech of phase.mechanics) {
      if (mech.timeSeconds === undefined || !mech.assignments) continue;
      out.push({ phaseTitle: phase.title, mech });
    }
  }
  return out;
}

// One matched occurrence of a mechanic in THIS pull: which sheet mechanic,
// and the earliest real timestamp (ms into pull) a death confirmed it at.
type MatchedOccurrence = { mech: PlanMechanic; anchorMs: number };

function matchDeathsToMechanics(deaths: DeathEvent[], flat: FlatMechanic[]): MatchedOccurrence[] {
  const byMechanic = new Map<PlanMechanic, number>(); // mech -> earliest death ms

  for (const death of deaths) {
    let best: { mech: PlanMechanic; diff: number } | null = null;
    for (const { mech } of flat) {
      if (!mechanicMatchesDeathCause(mech, death.cause)) continue;
      const diff = Math.abs(death.timestamp - mech.timeSeconds! * 1000);
      if (diff > MECHANIC_MATCH_WINDOW_MS) continue;
      if (!best || diff < best.diff) best = { mech, diff };
    }
    if (!best) continue;
    const prevAnchor = byMechanic.get(best.mech);
    if (prevAnchor === undefined || death.timestamp < prevAnchor) {
      byMechanic.set(best.mech, death.timestamp);
    }
  }

  return [...byMechanic.entries()].map(([mech, anchorMs]) => ({ mech, anchorMs }));
}

// ── Cast checking ─────────────────────────────────────────────────────────

function hasCastNear(player: PlayerInfo, abilityNames: string[], anchorMs: number): boolean {
  const wanted = new Set(abilityNames.map((n) => n.toLowerCase()));
  return player.casts.some(
    (c) =>
      wanted.has(c.abilityName.toLowerCase()) &&
      c.timestamp >= anchorMs - CAST_LOOKBACK_MS &&
      c.timestamp <= anchorMs + CAST_LOOKAHEAD_MS
  );
}

// Best-effort ability id/icon for the missed ability, sourced from ANY
// player's cast history in this pull that used it (for icon display only —
// falls back to 0/none if nobody in this pull ever cast it).
function findAbilityMeta(players: PlayerInfo[], name: string): { abilityId: number; abilityIcon?: string } {
  for (const p of players) {
    const c = p.casts.find((e) => e.abilityName.toLowerCase() === name.toLowerCase());
    if (c) return { abilityId: c.abilityId, abilityIcon: c.abilityIcon };
  }
  return { abilityId: 0 };
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

  const flat = flattenPhaseMechanics(plan);
  const occurrences = matchDeathsToMechanics(pull.deathEvents, flat);
  if (occurrences.length === 0) return [];

  const slots = resolveMitigationSlots(pull.players);
  const slotByLabel = new Map(slots.map((s) => [s.slot, s]));

  const errors: PullError[] = [];

  for (const { mech, anchorMs } of occurrences) {
    for (const [slotLabel, entries] of Object.entries(mech.assignments!)) {
      if (slotLabel === "Extras") continue;
      const assignment = slotByLabel.get(slotLabel);
      if (!assignment || !assignment.player || assignment.tentative) continue;
      const player = assignment.player;

      const missing: string[] = [];
      for (const entry of entries) {
        for (const ability of entry.abilities) {
          const candidates = resolveRequiredAbilityNames(ability, player);
          if (!candidates) continue; // unsupported term or wrong job — not checkable
          if (!hasCastNear(player, candidates, anchorMs)) {
            missing.push(candidates[0]);
          }
        }
      }
      if (missing.length === 0) continue;

      const meta = findAbilityMeta(pull.players, missing[0]);
      errors.push({
        ruleId:      MITIGATION_MISSED_RULE_ID,
        severity:    "Major",
        name:        "Missed Mitigation",
        description: `Assigned to cast ${missing.join(", ")} for ${mech.name} (${slotLabel}) — not found before the raid took a death to it.`,
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
