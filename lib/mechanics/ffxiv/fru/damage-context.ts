// lib/mechanics/ffxiv/fru/damage-context.ts
//
// Futures Rewritten (Ultimate)'s fight context for the damage analysis
// (lib/damage/types.ts DamageContext; the Dancing Mad one is the model).
// Built 2026-10-12 from the five module headers (fatebreaker.ts,
// usurper-of-frost.ts, oracle-of-darkness.ts, enter-the-dragon.ts,
// pandora.ts) and HP measured from players' hits (healthAfter / maxHealth)
// on the kills dDar482XvFKBPJYh, DWbAwTGQrYznK1jL, wY9h1862A3gXbFxm and
// ~40 wipes across the P2-P4 samples. Every kill runs the same clock to
// within ~5s (P1 ends 2:42-2:45, P2 7:20-7:23, P3 10:07-10:10, P4
// 14:10-14:17): every phase but P5 ends on the boss's script, so damage
// past a phase's check is wasted, and only P5's DPS decides the enrage.
//
// Phases (FFLogs phase ids; the intermission is inside P2):
// - P1 Fatebreaker, 22.29M: dies before the third Burnished Glory (40128,
//   +2:41.6) or the raid does (fatebreaker.ts "Boss defeat/1 HP transition
//   prevents enrage"). Groups hold the end of P1 like Dancing Mad's
//   Stompies (user, 2026-10-12): on dDar's kill Fatebreaker fell 10% to 5%
//   in 5.5s, then took 13.7s for the last 5% (2:27-2:40.7), and every
//   pull's kill lands 2:38-2:41. The hold runs from the last Burnt Strike
//   (40129 lightning / 40133 fire, +2:22.5: the line, the towers, then the
//   kill) to the end of the phase; the Ninja's 12.9s with no GCD at 2:28
//   on dDar's kill was this hold.
// - P2 Usurper of Frost, 25.15M: under 20% when Absolute Zero completes
//   (usurper-of-frost.ts: every pass at 20.0% or less, every enrage
//   20.0-26.3%). Past the line, her damage is wasted until she leaves
//   (her last hit in the phase); the intermission's Light crystals still
//   count. Intermission: the Ice Veil (2.51M) needs bringing under 50%;
//   Gaia's hammer finishes it and P3 starts on the script, so damage past
//   50% is wasted. Not judged: damage on the Dark crystals (the clear
//   route spares them, but a caster LB3 killing them is a valid route
//   too, usurper-of-frost.ts).
// - P3 Oracle of Darkness, 30.91M: under 20% when Memory's End completes
//   (oracle-of-darkness.ts: passes 16.6-19.7% on the cast; the samples'
//   pulls that reached P4 had 13.4-17.8%, those that wiped at 10:05
//   19.9-38.1%).
// - P4 Usurper of Frost + Oracle of Darkness, 11.94M each: both to 1 HP
//   before the scripted end (enter-the-dragon.ts), within 5 points at each
//   Morn Afah. Once both are at 1 HP the rest is wasted; one at 1 HP isn't
//   forced (switch to the other).
// - P5 Pandora, 48.54M: the hard enrage (Paradise Lost 40327 +251, landing
//   +261). Decides the enrage.
//
// Not built: per-player busy windows (tower soakers, tethers, carriers);
// the modules record the clocks (their headers) but not who was assigned.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { phaseSpans } from "../../../damage/wow/context-helpers";
import { mechanicLabelForKey } from "../../rule-meta";

const BURNT_STRIKE = new Set([40129, 40133]);
const ONE_HP = 0.001;
const SECOND_STRIKE_AFTER_MS = 120_000;

// Rule keys with no label in rule-meta.ts, for "gap during X".
const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-fb-fated-burn-mark":     "Utopian Sky tethers",
  "ffxiv-fb-tether-stack":        "Utopian Sky tethers",
  "ffxiv-fb-fall-of-faith":       "Fall of Faith",
  "ffxiv-fb-tower":               "Burnt Strike towers",
  "ffxiv-fb-knockback":           "Blastburn",
  "ffxiv-uof-gaze":               "Shining Armor",
  "ffxiv-uof-stack":              "Sinbound Holy",
  "ffxiv-uof-puddle":             "Hiemal Ray",
  "ffxiv-uof-refulgent-fate":     "Light Rampant",
  "ffxiv-uof-center-tower":       "Light Rampant",
  "ffxiv-uof-fifth-stack":        "Luminous Hammer",
  "ffxiv-uof-endless-ice-age":    "Endless Ice Age",
  "ffxiv-ood-apocalypse":         "Apocalypse",
  "ffxiv-ood-fire":               "Ultimate Relativity",
  "ffxiv-ood-unholy":             "Ultimate Relativity",
  "ffxiv-ood-blizzard":           "Ultimate Relativity",
  "ffxiv-ood-bait":               "Ultimate Relativity",
  "ffxiv-ood-eruption":           "Ultimate Relativity",
  "ffxiv-ood-gaze":               "Ultimate Relativity",
  "ffxiv-ood-water":              "Spell-in-Waiting Refrain",
  "ffxiv-ood-shell-crusher":      "Shell Crusher",
  "ffxiv-ood-spirit-taker":       "Spirit Taker",
  "ffxiv-etd-chain":              "Darklit Dragonsong",
  "ffxiv-etd-water":              "Darklit Dragonsong",
  "ffxiv-etd-lightsteep":         "Darklit Dragonsong",
  "ffxiv-etd-spirit-taker":       "Darklit Dragonsong",
  "ffxiv-etd-akh-rhai":           "Akh Rhai",
  "ffxiv-etd-wings":              "Hallowed Wings",
  "ffxiv-etd-morn-afah":          "Morn Afah",
  "ffxiv-etd-unholy":             "Crystallize Time",
  "ffxiv-etd-aero":               "Crystallize Time",
  "ffxiv-etd-blizzard":           "Crystallize Time",
  "ffxiv-etd-wyrm":               "Crystallize Time",
  "ffxiv-etd-longing":            "Crystallize Time",
  "ffxiv-etd-rewind-wings":       "Crystallize Time",
  "ffxiv-etd-dragon-head":        "Crystallize Time",
  "ffxiv-etd-crystal":            "Crystallize Time",
  "ffxiv-pan-exaline":            "Exalines",
  "ffxiv-pan-tower":              "Paradise Regained",
  "ffxiv-pan-tank-wings":         "Paradise Regained",
  "ffxiv-pan-tank-swap":          "Paradise Regained",
  "ffxiv-pan-polarizing":         "Polarizing Strikes",
  "ffxiv-pan-afterblast":         "Polarizing Strikes",
  "ffxiv-pan-box":                "Pandora's Box",
};

