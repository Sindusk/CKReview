// lib/mechanics/ffxiv/arcadion/lindwurm-damage-context.ts
//
// Damage context for Lindwurm (M12S door boss). Lindwurm II is its own
// fight in the log and has no context yet.
//
// Sources:
// - lindwurm-1.ts header (VERIFIED AGAINST LOGS): the clock, Refreshing
//   Overkill as the timed check (+7:17, lethal at +7:24 in all four
//   enrages), Act 2's In Line chain pairs, Act 3's untargetable stretch.
// - HP measured with build-fight-context/tools/phase-hp.js on
//   H9fnVZgPA3krpCzY (16 pulls, kill B3) and vFY7kHVWK19ZQ24A (kill C1).
// - Duty cost measured 2026-10-12 on B3, C1 and the six wipes that reached
//   Refreshing Overkill or Slaughtershed (B1, B9, B14, B15, A28, A77):
//   casts/s of the duty players against everyone else in the same window.
//
// One phase. The log has no phase segments; the analysis treats the pull
// as one span, and phase 0 here is the documentation and the deciding
// phase.
// - Pool: 104.59M, a fixed pool. The kills took it to 1 HP: C1 at +7:13.1,
//   ended +7:13.8; B3 0.5% at +7:17.7, ended +7:17.8. Refreshing Overkill
//   ends the fight either way, so the whole pool must go before ~+7:17.
//   Wipes at the check: B1 4.1% and B9 2.0% at +7:19 (enraged), so this
//   phase decides the enrage. No hold: the slowdown from 10% to 5% (C1 26s,
//   B3 22s) shows in the enrage wipes too (B9 33s), so it's the fight, not
//   the raid waiting.
// - Untargetable time (Act 3, +3:29-3:42) is inferred by the analysis.
//
// Forced windows:
// - Boss at 1 HP: from that hit to the end (C1: 0.7s).
// - Act 2 chain runs, melee only. From a pair's Unbreakable Flesh to 1.5s
//   after it breaks, alpha leaves Cruel Coil through its opening and beta
//   holds the center. Melee cast 0.68x the others' rate over 31 runs
//   (alpha 0.69, beta 0.67); physical ranged 0.97 (24 runs), casters 0.90
//   (8 runs), so only melee are excused. Curtain Call's chains break all
//   eight at once and have no comparison group: not excused.
// Measured as no loss, so not excused: Act 2 tower soaks (1.03x),
// Mortal Slayer baits (green 1.09x, purple 1.04x), Curtain Call's Rotting
// Flesh holders running into Ravenous Reach (1.14x).
//
// Movement windows (measured 2026-10-14; movement stays lenient, idle
// beyond the player's own usual rate shows as movement, not lost):
// - Sources: CABrk9zXLfJG8h6R pulls 1-2 (2 = kill), H9fnVZgPA3krpCzY pulls 1,
//   3 (kill), 9, vFY7kHVWK19ZQ24A pull 1 (kill), vVPtwaTQ62Jg391q pulls 1,
//   3 (kill). All one static (Prepull Sorry); the clock matches B/C above
//   within ~0.3s. Idle = the analysis's unforced GCD gaps per 1s bin from
//   each anchor, players dead in the span left out. Lindwurm sits at
//   (100,85); melee GCDs land from up to ~17-18y of that point (positions on
//   hits taken within 0.6s of a melee GCD).
// - Act 1 busters and six-player Fusion, melee only (tanks too): Visceral
//   Burst 46294 (1:38.3) from 3.0s before to 0.7s after. The Paladin
//   invulns both busters in the far corner (118,100), ~24y out; the stack
//   sat at (117,100), ~23y, in H9 pull 3. Melee pressed a ranged GCD at
//   1:35.7-1:38.0 in 6 of the 8 pulls (Tomahawk, Unmend, Shield Lob, Harpe,
//   Piercing Talon: 8 casts), then gap-closed back 1:38.0-1:38.8. Apart
//   from the pull opener, melee pressed only eight other ranged GCDs in all
//   eight pulls, four of them in Curtain Call.
// - Act 1 resolution, everyone: the first Hemorrhagic Projection 46255
//   (1:29.1) from 2.0s before to 0.8s after. Each cone points the way its
//   owner faces, and attacking Lindwurm turns the player to face him (the
//   Dancing Mad gaze precedent); Reach and the spread/stack corners land
//   in the same second. Idle in 1:28.9-1:29.9: healers 44%, tanks 15%,
//   ranged 14%, melee 12%, against 0-5% in the seconds around it.
// - Curtain Call, everyone: the first Phagocyte Spotlight 46238 after
//   Grotesquerie: Curtain Call (4:17.7) to 2.0s after the last chain break
//   46260 (~4:36.6). Five puddle baits on the NW route, Reach run-in,
//   spreads, regroup, then the chains stretched west/east: melee idle 13-20%
//   at 4:24.8-4:27.8 and ~10% at 4:34.8-4:37.8, healers 16-37% from 4:21.8
//   to 4:37.8. Over the span healers idled 18.4% (Astrologian, 6.2%
//   elsewhere) and 9.2% (Sage, 2.9%), Reaper 10.8% (1.2%), Samurai 6.3%
//   (0.7%). Some chain-break spots sat ~20-21y out: the Dark Knight
//   Unmended at 4:36.2 / 4:36.5 in H9 pulls 1 and 3.
// - Slaughtershed, everyone, each cycle: from 5s before its Fourth-Wall
//   Fusion 46293 (5:52 / 6:21 / 6:50) to 3.5s after its second arm cast
//   (Raptor Knuckles 46287/46288, Serpentine Scourge 46289/46290: +5.7s and
//   +10.2s after the Fusion). Regions for spreads and the stack, then the
//   half-room arms or corner knockbacks and back. Healers idled 19.5%
//   (Astrologian, 4.4% elsewhere) and 10.1% (Sage, 1.6%) across the three
//   cycles, peaking just after the Fusion and after each arm. Melee,
//   ranged and casters stayed near their usual rate on average (Dragoon
//   1.7% vs 2.0%, Pictomancer 2.6% vs 3.1%), so the window mostly moves the
//   healers' excess plus single gaps (vFY7 kill: the Gunbreaker at 5:52).
// Checked and not added: Mortal Slayer (no idle in either set), Act 2
// beyond the chain runs (no excess for anyone), Act 3's return from the
// islands (the raid hits again within ~1s of Lindwurm coming back; 0.1-0.2s
// average idle after it), Raptor Knuckles alone (melee idle there was
// deaths: the knock-offs).

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Lindwurm";
const ONE_HP = 0.001;
const UNBREAKABLE = [1004753, 1004755];
// Act 2 (+2:00) to Constrictor (+2:57): the In Line pairs break one at a time.
const ACT_2 = 48830;
const ACT_2_SPAN_MS = 70_000;
const AFTER_BREAK_MS = 1_500;

