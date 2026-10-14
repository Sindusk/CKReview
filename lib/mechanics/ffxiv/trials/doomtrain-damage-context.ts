// lib/mechanics/ffxiv/trials/doomtrain-damage-context.ts
//
// Damage context for Doomtrain (Hell on Rails Extreme).
//
// Sources:
// - doomtrain.ts header (VERIFIED AGAINST LOGS): the scripted car clock, the
//   orb intermission and its deadline, the last car's Derail as the hard
//   enrage (B3 +11:26).
// - HP measured 2026-10-14 with build-fight-context/tools/phase-hp.js on
//   rgTafHJ9MN47m3Vy (kills B4, B5, B6, B9, B10; wipes B1-B3, B7, B8).
// - GCD gaps measured 2026-10-14 on the same five kills (validate.js
//   damage-analysis, gaps binned by time and matched to the enemy cast that
//   explains them).
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: Doomtrain 98.90M, a fixed pool. Every kill took it to 1 HP
//   (9:33-10:27) and dealt 97.2-97.6M; the enrage wipe B3 left 3.6% at the
//   final Derail (+11:26). The pool decides the enrage.
// - The Aether orb (9.36M) is the intermission's own DPS check: killed at
//   3:34-3:47 in every pull that got past it, so damage on it counts and
//   is the only thing to hit then. The boss is untargetable from the orb's
//   arrival to the return; the analysis infers that.
// - No hold: no HP curve slows before a transition.
//
// Forced windows:
// - Doomtrain at 1 HP: from that hit to the end (kills: under 0.6s).
//
// Movement windows (everyone):
// - Dead Man's Express (45670 cast), 1s before to 3.5s after: the rear
//   knockback. B5 1:49.1-1:50.1 three players (RDM 3.5s, MNK 2.3s, AST
//   3.1s; Express 1:48.6), B6 1:48.3, B10 1:49.6; first car 0:21-0:23
//   (B5 RPR, B6 MNK).
// - Dead Man's Windpipe (45677 cast) to 2s after Blastpipe (45679 cast):
//   the draw-in, then out of the front rows. B5 0:40.7, 9:04.6; B6 9:04.2;
//   B9 9:06.8 (Windpipe 9:03.5 in B5).
// - The launchpad run: the Siege's final hit (45649 / 45703 / 45704) to 1s
//   after Derail (45711). B4 4:35.7-4:41.4: AST 10.7s, MNK 7.1s, DRK 6.7s,
//   MCH 6.0s, GNB 5.4s; B5 4:34.9 AST, B6 4:34.3 AST; car 5's run B4 7:57.9,
//   B5 7:54.0, B6 7:56.2, B9 7:59.1, B10 8:04.4.
// - Height switches: each Thunderous Breath / Headlight controller cast
//   (45687 / 45688 / 45690 / 45691), 1s before to 4s after. B5 8:32.2-
//   8:34.4: SGE, AST, MNK, GNB, DRK all 1.7-2.2s (Headlight 8:31.4,
//   Breath 8:33.9); B6 8:30.1 / 8:30.4; B9 8:25.2 / 8:27.7.
// - Arcane Revelation (47527 cast) to 1s after the sequence's last
//   Hyperconductive Plasma: following the rotating indicator. Melee every
//   kill (B5 MNK 6.9s at 5:30.4, B6 MNK 4.0s 5:32.9, B4 MNK/DRK 5:51.3/
//   5:52.7, B10 MNK 5.4s 5:57.0); on car 6 healers and ranged too (B10 RDM
//   5.5s 9:47.7, AST 9:52.4, SGE 7.4s 10:03.0; B4 AST 7.5s 10:18.8).
// Checked and left out: Plummet (two gaps per kill at most), turrets (one
// player at a time), the orb's spreads and stacks (no shared gaps).

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Doomtrain";
const ONE_HP = 0.001;

const EXPRESS = 45670;
const WINDPIPE = 45677;
const BLASTPIPE = 45679;
const SIEGE_FINAL = [45649, 45703, 45704, 45705];
const DERAIL = 45711;
const HEIGHT_CONTROLLERS = [45687, 45688, 45690, 45691];
const ARCANE = 47527;
const HYPERCONDUCTIVE = 45714;
const ARCANE_MAX_MS = 45_000;     // a sequence's last stack lands ~40s after the cast
const PAIR_MS = 15_000;           // Windpipe → Blastpipe, Siege final → Derail

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-dt-avoidable":  "avoidable damage",
  "ffxiv-dt-plasma":     "stored plasma",
  "ffxiv-dt-orb-spread": "Aetherochar spreads",
  "ffxiv-dt-arcane":     "Arcane Revelation",
  "ffxiv-dt-plummet":    "Plummet",
  "ffxiv-dt-stranded":   "Derail",
  "ffxiv-dt-fall":       "a fall",
};

const castTimes = (pull: Pull, ids: number[]) =>
  (pull.enemyCasts ?? []).filter((e) => ids.includes(e.abilityId)).map((e) => e.timestamp).sort((a, b) => a - b);

/** One timestamp per wave (casts within 3s are one wave). */
const waves = (ts: number[]) => ts.filter((t, i) => i === 0 || t - ts[i - 1] > 3_000);

export const DOOMTRAIN_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 98_900_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Doomtrain to 1 HP before the last car's Derail (~11:26)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Doomtrain at 1 HP: the check is met" });
    return out;
  },
  movementWindows: (pull: Pull) => {
    const end = pull.fightDuration;
    const out: ForcedWindow[] = [];
    const push = (startMs: number, endMs: number, cause: string) => out.push({ startMs: Math.max(0, startMs), endMs: Math.min(end, endMs), cause });
    for (const t of waves(castTimes(pull, [EXPRESS]))) push(t - 1_000, t + 3_500, "Dead Man's Express knockback");
    const blast = castTimes(pull, [BLASTPIPE]);
    for (const t of waves(castTimes(pull, [WINDPIPE]))) {
      const b = blast.find((x) => x >= t && x - t <= PAIR_MS);
      if (b !== undefined) push(t, b + 2_000, "Dead Man's Windpipe draw-in and Blastpipe");
    }
    const derails = castTimes(pull, [DERAIL]);
    for (const t of waves(castTimes(pull, SIEGE_FINAL))) {
      const d = derails.find((x) => x >= t && x - t <= PAIR_MS);
      if (d !== undefined) push(t, d + 1_000, "Running to the launchpad before Derail");
    }
    for (const t of waves(castTimes(pull, HEIGHT_CONTROLLERS))) push(t - 1_000, t + 4_000, "Changing height for Thunderous Breath / Headlight");
    const stacks = castTimes(pull, [HYPERCONDUCTIVE]);
    for (const t of castTimes(pull, [ARCANE])) {
      const last = stacks.filter((x) => x > t && x - t <= ARCANE_MAX_MS).pop();
      if (last !== undefined) push(t, last + 1_000, "Arcane Revelation (following the indicator)");
    }
    return out.filter((w) => w.endMs > w.startMs);
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