/** First hit in the span leaving every named target at or under `line` of its max HP (each has to cross it). */
function allCrossed(pull: Pull, span: { startMs: number; endMs: number }, targets: string[], line: number): number | undefined {
  const hits = pull.players.flatMap((p) => p.damageDone)
    .filter((e) => e.timestamp >= span.startMs && e.timestamp <= span.endMs && e.healthAfter !== undefined && e.maxHealth);
  let latest: number | undefined;
  for (const name of targets) {
    const t = hits.filter((e) => e.target === name && e.healthAfter! / e.maxHealth! <= line)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (t === undefined) return undefined;
    latest = latest === undefined ? t : Math.max(latest, t);
  }
  return latest;
}

function lastHitOn(pull: Pull, span: { startMs: number; endMs: number }, target: string): number | undefined {
  return pull.players.flatMap((p) => p.damageDone)
    .filter((e) => e.target === target && e.timestamp >= span.startMs && e.timestamp <= span.endMs)
    .reduce<number | undefined>((max, e) => (max === undefined || e.timestamp > max ? e.timestamp : max), undefined);
}

export const FRU_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Futures Rewritten",
  phases: {
    1: { pool: 22_290_000, fixedPool: true, carriesOver: false, note: "Fatebreaker dies before the third Burnished Glory; held from the last Burnt Strike" },
    2: { fixedPool: false, carriesOver: false, note: "Usurper under 20% by Absolute Zero; intermission: four Light crystals, Ice Veil under 50%" },
    3: { fixedPool: false, carriesOver: false, note: "Oracle under 20% by Memory's End" },
    4: { pool: 23_880_000, fixedPool: true, carriesOver: false, multiTarget: true, note: "Usurper and Oracle to 1 HP, within 5 points at each Morn Afah" },
    5: { pool: 48_540_000, fixedPool: true, decidesEnrage: true },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const span of phaseSpans(pull, 1)) {
      // The second set's Burnt Strike (+2:22.5; the first set is +1:06-1:12).
      const strike = (pull.enemyCasts ?? [])
        .filter((e) => BURNT_STRIKE.has(e.abilityId) && e.timestamp >= span.startMs + SECOND_STRIKE_AFTER_MS && e.timestamp <= span.endMs)
        .pop()?.timestamp;
      const dead = allCrossed(pull, span, ["Fatebreaker"], ONE_HP);
      if (strike !== undefined && (dead === undefined || strike <= dead)) {
        out.push({ startMs: strike, endMs: span.endMs, cause: "end-of-P1 hold for the transition (from the last Burnt Strike)" });
      } else if (dead !== undefined) {
        out.push({ startMs: dead, endMs: span.endMs, cause: "P1 check passed: Fatebreaker at 1 HP" });
      }
    }
    for (const span of phaseSpans(pull, 2)) {
      const under = allCrossed(pull, span, ["Usurper of Frost"], 0.2);
      const leaves = lastHitOn(pull, span, "Usurper of Frost");
      if (under !== undefined && leaves !== undefined && leaves > under) {
        out.push({ startMs: under, endMs: leaves + 2_500, cause: "P2 check passed: Usurper of Frost under 20%" });
      }
      const veil = allCrossed(pull, span, ["ice veil"], 0.5);
      if (veil !== undefined) out.push({ startMs: veil, endMs: span.endMs, cause: "Ice Veil under 50%: Gaia's hammer finishes it" });
    }
    for (const span of phaseSpans(pull, 3)) {
      const under = allCrossed(pull, span, ["Oracle of Darkness"], 0.2);
      if (under !== undefined) out.push({ startMs: under, endMs: span.endMs, cause: "P3 check passed: Oracle of Darkness under 20%" });
    }
    for (const span of phaseSpans(pull, 4)) {
      const both = allCrossed(pull, span, ["Usurper of Frost", "Oracle of Darkness"], ONE_HP);
      if (both !== undefined) out.push({ startMs: both, endMs: span.endMs, cause: "P4 check passed: both bosses at 1 HP" });
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
