// lib/mechanics/ffxiv/arcadion/vamp-fatale-damage-context.ts
//
// Damage context for Vamp Fatale (M9S).
//
// Sources:
// - vamp-fatale.ts header (VERIFIED AGAINST LOGS on jN3XDrf2z8PmLgRJ): a
//   timed script, one boss, no HP transitions; enrage Finale Fatale cast
//   +605 (P6 there). Coffinmaker +68..+125, the boss untargetable while it
//   advances; the add waves (Fatal Flails, Deadly Doornails) +297..+357;
//   Charnel Cells only their inmate can damage.
// - HP measured 2026-10-13 with build-fight-context/tools/phase-hp.js on
//   the kills 6XaWqwMbkZG9pLmx fight 1 (8:36) and 7tb1fYPkjy4RQ2L9 fight 26
//   (9:21).
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: 110.59M, a fixed pool. Both kills took it to 1 HP (+8:35.5,
//   +9:20.2) and dealt 109.5-110.9M; Finale Fatale ends the pull at ~10:05
//   either way, so the pool decides the enrage.
// - Coffinmaker (10.26M) died at 1:58.4 and 1:58.1, killed by damage
//   (10.3-10.4M dealt), and the boss was hit from 1:59.2 / 1:59.7: killing
//   it sooner returns the boss sooner, so damage on it counts. The boss's
//   untargetable stretch is inferred by the analysis.
// - The adds (Flails, Doornails, Cells) must die; damage on them counts.
// - No hold: nothing to hold for in a single-phase fight.
//
// Forced windows:
// - Boss at 1 HP: from that hit to the end.
// The Bard's second DoT after Coffinmaker (user, 2026-10-13: Caustic Bite
// and Stormbite go back on one GCD apart) is handled in the engine
// (shared.ts DotSpec.pairedIds), since it applies after any lapse.
//
// Movement windows (measured 2026-10-14 on the kills CABrk9zXLfJG8h6R
// fight 1, 6XaWqwMbkZG9pLmx fight 1, vVPtwaTQ62Jg391q fight 1 and
// jN3XDrf2z8PmLgRJ P8, from the engine's own GCD gaps and disengages
// without a context; positions from damage-taken x/y against the boss's
// nearest cast). Movement stays lenient (docs/dps-analysis.md): only
// stretches where idle or ranged fillers rose above normal on every kill.
// Out-of-melee spots are movement, not forced (user, 2026-10-13).
// - Vamp Stomp, melee: each carrier's own cleanse (Bombpyre 1004729
//   removed, its own Blast Beat ~0.6s later) is 5-9y from the boss. 26 of
//   33 melee cleanses show a ranged filler or a gap from 5.6s before the
//   explosion to 1.2s after (CABrk 0:34-0:38, 3:51-3:57, 8:31-8:39; the
//   other kills the same three). From 5.5s before the removal to 2s after.
// - Coffinmaker, melee: the add advances down the lane (Dead Wake) while
//   its blades and Half Moon cleave (Coffinfiller), and melee back off
//   ahead of it. Tank ranged fillers at each Dead Wake (-1.4..+0.8s) and
//   each blade pair (+0.1..+3.2s): CABrk's Dark Knight 8 in 1:09-1:44;
//   melee gaps 2-3x their pull rate on 9 of 16 melee (6XaW Samurai 12%
//   against 4%). Ranged and healers show none. One window from 2s before
//   the first Dead Wake to 1.5s after the last Coffinfiller.
// - Aetherletting, melee: each marked drop is at the wall, 24-29y from the
//   boss (10-11y for the ones dropped on the boss's side). 11 of 16 melee
//   drops show a filler or gap 3.2s before to 4s after their own drop
//   45970 (3:14-3:20 every kill). From 3.5s before the drop to 3s after.
// - Plummet, saws and add waves, everyone: Gravegrazer saws sweep the
//   arena 4:49-5:56 while towers, Flails and the Doornail pull players
//   around. Idle 2-4x the pull rate for most players in all four kills
//   (jN3X Paladin 9.2% against 0.5%, vVPt Astrologian 10.9% against
//   4.1%; Dancer and Bard unchanged), tank fillers at their 16-17y towers.
//   From the first Gravegrazer to 1.5s after the last.
// - Hell in a Cell, melee soakers: the towers are 9-23y from the boss. 13
//   of 16 melee soakers show a filler or gap 1.3s before to 2.3s after
//   their Bloody Bondage 45974 (6:41-6:43, 7:04-7:06), against 3 of 16
//   ranged soakers. From 2.5s before the soak to 2.5s after.
// - Undead Deathmatch and Sanguine Scratch, everyone: two rotating legs
//   with bat circle/donut, plus the bat-less Scratch at 9:10. Healers and
//   casters idled 2-8x their pull rate (jN3X Astrologian 27% against 6%,
//   Sage 20% against 3%; CABrk Astrologian 12.5% against 1.7%); melee
//   stay on the boss and lose nothing. From 1.5s before Deathmatch's cast
//   to 1.5s after the last Scratch or bat cast (chained within 10s).
// - Enlarged Hardcore (45952), each tank hit: the third Hardcore is
//   always enlarged and the tanks take it 15-18y from the boss. jN3X P8
//   8:59.8 (Paladin gap, Dark Knight filler) and P6 8:57-8:59 (Gunbreaker
//   gap and filler); the sample's other kills end before it. From 4s
//   before the hit to 1.5s after. Normal Hardcores show nothing.
// Checked and left out: Brutal Rain, Killer Voice, Finale, Crowd Kill,
// Thirst, Aetherletting's center stack for the lines, Ultrasonic Amp and
// Spread, and normal Hardcores showed no rise; the Bard's 4.3s at 6XaW
// 0:46.9 (Rain) and the Dark Knight's 5.3s at jN3X 0:46 are one-offs.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Vamp Fatale";
const ONE_HP = 0.001;

const BOMBPYRE = 1004729;                 // removed = the carrier's own cleanse
const STOMP_BEFORE_MS = 5_500;
const STOMP_AFTER_MS = 2_000;
const COFFIN_IDS = new Set([46853, 45927, 45928, 45929, 45930]);   // Dead Wake, Coffinfiller
const COFFIN_CHAIN_MS = 20_000;
const COFFIN_BEFORE_MS = 2_000;
const COFFIN_AFTER_MS = 1_500;
const AETH_DROP = 45970;                  // the marked player's own drop
const AETH_BEFORE_MS = 3_500;
const AETH_AFTER_MS = 3_000;
const SAW_IDS = new Set([45931, 45932]);  // Gravegrazer (Coffinmaker, Neckbiter)
const SAW_CHAIN_MS = 5_000;
const SAW_AFTER_MS = 1_500;
const CELL_SOAK = 45974;                  // Bloody Bondage on a cell-tower soaker
const CELL_BEFORE_MS = 2_500;
const CELL_AFTER_MS = 2_500;
const SCRATCH_IDS = new Set([45984, 45988, 45990, 45992, 45993, 45994, 45995]);
const SCRATCH_CHAIN_MS = 10_000;
const SCRATCH_BEFORE_MS = 1_500;
const SCRATCH_AFTER_MS = 1_500;
const HARDCORE_ENLARGED = 45952;
const HARDCORE_BEFORE_MS = 4_000;
const HARDCORE_AFTER_MS = 1_500;

/** Enemy casts of `ids`, chained when the next is within `chainMs`. */
function castChains(pull: Pull, ids: Set<number>, chainMs: number): { startMs: number; endMs: number }[] {
  return (pull.enemyCasts ?? [])
    .filter((e) => ids.has(e.abilityId))
    .map((e) => e.timestamp)
    .sort((a, b) => a - b)
    .reduce<{ startMs: number; endMs: number }[]>((chains, t) => {
      const last = chains[chains.length - 1];
      if (last && t - last.endMs <= chainMs) last.endMs = t;
      else chains.push({ startMs: t, endMs: t });
      return chains;
    }, []);
}

/** One window per hit of `abilityId` on each player `who` admits (500ms dedup). */
function hitWindows(
  pull: Pull, abilityId: number, who: (p: Pull["players"][number]) => boolean,
  before: number, after: number, cause: string,
): ForcedWindow[] {
  return pull.players.filter(who).flatMap((p) => p.damageTaken
    .filter((e) => e.abilityId === abilityId)
    .filter((e, i, all) => i === 0 || e.timestamp - all[i - 1].timestamp > 500)
    .map((e) => ({ startMs: e.timestamp - before, endMs: e.timestamp + after, cause, players: [p.name] })));
}

const melee = (p: Pull["players"][number]) => p.rangeType === "Melee";

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-vf-avoidable":             "avoidable damage",
  "ffxiv-vf-stomp-bat":             "Vamp Stomp",
  "ffxiv-vf-stomp-overlap":         "Vamp Stomp",
  "ffxiv-vf-hardcore-party":        "Hardcore",
  "ffxiv-vf-rain-missed":           "Brutal Rain",
  "ffxiv-vf-rain-wipe":             "Brutal Rain",
  "ffxiv-vf-aetherletting-overlap": "Aetherletting",
  "ffxiv-vf-aetherletting-cross":   "Aetherletting",
  "ffxiv-vf-aetherletting-clip":    "Aetherletting",
  "ffxiv-vf-aetherletting-misplaced": "Aetherletting",
  "ffxiv-vf-saw":                   "the saws",
  "ffxiv-vf-flail-tower":           "Plummet towers",
  "ffxiv-vf-barbed-burst":          "Barbed Burst",
  "ffxiv-vf-doornail":              "Deadly Doornail",
  "ffxiv-vf-cell-tower":            "Hell in a Cell",
  "ffxiv-vf-cell-cone":             "Ultrasonic cones",
  "ffxiv-vf-last-lash":             "Hell in a Cell",
  "ffxiv-vf-deathmatch-tower":      "Undead Deathmatch",
};