// Movement windows (header "Movement windows").
const VISCERAL_BURST = 46294;
const BUSTER_BEFORE_MS = 3_000;
const BUSTER_AFTER_MS = 700;
const HEMORRHAGIC_PROJECTION = 46255;
const CONES_BEFORE_MS = 2_000;
const CONES_AFTER_MS = 800;
const CURTAIN_CALL = 48832;
const PHAGOCYTE_SPOTLIGHT = 46238;
const CHAIN_BREAK = 46260;
const CURTAIN_CALL_SPAN_MS = 40_000;   // Curtain Call (4:13) to past its chain breaks (~4:37)
const CC_AFTER_BREAK_MS = 2_000;
const FUSION_SLAUGHTERSHED = 46293;
const ARMS = [46287, 46288, 46289, 46290];   // Raptor Knuckles, Serpentine Scourge casts
const ARMS_SPAN_MS = 15_000;                 // the second arm comes ~10.2s after the Fusion
const SLAUGHTER_BEFORE_MS = 5_000;
const SLAUGHTER_AFTER_MS = 3_500;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-lw1-avoidable":   "avoidable damage",
  "ffxiv-lw1-cone":        "Act 1 cones",
  "ffxiv-lw1-overlap":     "spreads",
  "ffxiv-lw1-orb":         "Mortal Slayer",
  "ffxiv-lw1-chain-clip":  "chain explosions",
  "ffxiv-lw1-stack":       "Fourth-Wall Fusion",
  "ffxiv-lw1-buster":      "Visceral Burst",
  "ffxiv-lw1-chain":       "Act 2 chains",
  "ffxiv-lw1-tower":       "Act 2 towers",
  "ffxiv-lw1-metamitosis": "Act 3 towers",
  "ffxiv-lw1-fall":        "a fall",
};

export const LINDWURM_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 104_590_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Lindwurm to 1 HP before Refreshing Overkill (~7:17)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Lindwurm at 1 HP: the check is met" });

    const act2 = (pull.enemyCasts ?? []).find((e) => e.abilityId === ACT_2)?.timestamp;
    if (act2 !== undefined) {
      for (const p of pull.players) {
        if (p.rangeType !== "Melee") continue;
        for (const on of p.debuffs.filter((e) => UNBREAKABLE.includes(e.abilityId) && e.debuffStatus === "applied" &&
          e.timestamp >= act2 && e.timestamp <= act2 + ACT_2_SPAN_MS)) {
          const off = p.debuffs.find((e) => e.abilityId === on.abilityId && e.debuffStatus === "removed" && e.timestamp > on.timestamp);
          if (!off) continue;
          out.push({ startMs: on.timestamp, endMs: off.timestamp + AFTER_BREAK_MS, cause: "Act 2 chain run (leaving or holding Cruel Coil)", players: [p.name] });
        }
      }
    }
    return out;
  },
  movementWindows: (pull: Pull) => {
    const casts = pull.enemyCasts ?? [];
    const first = (id: number, after = -Infinity) =>
      casts.filter((e) => e.abilityId === id && e.timestamp > after).reduce<number | undefined>((m, e) => (m === undefined || e.timestamp < m ? e.timestamp : m), undefined);
    const out: ForcedWindow[] = [];
    const melee = pull.players.filter((p) => p.rangeType === "Melee").map((p) => p.name);

    const burst = first(VISCERAL_BURST);
    if (burst !== undefined && melee.length) out.push({ startMs: burst - BUSTER_BEFORE_MS, endMs: burst + BUSTER_AFTER_MS,
      cause: "Act 1 busters and stack (corners out of reach)", players: melee });

    const cones = first(HEMORRHAGIC_PROJECTION);
    if (cones !== undefined) out.push({ startMs: cones - CONES_BEFORE_MS, endMs: cones + CONES_AFTER_MS,
      cause: "Act 1 cones (facing) and corners" });

    const cc = first(CURTAIN_CALL);
    if (cc !== undefined) {
      const spot = first(PHAGOCYTE_SPOTLIGHT, cc);
      const breaks = casts.filter((e) => e.abilityId === CHAIN_BREAK && e.timestamp > cc && e.timestamp <= cc + CURTAIN_CALL_SPAN_MS).map((e) => e.timestamp);
      if (spot !== undefined && breaks.length) out.push({ startMs: spot, endMs: Math.max(...breaks) + CC_AFTER_BREAK_MS,
        cause: "Curtain Call (baits, Reach, chains)" });
    }

    for (const f of casts.filter((e) => e.abilityId === FUSION_SLAUGHTERSHED)) {
      const arms = casts.filter((e) => ARMS.includes(e.abilityId) && e.timestamp > f.timestamp && e.timestamp <= f.timestamp + ARMS_SPAN_MS).map((e) => e.timestamp);
      if (!arms.length) continue;
      out.push({ startMs: f.timestamp - SLAUGHTER_BEFORE_MS, endMs: Math.max(...arms) + SLAUGHTER_AFTER_MS,
        cause: "Slaughtershed (regions, arms)" });
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