export const VAMP_FATALE_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 110_590_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Vamp Fatale to 1 HP before Finale Fatale (~10:05)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Vamp Fatale at 1 HP: the check is met" });
    return out;
  },
  movementWindows: (pull: Pull) => {
    const meleeNames = pull.players.filter(melee).map((p) => p.name);
    return [
      ...pull.players.filter(melee).flatMap((p) => p.debuffs
        .filter((d) => d.abilityId === BOMBPYRE && d.debuffStatus === "removed")
        .map((d) => ({
          startMs: d.timestamp - STOMP_BEFORE_MS, endMs: d.timestamp + STOMP_AFTER_MS,
          cause: "Vamp Stomp: cleansing Bombpyre", players: [p.name],
        }))),
      ...castChains(pull, COFFIN_IDS, COFFIN_CHAIN_MS).map((c) => ({
        startMs: c.startMs - COFFIN_BEFORE_MS, endMs: c.endMs + COFFIN_AFTER_MS,
        cause: "Coffinmaker: Dead Wake and blade dodges", players: meleeNames,
      })),
      ...hitWindows(pull, AETH_DROP, melee, AETH_BEFORE_MS, AETH_AFTER_MS, "Aetherletting: drop at the wall"),
      ...castChains(pull, SAW_IDS, SAW_CHAIN_MS).map((c) => ({
        startMs: c.startMs, endMs: c.endMs + SAW_AFTER_MS, cause: "saws, towers and add waves",
      })),
      ...hitWindows(pull, CELL_SOAK, melee, CELL_BEFORE_MS, CELL_AFTER_MS, "Hell in a Cell: tower soak"),
      ...castChains(pull, SCRATCH_IDS, SCRATCH_CHAIN_MS).map((c) => ({
        startMs: c.startMs - SCRATCH_BEFORE_MS, endMs: c.endMs + SCRATCH_AFTER_MS,
        cause: "Undead Deathmatch / Sanguine Scratch",
      })),
      ...hitWindows(pull, HARDCORE_ENLARGED, (p) => p.role === "Tank",
        HARDCORE_BEFORE_MS, HARDCORE_AFTER_MS, "enlarged Hardcore: tank out wide"),
    ];
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
