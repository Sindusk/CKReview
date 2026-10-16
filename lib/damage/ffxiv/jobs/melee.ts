// lib/damage/ffxiv/jobs/melee.ts
//
// Melee checks (melee batch). Positionals, broken combos and disengage
// GCDs (Enpi, Writhing Snap, ...) are generic engine checks
// (lib/damage/checks.ts); this file holds each job's own windows and buff
// uptimes, ported from xivanalysis src/parser/jobs/<job>/modules/:
//
// Samurai (verified on dQ8wmb1VhKt6yBXk):
//   - Higanbana uptime (DoTs.tsx) and Kenki / Meditation / Sen waste
//     (Kenki.tsx, Shoha.tsx, Sen.tsx), 2026-10-15: `higanbana` and
//     `samGauges` below, with the gauges as timeline lanes. Premise for
//     Sen: the FFLogs top 20 Red Hot and Deep Blue Samurai waste 3 Sen in
//     all, the 58 sample reports 115 (6 of them just before a Meikyo).
//     Not built: Ikishoten over a held Ogi Namikiri / Zanshin Ready (0 of
//     202 Ikishotens on disk).
//   - Fugetsu uptime (Buffs.tsx). +13%: FFLogs' multiplier for Standard
//     Finish + Fugetsu is 1.19 = 1.05 × 1.13.
//   - Meikyo Shisui (Meikyo.tsx): three Sen GCDs per window. A missing one
//     loses a Sen, valued at a third of the player's average Midare or
//     Tendo Setsugekka (inference).
//   - AoE on too few targets (AoeChecker.ts, 2026-10-15): Kyuten, Tenka /
//     Tendo Goken and their Kaeshi under 3, Guren on one target (7.4's
//     breakpoint), each against its single-target twin. Matched against
//     xivanalysis on Enuo pull 2 (Tendo Goken and its Kaeshi) and Necron
//     pull 15 (Guren). Seen firing: Xk2DKZwVp4Ar6d7y Enuo pull 2 0:27 (Tendo Goken and its Kaeshi,
//     179k + 154k: the opener's second Meikyo went Gekko, Kasha, Gekko, so
//     2 Sen where Yukikaze would have made 3 in the same GCDs), pull 4
//     6:42, pG319BgHTnPJc6Ft Necron pulls 2, 3, 10, L9BzKkD2nxcVgHTC
//     Necron pull 15 1:13 (Guren on the boss, 38k).
// Viper, checked against xivanalysis on K6qfMamL7rN8yz2Q Vamp Fatale (7.4,
// 2026-10-14): the death at 5:30 (and its Weakness) and its 6 positional
// misses match; the coil left at the kill (gained 8:36, ~2 GCDs before
// the 8:41.5 check) read as forced because leftovers were judged at the
// kill's instant (shared.ts gaugeFindings now judges the time held; 58k).
// Not adopted, all from the death: Honed Reavers / Hindstung Venom dropped
// at 5:28.3 with every buff; the 6:04 Serpent's Ire and 6:06 tincture with
// one Reawaken (the gauge emptied; the free one was all there was);
// Vicewinder 13/14 (two charges banked while dead); Uncoiled Fury 15/18
// (coils lost at the death, plus the one at the kill). Built: the Rattling
// Coil and Serpent Offerings lanes (jobs/gauges.ts; 20 Offerings over
// the cap, under its 25 threshold). Feint, Bloodbath, Second Wind: mitigation.
// Rechecked on K6qfMamL7rN8yz2Q Red Hot and Deep Blue (Pull 2, 7.4,
// 2026-10-14). Matched: 3 positionals, the 3 coils left at the kill, its
// 4 weaving issues, the 6:39 combo expiry, its GCD downtimes by time (the
// 3:13 and 8:03-8:32 ones are Insane Air movement here). Built: Steel /
// Reaving Maw consume the Honed buffs (3:00.1 read as Honed Reavers
// dropped) and are judged on under 3 targets (that Maw hit one: 16k);
// Poised for Twinfang / Twinblood drops (7:06.9, a second Uncoiled
// Twinfang: 4k); a Writhing Snap with an unpooled Rattling Coil held is a
// choice (8:15.7 with 2, left at the kill: 34k; vprDisengageAlternative).
// Kept: Hunter's Instinct down 34.6s (2:24, 4:36, 7:15) though it shows
// 97.5%: its uptime divides by fight time less invulnerability (Swiftscaled
// 104.5%). Not adopted: the 6:37 Serpent's Ire / 6:39 tincture's missing
// Ouroboros (the split-arena Inferno at 7:05 pushed Fourth Generation and
// Ouroboros to 7:10-7:12, past the tincture; Uncoiled Fury mid-Reawaken was
// the ranged GCD it needed); 8:39 Ire (cut by the kill); Vicewinder 13/15
// (18.8s at full charges in all, under one 40s recharge).
// Rechecked on K6qfMamL7rN8yz2Q The Tyrant (Pull 2, 7.4, 2026-10-15).
// Matched: the 3:49.8 death, 2 coils overcapped (6:10.7 and 10:11.9
// Serpent's Ire) and 1 left at the kill, Hindstung 8/10 and the Honed
// drop / overwrite, the 5:40 combo expiry, the Flanksting misses, its GCD
// downtimes (7:01-7:06 and 6:01 are the Flatliner towers / launch
// movement). Fixed: Hindsbane Fang misses were never caught (8:04.9; the
// positional table used the log's spelling, game.ts); the 6:37.5
// Hindstung and 6:39.3 Honed Reavers expiries read as dropped by a
// Generation; Snaps under raid buffs with coils held are a choice
// (6:29.4 and 6:31.5 with 3, 136k; vprDisengageAlternative). Not
// adopted: the 4:10 Ire / tincture with one Reawaken (the death emptied
// the gauge); 6:10's second Ouroboros (the towers' Snaps pushed it to
// 6:41, counted at those Snaps); Vicewinder 15/17 (35s held unforced
// beyond the opener, under one 40s recharge; one regained ~10:20 is the
// kill); the 7:25 triple weave with Feint (0.3s, under the 0.5s clipping
// floor).
// Viper (verified on dQ8wmb1VhKt6yBXk):
//   - Hunter's Instinct uptime (Buffs.tsx), +10% (multiplier 1.10).
//   - Reawaken (Reawaken.tsx): four Generations, four Legacies, one
//     Ouroboros. A missing Legacy is lost outright (its average); a missing
//     Generation or Ouroboros is its average minus the GCD used instead.
//   - Venoms and Honed buffs, Rattling Coil (below), and positionals (the
//     finishers' miss value, game.ts POSITIONAL_MISSED_EXTRA). Checked
//     against xivanalysis on 2T1HzdPKgbhM43am Dancing Mad fight 10
//     (2026-10-09): venoms 7, Honed 3 + 1 overwrite, coils 3 + 3 left,
//     positionals and the Reawaken at 6:05 all match. Not built: Serpent's
//     Ire pooling (9 actions). Death Rattle (1) built 2026-10-16 (below).
//     Rechecked on qjCMx4bRfgNKwX9T fight 16 (7.5, 2026-10-13): Honed
//     Reavers 30/31 (7:17 expiry), Third Legacy 24/25 (0:55), the 6:06
//     Reawaken cut to two Generations (Kefka hit 0% at 6:15, after the
//     window's natural end), 1 coil left at the kill, 8 positionals and
//     the 16:02 combo all match. Fixed: the 18:27 Reawaken, ended by an
//     early Ouroboros 1.6s before the kill, read as 2 Generations + 2
//     Legacies missing (158k); a window whose full span runs past the
//     kill is skipped now (spanMs). Not adopted: "8 missed in Serpent's
//     Ire windows" (at 2:01, 4:01, 8:02 and 18:16 the first Reawaken was
//     pressed one GCD before Serpent's Ire; both are inside the buffs;
//     6:02 is the cut Reawaken; 14:03's second one would land past P4's
//     HP check at 14:09); Vicewinder 28/29 (its banked charge capped in
//     P2's downtime, 35s held in all, under one 40s recharge).
//   - Serpent Offerings overcap and a Reawaken held at the kill (snilk.tsx)
//     and Death Rattle / Last Lash lost (SerpentsTail.tsx), 2026-10-16:
//     `serpentOfferingsCheck`, `serpentsTail` below. Death Rattle matched
//     xivanalysis's 1 on 2T1HzdPKgbhM43am fight 10 (13:28); the Offerings
//     overcap its 20 on K6qfMamL7rN8yz2Q Vamp Fatale and 110 on
//     cBZXM6kayd7Tf9Fg, the Reawaken left at the kill on cBZXM6kayd7Tf9Fg
//     and jXG76ba43VDLAvYz. The coils' Bites (`viperBites`, from that
//     jXG76ba43VDLAvYz page's third dropped proc). Not built: a coil
//     skipped after Vicewinder (Vices.tsx; 22 of 1,043 on disk, most at a
//     death or a wipe's end, and when a coil stops being available isn't
//     known).
// Monk (checked against xivanalysis on qjCMx4bRfgNKwX9T fight 16, 7.5,
// 2026-10-13, the first Monk sample):
//   - Riddle of Fire (RiddleOfFire.tsx): 11 GCDs; +15% (FFLogs multiplier
//     1.16 beside 1.01 from a Bard song outside it); Masterful Blitzes,
//     one per Perfect Balance it had time for (blitzesExpected, below).
//   - Matches: its 3 short windows (3:02, 6:02, 7:03; past HP checks or
//     downtime, forced), 7 positionals, the 13:02 delay. Built: Blitzes in
//     Riddle of Fire. The opener's second Perfect Balance came at 0:17 and
//     its Elixir Burst at 0:24, 1.2s after Riddle of Fire (27k); 12:04's at
//     12:28 (forced: 5s of that window was the P3-P4 transition).
//   - Not adopted: 18:17 Blitz and "1 Perfect Balance GCD" (cut by the
//     kill; Six-sided Star to finish is right); Riddle of Wind 12/13 (66s
//     held in all, under one 90s recharge; room is 12); 11:49 and the 12:02
//     triple weave (end-of-P3 hold). Not built: "Perfect Balance after
//     Opo-opo 22/29" (form order; its cost depends on the Blitz planned
//     and isn't measurable from one press).
//   - AoE on too few targets (AoE.tsx, 2026-10-15): each form's AoE under
//     4 against that form's three single-target GCDs, Enlightenment under 3
//     against The Forbidden Chakra. Checked against xivanalysis on
//     L9BzKkD2nxcVgHTC Necron pull 20: its 2 Four-point Fury and 2
//     Rockbreaker match; not adopted: its 2 Shadow of the Destroyer, which
//     hit 3 adds for more than the form's average. Seen firing:
//     kC7Y3WbzvKcZrBxT The Tyrant pull 1 6:29 (Enlightenment
//     on the boss, 10k); L9BzKkD2nxcVgHTC Necron pulls 6 and 20 (Four-point
//     Fury and Rockbreaker on 2-3 adds, 3-20k: three is near even, so
//     only the ones that dealt less than the form's average show);
//     djChYqt4b7K8aAfP 0:33 (Shadow of the Destroyer with only Red Hot
//     up, 36k); 7yXZbmqcrCga8PHz 4:41 (Enlightenment on one boss, 34k).
//   - Blitz resources (2026-10-15): Perfect Balance lost, Celestial
//     Revolution, Form Shift in uptime; `mnkBlitz` below. Matched against
//     xivanalysis on five searched kills (2026-10-15): Celestial
//     Revolution on all four with one. It misses a Perfect Balance that
//     ran out with stacks (bqmRpGxDvfT8AZc6 6:47) and counts Form Shifts in
//     downtime and out-of-reach mechanics, which this check excuses.
//   - Smaller form rules (2026-10-15), from a scan of the 101 Monk pulls
//     on disk: an Opo-opo skill with no form (Forms.tsx; in `mnkBlitz`,
//     the opener and the GCD after Perfect Balance exempt) fires once,
//     rgTafHJ9MN47m3Vy Doomtrain pull 8 4:03.7 (Coeurl Form ran out in
//     downtime); Fury overcap (Balls.tsx, `mnkFury`, also the timeline
//     lanes) 32 times, 20 of them bWDLM6zVXkqFAfjT. Not adopted:
//     Brotherhood against Riddle of Fire (305 of 337 within 3s; the
//     outliers cost the Monk's own 5% off the 15% window, ~3k, and 14 sit
//     on the party's raid buffs instead) and Formless Fist overwritten
//     (many in downtime; its cost depends on the Blitz planned).
//   - Dragoon (checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull 8:
//     Lance Charge and positionals match): Power Surge uptime, +10%
//     (tooltip); Chaotic Spring DoT uptime; Life Surge (below); Lance Charge
//     (LanceCharge.tsx): 8 GCDs plus High Jump, Mirage Dive, Dragonfire
//     Dive, Rise of the Dragon, Geirskogul, Nastrond, Stardiver and
//     Starcross, +10% (tooltip); Firstminds' Focus overcap (below).
//     Rechecked on 2T1HzdPKgbhM43am Dancing Mad fight 10 (2026-10-09):
//     its 9 missed Lance Charge GCDs and 13 missed positionals match; most
//     of the GCDs were in forced windows. Life of the Dragon and Battle
//     Litany windows aren't separate checks: they fall with Lance Charge.
//     Rechecked on qjCMx4bRfgNKwX9T Dancing Mad kill (7.5, 2026-10-13):
//     its 17 missed positionals match by action (Chaotic Spring 7,
//     Wheeling Thrust 5, Fang and Claw 5), as do Power Surge, the one
//     poor Life Surge (Lance Barrage, 14:13) and the 2.8s gap at 13:44.
//     Its missed window GCDs are all at 3:01-3:03, 6:03, 7:06 and 14:08,
//     which run into downtime or past an HP check (forced here). Not
//     adopted: "Chaotic Spring before invulnerability" (it's a combo
//     step, not an optional DoT GCD).
//     Rechecked on K6qfMamL7rN8yz2Q Vamp Fatale (7.4, 2026-10-14). Matched:
//     its 5 missed positionals by time, Power Surge (93.7%), Chaotic
//     Spring uptime, every Lance Charge / Battle Litany window full, its
//     GCD downtimes by time (most are Bombpyre / saws movement, or Piercing
//     Talons forced out of reach). Built: Life of the Dragon, +15% (below;
//     its 5:11 and 7:12 at 7/8); Life Surge drift valued as a forced crit
//     (tracked-cooldowns.ts; its 13/14, 1 use, 25k); the Firstminds' Focus
//     lane (jobs/gauges.ts; 0 lost, as it says). Not adopted: Chaotic
//     Spring before invulnerability (above); Feint, Bloodbath, Second Wind.
//     Rechecked on the same report's Red Hot and Deep Blue kill (Pull 2,
//     2026-10-14), nothing to build. Matched: its 4 positionals by time,
//     the Lance Charge misses (2:07 High Jump and Mirage Dive; Mirage Dive
//     at 3:10, 4:13, 5:13), Life of the Dragon 3:12 6/8 and 6:39 7/8, the
//     6:39 weave, the Firstminds' Focus lost at 8:46, Battle Litany at 4:16
//     missing Kade and Mocha (80k), its GCD downtimes by time (4:54, 7:16,
//     8:35 are Hot Aerial / Freaky Pyrotation / Insane Air movement here).
//     Held: Power Surge 101.4% and Chaotic Spring 62.2% are its uptime ÷
//     fight time less invulnerability; the log has Power Surge down 11.9s
//     from 6:43 and Chaotic Spring 20.2s from 6:39, one mistake: Raiden
//     Thrust → Lance Barrage at 6:42, the same route as 6:24, where Spiral
//     Blow was due (120k + 38k, both counted). Not adopted: High Jump
//     16/17, Life Surge 13/14, Dragonfire Dive 4/5 (36.8s, 46.4s and 47s
//     held after the burst holds, each under one recharge; the fifth
//     Dragonfire Dive came back 8:45.8, 5.6s before the kill, in the
//     Lance Charge window the kill cut short); the 8:43 / 8:45 windows'
//     shortfalls (the kill); Chaotic Spring before invulnerability (above).
//     Mirage Dive missing from Life of the Dragon is valued at Lance
//     Charge's 10% only (a few k).
//     Rechecked on the same report's The Tyrant kill (Pull 2, 2026-10-15).
//     Matched: its 13 positionals one for one (Chaotic Spring 3, Wheeling
//     Thrust 6, Fang and Claw 4), cooldowns 100%, Lance Charge 9:10's
//     Mirage Dive, Power Surge and Chaotic Spring uptime, its GCD
//     downtimes (3:37 1.6s, 4:57; 6:03, 6:29, 6:44, 7:02, 7:39 are
//     Flatliner / Fire Breath movement). Built: its dropped Starcross proc —
//     the 5:29.0 Stardiver came 2.3s before Life of the Dragon ended and
//     Starcross Ready went with it (starcrossDropped, 161k; the Lance Charge
//     window counted only its 10%, 16k). About 60 across the samples, e.g.
//     her Lindwurm 4:11 Stardiver with Starcross Ready held 18s while every
//     other oGCD went out. No damage: Feint, Bloodbath, Second Wind.
//   - Ninja: Kunai's Bane window, Ninki and Kazematoi (below). Checked
//     against xivanalysis on dDar482XvFKBPJYh FRU kill (7.1, 2026-10-12):
//     its 9 Kazematoi lost and 1 unbuffed Aeolian Edge match; Ninki ~300
//     simulated vs its 250; Bunshin 2 lost (its 3 counts burst
//     alignment); Dokumori, Ten Chi Jin and Meisui's missing uses were
//     ready a few seconds before P4's downtime and held for the 14:17
//     burst (no extra use fit before the kill). Built 2026-10-16 (in
//     `kazematoi`): Kazematoi left at the kill (3+: the last Armor Crush
//     could have been an Aeolian Edge) and Armor Crush under Kunai's Bane
//     with stacks held (the difference × the window's bonus, 0-2k). Not
//     matched against a page yet.
//     Hellfrog / Deathfrog on one target (Ninki.tsx, 2026-10-15): `ninAoe`.
//     Seen firing, not matched against xivanalysis: Hellfrog on one of Red
//     Hot and Deep Blue's bosses with the two apart, mgTQJjX2nW6ANkP7 6:51
//     and jXG76ba43VDLAvYz 4:07 (17-21k); jXG76ba43VDLAvYz 9:16 as Deep
//     Blue died (24k). Deathfrog not seen on one target.
//     Ninjutsu mistakes (2026-10-15): Rabbit Medium, Hyoton, a weak Doton,
//     Kassatsu misspent or lapsed, Raiju Ready dropped; `ninjutsu` below.
//     Found by searching the lowest Red Hot and Deep Blue Ninja parses;
//     matched against xivanalysis on six of those kills (2026-10-15). Not
//     adopted: a Ten Chi Jin Doton it counts by target count alone
//     (zMJdajRYyNF3LVkr 2:33 out-damaged its Suiton).
//   - Reaper: Enshroud (Enshroud.tsx): four Reapings, two Lemure's, one
//     Sacrificium, one Communio. Arcane Circle, Death's Design, Harvest
//     Moon, Shroud and Whorl of Death below. Checked against xivanalysis
//     on dDar482XvFKBPJYh FRU kill (7.1, 2026-10-12): its 27 missing
//     Arcane Circle actions, 10 Shroud lost, 8 positionals, 4 expired
//     combos and Whorl of Death match; its Soul Slice 36/38 recharged
//     through P4's downtime with nothing banked (not counted); its Arcane
//     Circle 9/10 was ready 18s before that downtime and held for the
//     14:18 burst.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { chargesAt, finding, PROC_CONSUME_MS, PROC_EXPIRY_EARLY_MS, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows, mergeWindows } from "../../timeline";
import { aoeComboOnOneTarget, baseValue, burstWindowFindings, castHits, clock, critMultOf, dotFindings, enemyStatusWindows, gaugeFindings, observedBonus, gaugeTrack, k, offCooldownIn, rollGainOf, s, statusWindows, uptimeFindings, type ExpectedAction, type GaugeEvent, type GaugeSpec } from "./shared";
import { comboLanded } from "./gnb";

const id = (key: string) => A[key].id;
const ids = (...keys: string[]) => keys.filter((key) => A[key]).map(id);

/** A missing GCD that was replaced by another: its average minus the player's average GCD. */
const replacedGcd = (...keys: string[]) => (ctx: PlayerCheckContext) =>
  Math.max(0, Math.max(...ids(...keys).map((x) => ctx.values.perUse(x))) - ctx.values.gcdValue(undefined, false));
/** A missing oGCD is simply lost. */
const lostOgcd = (...keys: string[]) => (ctx: PlayerCheckContext) =>
  Math.max(...ids(...keys).map((x) => ctx.values.perUse(x)));

const uptime = (statusKey: string, bonus: number, bonusBasis: string,
  refresh?: { cost: (ctx: PlayerCheckContext, fromMs: number, toMs: number) => number; reapplyGcds: number; restartIds?: number[] }): JobCheck => (ctx) => {
  const windows = statusWindows(ctx, S[statusKey].id);
  if (windows.length === 0) return [];
  return uptimeFindings(ctx, {
    name: S[statusKey].name, bonus, bonusBasis,
    active: windows, fromMs: windows[0].startMs, graceMs: 2_500,
    refreshCost: refresh?.cost, reapplyMs: refresh ? refresh.reapplyGcds * ctx.baseGcdMs : undefined,
    restartIds: refresh?.restartIds,
  });
};

// ── Samurai ────────────────────────────────────────────────────────────

const meikyo: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.MEIKYO_SHISUI.id, name: "Meikyo Shisui", bonus: 0, inference: true,
  bonusBasis: "a missing Sen GCD is valued at a third of the player's average Midare / Tendo Setsugekka",
  expected: () => [{
    ids: ids("GEKKO", "KASHA", "YUKIKAZE", "MANGETSU", "OKA"), count: 3, name: "Sen GCD",
    value: (c) => Math.max(c.values.perUse(id("MIDARE_SETSUGEKKA")), c.values.perUse(id("TENDO_SETSUGEKKA"))) / 3,
  }],
});

// ── Viper ──────────────────────────────────────────────────────────────

const reawaken: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.REAWAKENED.id, name: "Reawaken", bonus: 0,
  // Reawaken's own GCD (2.2s) and four Generations (2.0s), at the player's
  // speed; Ouroboros ends it. On qjCMx4bRfgNKwX9T fight 16 the 18:27 one
  // had 6.9s left and went First, Second, Ouroboros: right at a kill.
  spanMs: (c) => ((A.REAWAKEN.gcdRecast ?? 2200) + 4 * (A.FIRST_GENERATION.gcdRecast ?? 2000)) * c.factor,
  bonusBasis: "a missing Generation or Ouroboros = its average minus the GCD used instead; a missing Legacy = its average",
  expected: (): ExpectedAction[] => [
    { ids: ids("FIRST_GENERATION", "SECOND_GENERATION", "THIRD_GENERATION", "FOURTH_GENERATION"), count: 4, name: "Generation",
      value: replacedGcd("FIRST_GENERATION", "SECOND_GENERATION", "THIRD_GENERATION", "FOURTH_GENERATION") },
    { ids: ids("FIRST_LEGACY", "SECOND_LEGACY", "THIRD_LEGACY", "FOURTH_LEGACY"), count: 4, name: "Legacy",
      value: lostOgcd("FIRST_LEGACY", "SECOND_LEGACY", "THIRD_LEGACY", "FOURTH_LEGACY") },
    { ids: ids("OUROBOROS"), count: 1, name: "Ouroboros", value: replacedGcd("OUROBOROS") },
  ],
});

// Venoms and Honed buffs (xivanalysis Venoms / Honed procs): each boosts
// one action by 100 potency and falls off when another combo step goes
// first. The generic proc check missed those drops (the removal sits on a
// cast, so it read as consumed) and valued an expiry at the whole finisher,
// though the finisher is still pressed. On 2T1HzdPKgbhM43am fight 10 the
// Hindstung drops are Hindsbane Fangs pressed instead (2:02, 4:45, 11:35,
// 12:04) plus one expiry (13:17): xivanalysis's 5.
// Consumers are the actions that use the buff (the first one is valued);
// Steel Maw / Reaving Maw consume the Honed buffs too (xivanalysis
// HonedProcs.tsx): K6qfMamL7rN8yz2Q Red Hot and Deep Blue (Pull 2) 3:00.1,
// a one-target Reaving Maw read as Honed Reavers dropped (its loss is the
// AoE-on-one-target finding instead).
const VENOM_PROCS: [status: string, consumers: string[], share: number, bonus: string][] = [
  // 500 vs 400 potency (combo, positional) from the finishers' potency tables.
  ["HINDSTUNG_VENOM", ["HINDSTING_STRIKE"], 0.2, "its 100 potency bonus"],
  ["HINDSBANE_VENOM", ["HINDSBANE_FANG"], 0.2, "its 100 potency bonus"],
  ["FLANKSTUNG_VENOM", ["FLANKSTING_STRIKE"], 0.2, "its 100 potency bonus"],
  ["FLANKSBANE_VENOM", ["FLANKSBANE_FANG"], 0.2, "its 100 potency bonus"],
  // Steel Fangs / Reaving Fangs: 300 vs 200 (tooltip).
  ["HONED_STEEL", ["STEEL_FANGS", "STEEL_MAW"], 1 / 3, "its 100 potency bonus"],
  ["HONED_REAVERS", ["REAVING_FANGS", "REAVING_MAW"], 1 / 3, "its 100 potency bonus"],
  // Uncoiled Twinfang / Twinblood: 120 with Poised, 100 without (tooltip,
  // not measurable: every one but the drop had it). oGCDs, so a drop is
  // the other one pressed (xivanalysis Venoms.tsx; K6qfMamL7rN8yz2Q Red
  // Hot and Deep Blue 7:06.9, a second Uncoiled Twinfang).
  ["POISED_FOR_TWINFANG", ["UNCOILED_TWINFANG"], 1 / 6, "its 20 potency bonus (tooltip)"],
  ["POISED_FOR_TWINBLOOD", ["UNCOILED_TWINBLOOD"], 1 / 6, "its 20 potency bonus (tooltip)"],
];

/** Statuses the venom check owns; the generic proc check skips them (game.ts). */
export const VPR_PROC_STATUS_IDS = new Set(VENOM_PROCS.map(([st]) => S[st]?.id).filter((x): x is number => x !== undefined));

/** Melee statuses the generic proc check skips (game.ts): the venoms (their
 *  own check) and Dragoon's Enhanced Piercing Talon, a ranged insurance the
 *  Dragoon banks for a bad outcome, never a loss when it expires (user,
 *  2026-10-13; yBKPqGwHparm7Tk4 fight 5 flagged one at 1:50), and Ninja's
 *  Kassatsu and Raiju Ready (the ninjutsu check values them: a lapsed
 *  Kassatsu read as a whole Hyosho, or as a Raiton for a Ninja who always
 *  spent it on Raiton). */
export const MELEE_PROC_SKIP_IDS = new Set([...VPR_PROC_STATUS_IDS, S.ENHANCED_PIERCING_TALON.id, S.KASSATSU.id, S.RAIJU_READY.id]);

const venoms: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const forced = mergeWindows(ctx.forced);
  for (const [statusKey, consumerKeys, share, bonus] of VENOM_PROCS) {
    const status = S[statusKey], consumer = A[consumerKeys[0]];
    if (!status || !consumer) continue;
    const consumerIds = new Set(ids(...consumerKeys));
    const value = ctx.values.perUse(consumer.id) * share;
    if (value <= 0) continue;
    // The press that removed it: a GCD for the combo buffs, an oGCD for Poised.
    const onGcd = !!consumer.onGcd;
    const presses = ctx.player.casts.filter((c) => !!ctx.game.action(c.abilityId)?.onGcd === onGcd);
    const lose = (t: number, how: string) => {
      const isForced = inWindows(t, forced);
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: t, endMs: t, forced: isForced,
        cause: isForced ? forcedPart(t - 1, t + 1, ctx.forced).cause : undefined,
        label: `${status.name} ${how.startsWith("dropped") ? "dropped" : how}`,
        lostDamage: value,
        basis: `${k(ctx.values.perUse(consumer.id))} average ${consumer.name} × ${Math.round(share * 100)}% (${bonus})`,
        detail: `${status.name} ${how}`,
      }));
    };
    let expiresAt: number | undefined;
    for (const e of [...(ctx.player.buffs ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
      if (e.abilityId !== status.id || e.source !== ctx.player.name || e.timestamp >= ctx.endMs) continue;
      if (e.buffStatus === "applied" || e.buffStatus === "refreshed") {
        if (expiresAt !== undefined && e.timestamp < expiresAt - PROC_EXPIRY_EARLY_MS) lose(e.timestamp, "overwritten before use");
        expiresAt = e.durationMs ? e.timestamp + e.durationMs : undefined;
      } else if (e.buffStatus === "removed") {
        const at = presses.find((c) => Math.abs(c.timestamp - e.timestamp) <= PROC_CONSUME_MS);
        // No upper bound: the 13:17 removal logged 1.6s after its 60s ran
        // out, past the generic check's 1.5s. An expiry beside a press that
        // isn't a consumer is still an expiry: K6qfMamL7rN8yz2Q The Tyrant's
        // Hindstung Venom (6:37.5) and Honed Reavers (6:39.3) ran out 61.6s
        // and 61.1s after they were applied, beside Third / Fourth
        // Generation, which never consume them.
        const expired = expiresAt !== undefined && e.timestamp >= expiresAt - PROC_EXPIRY_EARLY_MS;
        // Poised ended by a GCD: the Uncoiled follow-up itself is gone, not
        // only its bonus (VzycM18rpn6bWxXY 6:35.7, Reawaken with Poised for
        // Twinblood up; xivanalysis's fifth dropped oGCD proc).
        const gcdAt = !onGcd && !at ? ctx.player.casts.find((c) => !!ctx.game.action(c.abilityId)?.onGcd &&
          Math.abs(c.timestamp - e.timestamp) <= PROC_CONSUME_MS) : undefined;
        if (at && consumerIds.has(at.abilityId)) { /* consumed */ }
        else if (inWindows(e.timestamp, ctx.dead)) { /* lost to the death */ }
        else if (gcdAt && !expired) {
          const avg = ctx.values.perUse(consumer.id), isForced = inWindows(e.timestamp, forced);
          out.push(finding(ctx, {
            kind: "missed-followup", startMs: e.timestamp, endMs: e.timestamp, forced: isForced,
            cause: isForced ? forcedPart(e.timestamp - 1, e.timestamp + 1, ctx.forced).cause : undefined,
            label: `${consumer.name} lost`, lostDamage: avg,
            basis: `her average ${consumer.name} (${k(avg)})`,
            detail: `${gcdAt.abilityName} at ${clock(e.timestamp)} with ${status.name} up: its ${consumer.name} was lost`,
          }));
        }
        else if (expired) lose(e.timestamp, "expired unused");
        else if (at) lose(e.timestamp, `dropped: ${at.abilityName} went first`);
        expiresAt = undefined;
      }
    }
  }
  return out;
};

// ── Monk, Dragoon, Ninja, Reaper (unverified) ──────────────────────────

// Blitzes in Riddle of Fire, from xivanalysis BlitzEvaluator.tsx: one per
// Perfect Balance it had time for, at most two: the charges held when the
// window opened, one already running, and one regained 8s or more before
// it ended (room for 3 Balance GCDs and the Blitz). A late one was pressed
// after the window, so it costs the window's bonus on it.
const BLITZ_KEYS = ["TORNADO_KICK", "ELIXIR_FIELD", "CELESTIAL_REVOLUTION", "FLINT_STRIKE", "RISING_PHOENIX", "PHANTOM_RUSH", "ELIXIR_BURST"];
const BLITZ_END_TOLERANCE_MS = 8_000;

function blitzesExpected(ctx: PlayerCheckContext, w: { startMs: number; endMs: number }): number {
  const pb = A.PERFECT_BALANCE;
  const cd = pb.cooldown ?? 40_000, max = pb.charges ?? 2;
  const casts = ctx.player.casts.filter((c) => c.abilityId === pb.id).map((c) => c.timestamp);
  const held = chargesAt(casts.filter((t) => t < w.startMs), cd, max, w.startMs);
  const running = statusWindows(ctx, S.PERFECT_BALANCE.id).some((b) => b.startMs < w.startMs && b.endMs > w.startMs);
  const regained = chargesAt(casts, cd, max, w.endMs - BLITZ_END_TOLERANCE_MS) >
    chargesAt(casts.filter((t) => t < w.startMs), cd, max, w.startMs) - casts.filter((t) => t >= w.startMs && t < w.endMs - BLITZ_END_TOLERANCE_MS).length;
  return Math.min(2, held + (running ? 1 : 0) + (regained ? 1 : 0));
}

const riddleOfFire: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.RIDDLE_OF_FIRE.id, name: "Riddle of Fire", bonus: 0.15,
  bonusBasis: "Riddle of Fire is +15% (FFLogs multiplier 1.16 against 1.01 outside it)",
  expectedGcds: () => 11,
  expected: () => [{
    ids: ids(...BLITZ_KEYS.filter((key) => A[key])), count: 0, countIn: blitzesExpected, name: "Masterful Blitz",
    // The player's average Blitz (a late one still landed, so the window's
    // bonus on it is the loss).
    value: (c) => {
      const used = ids(...BLITZ_KEYS.filter((key) => A[key])).map((i) => ({ v: c.values.perUse(i), n: c.player.casts.filter((x) => x.abilityId === i).length }));
      const n = used.reduce((a, u) => a + u.n, 0);
      return n > 0 ? used.reduce((a, u) => a + u.v * u.n, 0) / n : 0;
    },
    scaled: true,
  }],
});

const lanceCharge: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.LANCE_CHARGE.id, name: "Lance Charge", bonus: 0.1,
  bonusBasis: "Lance Charge is +10% (tooltip; not yet checked against a log)",
  expectedGcds: () => 8,
  expected: () => ["HIGH_JUMP", "MIRAGE_DIVE", "DRAGONFIRE_DIVE", "RISE_OF_THE_DRAGON", "GEIRSKOGUL", "NASTROND", "STARDIVER", "STARCROSS"]
    .filter((key) => A[key]).map((key): ExpectedAction => ({
      ids: [id(key)], count: 1, name: A[key].name,
      // Follow-ups are available when what grants them was.
      availableIf: key === "RISE_OF_THE_DRAGON" ? (c, w, cycle) => offCooldownIn(c, ids("DRAGONFIRE_DIVE"), w, cycle)
        : key === "MIRAGE_DIVE" ? (c, w, cycle) => offCooldownIn(c, ids("HIGH_JUMP"), w, cycle)
        // A Starcross Ready lost unused is starcrossDropped's (the whole
        // Starcross), not this window's share of it.
        : key === "STARCROSS" ? (c, w) => !statusWindows(c, S.STARCROSS_READY.id)
          .some((r) => r.startMs < w.endMs && r.endMs > w.startMs && starcrossLostAt(c, r.endMs))
        : undefined,
    })),
});

// Starcross Ready ends with Life of the Dragon: a Stardiver pressed in
// its last seconds loses the Starcross (K6qfMamL7rN8yz2Q The Tyrant,
// Stardiver 5:29.0, Starcross Ready gone 5:31.3 as Life of the Dragon
// from the 5:11 Geirskogul ran out; xivanalysis's dropped proc). Lost:
// the player's average Starcross. checkProcs only sees expiries.
function starcrossLostAt(ctx: PlayerCheckContext, t: number): boolean {
  return !ctx.player.casts.some((c) => c.abilityId === id("STARCROSS") && Math.abs(c.timestamp - t) <= PROC_CONSUME_MS) &&
    !inWindows(t, ctx.dead) && t < ctx.endMs;
}
const starcrossDropped: JobCheck = (ctx) => {
  const value = ctx.values.perUse(id("STARCROSS"));
  if (value <= 0) return [];
  return statusWindows(ctx, S.STARCROSS_READY.id).filter((r) => starcrossLostAt(ctx, r.endMs)).map((r) => {
    const forced = inWindows(r.endMs, mergeWindows(ctx.forced));
    return finding(ctx, {
      kind: "proc-lost", startMs: r.endMs, endMs: r.endMs, forced,
      cause: forced ? forcedPart(r.endMs - 1, r.endMs + 1, ctx.forced).cause : undefined,
      label: "Starcross Ready lost", lostDamage: value,
      basis: `${k(value)} average Starcross`,
      detail: `Starcross Ready from the ${clock(r.startMs)} Stardiver ended unused at ${clock(r.endMs)} (${s(r.endMs - r.startMs)} later)`,
    });
  });
};

// Life of the Dragon (xivanalysis BloodOfTheDragon.tsx): 8 GCDs in the 20s
// from each Geirskogul. It's +15%: the FFLogs multiplier with only it and
// Power Surge is 1.26 (1.10 × 1.15), with Lance Charge too 1.39, on all
// three Vamp Fatale kills checked (K6qfMamL7rN8yz2Q, grK2z6ptfZWGmVdj,
// vVPtwaTQ62Jg391q). The status (1003177) is in the hit snapshots only,
// never the buff stream, so the window is the Geirskogul cast + 20s (the
// last hit carrying it lands 19-21.6s after, hits trailing their casts).
// GCDs only: its oGCDs are Lance Charge's (above), which starts ~2s
// before it, so they'd be counted twice. K6qfMamL7rN8yz2Q: 5:11 and 7:12
// at 7/8, xivanalysis's two.
const LOTD_MS = 20_000;
const lifeOfTheDragon: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: 1_003_177, name: "Life of the Dragon", bonus: 0.15,
  bonusBasis: "Life of the Dragon is +15% (FFLogs multiplier: 1.26 with Power Surge alone)",
  windows: (c) => c.player.casts.filter((x) => x.abilityId === id("GEIRSKOGUL"))
    .map((x) => ({ startMs: x.timestamp, endMs: x.timestamp + LOTD_MS })),
  expectedGcds: () => 8,
  expected: () => [],
});

// Life Surge (xivanalysis LifeSurge.ts): its guaranteed crit belongs on
// Drakesbane or Heavens' Thrust (Coerthan Torment in AoE). The GCD that
// consumed it is the cast at the status's removal. xivanalysis also
// accepts the other strong steps, Fang and Claw, Wheeling Thrust and
// Chaotic Spring: its consumer table for jN3XDrf2z8PmLgRJ Vamp pull 8
// (Drakesbane 6, Heavens' Thrust 1, Fang and Claw 3, Chaotic Spring 1,
// Other 4) matches the log, and only the 4 "Other" (Raiden Thrust ×2,
// Lance Barrage, Spiral Blow) were called non-optimal. Those lose (the
// best GCD's average − its average) × the crit's share, estimated as for
// crit buffs (lib/damage/buffs.ts: ×1.55 at a 25% base rate, so a forced
// crit adds 36% over an average hit). Marked inference.
const LIFE_SURGE_GOOD = ["DRAKESBANE", "HEAVENS_THRUST", "COERTHAN_TORMENT", "FANG_AND_CLAW", "WHEELING_THRUST", "CHAOTIC_SPRING"];
export const FORCED_CRIT_SHARE = (1.55 - (1 + 0.25 * 0.55)) / (1 + 0.25 * 0.55);

const lifeSurge: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const good = new Set(ids(...LIFE_SURGE_GOOD));
  const best = Math.max(...ids("DRAKESBANE", "HEAVENS_THRUST").map((x) => ctx.values.perUse(x)));
  for (const e of ctx.player.buffs ?? []) {
    if (e.abilityId !== S.LIFE_SURGE.id || e.buffStatus !== "removed" || e.source !== ctx.player.name || e.timestamp >= ctx.endMs) continue;
    const used = ctx.uses.find((u) => Math.abs(u.startMs - e.timestamp) <= 100);
    if (!used || good.has(used.action.id)) continue;
    const lost = Math.max(0, best - ctx.values.perUse(used.action.id)) * FORCED_CRIT_SHARE;
    if (lost <= 0) continue;
    out.push(finding(ctx, {
      kind: "burst-window", startMs: e.timestamp, endMs: e.timestamp, forced: false, inference: true,
      label: `Life Surge on ${used.abilityName}`,
      lostDamage: lost,
      basis: `(${k(best)} best of Drakesbane / Heavens' Thrust − ${k(ctx.values.perUse(used.action.id))} average ${used.abilityName}) × ` +
        `${Math.round(FORCED_CRIT_SHARE * 100)}% (a forced crit over an average hit, estimated)`,
      detail: `Life Surge spent on ${used.abilityName}, a weak combo step`,
    }));
  }
  return out;
};

// Chaotic Spring and Power Surge both come from the Spiral Blow route; going
// that way in place of Lance Barrage → Heavens' Thrust costs the difference.
function drgSpiralRouteCost(ctx: PlayerCheckContext): number {
  const v = (...keys: string[]) => ids(...keys).reduce((a, x) => a + ctx.values.perUse(x), 0);
  return v("LANCE_BARRAGE", "HEAVENS_THRUST") - v("SPIRAL_BLOW", "CHAOTIC_SPRING");
}

// Power Surge down in a stretch forced time cuts off (from → to): the
// choice was the Lance Barrage pressed after a Raiden Thrust, which Spiral
// Blow could have replaced. The first such slot whose Power Surge would
// reach into the stretch is the counterfactual: Spiral there (the route
// cost), Power Surge from its hit (the bonus before that couldn't be had:
// added to the cost), Chaotic Spring a GCD later (its ticks to the cut,
// where the DoT was off: taken off the cost). So Power Surge + DoT − route
// is counted once: the DoT check values its own cut stretch at ticks −
// route, ≤ 0 unless long. No such slot: nothing could be done (cost ∞).
// yBKPqGwHparm7Tk4 fight 5 (user, 2026-10-13):
// - 6:04.5 Lance Barrage again instead of Spiral Blow: Power Surge off
//   6:10.9-6:16.9 (~39k) + 3 ticks (~21k) − route (~37k) ≈ 23k.
// - 3:06.4: Spiral there restores it only from ~3:07.1 and the DoT lands
//   ~3:09.6, no tick before the check at 3:10.7: worth less than the route.
const DOT_TICK_MS = 3_000;
const SPIRAL_HIT_MS = 700;
const POWER_SURGE_MS = 30_000;
function drgPowerSurgeRefreshCost(ctx: PlayerCheckContext, fromMs: number, toMs: number): number {
  const raiden = new Set(ids("RAIDEN_THRUST", "TRUE_THRUST"));
  const barrage = new Set(ids("LANCE_BARRAGE", "VORPAL_THRUST"));
  const uses = ctx.uses;
  // Only a slot that broke the alternation (Lance Barrage after a Lance
  // Barrage route) is a choice: Spiral Blow twice in a row to stretch
  // Power Surge isn't something a Dragoon would be asked to do (3:05 here:
  // Spiral 2:33.9, Lance Barrage 2:49.5 was the rotation; the second Lance
  // Barrage at 3:06.4 was the choice). The first such slot that could have
  // had it up in the stretch: before it, nothing could; after it, later
  // slots keep it going.
  const spiral = new Set(ids("SPIRAL_BLOW", "DISEMBOWEL"));
  let prevRoute: "spiral" | "barrage" | undefined;
  let slot: (typeof uses)[number] | undefined;
  for (let i = 1; i < uses.length && !slot; i++) {
    const u = uses[i];
    if (!raiden.has(uses[i - 1].action.id)) continue;
    const route = barrage.has(u.action.id) ? "barrage" : spiral.has(u.action.id) ? "spiral" : undefined;
    if (!route) continue;
    if (route === "barrage" && prevRoute === "barrage" && u.startMs < toMs && u.startMs + POWER_SURGE_MS >= fromMs) slot = u;
    prevRoute = route;
  }
  if (!slot) return Infinity;
  const psFrom = slot.startMs + SPIRAL_HIT_MS;
  const early = psFrom > fromMs ? ctx.values.damageIn(fromMs, Math.min(psFrom, toMs)) * 0.1 : 0;
  const route = drgSpiralRouteCost(ctx) + early;
  const from = slot.startMs + ctx.baseGcdMs + SPIRAL_HIT_MS;
  const evs = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => e.statusId === S.CHAOTIC_SPRING.id && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  const duration = S.CHAOTIC_SPRING.duration ?? 24_000;
  const up: { startMs: number; endMs: number }[] = [];
  let lastApply: number | undefined, open: number | undefined;
  for (const e of evs) {
    if (e.status === "removed") { if (open !== undefined) up.push({ startMs: open, endMs: e.timestamp }); open = lastApply = undefined; continue; }
    if (open === undefined || (lastApply !== undefined && e.timestamp > lastApply + duration)) {
      if (open !== undefined && lastApply !== undefined) up.push({ startMs: open, endMs: lastApply + duration });
      open = e.timestamp;
    }
    lastApply = e.timestamp;
  }
  if (open !== undefined && lastApply !== undefined) up.push({ startMs: open, endMs: lastApply + duration });
  const merged = mergeWindows(up);
  const downMs = Math.max(0, toMs - Math.max(from, 0)) - merged.reduce((a, w) => a + Math.max(0, Math.min(w.endMs, toMs) - Math.max(w.startMs, from)), 0);
  const ticks = ctx.player.damageDone.filter((e) => e.abilityId === S.CHAOTIC_SPRING.id && e.isDoT);
  const avgTick = ticks.length ? ticks.reduce((a, e) => a + (e.amount ?? 0), 0) / ticks.length : 0;
  return route - Math.floor(downMs / DOT_TICK_MS) * avgTick;
}

const chaoticSpring: JobCheck = (ctx) => dotFindings(ctx, {
  statusIds: [S.CHAOTIC_SPRING.id], name: S.CHAOTIC_SPRING.name, durationMs: S.CHAOTIC_SPRING.duration ?? 24_000,
  // Before a downtime or a passed check, Chaotic Spring means the Spiral
  // Blow route instead of Lance Barrage → Heavens' Thrust (yBKPqGwHparm7Tk4
  // fight 5 at 3:01: ~33k for 2 ticks).
  applyCost: (ctx) => drgSpiralRouteCost(ctx),
  reapplyGcds: 2,   // Raiden Thrust, Spiral Blow
  restartIds: ids("RAIDEN_THRUST", "TRUE_THRUST"),
});

// Kunai's Bane, from xivanalysis KunaisBaneWindow.tsx: 7 GCDs, mudras not
// counted (with them, a 6/7 window read 7+), 8 with Ten Chi Jin in it;
// Hyosho Ranryu or Goka Mekkyaku once; Raiton twice (once in the opener,
// where one goes before the window for an extra Bhavacakra); Dream Within
// a Dream once; Tenri Jindo when Ten Chi Jin is in it.
const MUDRA_IDS = new Set(ids("TEN", "CHI", "JIN", "TEN_KASSATSU", "CHI_KASSATSU", "JIN_KASSATSU"));
const KB_OPENER_MS = 12_000;
const kunaisBane: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.KUNAIS_BANE.id, name: "Kunai's Bane", bonus: 0.1, onEnemy: true,
  bonusBasis: "Kunai's Bane is +10% damage taken (tooltip; not yet checked against a log)",
  ignoreGcdIds: MUDRA_IDS,
  expectedGcds: (_c, casts) => (casts.some((c) => c.abilityId === id("TEN_CHI_JIN")) ? 8 : 7),
  expected: (_c, casts) => {
    const opener = casts.length > 0 && casts[0].timestamp <= KB_OPENER_MS;
    const tcj = casts.some((c) => c.abilityId === id("TEN_CHI_JIN"));
    return [
      { ids: ids("DREAM_WITHIN_A_DREAM"), count: 1, name: "Dream Within a Dream" },
      { ids: ids("HYOSHO_RANRYU", "GOKA_MEKKYAKU"), count: 1, name: "Hyosho Ranryu" },
      { ids: ids("RAITON"), count: opener ? 1 : 2, name: "Raiton" },
      ...(tcj ? [{ ids: ids("TENRI_JINDO"), count: 1, name: "Tenri Jindo" }] : []),
    ];
  },
});

// Ninki (cap 100), from xivanalysis Ninki.tsx: +5 Spinning Edge, Gust
// Slash, Death Blossom, Hakke Mujinsatsu; +15 Aeolian Edge, Armor Crush
// (combo'd steps only, read from bonusPercent); +5 per Raiju and Throwing
// Dagger hit; +40 Mug / Dokumori; +50 Meisui; +5 per Bunshin shadow hit
// (+10 its Phantom Kamaitachi); −50 Bhavacakra, Zesho Meppo, Hellfrog,
// Deathfrog, Bunshin. Starts at 0; a death empties it. 50 Ninki is one
// average Bhavacakra. Every gain is read at the cast (2026-10-16): with
// hit-timed gains, 113 Ninki findings on disk had the simulation below
// zero; none do now. zMJdajRYyNF3LVkr: 70 lost here, xivanalysis 60
// (its gains wait for hits, and a shadow hit can go unlogged).
const NINKI_COMBO = new Map([
  ...ids("SPINNING_EDGE", "GUST_SLASH", "DEATH_BLOSSOM", "HAKKE_MUJINSATSU").map((x) => [x, 5] as const),
  ...ids("AEOLIAN_EDGE", "ARMOR_CRUSH").map((x) => [x, 15] as const),
]);
const NINKI_HIT = new Map([
  ...ids("FORKED_RAIJU", "FLEETING_RAIJU", "THROWING_DAGGER").map((x) => [x, 5] as const),
  ...ids("MUG", "DOKUMORI").map((x) => [x, 40] as const),
]);
const NINKI_SPEND = new Set(ids("BHAVACAKRA", "ZESHO_MEPPO", "HELLFROG_MEDIUM", "DEATHFROG_MEDIUM", "BUNSHIN"));
const ninki: JobCheck = (ctx) => {
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    const combo = NINKI_COMBO.get(c.abilityId);
    if (combo !== undefined && (c.abilityId === id("SPINNING_EDGE") || c.abilityId === id("DEATH_BLOSSOM") ||
      comboLanded(ctx, c.abilityId, c.timestamp))) {
      events.push({ t: c.timestamp, type: "gain", amount: combo, label: `${c.abilityName} at high Ninki` });
    }
    if (c.abilityId === id("MEISUI")) events.push({ t: c.timestamp, type: "gain", amount: 50, label: "Meisui at high Ninki" });
    if (NINKI_SPEND.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 50, label: c.abilityName });
  }
  // Every gain comes with the cast, hit or not (see gaugeCastTimes), not with
  // the hit, which logs ~0.7s later and can follow the spender it paid
  // for. JZ1KXhDbqkNH3jxR FRU pull 3: Fleeting Raiju cast 0:26.80, its
  // hit and its shadow's at 0:27.56 / 0:27.65, Bhavacakra 0:27.51; a
  // Throwing Dagger at 2:39.97 that never landed (Fatebreaker leaving)
  // paid for the 2:53.55 Bhavacakra. Read at the hits, 113 Ninki findings
  // on disk had the gauge below zero.
  for (const c of ctx.player.casts) {
    const amount = NINKI_HIT.get(c.abilityId);
    if (amount !== undefined) events.push({ t: c.timestamp, type: "gain", amount, label: `${c.abilityName} at high Ninki` });
  }
  // Bunshin's shadow: +5 per weaponskill it copies, read from the stack
  // each one takes at the player's cast (the shadow's hit can go unlogged:
  // MFGhwLnJ34pz7cWQ, Keichi's 1:46.28 Aeolian Edge took a stack, no
  // shadow hit); +10 its Phantom Kamaitachi.
  const castTimes = ctx.player.casts.map((c) => c.timestamp);
  for (const b of ctx.player.buffs ?? []) {
    if (b.abilityId !== S.BUNSHIN.id || (b.buffStatus !== "stackRemoved" && b.buffStatus !== "removed")) continue;
    if (castTimes.some((t) => Math.abs(t - b.timestamp) <= 20)) events.push({ t: b.timestamp, type: "gain", amount: 5, label: "Bunshin hit at high Ninki" });
  }
  for (const c of ctx.player.casts) {
    if (c.abilityId === id("PHANTOM_KAMAITACHI")) events.push({ t: c.timestamp, type: "gain", amount: 10, label: "Phantom Kamaitachi at high Ninki" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const perPoint = ctx.values.perUse(id("BHAVACAKRA")) / 50;
  return gaugeFindings(ctx, {
    name: "Ninki", unit: "Ninki", cap: 100, unitValue: perPoint,
    valueBasis: `${k(perPoint * 50)} average Bhavacakra per 50`,
    events,
  });
};

// Kazematoi (cap 5), from xivanalysis Kazematoi.tsx: a combo'd Armor
// Crush adds 2, Aeolian Edge spends 1. Stacks over the cap are lost, each
// worth one buffed Aeolian Edge over the Armor Crush that replaced it
// (the player's averages). An Aeolian Edge at 0 stacks loses the average
// Armor Crush minus that Aeolian Edge.
const kazematoi: JobCheck = (ctx) => {
  const ac = id("ARMOR_CRUSH"), ae = id("AEOLIAN_EDGE");
  const casts = ctx.player.casts.filter((c) => (c.abilityId === ac && comboLanded(ctx, ac, c.timestamp)) || c.abilityId === ae)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (!casts.some((c) => c.abilityId === ae)) return [];
  const aeHits = castHits(ctx, ae), acAvg = ctx.values.perUse(ac);
  const hitOf = (t: number) => aeHits.find((h) => h.timestamp >= t && h.timestamp <= t + 1_500)?.amount ?? 0;
  let stacks = 0;
  let lastAc: number | undefined, prevT = -Infinity;
  const acWithStacks: number[] = [];
  const buffed: number[] = [];
  const unbuffed: { t: number; dealt: number }[] = [];
  const events: GaugeEvent[] = [];
  for (const c of casts) {
    if (c.timestamp >= ctx.endMs) break;
    if (inWindows(c.timestamp, ctx.dead)) continue;
    if (ctx.dead.some((d) => d.startMs > prevT && d.startMs <= c.timestamp)) { stacks = 0; lastAc = undefined; }
    prevT = c.timestamp;
    if (c.abilityId === ac) {
      events.push({ t: c.timestamp, type: "gain", amount: 2, label: "Armor Crush at 4+ Kazematoi" });
      if (stacks > 0) acWithStacks.push(c.timestamp);
      stacks = Math.min(5, stacks + 2);
      lastAc = c.timestamp;
    } else if (stacks > 0) {
      events.push({ t: c.timestamp, type: "spend", amount: 1, label: "Aeolian Edge" });
      stacks--;
      buffed.push(hitOf(c.timestamp));
    } else {
      unbuffed.push({ t: c.timestamp, dealt: hitOf(c.timestamp) });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const buffedAvg = buffed.length ? buffed.reduce((a, x) => a + x, 0) / buffed.length : 0;
  const perStack = Math.max(0, buffedAvg - acAvg);
  const out = gaugeFindings(ctx, {
    name: "Kazematoi", unit: "Kazematoi", cap: 5, unitValue: perStack,
    valueBasis: `(${k(buffedAvg)} average buffed Aeolian Edge − ${k(acAvg)} average Armor Crush)`,
    events,
  });
  const forced = mergeWindows(ctx.forced);
  for (const u of unbuffed) {
    if (u.t >= ctx.endMs) continue;
    const lost = Math.max(0, acAvg - u.dealt);
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: u.t, endMs: u.t, forced: inWindows(u.t, forced),
      label: "Aeolian Edge without Kazematoi",
      lostDamage: lost, inference: true,
      basis: `${k(acAvg)} average Armor Crush − ${k(u.dealt)} this Aeolian Edge (Kazematoi simulated from casts)`,
      detail: "Aeolian Edge at 0 Kazematoi (Armor Crush does more unbuffed)",
    }));
  }
  // Kazematoi left at the kill (xivanalysis "leftover", 3+): the last
  // Armor Crush could have been a buffed Aeolian Edge. That swap costs 3
  // stacks (2 not gained, 1 spent), and the stacks it spent were there,
  // so 3+ at the kill is always one swap, never two (cap 5). 6 of the 16
  // Ninja kills on disk end with 3-5 (2026-10-16).
  const deadAtEnd = ctx.dead.some((d) => d.endMs >= ctx.endMs - 1 && d.startMs > prevT);
  if (ctx.pull.result === "Kill" && !deadAtEnd && stacks >= KAZEMATOI_LEFTOVER && lastAc !== undefined && perStack > 0) {
    const isForced = inWindows(lastAc, forced);
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: lastAc, endMs: lastAc, forced: isForced,
      cause: isForced ? forcedPart(lastAc - 1, lastAc + 1, ctx.forced).cause : undefined,
      label: "Kazematoi left at the kill",
      lostDamage: perStack, inference: true,
      basis: `${k(buffedAvg)} average buffed Aeolian Edge − ${k(acAvg)} average Armor Crush (Kazematoi simulated from casts)`,
      detail: `${stacks} Kazematoi left at the kill: the ${clock(lastAc)} Armor Crush could have been an Aeolian Edge`,
    }));
  }
  // Armor Crush in Kunai's Bane with Kazematoi held (xivanalysis
  // KunaisBaneWindow "limited Armor Crush"; the opener's, at 0 stacks,
  // never counts): the buffed Aeolian Edge belonged in the window and the
  // Armor Crush after it. The swap moves their difference into the window:
  // worth that difference × the window's observed bonus.
  // A window whose removal never logged runs to the end of the pull: cut
  // it at the debuff's duration (a 9:14 Armor Crush read as in the 6:24
  // window, 7zwpcLxk2Fd1h6Vr).
  const kbMs = (S.KUNAIS_BANE.duration ?? 15_000) + 1_000;
  for (const raw of enemyStatusWindows(ctx, S.KUNAIS_BANE.id)) {
    const w = { startMs: raw.startMs, endMs: Math.min(raw.endMs, raw.startMs + kbMs) };
    const inside = acWithStacks.filter((t) => t >= w.startMs && t <= w.endMs && t < ctx.endMs);
    if (inside.length === 0) continue;
    // On an add the hits' multipliers show no bonus (the 6:16.7 window on
    // Watery Grave read 0): Kunai's Bane's own 10% then.
    const bonus = observedBonus(ctx, w) || KUNAIS_BANE_BONUS;
    const lost = inside.length * perStack * bonus;
    if (lost <= 0) continue;
    const during = forcedPart(w.startMs, w.endMs, ctx.forced);
    out.push(finding(ctx, {
      kind: "burst-window", startMs: inside[0], endMs: inside[inside.length - 1], inference: true,
      forced: during.ms >= 1_500, cause: during.ms >= 1_500 ? during.cause : undefined,
      label: "Armor Crush in Kunai's Bane",
      lostDamage: lost,
      basis: `${inside.length} × (${k(buffedAvg)} average buffed Aeolian Edge − ${k(acAvg)} average Armor Crush) × ` +
        `${Math.round(bonus * 100)}% (the window's observed bonus; Kazematoi simulated from casts)`,
      detail: `${inside.length} Armor Crush${inside.length > 1 ? "es" : ""} in the ${clock(w.startMs)} Kunai's Bane with Kazematoi held`,
    }));
  }
  return out;
};
const KAZEMATOI_LEFTOVER = 3, KUNAIS_BANE_BONUS = 0.1;

const enshroud: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.ENSHROUDED.id, name: "Enshroud", bonus: 0,
  bonusBasis: "a missing Reaping or Communio = its average minus the GCD used instead; a missing oGCD = its average",
  expected: (): ExpectedAction[] => [
    { ids: ids("CROSS_REAPING", "VOID_REAPING", "GRIM_REAPING"), count: 4, name: "Reaping", value: replacedGcd("CROSS_REAPING", "VOID_REAPING") },
    { ids: ids("LEMURES_SLICE", "LEMURES_SCYTHE"), count: 2, name: "Lemure's Slice", value: lostOgcd("LEMURES_SLICE") },
    { ids: ids("SACRIFICIUM"), count: 1, name: "Sacrificium", value: lostOgcd("SACRIFICIUM") },
    { ids: ids("COMMUNIO"), count: 1, name: "Communio", value: replacedGcd("COMMUNIO") },
  ],
});

// Reaper, checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull 8
// (positionals, cancelled Harpes and broken combos already matched):
// - Arcane Circle (xivanalysis ArcaneCircle.ts): two Communios and one
//   Plentiful Harvest, one Communio in the opener (the first window).
//   +3% from the tooltip. A missing one was used outside the window.
//   On that pull (2026-10-08, the rule then) it found the 8:22 window's
//   second Communio 2s late; xivanalysis said 2 missed, the other not
//   visible in the log. Gluttony drift: 1 use found, xivanalysis 8 of 10.
// - Not built: Soul gauge overcap (xivanalysis: 20 lost). Simulated from
//   casts (+10 per combo step, +50 per Soul Slice, −50 per spender) the
//   kill gains 1800 and spends 1850, going below zero 4 times: some gains
//   aren't casts (likely +10 when an enemy dies under Death's Design), so
//   a cast simulation runs short and would hide overcaps.
// - AoE on too few targets (Whorl of Death at 5:00 hit 2; it needs about
//   3 to beat Shadow of Death): `rprAoe` below. Since 2026-10-15 it holds
//   all of xivanalysis AoE.ts's pairs. The new ones, seen firing but not
//   matched against xivanalysis: jN3XDrf2z8PmLgRJ Red Hot and Deep Blue
//   pull 44 5:18-5:19 (Grim Swathe and Guillotine on one boss, the two
//   apart; 14k, 38k), pull 20 4:15 and bVDR2mTL7YGvMxK1 pull 1 3:40
//   (Lemure's Scythe, 29k, 40k), pull 13 3:48 (Soul Scythe on both, 29k).
//   xydWc2pK74HCbZ8q's Red Hot and Deep Blue kill fires the rest on both
//   bosses: Spinning Scythe 3:07-7:35 (9-19k), Executioner's Guillotine
//   6:49 (34k), Grim Reaping 3:57 (23k), Guillotine, Soul Scythe.
// Rechecked on qjCMx4bRfgNKwX9T Dancing Mad kill (7.5, 2026-10-13):
// GCD uptime, Harvest Moon 5/4, Death's Design, its 14 missed
// positionals (same split by action), 2 Whorls on too few targets, the
// cancelled Communio and its weaving gaps all match. Its 6 missed
// Enshroud actions are the 6:12 Enshroud, cashed with Sacrificium and
// Communio 9s before P2's downtime (counted: holding the Shroud through
// the downtime would have kept the Reapings). Its "2 Communios missed in
// tinctures" (1:58, 17:48) is the tincture placement finding. Not
// adopted: Gluttony drift (31s and 25s at two-minute marks; 18/18, no
// use lost); Soul gauge 20 (the cast simulation's reason above stands).
// Soul Reaver / Executioner stacks dropped and Enhanced Gibbet / Gallows /
// Void / Cross Reaping overwritten (Reaver.tsx, Executioner.tsx,
// Procs.tsx), 2026-10-16: `reaperStacks`, `reaperEnhancedOverwrites`
// below. On disk 38 drops counted (21 Soul Reaver, 17 Executioner; 10 at
// a death or forced) and 49 overwrites; the FFLogs top 20 for Red Hot and
// Deep Blue drop 4 stacks in 629 and press the same one twice once in 794.
// Drops matched xivanalysis (2026-10-16): xydWc2pK74HCbZ8q 7 Soul Reaver
// + 2 Executioner, fJxTNgwtRKjYbvZp 4 Executioner. Overwrites not yet on
// a page.
// Arcane Circle, from xivanalysis ArcaneCircle.tsx: the two-minute burst
// is a double Enshroud inside the window: 7 Reapings, 4 Lemure's, 2
// Sacrificium, 1 Plentiful Harvest, 2 Communio; the opener half of that
// (Plentiful Harvest still 1). Valued at the window's observed bonus (it
// lines up with the party's buffs): a Reaping done just after it lost the
// whole raid-buff stack, not Arcane Circle's 3%. dDar482XvFKBPJYh FRU kill:
// xivanalysis's 27 missing match (8:30, 10:37, 14:18, 16:18, 18:18 single
// Enshrouds in the window).
const AC_OPENER_MS = 30_000;
const arcaneCircle: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.ARCANE_CIRCLE.id, name: "Arcane Circle", bonus: "observed",
  bonusBasis: "the window's observed bonus (the player's multiplier in it over their median outside raid buffs)",
  expected: (c, casts): ExpectedAction[] => {
    const half = casts.length > 0 && casts[0].timestamp < AC_OPENER_MS ? 0.5 : 1;
    return [
      { ids: ids("CROSS_REAPING", "VOID_REAPING", "GRIM_REAPING"), count: Math.ceil(7 * half), name: "Reaping" },
      { ids: ids("LEMURES_SLICE", "LEMURES_SCYTHE"), count: 4 * half, name: "Lemure's Slice" },
      { ids: ids("SACRIFICIUM"), count: 2 * half, name: "Sacrificium" },
      { ids: ids("PLENTIFUL_HARVEST"), count: 1, name: "Plentiful Harvest" },
      { ids: ids("COMMUNIO"), count: 2 * half, name: "Communio" },
    ];
  },
});

// Death's Design (+10% on the Reaper's own damage to the target, xivanalysis
// DeathsDesign.tsx: uptime). Measured from the Reaper's own hits: each hit
// whose snapshot lacks it, from the first one that has it, outside forced
// time, lost 10% of itself. Per target, so P3/P4's second boss counts.
// Summed per phase, with each stretch as a moment.
const DD_STRETCH_GAP_MS = 5_000;
const deathsDesign: JobCheck = (ctx) => {
  const dd = S.DEATHS_DESIGN?.id;
  if (dd === undefined) return [];
  const hits = ctx.player.damageDone.filter((e) => !e.pet && (e.amount ?? 0) > 0 && e.timestamp < ctx.endMs && e.statusIds);
  const first = hits.find((e) => e.statusIds!.includes(dd))?.timestamp;
  if (first === undefined) return [];
  const forced = mergeWindows(ctx.forced);
  const bare = hits.filter((e) => e.timestamp > first && !e.statusIds!.includes(dd) && !inWindows(e.timestamp, forced));
  const byPhase = new Map<number | undefined, typeof bare>();
  for (const e of bare) {
    const ph = ctx.phaseOf(e.timestamp);
    byPhase.set(ph, [...(byPhase.get(ph) ?? []), e]);
  }
  const out: DamageFinding[] = [];
  for (const [, list] of byPhase) {
    const stretches: { startMs: number; endMs: number; dealt: number; n: number }[] = [];
    for (const e of list) {
      const last = stretches[stretches.length - 1];
      if (last && e.timestamp - last.endMs <= DD_STRETCH_GAP_MS) { last.endMs = e.timestamp; last.dealt += e.amount ?? 0; last.n++; }
      else stretches.push({ startMs: e.timestamp, endMs: e.timestamp, dealt: e.amount ?? 0, n: 1 });
    }
    const dealt = stretches.reduce((a, x) => a + x.dealt, 0);
    out.push(finding(ctx, {
      kind: "buff-uptime", startMs: stretches[0].startMs, endMs: stretches[stretches.length - 1].endMs, forced: false,
      label: "Death's Design down",
      lostDamage: dealt * 0.1,
      basis: `${k(dealt)} dealt in ${list.length} hits without Death's Design on the target × 10% (tooltip)`,
      detail: `${list.length} hits without Death's Design in ${ctx.phaseName(ctx.phaseOf(list[0].timestamp)) ?? "the pull"}`,
      moments: stretches.map((x) => ({
        startMs: x.startMs, endMs: x.endMs, lostDamage: x.dealt * 0.1,
        detail: `${x.n} hit${x.n === 1 ? "" : "s"} without Death's Design`,
      })),
    }));
  }
  return out;
};

// Harvest Moon (xivanalysis HarvestMoon.tsx: one per downtime long enough
// to cast Soulsow, plus the pre-pull one). Each boss-untargetable stretch
// of SOULSOW_WINDOW_MS+ with targetable time after it is a chance: Soulsow
// cast in it, and Harvest Moon fired before the next. One with no Soulsow
// cast in it was wasted, whether Soulsow wasn't up (never recast) or was
// (the last Harvest Moon was held through it). Each costs the average
// Harvest Moon minus the GCD it would have replaced. dDar482XvFKBPJYh FRU
// kill: 3:20 (not recast), 5:50 and 12:55 (held; the 12:25 Soulsow's
// Harvest Moon went at 18:28). xivanalysis counts 7 chances, from its
// invulnerability windows; the boss-untargetable windows give 9.
const SOULSOW_WINDOW_MS = 6_000;
const harvestMoon: JobCheck = (ctx) => {
  const soulsow = id("SOULSOW"), moon = id("HARVEST_MOON");
  if (!ctx.player.casts.some((c) => c.abilityId === moon || c.abilityId === soulsow)) return [];
  const downtime = mergeWindows(ctx.forced.filter((f) => f.cause === "boss untargetable"))
    .filter((w) => w.endMs - w.startMs >= SOULSOW_WINDOW_MS && w.endMs + ctx.baseGcdMs < ctx.endMs);
  const value = Math.max(0, ctx.values.perUse(moon) - ctx.values.gcdValue(undefined, false));
  if (value <= 0) return [];
  const out: DamageFinding[] = [];
  for (const w of downtime) {
    if (ctx.player.casts.some((c) => c.abilityId === soulsow && c.timestamp >= w.startMs - 1_000 && c.timestamp <= w.endMs)) continue;
    if (inWindows(w.startMs, ctx.dead)) continue;
    const up = statusWindows(ctx, S.SOULSOW.id).some((s) => s.startMs <= w.startMs && s.endMs >= w.endMs);
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: w.startMs, endMs: w.endMs, forced: false, inference: true,
      label: "Harvest Moon chance missed",
      lostDamage: value,
      basis: `${k(ctx.values.perUse(moon))} average Harvest Moon − ${k(ctx.values.gcdValue(undefined, false))} average GCD it replaces`,
      detail: up
        ? `Soulsow was still up through ${s(w.endMs - w.startMs)} of downtime: Harvest Moon before it, then Soulsow in it, is one more`
        : `No Soulsow cast in ${s(w.endMs - w.startMs)} of downtime`,
    }));
  }
  return out;
};

// Shroud (cap 100), from xivanalysis OtherGauges.tsx: +10 per Gibbet,
// Gallows, Guillotine (Executioner's too); Enshroud spends 50 unless Ideal
// Host is up (Plentiful Harvest's free Enshroud). 50 Shroud is one
// Enshroud: worth the player's average Enshroud window (Reapings, Lemure's,
// Sacrificium, Communio dealt in it) minus the same time's average GCDs.
const SHROUD_GAIN = new Set(ids("GIBBET", "GALLOWS", "GUILLOTINE", "EXECUTIONERS_GIBBET", "EXECUTIONERS_GALLOWS", "EXECUTIONERS_GUILLOTINE"));
const ENSHROUD_CONTENT = new Set(ids("CROSS_REAPING", "VOID_REAPING", "GRIM_REAPING", "LEMURES_SLICE", "LEMURES_SCYTHE", "SACRIFICIUM", "COMMUNIO"));
const shroud: JobCheck = (ctx) => {
  const enshroud = id("ENSHROUD");
  const idealHost = statusWindows(ctx, S.IDEAL_HOST.id);
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    if (SHROUD_GAIN.has(c.abilityId)) events.push({ t: c.timestamp, type: "gain", amount: 10, label: `${c.abilityName} at full Shroud` });
    if (c.abilityId === enshroud && !idealHost.some((w) => c.timestamp >= w.startMs && c.timestamp <= w.endMs + 200)) {
      events.push({ t: c.timestamp, type: "spend", amount: 50, label: "Enshroud" });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const windows = statusWindows(ctx, S.ENSHROUDED.id).filter((w) => w.endMs <= ctx.endMs);
  if (windows.length === 0) return [];
  const content = windows.reduce((a, w) => a + ctx.player.damageDone
    .filter((e) => ENSHROUD_CONTENT.has(e.abilityId) && e.timestamp >= w.startMs && e.timestamp <= w.endMs + 1_000)
    .reduce((x, e) => x + (e.amount ?? 0), 0), 0) / windows.length;
  const span = windows.reduce((a, w) => a + w.endMs - w.startMs, 0) / windows.length;
  const plain = (span / ctx.baseGcdMs) * ctx.values.gcdValue(undefined, false);
  const perEnshroud = Math.max(0, content - plain);
  return gaugeFindings(ctx, {
    name: "Shroud", unit: "Shroud", cap: 100, unitValue: perEnshroud / 50,
    valueBasis: `(${k(content)} average Enshroud window − ${k(plain)} of average GCDs in its ${s(span)}) per 50`,
    events,
  });
};

// The AoE line on too few targets (xivanalysis AoE.ts minimums): each
// judged by what it dealt against the player's average for the
// single-target action it replaced, so a patch's potency change moves the
// verdict with it.
const rprAoe = aoeComboOnOneTarget([
  [id("WHORL_OF_DEATH"), id("SHADOW_OF_DEATH"), 3], [id("SPINNING_SCYTHE"), id("SLICE"), 4],
  [id("SOUL_SCYTHE"), id("SOUL_SLICE"), 3], [id("GRIM_SWATHE"), id("BLOOD_STALK"), 3],
  [id("GUILLOTINE"), ids("GALLOWS", "GIBBET"), 3],
  [id("EXECUTIONERS_GUILLOTINE"), ids("EXECUTIONERS_GALLOWS", "EXECUTIONERS_GIBBET"), 4],
  [id("LEMURES_SCYTHE"), id("LEMURES_SLICE"), 3], [id("GRIM_REAPING"), ids("VOID_REAPING", "CROSS_REAPING"), 3],
]);

// xivanalysis AoeChecker, without its Fuko / Oka / Mangetsu rows (Oka and
// Mangetsu only count under Meikyo Shisui there; none seen on a log yet).
// Tenka Goken spends 2 Sen to Midare's 3. On one target it's usually a
// missed Sen in a Meikyo (Enuo pull 2 in the header), where the third Sen
// cost no extra GCD, so the whole Midare difference is lost. Guren only on
// one target: from 7.4 two out-damage Senei, and judging two by the
// damage would flag crit noise (pre-7.4 logs' two-target Gurens go unseen).
const samAoe = aoeComboOnOneTarget([
  [id("HISSATSU_GUREN"), id("HISSATSU_SENEI")], [id("HISSATSU_KYUTEN"), id("HISSATSU_SHINTEN"), 3],
  [id("TENKA_GOKEN"), id("MIDARE_SETSUGEKKA"), 3], [id("TENDO_GOKEN"), id("TENDO_SETSUGEKKA"), 3],
  [id("KAESHI_GOKEN"), id("KAESHI_SETSUGEKKA"), 3], [id("TENDO_KAESHI_GOKEN"), id("TENDO_KAESHI_SETSUGEKKA"), 3],
]);
// Oka / Mangetsu under Meikyo Shisui on under 3 (xivanalysis AoeChecker.ts):
// the same Sen as Kasha / Gekko from one GCD each, so the finisher's average
// is the alternative. Outside Meikyo they end the 2-step Fuko combo, which
// a 3-step finisher's average misprices: not judged. 7zwpcLxk2Fd1h6Vr
// (Alison Octavious): Oka 3:01.8 and 3:51.5, Mangetsu 3:46.9, each on Red
// Hot and Deep Blue (22k for the Oka against ~38k for her Kasha);
// xivanalysis's 2 + 1.
const samMeikyoAoeAll = aoeComboOnOneTarget([[id("OKA"), id("KASHA"), 3], [id("MANGETSU"), id("GEKKO"), 3]]);
const samMeikyoAoe: JobCheck = (ctx) => {
  const meikyo = statusWindows(ctx, S.MEIKYO_SHISUI.id);
  return samMeikyoAoeAll(ctx).filter((f) => meikyo.some((w) => f.startMs > w.startMs && f.startMs <= w.endMs + 50));
};

// Higanbana (xivanalysis DoTs.tsx, 90% uptime): the shared DoT check, its
// refreshes against Gekko (a one-Sen GCD, as Higanbana spends one Sen).
const higanbana: JobCheck = (ctx) => dotFindings(ctx, {
  statusIds: [S.HIGANBANA.id], name: S.HIGANBANA.name, durationMs: S.HIGANBANA.duration ?? 60_000,
  fillerId: () => ({ id: id("GEKKO"), name: "Gekko" }),
});

// Kenki, Meditation and Sen (xivanalysis Kenki.tsx, Shoha.tsx, Sen.tsx),
// simulated from casts. A combo step counts when its combo landed or
// under Meikyo Shisui.
// - Kenki (cap 100): Hakaze / Gyofu +5, Enpi / Fuko +10, Ikishoten +50;
//   combo steps Jinpu / Shifu +5, Gekko / Kasha / Mangetsu / Oka +10,
//   Yukikaze +15; Meditate +10 per 3s (5 at most); Hagakure +10 per Sen;
//   Third Eye / Tengentsu +10 when hit under it.
//   Zanshin −50, Guren / Kyuten / Shinten / Senei −25, Gyoten / Yaten −10.
//   Lost Kenki is her Shinten per 25.
// - Meditation (cap 3): +1 per Iaijutsu and Ogi Namikiri, +1 per 3s of
//   Meditate; Shoha −3. Lost, a third of her Shoha.
// - Sen (Setsu, Getsu, Ka; one each): Yukikaze Setsu, Gekko / Mangetsu
//   Getsu, Kasha / Oka Ka. Iaijutsu and Hagakure clear them. One gained while held is
//   wasted: a third of (her Midare Setsugekka − an average GCD), the
//   Midare it delays.
// A death empties all three. Also the Samurai's timeline lanes (gauges.ts).
const SAM_ACTION_KENKI: [string, number][] = [["HAKAZE", 5], ["GYOFU", 5], ["ENPI", 10], ["FUKO", 10], ["IKISHOTEN", 50]];
const SAM_COMBO_KENKI: [string, number][] = [["JINPU", 5], ["SHIFU", 5], ["GEKKO", 10], ["KASHA", 10], ["MANGETSU", 10], ["OKA", 10], ["YUKIKAZE", 15]];
const SAM_KENKI_SPEND: [string, number][] = [["ZANSHIN", 50], ["HISSATSU_GUREN", 25], ["HISSATSU_KYUTEN", 25], ["HISSATSU_SHINTEN", 25],
  ["HISSATSU_SENEI", 25], ["HISSATSU_GYOTEN", 10], ["HISSATSU_YATEN", 10]];
const SAM_IAIJUTSU = ["HIGANBANA", "TENKA_GOKEN", "MIDARE_SETSUGEKKA", "TENDO_GOKEN", "TENDO_SETSUGEKKA"];
const SAM_SEN: [string, ("setsu" | "getsu" | "ka")[]][] = [["YUKIKAZE", ["setsu"]], ["GEKKO", ["getsu"]], ["MANGETSU", ["getsu"]],
  ["KASHA", ["ka"]], ["OKA", ["ka"]]];
const MEDITATE_TICK_MS = 3_000, EYE_MS = 4_000, SAM_COMBO_MS = 30_000;
// Enpi doesn't break the combo (7zwpcLxk2Fd1h6Vr 4:41.5, Gekko after Enpi
// with its full combo bonus).
const SAM_CHAIN = new Set(ids("HAKAZE", "GYOFU", "JINPU", "SHIFU", "GEKKO", "KASHA", "YUKIKAZE", "FUKO", "MANGETSU", "OKA"));
const SAM_COMBO_FROM = new Map<number, Set<number>>([
  ...ids("JINPU", "SHIFU", "YUKIKAZE").map((x) => [x, new Set(ids("HAKAZE", "GYOFU"))] as [number, Set<number>]),
  [id("GEKKO"), new Set(ids("JINPU"))], [id("KASHA"), new Set(ids("SHIFU"))],
  ...ids("MANGETSU", "OKA").map((x) => [x, new Set(ids("FUKO"))] as [number, Set<number>]),
]);
export function samGaugeSpecs(ctx: PlayerCheckContext): GaugeSpec[] {
  const casts = ctx.player.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const meikyoW = statusWindows(ctx, S.MEIKYO_SHISUI.id);
  // A pre-pull Meikyo shows first as a stack removed, which statusWindows
  // doesn't open a window for (pG319BgHTnPJc6Ft Necron pull 2: 0:00.76,
  // removed 0:05.58): from the pull's start to its first removal.
  const meikyoEvents = (ctx.player.buffs ?? []).filter((e) => e.abilityId === S.MEIKYO_SHISUI.id).sort((a, b) => a.timestamp - b.timestamp);
  if (meikyoEvents.length && meikyoEvents[0].buffStatus !== "applied") {
    const end = meikyoEvents.find((e) => e.buffStatus === "removed")?.timestamp;
    if (end !== undefined && !meikyoW.some((w) => w.startMs <= 0 && w.endMs >= end)) meikyoW.push({ startMs: -Infinity, endMs: end });
  }
  // The combo is read from the cast order, not the hit's bonus: Gekko and
  // Kasha's positional shows as a bonus too (7zwpcLxk2Fd1h6Vr 8:07.45, a
  // Kasha with no Shifu before it at +23%, read as a Sen).
  const chain = casts.filter((c) => SAM_CHAIN.has(c.abilityId));
  const comboOk = (c: { abilityId: number; timestamp: number }) => {
    if (meikyoW.some((w) => c.timestamp > w.startMs && c.timestamp <= w.endMs + 50)) return true;
    const prev = [...chain].reverse().find((x) => x.timestamp < c.timestamp);
    const from = SAM_COMBO_FROM.get(c.abilityId);
    return !!prev && !!from && from.has(prev.abilityId) && c.timestamp - prev.timestamp <= SAM_COMBO_MS;
  };
  const byId = <T,>(list: [string, T][]) => new Map(list.filter(([key]) => A[key]).map(([key, v]) => [A[key].id, v]));
  const actionKenki = byId(SAM_ACTION_KENKI), comboKenki = byId(SAM_COMBO_KENKI), spendKenki = byId(SAM_KENKI_SPEND), senOf = byId(SAM_SEN);
  const iaijutsu = new Set(ids(...SAM_IAIJUTSU));
  const kenki: GaugeEvent[] = [], meditation: GaugeEvent[] = [];
  const sen: Record<"setsu" | "getsu" | "ka", GaugeEvent[]> = { setsu: [], getsu: [], ka: [] };
  const held = { setsu: false, getsu: false, ka: false };
  const clearSen = (t: number, label: string) => {
    for (const s of ["setsu", "getsu", "ka"] as const) if (held[s]) { sen[s].push({ t, type: "spend", amount: 1, label }); held[s] = false; }
  };
  let d = 0;
  const deaths = [...ctx.dead].sort((a, b) => a.startMs - b.startMs);
  for (const c of casts) {
    // Sen held at a death are lost with it (xivanalysis counts them as
    // wasted): a gain at the cap just before the reset, so forced.
    while (d < deaths.length && deaths[d].startMs <= c.timestamp) {
      for (const s of ["setsu", "getsu", "ka"] as const) {
        if (held[s]) sen[s].push({ t: deaths[d].startMs, type: "gain", amount: 1, label: "Sen held at a death" });
        held[s] = false;
      }
      d++;
    }
    const id = c.abilityId, t = c.timestamp;
    const ak = actionKenki.get(id), ck = comboKenki.get(id), sk = spendKenki.get(id);
    if (ak) kenki.push({ t, type: "gain", amount: ak, label: `${c.abilityName} at 100 Kenki` });
    else if (ck && comboOk(c)) kenki.push({ t, type: "gain", amount: ck, label: `${c.abilityName} at 100 Kenki` });
    else if (sk) kenki.push({ t, type: "spend", amount: sk, label: c.abilityName });
    if (iaijutsu.has(id) || id === A.OGI_NAMIKIRI.id) meditation.push({ t, type: "gain", amount: 1, label: `${c.abilityName} at 3 Meditation` });
    else if (id === A.SHOHA.id) meditation.push({ t, type: "spend", amount: 3, label: "Shoha" });
    const gives = senOf.get(id);
    if (gives && comboOk(c)) for (const s of gives) { sen[s].push({ t, type: "gain", amount: 1, label: `${c.abilityName} with the Sen held` }); held[s] = true; }
    if (iaijutsu.has(id)) clearSen(t, c.abilityName);
    else if (id === A.HAGAKURE.id) {
      const n = Number(held.setsu) + Number(held.getsu) + Number(held.ka);
      if (n) kenki.push({ t, type: "gain", amount: 10 * n, label: "Hagakure at 100 Kenki" });
      clearSen(t, "Hagakure");
    }
  }
  // Third Eye / Tengentsu: +10 when a hit lands on her while it's up (the
  // first hit only). Without it Kenki ran negative in 43 of the samples'
  // lanes (kNQKG6yHmvZTJ2hf Genichiro Ashina 3:57-8:44). The status isn't
  // in the buff stream: from the cast, for its 4s.
  const eyes = new Set(ids("THIRD_EYE", "TENGENTSU"));
  for (const c of casts.filter((x) => eyes.has(x.abilityId))) {
    const hit = ctx.player.damageTaken.find((e) => e.timestamp > c.timestamp && e.timestamp <= c.timestamp + EYE_MS);
    if (hit) kenki.push({ t: hit.timestamp, type: "gain", amount: 10, label: "Tengentsu at 100 Kenki" });
  }
  for (const w of statusWindows(ctx, S.MEDITATE.id)) {
    const ticks = Math.min(5, Math.floor((Math.min(w.endMs, ctx.endMs) - w.startMs) / MEDITATE_TICK_MS));
    for (let i = 1; i <= ticks; i++) {
      const t = w.startMs + i * MEDITATE_TICK_MS;
      kenki.push({ t, type: "gain", amount: 10, label: "Meditate at 100 Kenki" });
      if (i <= 3) meditation.push({ t, type: "gain", amount: 1, label: "Meditate at 3 Meditation" });
    }
  }
  // The Sen resets come 1ms after their "held at a death" losses.
  for (const dd of ctx.dead) {
    for (const list of [kenki, meditation]) list.push({ t: dd.startMs, type: "reset", label: "death" });
    for (const list of [sen.setsu, sen.getsu, sen.ka]) list.push({ t: dd.startMs + 1, type: "reset", label: "death" });
  }
  const shinten = ctx.values.perUse(A.HISSATSU_SHINTEN.id), shoha = ctx.values.perUse(A.SHOHA.id);
  const midare = ctx.values.perUse(A.MIDARE_SETSUGEKKA.id), gcd = ctx.values.gcdValue(undefined, false);
  const perSen = Math.max(0, (midare - gcd) / 3);
  const senSpec = (name: string, events: GaugeEvent[]): GaugeSpec => ({
    name, unit: name, cap: 1, unitValue: perSen, events,
    valueBasis: `(${k(midare)} average Midare Setsugekka − ${k(gcd)} average GCD) ÷ 3 (the Midare it delays)`,
  });
  return [
    { name: "Kenki", unit: "Kenki", cap: 100, unitValue: shinten / 25, events: kenki, valueBasis: `${k(shinten)} average Shinten per 25 Kenki` },
    { name: "Meditation", unit: "Meditation", cap: 3, unitValue: shoha / 3, events: meditation, valueBasis: `${k(shoha)} average Shoha per 3 Meditation` },
    senSpec("Setsu", sen.setsu), senSpec("Getsu", sen.getsu), senSpec("Ka", sen.ka),
  ];
}
const samGauges: JobCheck = (ctx) => samGaugeSpecs(ctx).flatMap((spec) => (spec.unitValue > 0 ? gaugeFindings(ctx, spec) : []));

export const SAM_CHECKS: JobCheck[] = [uptime("FUGETSU", 0.13, "Fugetsu is +13%, FFLogs multiplier"), meikyo, samAoe, samMeikyoAoe, higanbana, samGauges];
// Rattling Coil (xivanalysis UncoiledFury): +1 per Vicewinder / Vicepit /
// Serpent's Ire, cap 3, Uncoiled Fury spends 1. Coils left when a kill
// ends are lost too. On 2T1HzdPKgbhM43am fight 10 the cast simulation finds
// xivanalysis's 3 overcapped (12:07, 14:08, 15:23) and 3 left at the end,
// never going below zero.
// Coils left at a kill are leftAtKill (judged by how long they were held,
// shared.ts gaugeFindings). The timeline draws the same simulation.
export function rattlingCoilSpec(ctx: PlayerCheckContext): GaugeSpec {
  const gain = new Set(ids("VICEWINDER", "VICEPIT", "SERPENTS_IRE"));
  const spend = new Set(ids("UNCOILED_FURY"));
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    if (gain.has(c.abilityId)) events.push({ t: c.timestamp, type: "gain", amount: 1, label: `${c.abilityName} at 3 coils` });
    else if (spend.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 1, label: "Uncoiled Fury" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  // Uncoiled Fury is a GCD: it replaces one, so only its excess counts.
  const perCoil = replacedGcd("UNCOILED_FURY")(ctx) + ctx.values.perUse(id("UNCOILED_TWINFANG")) + ctx.values.perUse(id("UNCOILED_TWINBLOOD"));
  const basis = `${k(perCoil)} per coil: Uncoiled Fury less the GCD it replaces, plus its Twinfang and Twinblood`;
  return {
    name: "Rattling Coil", unit: "Rattling Coil", cap: 3, unitValue: perCoil, valueBasis: basis, events,
    leftAtKill: { unitValue: perCoil, valueBasis: basis },
  };
}
const rattlingCoils: JobCheck = (ctx) => gaugeFindings(ctx, rattlingCoilSpec(ctx));

// Serpent Offerings, after xivanalysis vpr/modules/snilk.tsx (100 at most,
// start 0): Hunter's / Swiftskin's Coil and Den +5; the four finishers
// (Hindsbane, Hindsting, Flanksbane, Flanksting) and Jagged / Bloodied Maw
// +10; Reawaken −50 unless Ready to Reawaken (Serpent's Ire's free one) is
// up. A death empties it (xivanalysis resets gauges on death). 50 of them
// are one Reawaken: Reawaken, four Generations and Ouroboros over the six
// GCDs they replace, plus four Legacies (her averages). Offerings over 100
// are lost at that rate. At a kill, a Reawaken that could still have been
// played out (50 or more held, or Ready to Reawaken up, while six ordinary
// GCDs went by) is one Reawaken lost (snilk.tsx "lost a use"); fewer than
// 50 isn't. Also the Offerings lane (gauges.ts).
// K6qfMamL7rN8yz2Q Vamp Fatale: 20 over the cap (3:26 5 + 5, 7:18 10),
// xivanalysis's 20. cBZXM6kayd7Tf9Fg Red Hot and Deep Blue: 6 paid
// Reawakens in 9:36 (2:19 to 4:19 none), 11 overcaps and 80 held at the
// kill.
const OFFERINGS_MAX = 100, OFFERINGS_COST = 50;
const OFFERING_GAINS: [string, number][] = [
  ["HUNTERS_COIL", 5], ["SWIFTSKINS_COIL", 5], ["HUNTERS_DEN", 5], ["SWIFTSKINS_DEN", 5],
  ["HINDSBANE_FANG", 10], ["HINDSTING_STRIKE", 10], ["FLANKSBANE_FANG", 10], ["FLANKSTING_STRIKE", 10],
  ["JAGGED_MAW", 10], ["BLOODIED_MAW", 10],
];
const REAWAKEN_GCDS = ["REAWAKEN", "FIRST_GENERATION", "SECOND_GENERATION", "THIRD_GENERATION", "FOURTH_GENERATION", "OUROBOROS"];
const LEGACIES = ["FIRST_LEGACY", "SECOND_LEGACY", "THIRD_LEGACY", "FOURTH_LEGACY"];
function reawakenValue(ctx: PlayerCheckContext): { value: number; basis: string } {
  const gcds = REAWAKEN_GCDS.filter((key) => A[key]).reduce((a, key) => a + replacedGcd(key)(ctx), 0);
  const legacies = LEGACIES.filter((key) => A[key]).reduce((a, key) => a + ctx.values.perUse(A[key].id), 0);
  return { value: gcds + legacies,
    basis: `one Reawaken ${k(gcds + legacies)}: Reawaken, four Generations and Ouroboros less the average GCD each replaces (${k(gcds)}), plus four Legacies (${k(legacies)})` };
}
export function serpentOfferingsSpec(ctx: PlayerCheckContext): GaugeSpec | undefined {
  const reawaken = A.REAWAKEN?.id, ready = S.READY_TO_REAWAKEN?.id;
  if (reawaken === undefined || ready === undefined) return undefined;
  const gains = new Map(OFFERING_GAINS.filter(([key]) => A[key]).map(([key, n]) => [A[key].id, n]));
  const free = statusWindows(ctx, ready);
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    const n = gains.get(c.abilityId);
    if (n !== undefined) events.push({ t: c.timestamp, type: "gain", amount: n, label: `${c.abilityName} at 100 Offerings` });
    else if (c.abilityId === reawaken && !free.some((w) => c.timestamp >= w.startMs && c.timestamp <= w.endMs + 200)) {
      events.push({ t: c.timestamp, type: "spend", amount: OFFERINGS_COST, label: "Reawaken" });
    }
  }
  if (!events.some((e) => e.type === "spend") && !ctx.player.casts.some((c) => c.abilityId === reawaken)) return undefined;
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const { value, basis } = reawakenValue(ctx);
  return { name: "Serpent Offerings", unit: "Serpent Offerings", cap: OFFERINGS_MAX, unitValue: value / OFFERINGS_COST,
    valueBasis: `(${basis}) ÷ 50`, events };
}
const serpentOfferingsCheck: JobCheck = (ctx) => {
  const spec = serpentOfferingsSpec(ctx);
  if (!spec || spec.unitValue <= 0) return [];
  const out = gaugeFindings(ctx, spec);
  if (ctx.pull.result !== "Kill") return out;
  const steps = gaugeTrack(ctx, spec).steps;
  const held = steps[steps.length - 1]?.value ?? 0;
  // Since when a Reawaken was ready: the last time the gauge reached 50,
  // or Ready to Reawaken came up.
  const reachedAt = held >= OFFERINGS_COST
    ? [...steps].reverse().find((st, i, rev) => st.value >= OFFERINGS_COST && (rev[i + 1]?.value ?? 0) < OFFERINGS_COST)?.t
    : undefined;
  const readyAt = statusWindows(ctx, S.READY_TO_REAWAKEN.id).find((w) => w.endMs > ctx.endMs)?.startMs;
  const { value, basis } = reawakenValue(ctx);
  // From when it could have been pressed: the later of reaching it and the
  // last Reawaken window's end (pooling for Serpent's Ire is right:
  // pnLBzfbH8NjGAJRg Enuo pull 9 held 50 from 7:41 into the 8:27 burst).
  // Lost only if a whole Reawaken's six GCDs went to ordinary GCDs since,
  // outside forced time (that Enuo pull ended Ouroboros 8:54, its Limit
  // Break 8:59, one Vicewinder; K6qfMamL7rN8yz2Q Red Hot and Deep Blue
  // reached 50 8.1s before the kill).
  const windowEnd = statusWindows(ctx, S.REAWAKENED.id).filter((w) => w.startMs < ctx.endMs).pop()?.endMs ?? -Infinity;
  const reawakenIds = new Set(ids(...REAWAKEN_GCDS));
  for (const [reached, what] of [[reachedAt, `${held} Serpent Offerings`], [readyAt, "Ready to Reawaken"]] as const) {
    if (reached === undefined) continue;
    const since = Math.max(reached, windowEnd);
    const ordinary = ctx.uses.filter((u) => u.startMs >= since && u.startMs < ctx.endMs && !reawakenIds.has(u.action.id) &&
      !inWindows(u.startMs, ctx.forced)).length;
    const forced = ordinary < REAWAKEN_GCDS.length;
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: since, endMs: ctx.endMs, forced,
      cause: forced ? `only ${ordinary} ordinary GCD${ordinary === 1 ? "" : "s"} before the kill, under a Reawaken's ${REAWAKEN_GCDS.length}` : undefined,
      label: "Reawaken left at the kill", lostDamage: value, basis,
      detail: `${what} held from ${clock(since)} to the kill, ${ordinary} ordinary GCDs meanwhile: one Reawaken never pressed`,
    }));
  }
  return out;
};

// Writhing Snap with a Rattling Coil held: Uncoiled Fury is Viper's ranged
// GCD (xivanalysis Snaps.tsx: "save Uncoiled Fury for when you cannot stay
// in melee range"). Spending the coil there frees a melee GCD later, so the
// Snap costs the same as an unforced one (checks.ts checkDisengages).
// Only when the coil wasn't pooled: the next Uncoiled Fury came outside
// raid buffs and outside movement / forced time (spent in melee range), or
// never (held to the end). Coils pooled for the burst are right: Fury and
// its follow-ups under ~25% of buffs are worth about what the Snap costs.
// On K6qfMamL7rN8yz2Q Red Hot and Deep Blue (Pull 2): 8:15.7 with 2 coils
// (both left at the kill). 5:56.8 held 1, spent at 6:13.1 on an Xtreme
// Wave tether stretch (another ranged need): not counted. The other 11
// Snaps had none.
export function vprDisengageAlternative(ctx: PlayerCheckContext, t: number): string | undefined {
  if (ctx.job !== "Viper") return undefined;
  const steps = gaugeTrack(ctx, rattlingCoilSpec(ctx)).steps;
  const heldAt = (x: number) => [...steps].reverse().find((st) => st.t < x)?.value ?? 0;
  const held = heldAt(t);
  if (held <= 0) return undefined;
  // One coil covers one Snap: earlier Snaps since the last Fury that were
  // a choice claim it first (CABrk9zXLfJG8h6R The Tyrant, 0:50 and 1:39
  // with the same coil, spent 1:46). An excused one claims none: its coil
  // stayed pooled (K6qfMamL7rN8yz2Q The Tyrant, five at 5:42-5:57 with 2
  // held, before the 6:29.4 one with 3).
  const fury = id("UNCOILED_FURY"), snap = id("WRITHING_SNAP");
  const lastFury = [...ctx.player.casts].reverse().find((c) => c.abilityId === fury && c.timestamp < t)?.timestamp ?? -Infinity;
  const earlier = ctx.player.casts.filter((c) => c.abilityId === snap && c.timestamp > lastFury && c.timestamp < t &&
    vprDisengageAlternative(ctx, c.timestamp) !== undefined).length;
  if (earlier >= held) return undefined;
  const coils = `${held} Rattling Coil${held === 1 ? "" : "s"} held (Uncoiled Fury is the ranged GCD)`;
  const next = ctx.player.casts.find((c) => c.abilityId === fury && c.timestamp > t && c.timestamp < ctx.endMs);
  if (!next) return `${coils}, never spent`;
  const at = next.timestamp;
  const rangedNeed = inWindows(at, ctx.forced) || inWindows(at, ctx.movement ?? []);
  // A Snap under raid buffs spends nothing on pooling: the coil goes under
  // buffs either way. Only a last coil the next ranged need takes excuses
  // it. K6qfMamL7rN8yz2Q The Tyrant: 6:29.4 and 6:31.5, in the 6:10
  // Serpent's Ire window and the tincture with 3 coils (the Ire had just
  // overcapped one); the next Fury, 6:34.5, was the towers' knockback.
  if (inWindows(t, ctx.buffWindows)) {
    if (rangedNeed && held - earlier <= 1) return undefined;
    return `${coils} under raid buffs`;
  }
  if (inWindows(at, ctx.buffWindows) || rangedNeed) return undefined;
  return `${coils}, next spent at ${clock(at)} outside raid buffs`;
}

// Steel Maw / Reaving Maw under three targets (xivanalysis AoEChecker.tsx,
// minTargets 3): judged against the player's average Steel / Reaving Fangs.
// K6qfMamL7rN8yz2Q Red Hot and Deep Blue 3:00.1: a Reaving Maw on Deep
// Blue alone as the bosses came back (15.6k against 31k).
const vprAoe = aoeComboOnOneTarget([[id("STEEL_MAW"), id("STEEL_FANGS"), 3], [id("REAVING_MAW"), id("REAVING_FANGS"), 3]]);

// Death Rattle / Last Lash (xivanalysis SerpentsTail.tsx): each finisher
// (Hindsbane, Hindsting, Flanksbane, Flanksting) readies a Death Rattle,
// each Jagged / Bloodied Maw a Last Lash, until the next GCD. One the next
// GCD replaced is lost: her average of it. Forced, death or movement
// between the two: shown, not counted; one the pull's end cut isn't
// judged. On disk 15 of 2,220 finishers (2026-10-16); the FFLogs top 20
// for Red Hot and Deep Blue lose 9 of 596, two of them at the 1:47
// downtime.
const SERPENTS_TAIL: [readers: string[], follow: string][] = [
  [["HINDSBANE_FANG", "HINDSTING_STRIKE", "FLANKSBANE_FANG", "FLANKSTING_STRIKE"], "DEATH_RATTLE"],
  [["JAGGED_MAW", "BLOODIED_MAW"], "LAST_LASH"],
];
const serpentsTail: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const gcds = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  for (const [readers, follow] of SERPENTS_TAIL) {
    const readyIds = new Set(ids(...readers)), followId = id(follow);
    const avg = ctx.values.perUse(followId);
    for (const u of gcds) {
      if (!readyIds.has(u.action.id)) continue;
      const next = gcds.find((x) => x.startMs > u.startMs);
      if (!next) continue;
      if (ctx.player.casts.some((c) => c.abilityId === followId && c.timestamp > u.startMs && c.timestamp < next.startMs)) continue;
      const during = forcedPart(u.startMs, next.startMs, ctx.forced);
      const moving = ctx.movement?.some((w) => w.startMs < next.startMs && w.endMs > u.startMs) ?? false;
      const died = ctx.dead.some((d) => d.startMs >= u.startMs && d.startMs <= next.startMs);
      out.push(finding(ctx, {
        kind: "missed-followup", startMs: u.startMs, endMs: next.startMs, forced: during.ms > 0 || moving || died,
        movement: (!during.ms && moving) || undefined, cause: during.ms > 0 ? during.cause : died ? "dead" : undefined,
        label: `${A[follow].name} lost`, lostDamage: avg,
        basis: `her average ${A[follow].name} (${k(avg)})`,
        detail: `${u.abilityName} at ${clock(u.startMs)}: its ${A[follow].name} was replaced by ${next.abilityName} at ${clock(next.startMs)}`,
      }));
    }
  }
  return out;
};

// The coils' Bites (xivanalysis Venoms.tsx, Vices.tsx): Hunter's /
// Swiftskin's Coil (Den) readies Twinfang and Twinblood Bite (Thresh),
// the coil's venom boosting the first and the first Bite's venom the
// second, until the next GCD. A venom removed beside:
// - a GCD: the Bites not yet pressed are lost, two if none was pressed
//   since the coil, else one; her average Bite each. jXG76ba43VDLAvYz Red
//   Hot and Deep Blue (Rinn Kuma), Twinblood Bite 9:00.6 then Uncoiled
//   Fury 9:01.3: xivanalysis's third dropped oGCD proc.
// - the other Bite: that Bite went unboosted and the venom is gone. Twinfang
//   Bite measured 13.3k with its venom, 9.6k without (buff-neutral
//   medians on disk, 2026-10-16), so ~27% of her average Bite.
// A death, or forced or movement time since the coil: shown, not counted.
// On disk 20 by a GCD and 12 by the wrong Bite in 4,185 venoms.
const BITE_VENOMS: [status: string, bite: string, other: string][] = [
  ["HUNTERS_VENOM", "TWINFANG_BITE", "TWINBLOOD_BITE"], ["SWIFTSKINS_VENOM", "TWINBLOOD_BITE", "TWINFANG_BITE"],
  ["FELLHUNTERS_VENOM", "TWINFANG_THRESH", "TWINBLOOD_THRESH"], ["FELLSKINS_VENOM", "TWINBLOOD_THRESH", "TWINFANG_THRESH"],
];
const BITE_VENOM_SHARE = 1 - 9.6 / 13.3;
const viperBites: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const coils = new Set(ids("HUNTERS_COIL", "SWIFTSKINS_COIL", "HUNTERS_DEN", "SWIFTSKINS_DEN"));
  const bites = new Set(ids("TWINFANG_BITE", "TWINBLOOD_BITE", "TWINFANG_THRESH", "TWINBLOOD_THRESH"));
  for (const [statusKey, biteKey, otherKey] of BITE_VENOMS) {
    const status = S[statusKey];
    if (!status || !A[biteKey] || !A[otherKey]) continue;
    const avg = ctx.values.perUse(A[biteKey].id);
    for (const e of ctx.player.buffs ?? []) {
      if (e.abilityId !== status.id || e.buffStatus !== "removed" || e.timestamp >= ctx.endMs) continue;
      const at = ctx.player.casts.filter((c) => Math.abs(c.timestamp - e.timestamp) <= PROC_CONSUME_MS);
      if (at.length === 0 || at.some((c) => c.abilityId === A[biteKey].id)) continue;
      const gcd = at.find((c) => ctx.game.action(c.abilityId)?.onGcd);
      const wrongBite = at.find((c) => c.abilityId === A[otherKey].id);
      if (!gcd && !wrongBite) continue;
      const coil = [...ctx.player.casts].reverse().find((c) => coils.has(c.abilityId) && c.timestamp < e.timestamp);
      const pressed = coil ? ctx.player.casts.some((c) => bites.has(c.abilityId) && c.timestamp > coil.timestamp && c.timestamp < e.timestamp - 50) : true;
      const lostBites = gcd ? (pressed ? 1 : 2) : 0;
      const died = ctx.dead.some((d) => d.startMs >= e.timestamp - 200 && d.startMs - e.timestamp <= 3_000);
      const from = coil?.timestamp ?? e.timestamp;
      const during = forcedPart(from, e.timestamp + 1, ctx.forced);
      const moving = gcd !== undefined && (ctx.movement?.some((w) => w.startMs < e.timestamp && w.endMs > from) ?? false);
      out.push(finding(ctx, {
        kind: gcd ? "missed-followup" : "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: died || during.ms > 0 || moving,
        movement: (moving && !during.ms) || undefined,
        cause: during.ms > 0 ? during.cause : died ? "lost to the death that followed" : undefined, inference: !gcd || undefined,
        label: gcd ? `${A[biteKey].name} lost` : `${status.name} dropped`,
        lostDamage: gcd ? lostBites * avg : avg * BITE_VENOM_SHARE,
        basis: gcd ? `${lostBites} × her average ${A[biteKey].name} (${k(avg)})`
          : `${k(avg)} average ${A[biteKey].name} × ${Math.round(BITE_VENOM_SHARE * 100)}% (its venom's boost, measured)`,
        detail: gcd ? `${gcd.abilityName} at ${clock(e.timestamp)} before the coil's Bites: ${lostBites} Bite${lostBites > 1 ? "s" : ""} lost`
          : `${A[otherKey].name} at ${clock(e.timestamp)} with ${status.name} held: the ${A[biteKey].name} went unboosted`,
      }));
    }
  }
  return out;
};

export const VPR_CHECKS: JobCheck[] = [uptime("HUNTERS_INSTINCT", 0.1, "Hunter's Instinct is +10%, FFLogs multiplier"), reawaken, venoms, rattlingCoils, serpentOfferingsCheck, serpentsTail, viperBites, vprAoe];
// xivanalysis AoE.tsx: each form's AoE against that form's three
// single-target GCDs (their cast-weighted average), Enlightenment against
// The Forbidden Chakra.
const mnkAoe = aoeComboOnOneTarget([
  [id("SHADOW_OF_THE_DESTROYER"), ids("BOOTSHINE", "DRAGON_KICK", "LEAPING_OPO"), 4],
  [id("FOUR_POINT_FURY"), ids("TRUE_STRIKE", "TWIN_SNAKES", "RISING_RAPTOR"), 4],
  [id("ROCKBREAKER"), ids("DEMOLISH", "SNAP_PUNCH", "POUNCING_COEURL"), 4],
  [id("ENLIGHTENMENT"), id("THE_FORBIDDEN_CHAKRA"), 3],
]);
// Blitz resources (xivanalysis PerfectBalance.tsx, Revolution.tsx), from a
// search of the lowest Red Hot and Deep Blue Monk parses against the top
// 100 (2026-10-15):
// - Perfect Balance lost: stacks left when the buff ended (read from its
//   stack events), or pressed again while one ran (Q18Xc93x4wpfMFdT 7:32,
//   7:33: a charge gone). Beast Chakra only comes from Perfect Balance, so
//   either loses its Blitz: her average Blitz over the form GCD in its
//   place. One in forced time, or ending just before a death (the log
//   strips buffs ~2s early), is shown, not counted. None of the top 100
//   lost one; 18 of the lowest 122 did.
// - Celestial Revolution (two of one form and one other): Rising Phoenix
//   less what it dealt, buff-neutral. Even a top parse did one
//   (YPhxRTb9Ld7BJaXp 7:48: Dragon Kick, Leaping Opo, Twin Snakes).
// - Form Shift in uptime: a GCD that does nothing (its form GCD average).
//   In downtime it's free: the top 100's Form Shifts sat in the bosses'
//   2:52-2:58 absence.
// - Nadi overcap, judged by what it cost by the kill (Phantom Rushes lost,
//   below), not as a bare rule: 36 of the top 100 generate a Nadi they hold
//   after the opener, mostly shifting the cycle at no cost.
const BLITZ_IDS = new Set(ids(...BLITZ_KEYS.filter((key) => A[key])));
const FORM_GCD_IDS = new Set(ids("BOOTSHINE", "DRAGON_KICK", "LEAPING_OPO", "SHADOW_OF_THE_DESTROYER", "ARM_OF_THE_DESTROYER",
  "TRUE_STRIKE", "TWIN_SNAKES", "RISING_RAPTOR", "FOUR_POINT_FURY", "DEMOLISH", "SNAP_PUNCH", "POUNCING_COEURL", "ROCKBREAKER"));
const PB_STACKS = 3;
const OPO_IDS = new Set(ids("BOOTSHINE", "DRAGON_KICK", "LEAPING_OPO"));
// Each Fury's share of its spender's potency (xiva-data: Leaping Opo 260 /
// 460 with Opo-opo's Fury, Rising Raptor 330 / 480 with Raptor's Fury,
// Pouncing Coeurl 340 / 440 with Coeurl's Fury).
const OPO_FURY_SHARE = 200 / 460, RAPTOR_FURY_SHARE = 150 / 480, COEURL_FURY_SHARE = 100 / 440;
const mnkBlitz: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const me = ctx.player;
  const casts = me.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const count = new Map<number, number>();
  for (const c of casts) count.set(c.abilityId, (count.get(c.abilityId) ?? 0) + 1);
  const avgOf = (list: number[]) => {
    const n = list.reduce((a, x) => a + (count.get(x) ?? 0), 0);
    return n > 0 ? list.reduce((a, x) => a + ctx.values.perUse(x) * (count.get(x) ?? 0), 0) / n : 0;
  };
  const formGcd = avgOf([...FORM_GCD_IDS]);
  const blitz = avgOf([...BLITZ_IDS].filter((x) => x !== id("CELESTIAL_REVOLUTION")));
  const lostBlitz = blitz - formGcd;
  const diedAfter = (t: number) => ctx.dead.some((d) => d.startMs >= t && d.startMs - t <= DEATH_STRIP_MS);
  const push = (t: number, f: { label: string; lost: number; basis: string; detail: string; deathExcuses?: boolean }) => {
    if (f.lost <= 0) return;
    const during = forcedPart(t - 1, t + 1, ctx.forced);
    const died = f.deathExcuses === true && diedAfter(t);
    const forced = during.ms > 0 || died;
    out.push(finding(ctx, {
      kind: "blitz", startMs: t, endMs: t, forced, cause: during.ms > 0 ? during.cause : died ? "lost to the death that followed" : undefined,
      inference: true, label: f.label, lostDamage: f.lost, basis: f.basis, detail: f.detail,
    }));
  };
  const blitzBasis = `${k(blitz)} average Blitz − ${k(formGcd)} average form GCD in its place`;

  // Perfect Balance, from its stack events: 3 on applying, one off per form
  // GCD; the last one shows as the removal beside a form GCD.
  let stacks = 0, startedAt = 0;
  const pbBuffs = (me.buffs ?? []).filter((b) => b.abilityId === S.PERFECT_BALANCE.id && b.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  for (const b of pbBuffs) {
    if (b.buffStatus === "applied") { stacks = PB_STACKS; startedAt = b.timestamp; }
    else if (b.buffStatus === "stackRemoved") stacks = Math.max(0, stacks - 1);
    else if (b.buffStatus === "removed") {
      const used = casts.some((c) => FORM_GCD_IDS.has(c.abilityId) && Math.abs(c.timestamp - b.timestamp) <= PROC_CONSUME_MS);
      const left = Math.max(0, stacks - (used ? 1 : 0));
      if (left > 0 && lostBlitz > 0) push(b.timestamp, {
        label: `Perfect Balance ended with ${left} stack${left > 1 ? "s" : ""} unused`, lost: lostBlitz, basis: blitzBasis, deathExcuses: true,
        detail: `Perfect Balance from ${clock(startedAt)} ran out at ${clock(b.timestamp)} with ${left} of ${PB_STACKS} stacks: no Blitz`,
      });
      stacks = 0;
    }
  }
  // Pressed again while one ran: the charge is gone.
  const pbWindows = statusWindows(ctx, S.PERFECT_BALANCE.id);
  for (const c of casts.filter((x) => x.abilityId === id("PERFECT_BALANCE"))) {
    if (!pbWindows.some((w) => c.timestamp > w.startMs + PROC_CONSUME_MS && c.timestamp < w.endMs)) continue;
    if (lostBlitz > 0) push(c.timestamp, {
      label: "Perfect Balance pressed while one was running", lost: lostBlitz, basis: blitzBasis,
      detail: `Perfect Balance at ${clock(c.timestamp)} with the buff already up: a charge spent for nothing`,
    });
  }

  // Phantom Rushes lost to Nadi overcaps, judged by the kill: every Monk on
  // disk opens Lunar, Lunar, Solar, Phantom Rush, then Lunar, Solar, Phantom
  // Rush, so B Blitzes allow ⌊(B − 1) / 3⌋ Phantom Rushes. Fewer is a loss
  // pinned to the overcaps after the opener. An overcap that only shifts the
  // cycle costs nothing: YPhxRTb9Ld7BJaXp (a top parse) went LLLSPSLPSLPLCPL,
  // 15 Blitzes, 4 Phantom Rushes of 4 (xivanalysis counts its overcaps as 1
  // lost); bWDLM6zVXkqFAfjT went SCPSCPCSPCLLL, 3 of 4.
  // A death empties the Nadi gauge (Xk2DKZwVp4Ar6d7y Enuo pull 3: an
  // Elixir Burst after Lunar and Solar, 15s after a death): each stretch
  // after one restarts at Lunar, Solar, Phantom Rush, ⌊B / 3⌋, and what the
  // death cost is the death's.
  const blitzCasts = casts.filter((c) => BLITZ_IDS.has(c.abilityId));
  const segments: (typeof casts)[] = [[]];
  let prevBlitz: (typeof casts)[number] | undefined;
  for (const c of blitzCasts) {
    if (prevBlitz && ctx.dead.some((d) => d.startMs > prevBlitz!.timestamp && d.startMs < c.timestamp)) segments.push([]);
    segments[segments.length - 1].push(c);
    prevBlitz = c;
  }
  // The opener's double Lunar costs one Blitz; an opener without it
  // (Lunar, Celestial Revolution, Phantom Rush: rgTafHJ9MN47m3Vy pull 10)
  // allows ⌊B / 3⌋ like a stretch after a death.
  const lunarIds = new Set(ids("ELIXIR_BURST", "ELIXIR_FIELD"));
  const doubleLunar = (seg: typeof casts) => seg.length >= 2 && lunarIds.has(seg[0].abilityId) && lunarIds.has(seg[1].abilityId);
  const allowedIn = (seg: typeof casts, i: number) => Math.floor((seg.length - (i === 0 && doubleLunar(seg) ? 1 : 0)) / 3);
  const allowed = segments.reduce((a, seg, i) => a + allowedIn(seg, i), 0);
  const rushes = blitzCasts.filter((c) => c.abilityId === id("PHANTOM_RUSH")).length;
  const lostRushes = segments.reduce((a, seg, i) =>
    a + Math.max(0, allowedIn(seg, i) - seg.filter((c) => c.abilityId === id("PHANTOM_RUSH")).length), 0);
  if (lostRushes > 0) {
    const nadiBlitz = avgOf(ids("ELIXIR_BURST", "RISING_PHOENIX", "ELIXIR_FIELD", "FLINT_STRIKE"));
    const rush = ctx.values.perUse(id("PHANTOM_RUSH"));
    const LUNAR = new Set(ids("ELIXIR_BURST", "ELIXIR_FIELD")), SOLAR = new Set(ids("RISING_PHOENIX", "FLINT_STRIKE"));
    let lunar = false, solar = false, n = 0;
    const overcaps: number[] = [];
    const firstOf = new Set(segments.slice(1).map((seg) => seg[0]));
    for (const c of blitzCasts) {
      n++;
      if (firstOf.has(c)) lunar = solar = false;
      if (c.abilityId === id("PHANTOM_RUSH") || c.abilityId === id("TORNADO_KICK")) { lunar = solar = false; continue; }
      const gives = LUNAR.has(c.abilityId) ? "l" : SOLAR.has(c.abilityId) ? "s" : lunar ? "s" : "l";
      // The opener's second Lunar is the standard line, not an overcap.
      if (((gives === "l" && lunar) || (gives === "s" && solar)) && n > 2) overcaps.push(c.timestamp);
      if (gives === "l") lunar = true; else solar = true;
    }
    if (rush > nadiBlitz && nadiBlitz > 0) {
      const t = overcaps[0] ?? blitzCasts[blitzCasts.length - 1].timestamp;
      push(t, {
        label: `${lostRushes} Phantom Rush${lostRushes > 1 ? "es" : ""} lost to Nadi overcaps`,
        lost: lostRushes * (rush - nadiBlitz),
        basis: `${lostRushes} × (${k(rush)} average Phantom Rush − ${k(nadiBlitz)} average Elixir Burst / Rising Phoenix in its place)`,
        detail: `${blitzCasts.length} Blitzes allow ${allowed} Phantom Rushes${segments.length > 1 ? " (counted between deaths)" : ""}, ${rushes} landed` +
          (overcaps.length ? `; a Nadi already held at ${overcaps.map(clock).join(", ")}` : ""),
      });
    }
  }

  const phoenix = ctx.values.perUse(id("RISING_PHOENIX")) || ctx.values.perUse(id("ELIXIR_BURST"));
  const critMult = critMultOf(ctx);
  const inAny = (ws: { startMs: number; endMs: number }[], t: number) => ws.some((w) => t > w.startMs && t <= w.endMs);
  const raptor = statusWindows(ctx, S.RAPTOR_FORM.id), coeurl = statusWindows(ctx, S.COEURL_FORM.id);
  const formless = statusWindows(ctx, S.FORMLESS_FIST.id);
  const opo = statusWindows(ctx, S.OPO_OPO_FORM.id);
  const allForms = [...opo, ...raptor, ...coeurl, ...formless, ...pbWindows];
  const formsSeenBefore = (t: number) => allForms.some((w) => w.startMs < t);
  const lastFormEnd = (t: number) => Math.max(-Infinity, ...allForms.filter((w) => w.endMs <= t).map((w) => w.endMs));
  const lastFormWasPb = (t: number) => pbWindows.some((w) => w.endMs <= t && w.endMs >= lastFormEnd(t));
  const roll = rollGainOf(ctx, critMult);
  const pushNoForm = (c: { timestamp: number; abilityName: string }, died: boolean, lost: number, basis: string) => {
    if (died) {
      out.push(finding(ctx, {
        kind: "blitz", startMs: c.timestamp, endMs: c.timestamp, forced: true, cause: "the form went with a death",
        label: `${c.abilityName} with no form`, lostDamage: lost, basis, detail: `${c.abilityName} at ${clock(c.timestamp)} after a death: no form`,
      }));
      return;
    }
    push(c.timestamp, {
      label: `${c.abilityName} with no form`, lost, basis,
      detail: `${c.abilityName} at ${clock(c.timestamp)} with no form: the last ran out at ${clock(lastFormEnd(c.timestamp))} (Form Shift in downtime keeps one)`,
    });
  };
  for (const c of casts) {
    if (c.abilityId === id("CELESTIAL_REVOLUTION") && phoenix > 0) {
      // Rising Phoenix's damage per base value prices this cast's base.
      const rpCasts = count.get(id("RISING_PHOENIX")) ?? 0;
      const rpBase = rpCasts ? me.damageDone.filter((e) => e.abilityId === id("RISING_PHOENIX") && e.timestamp < ctx.endMs)
        .reduce((a, e) => a + baseValue(e, critMult), 0) / rpCasts : 0;
      const base = me.damageDone.filter((e) => e.abilityId === c.abilityId && e.timestamp >= c.timestamp && e.timestamp < c.timestamp + 2_000)
        .reduce((a, e) => a + baseValue(e, critMult), 0);
      const dealt = rpBase > 0 ? base * phoenix / rpBase : base;
      push(c.timestamp, {
        label: "Celestial Revolution", lost: phoenix - dealt,
        basis: `${k(phoenix)} average Rising Phoenix − ${k(dealt)} for this Celestial Revolution at the same buffs`,
        detail: `Celestial Revolution at ${clock(c.timestamp)}: two of one form and one other`,
      });
    } else if (c.abilityId === id("FORM_SHIFT") && formGcd > 0) {
      // A GCD that does no damage. A Monk has no ranged GCD: out of reach
      // in a mechanic's movement window it's the right press (as a
      // disengage is, checks.ts checkDisengages), and in downtime it's free.
      // Meditation (a 1s GCD) isn't judged: the top parse YPhxRTb9Ld7BJaXp
      // Meditates at 2:06, 3:23, 3:30 and 7:15 with the bosses up and no
      // movement window known, most likely out of reach, which the log
      // can't show.
      const lost = formGcd;
      const basis = `${k(formGcd)} average form GCD: Form Shift does no damage`;
      const moving = (ctx.movement ?? []).find((w) => c.timestamp >= w.startMs && c.timestamp <= w.endMs);
      if (moving) {
        out.push(finding(ctx, {
          kind: "blitz", startMs: c.timestamp, endMs: c.timestamp, forced: true, movement: true, cause: moving.cause,
          label: `${c.abilityName} during ${moving.cause}`, lostDamage: lost, basis,
          detail: `${c.abilityName} at ${clock(c.timestamp)}, out of reach`,
        }));
        continue;
      }
      push(c.timestamp, {
        label: `${c.abilityName} in uptime`, lost, basis,
        detail: `${c.abilityName} at ${clock(c.timestamp)} with a target to hit`,
      });
    } else if (OPO_IDS.has(c.abilityId) && !inAny(pbWindows, c.timestamp) && !inAny(formless, c.timestamp)) {
      // An Opo-opo skill in Raptor or Coeurl form restarts the cycle: the
      // form's GCD is skipped. None of the top 100's sampled parse did it;
      // bWDLM6zVXkqFAfjT did it 49 times. Valued as that form's average
      // GCD less what this one dealt at its average conditions.
      const form = inAny(raptor, c.timestamp) ? "Raptor" : inAny(coeurl, c.timestamp) ? "Coeurl" : undefined;
      if (!form) {
        // No form at all (xivanalysis Forms.tsx formless starter / dropped
        // form): a form ran out, usually over downtime with no Form Shift.
        // Dragon Kick then grants no Opo-opo's Fury (+200 on the next
        // Leaping Opo, 460 with it); Leaping Opo / Bootshine lose the Fury
        // and the form's sure crit. The opener (no form seen yet) isn't
        // judged: a pre-pull Form Shift can fall before the log.
        // Nor the GCD after Perfect Balance ends: its three GCDs leave no
        // form, and the Opo-opo skill before the Blitz is the standard line
        // (YPhxRTb9Ld7BJaXp 5:21.8, a top parse; xivanalysis exempts it).
        if (inAny(opo, c.timestamp) || !formsSeenBefore(c.timestamp) || lastFormWasPb(c.timestamp)) continue;
        const leaping = ctx.values.perUse(id("LEAPING_OPO"));
        const died = ctx.dead.some((d) => d.startMs < c.timestamp && d.endMs >= lastFormEnd(c.timestamp));
        if (c.abilityId === id("DRAGON_KICK")) {
          const lost = leaping * OPO_FURY_SHARE;
          if (lost > 0) pushNoForm(c, died, lost, `${k(leaping)} average Leaping Opo × 200 / 460 (the Opo-opo's Fury it didn't grant)`);
        } else {
          const avg = ctx.values.perUse(c.abilityId);
          const hit = me.damageDone.find((e) => e.abilityId === c.abilityId && e.timestamp >= c.timestamp && e.timestamp < c.timestamp + 2_000 && (e.amount ?? 0) > 0);
          if (!hit || avg <= 0) continue;
          const dealt = baseValue(hit, critMult) * roll * (hit.multiplier && hit.multiplier > 0 ? hit.multiplier : 1);
          if (avg - dealt > 0) pushNoForm(c, died, avg - dealt, `${k(avg)} average ${c.abilityName} (in form: Fury and a sure crit) − ${k(dealt)} for this one at average crit and direct hit`);
        }
        continue;
      }
      const formAvg = avgOf(form === "Raptor" ? ids("TRUE_STRIKE", "TWIN_SNAKES", "RISING_RAPTOR") : ids("DEMOLISH", "SNAP_PUNCH", "POUNCING_COEURL"));
      const ownCasts = count.get(c.abilityId) ?? 0;
      const ownBase = ownCasts ? me.damageDone.filter((e) => e.abilityId === c.abilityId && e.timestamp < ctx.endMs)
        .reduce((a, e) => a + baseValue(e, critMult), 0) / ownCasts : 0;
      const base = me.damageDone.filter((e) => e.abilityId === c.abilityId && e.timestamp >= c.timestamp && e.timestamp < c.timestamp + 2_000)
        .reduce((a, e) => a + baseValue(e, critMult), 0);
      const dealt = ownBase > 0 ? base * ctx.values.perUse(c.abilityId) / ownBase : base;
      push(c.timestamp, {
        label: `${c.abilityName} in ${form} form`, lost: formAvg - dealt,
        basis: `${k(formAvg)} average ${form} form GCD − ${k(dealt)} for this ${c.abilityName} at the same buffs`,
        detail: `${c.abilityName} at ${clock(c.timestamp)} skipped ${form} form`,
      });
    }
  }
  return out;
};
// Fury gauges (xivanalysis Balls.tsx): Opo-opo's Fury (max 1) from Dragon
// Kick in Opo-opo form, Formless Fist or Perfect Balance (a formless
// Dragon Kick grants none), spent by Leaping Opo / Bootshine; Raptor's
// Fury (max 1) from Twin Snakes, spent by Rising Raptor / True Strike;
// Coeurl's Fury (max 2, +2) from Demolish, spent by Pouncing Coeurl / Snap
// Punch. One gained at the cap is that Fury's share of her average
// spender. A death empties them. Also the Monk's timeline lanes
// (gauges.ts).
export function mnkFurySpecs(ctx: PlayerCheckContext): GaugeSpec[] {
  const grants = [
    ...statusWindows(ctx, S.OPO_OPO_FORM.id), ...statusWindows(ctx, S.FORMLESS_FIST.id), ...statusWindows(ctx, S.PERFECT_BALANCE.id),
  ];
  const furyFrom = (t: number) => grants.some((w) => t > w.startMs && t <= w.endMs);
  const spec = (name: string, cap: number, gain: { ids: number[]; amount: number; when?: (t: number) => boolean },
    spend: number[], share: number, spender: string): GaugeSpec => {
    const events: GaugeEvent[] = [];
    for (const c of ctx.player.casts) {
      if (gain.ids.includes(c.abilityId) && (!gain.when || gain.when(c.timestamp)))
        events.push({ t: c.timestamp, type: "gain", amount: gain.amount, label: `${c.abilityName} with ${name} held` });
      else if (spend.includes(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 1, label: c.abilityName });
    }
    for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
    const avg = ctx.values.perUse(id(spender));
    return {
      name, unit: name, cap, unitValue: avg * share, events,
      valueBasis: `${k(avg)} average ${ctx.game.action(id(spender))?.name ?? spender} × the Fury's share of its potency (${Math.round(share * 100)}%)`,
    };
  };
  return [
    spec("Opo-opo's Fury", 1, { ids: ids("DRAGON_KICK"), amount: 1, when: furyFrom }, ids("LEAPING_OPO", "BOOTSHINE"), OPO_FURY_SHARE, "LEAPING_OPO"),
    spec("Raptor's Fury", 1, { ids: ids("TWIN_SNAKES"), amount: 1 }, ids("RISING_RAPTOR", "TRUE_STRIKE"), RAPTOR_FURY_SHARE, "RISING_RAPTOR"),
    spec("Coeurl's Fury", 2, { ids: ids("DEMOLISH"), amount: 2 }, ids("POUNCING_COEURL", "SNAP_PUNCH"), COEURL_FURY_SHARE, "POUNCING_COEURL"),
  ];
}
const mnkFury: JobCheck = (ctx) => mnkFurySpecs(ctx).flatMap((spec) => (spec.unitValue > 0 ? gaugeFindings(ctx, spec) : []));

export const MNK_CHECKS: JobCheck[] = [riddleOfFire, mnkAoe, mnkBlitz, mnkFury];
// Firstminds' Focus (xivanalysis FirstmindsFocus): +1 per Raiden Thrust /
// Draconian Fury, cap 2, Wyrmwind Thrust spends 2. A stack gained at 2 is
// half a Wyrmwind. On 2T1HzdPKgbhM43am fight 10 the cast simulation finds
// xivanalysis's 2 lost stacks (3:17, 6:18) and never goes below zero.
// The timeline draws the same simulation (jobs/gauges.ts, gaugeTrack).
export function firstmindsFocusSpec(ctx: PlayerCheckContext): GaugeSpec {
  const gain = new Set(ids("RAIDEN_THRUST", "DRACONIAN_FURY"));
  const spend = new Set(ids("WYRMWIND_THRUST"));
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    if (gain.has(c.abilityId)) events.push({ t: c.timestamp, type: "gain", amount: 1, label: `${c.abilityName} at 2 stacks` });
    else if (spend.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 2, label: c.abilityName ?? "Wyrmwind Thrust" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const perStack = ctx.values.perUse(id("WYRMWIND_THRUST")) / 2;
  return {
    name: "Firstminds' Focus", unit: "Firstminds' Focus", cap: 2, unitValue: perStack,
    valueBasis: `${k(perStack * 2)} average Wyrmwind Thrust per 2`,
    events,
  };
}
const firstmindsFocus: JobCheck = (ctx) => gaugeFindings(ctx, firstmindsFocusSpec(ctx));

export const DRG_CHECKS: JobCheck[] = [uptime("POWER_SURGE", 0.1, "Power Surge is +10% (tooltip)", { cost: drgPowerSurgeRefreshCost, reapplyGcds: 1, restartIds: ids("RAIDEN_THRUST", "TRUE_THRUST") }), lanceCharge, lifeOfTheDragon, lifeSurge, chaoticSpring, firstmindsFocus, starcrossDropped];
// xivanalysis Ninki.tsx: the frogs against Bhavacakra / Zesho Meppo. From
// 7.3 two targets out-damage them, so only one target is judged (as
// Samurai's Guren).
const ninAoe = aoeComboOnOneTarget([[id("HELLFROG_MEDIUM"), id("BHAVACAKRA")], [id("DEATHFROG_MEDIUM"), id("ZESHO_MEPPO")]]);
// Ninjutsu mistakes (xivanalysis Ninjutsu.tsx, Kassatsu.tsx, Raiju.tsx),
// checked on Red Hot and Deep Blue kills from a search of the lowest Ninja
// parses (2026-10-15). Values come from the player's own averages: a
// Raiton is worth its hit plus the Raiju Ready it grants (a Raiju over the
// combo GCD it replaces).
// - Rabbit Medium (a mudra slipped): the ninjutsu and its mudra charge
//   lost, a Raiton's worth (cZ42C1y3JRNGXWLH 4:24, Ten Ten).
// - Hyoton, or Doton dealing less than a Raiton (a Doton left early ticks
//   4 times: zMJdajRYyNF3LVkr 2:34): a Raiton less what it dealt.
// - Kassatsu, read from its buff: the ninjutsu cast as it was removed
//   spent it. Anything but Hyosho Ranryu / Goka Mekkyaku costs a Hyosho
//   over a Raiton (the mudra charge Kassatsu saved goes to a Raiton later;
//   7zwpcLxk2Fd1h6Vr spent 7 of 9 on Raiton). Huton / Suiton included:
//   xivanalysis allows them only for Kunai's Bane on 3+ targets. Rabbit
//   Medium under Kassatsu loses the whole Hyosho; Kassatsu expiring unused
//   (cZ42C1y3JRNGXWLH 4:20) a Hyosho over the GCD used instead.
// - Raiju Ready dropped: a combo GCD with stacks held removes them all
//   (cZ42C1y3JRNGXWLH 2:28, Aeolian Edge), each a Raiju over a combo GCD.
// - Ten Chi Jin (Fuma, Raiton, Suiton): its Hyoton against its Raiton
//   (VzycM18rpn6bWxXY 2:26: Fuma, Hyoton, Huton), its Doton against its
//   Suiton by damage.
const NINJUTSU_NAMES = new Map(ids("FUMA_SHURIKEN", "KATON", "RAITON", "HYOTON", "HUTON", "DOTON", "SUITON",
  "RABBIT_MEDIUM", "GOKA_MEKKYAKU", "HYOSHO_RANRYU").map((x) => [x, A[Object.keys(A).find((key) => A[key].id === x)!].name]));
const KASSATSU_GOOD = new Set(ids("HYOSHO_RANRYU", "GOKA_MEKKYAKU"));
const RAIJU_IDS = new Set(ids("FORKED_RAIJU", "FLEETING_RAIJU"));
const RAITON_IDS = new Set(ids("RAITON", "RAITON_TCJ"));
const RAIJU_BREAKERS = new Set(ids("SPINNING_EDGE", "GUST_SLASH", "AEOLIAN_EDGE", "ARMOR_CRUSH", "DEATH_BLOSSOM", "HAKKE_MUJINSATSU"));
const KASSATSU_SPEND_MS = 150;
const DEATH_STRIP_MS = 3_000;
// Hyosho Ranryu over Raiton, buff-neutral first hits (Kassatsu's +30% is
// in the base, not the log's multiplier): 2.20-2.36 on 16 Ninja pulls on
// 7.4-7.5 (median 2.28); The Omega Protocol's older-patch log 2.62. Used
// only for a Ninja who never cast Hyosho in the pull.
const HYOSHO_PER_RAITON = 2.28;
const NINJUTSU_HIT_MS = 2_000;
const DOTON_SPAN_MS = 19_000;
const ninjutsu: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const me = ctx.player;
  const casts = me.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const count = new Map<number, number>();
  for (const c of casts) count.set(c.abilityId, (count.get(c.abilityId) ?? 0) + 1);
  const avgOf = (list: number[]) => {
    const n = list.reduce((a, x) => a + (count.get(x) ?? 0), 0);
    return n > 0 ? list.reduce((a, x) => a + ctx.values.perUse(x) * (count.get(x) ?? 0), 0) / n : 0;
  };
  const combo = avgOf([...RAIJU_BREAKERS].filter((x) => x !== id("DEATH_BLOSSOM") && x !== id("HAKKE_MUJINSATSU")));
  const raijuOver = Math.max(0, avgOf([...RAIJU_IDS]) - combo);
  const raitonHit = ctx.values.perUse(id("RAITON"));
  const raiton = raitonHit + raijuOver;
  // Ten Chi Jin's own Raiton / Suiton (Fuma, Raiton, Suiton is the set
  // sequence); the regular ones when the pull has none.
  const tcjRaiton = (ctx.values.perUse(id("RAITON_TCJ")) || raitonHit) + raijuOver;
  const tcjSuiton = ctx.values.perUse(id("SUITON_TCJ")) || ctx.values.perUse(id("SUITON"));
  const ownHyosho = ctx.values.perUse(id("HYOSHO_RANRYU"));
  const hyosho = ownHyosho > 0 ? ownHyosho : raitonHit * HYOSHO_PER_RAITON;
  const hyoshoBasis = ownHyosho > 0 ? `${k(hyosho)} average Hyosho Ranryu`
    : `${k(hyosho)} Hyosho Ranryu (none in the pull: ${HYOSHO_PER_RAITON} × her average Raiton)`;
  // A cast's buff-neutral base, priced at her average Raiton's conditions:
  // a Hyoton in the opener burst isn't judged by the burst.
  const critMult = critMultOf(ctx);
  const raitonCasts = casts.filter((c) => c.abilityId === id("RAITON"));
  const raitonBase = raitonCasts.length ? me.damageDone.filter((e) => e.abilityId === id("RAITON") && !e.pet && e.timestamp < ctx.endMs)
    .reduce((a, e) => a + baseValue(e, critMult), 0) / raitonCasts.length : 0;
  const atRaitonTerms = (b: number) => (raitonBase > 0 ? b * raitonHit / raitonBase : b);
  const at = (t: number) => clock(t);
  // The log strips buffs up to ~2s before the death event (djChYqt4b7K8aAfP:
  // Kassatsu and Arm's Length removed at 7:32.07, Steam Burst death at 7:34):
  // a buff ending just before a death went with the death.
  const diedAfter = (t: number) => ctx.dead.some((d) => d.startMs >= t && d.startMs - t <= DEATH_STRIP_MS);
  const push = (t: number, f: { kind: "ninjutsu" | "proc-lost"; label: string; lost: number; basis: string; detail: string }) => {
    if (f.lost <= 0) return;
    const during = forcedPart(t - 1, t + 1, ctx.forced);
    const died = f.kind === "proc-lost" && diedAfter(t);
    const forced = during.ms > 0 || died;
    out.push(finding(ctx, {
      kind: f.kind, startMs: t, endMs: t, forced, cause: during.ms > 0 ? during.cause : died ? "lost to the death that followed" : undefined, inference: true,
      label: f.label, lostDamage: f.lost, basis: f.basis, detail: f.detail,
    }));
  };
  const dealt = (c: { abilityId: number; timestamp: number }, ms = NINJUTSU_HIT_MS, name?: string) =>
    atRaitonTerms(me.damageDone.filter((e) => (name ? e.abilityName === name : e.abilityId === c.abilityId) && !e.pet &&
      e.timestamp >= c.timestamp && e.timestamp < c.timestamp + ms).reduce((a, e) => a + baseValue(e, critMult), 0));
  const raitonBasis = `${k(raiton)}: her average Raiton plus the Raiju Ready it grants (a Raiju over a combo GCD)`;

  // Kassatsu: what each removal was spent on.
  const spentBy = new Map<number, number>();
  for (const b of (me.buffs ?? []).filter((x) => x.abilityId === S.KASSATSU.id && x.buffStatus === "removed" && x.timestamp < ctx.endMs)) {
    const spend = casts.find((c) => NINJUTSU_NAMES.has(c.abilityId) && Math.abs(c.timestamp - b.timestamp) <= KASSATSU_SPEND_MS);
    if (spend) { spentBy.set(spend.timestamp, b.timestamp); continue; }
    if (hyosho > 0) push(b.timestamp, {
      kind: "proc-lost", label: "Kassatsu expired unused", lost: hyosho - combo,
      basis: `${hyoshoBasis} − ${k(combo)} average combo GCD pressed instead`,
      detail: `Kassatsu ran out at ${at(b.timestamp)} without a ninjutsu`,
    });
  }

  // Raiju Ready running out on its own (no Raiju or combo GCD beside the
  // removal): the generic proc check skips it now, so it's counted here.
  const raijuEnds = (me.buffs ?? []).filter((b) => b.abilityId === S.RAIJU_READY.id && b.buffStatus === "removed" && b.timestamp < ctx.endMs &&
    !casts.some((c) => (RAIJU_IDS.has(c.abilityId) || RAIJU_BREAKERS.has(c.abilityId)) && Math.abs(c.timestamp - b.timestamp) <= PROC_CONSUME_MS))
    .map((b) => b.timestamp);
  const events = [...casts.map((c) => ({ t: c.timestamp, c })), ...raijuEnds.map((t) => ({ t, c: undefined }))].sort((a, b) => a.t - b.t);

  let raiju = 0;
  for (const { t: when, c } of events) {
    if (!c) {
      if (raiju > 0 && raijuOver > 0) push(when, {
        kind: "proc-lost", label: `Raiju Ready expired${raiju > 1 ? ` (${raiju})` : ""}`, lost: raiju * raijuOver,
        basis: `${raiju} × (${k(avgOf([...RAIJU_IDS]))} average Raiju − ${k(combo)} average combo GCD)`,
        detail: `${raiju} Raiju Ready ran out at ${at(when)}`,
      });
      raiju = 0;
      continue;
    }
    const name = NINJUTSU_NAMES.get(c.abilityId);
    const underKassatsu = spentBy.has(c.timestamp);
    if (name && underKassatsu && !KASSATSU_GOOD.has(c.abilityId) && hyosho > 0) {
      const rabbit = c.abilityId === id("RABBIT_MEDIUM");
      push(c.timestamp, {
        kind: "ninjutsu", label: `${name} under Kassatsu`,
        lost: rabbit ? hyosho : hyosho - raiton,
        basis: rabbit ? `${hyoshoBasis}: the Kassatsu and its GCD gave nothing`
          : `${hyoshoBasis} − ${raitonBasis} (the mudra charge Kassatsu saved)`,
        detail: `Kassatsu spent on ${name} at ${at(c.timestamp)}`,
      });
    } else if (c.abilityId === id("RABBIT_MEDIUM") && raiton > 0) {
      push(c.timestamp, {
        kind: "ninjutsu", label: "Rabbit Medium", lost: raiton, basis: `${raitonBasis}: the ninjutsu and its mudra charge lost`,
        detail: `a failed ninjutsu at ${at(c.timestamp)}`,
      });
    } else if (c.abilityId === id("HYOTON") && raiton > 0) {
      const d = dealt(c);
      push(c.timestamp, {
        kind: "ninjutsu", label: "Hyoton", lost: raiton - d,
        basis: `${raitonBasis} − ${k(d)} for this Hyoton at the same buffs (crit and direct hit averaged out)`,
        detail: `Hyoton at ${at(c.timestamp)}, the weakest ninjutsu`,
      });
    } else if (c.abilityId === id("HYOTON_TCJ") && tcjRaiton > 0) {
      const d = dealt(c);
      push(c.timestamp, {
        kind: "ninjutsu", label: "Hyoton in Ten Chi Jin", lost: tcjRaiton - d,
        basis: `${k(tcjRaiton)}: her average Ten Chi Jin Raiton plus its Raiju Ready − ${k(d)} for this Hyoton at the same buffs`,
        detail: `Ten Chi Jin's Hyoton at ${at(c.timestamp)} where its Raiton goes`,
      });
    } else if (c.abilityId === id("DOTON_TCJ") && tcjSuiton > 0) {
      const d = dealt(c, DOTON_SPAN_MS, "Doton");
      push(c.timestamp, {
        kind: "ninjutsu", label: "Doton in Ten Chi Jin", lost: tcjSuiton - d,
        basis: `${k(tcjSuiton)} average Ten Chi Jin Suiton − ${k(d)} for this Doton's ticks at the same buffs`,
        detail: `Ten Chi Jin's Doton at ${at(c.timestamp)} dealt less than its Suiton`,
      });
    } else if (c.abilityId === id("DOTON") && raiton > 0) {
      const d = dealt(c, DOTON_SPAN_MS, "Doton");
      push(c.timestamp, {
        kind: "ninjutsu", label: "Doton", lost: raiton - d,
        basis: `${raitonBasis} − ${k(d)} for this Doton's ticks at the same buffs`,
        detail: `Doton at ${at(c.timestamp)} dealt less than a Raiton`,
      });
    }
    // Raiju Ready: Raiton grants a stack (up to 3), a Raiju spends one, a
    // combo GCD drops what's left.
    if (RAITON_IDS.has(c.abilityId)) raiju = Math.min(3, raiju + 1);
    else if (RAIJU_IDS.has(c.abilityId)) raiju = Math.max(0, raiju - 1);
    else if (RAIJU_BREAKERS.has(c.abilityId) && raiju > 0) {
      if (raijuOver > 0) push(c.timestamp, {
        kind: "proc-lost", label: `Raiju Ready dropped${raiju > 1 ? ` (${raiju})` : ""}`, lost: raiju * raijuOver,
        basis: `${raiju} × (${k(avgOf([...RAIJU_IDS]))} average Raiju − ${k(combo)} average combo GCD)`,
        detail: `${c.abilityName} at ${at(c.timestamp)} with ${raiju} Raiju Ready held`,
      });
      raiju = 0;
    }
  }
  return out;
};
export const NIN_CHECKS: JobCheck[] = [kunaisBane, ninki, kazematoi, ninAoe, ninjutsu];
// Soul Reaver and Executioner stacks dropped (xivanalysis Reaver.tsx,
// Executioner.tsx): the status removed beside a press that doesn't spend
// it (a combo GCD, Harpe, Perfectio, another Blood Stalk), with the stacks
// still on it lost. Counted from the buff stream: applied (1), "stack"
// (+1; Gluttony's Executioner logs applied then stack), "stackRemoved"
// (−1). Each stack is a Gibbet / Gallows / Guillotine over the combo GCD
// it would have replaced (her averages; its 10 Shroud isn't valued, so a
// lower bound). One running out with no press is checkProcs's. Lost to a
// death, or in forced time: shown, not counted (xivanalysis counts stacks
// lost at a death as dropped). 6XaWqwMbkZG9pLmx Vamp Fatale 8:32.6:
// Perfectio pressed with both Executioner stacks from the 8:30.2 Gluttony.
const REAPER_STACKS: [status: string, consumers: string[]][] = [
  ["SOUL_REAVER", ["GIBBET", "GALLOWS", "GUILLOTINE"]],
  ["EXECUTIONER", ["EXECUTIONERS_GIBBET", "EXECUTIONERS_GALLOWS", "EXECUTIONERS_GUILLOTINE"]],
];
const RPR_COMBO = ["SLICE", "WAXING_SLICE", "INFERNAL_SLICE"];
const reaperStacks: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  // The GCD a held stack would have replaced: her average combo GCD, by
  // cast count (the pull's average GCD holds Enshroud's and the AoE).
  const combo = ids(...RPR_COMBO).map((x) => ({ v: ctx.values.perUse(x), n: ctx.player.casts.filter((c) => c.abilityId === x).length }));
  const comboN = combo.reduce((a, c) => a + c.n, 0);
  const comboAvg = comboN > 0 ? combo.reduce((a, c) => a + c.v * c.n, 0) / comboN : ctx.values.gcdValue(undefined, false);
  for (const [statusKey, consumerKeys] of REAPER_STACKS) {
    const status = S[statusKey];
    if (!status) continue;
    const consumers = new Set(ids(...consumerKeys));
    const each = Math.max(0, Math.max(...ids(...consumerKeys).map((x) => ctx.values.perUse(x))) - comboAvg);
    let stacks = 0;
    for (const e of [...(ctx.player.buffs ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
      if (e.abilityId !== status.id || e.timestamp >= ctx.endMs) continue;
      if (e.buffStatus === "applied") { stacks = Math.max(stacks, 1); continue; }
      if (e.buffStatus === "stack") { stacks++; continue; }
      if (e.buffStatus === "stackRemoved") { stacks = Math.max(0, stacks - 1); continue; }
      if (e.buffStatus !== "removed" && e.buffStatus !== "refreshed") continue;
      // Refreshed: granted again (Blood Stalk with Soul Reaver held), the
      // held stacks replaced by the new one.
      const held = stacks;
      stacks = e.buffStatus === "refreshed" ? 1 : 0;
      if (e.buffStatus === "refreshed" && held === 0) continue;
      const at = ctx.player.casts.filter((c) => Math.abs(c.timestamp - e.timestamp) <= PROC_CONSUME_MS);
      if (at.length === 0 || at.some((c) => consumers.has(c.abilityId))) continue;
      const lost = Math.max(1, held);
      const died = ctx.dead.some((d) => d.startMs >= e.timestamp - 100 && d.startMs - e.timestamp <= 3_000);
      const during = forcedPart(e.timestamp - 1, e.timestamp + 1, ctx.forced);
      const by = at.find((c) => ctx.game.action(c.abilityId)?.onGcd) ?? at[0];
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: died || during.ms > 0, inference: true,
        cause: during.ms > 0 ? during.cause : died ? "lost to the death that followed" : undefined,
        label: `${status.name} dropped`, lostDamage: lost * each,
        basis: `${lost} × (${A[consumerKeys[0]].name} / ${A[consumerKeys[1]].name} average − ${k(comboAvg)} average combo GCD it replaces); its 10 Shroud isn't valued`,
        detail: `${by.abilityName} at ${clock(e.timestamp)} dropped ${lost} ${status.name} stack${lost > 1 ? "s" : ""}`,
      }));
    }
  }
  return out;
};

// Enhanced Gibbet / Gallows / Void Reaping / Cross Reaping refreshed
// (xivanalysis Procs.tsx overwrites): the press that granted it again was
// itself unenhanced (the wrong one of the pair), so it lost the
// enhancement. Measured on disk (2026-10-16, three Reapers): enhanced hits
// ~11.5% over plain ones, buff-neutral medians (Cross Reaping 47.2k vs
// 42.4k, Gallows 47.8k vs 42.9k), so each is ~10% of her average of the
// action pressed.
const RPR_ENHANCED: [status: string, pressed: string[]][] = [
  ["ENHANCED_GIBBET", ["GALLOWS", "EXECUTIONERS_GALLOWS"]], ["ENHANCED_GALLOWS", ["GIBBET", "EXECUTIONERS_GIBBET"]],
  ["ENHANCED_VOID_REAPING", ["CROSS_REAPING"]], ["ENHANCED_CROSS_REAPING", ["VOID_REAPING"]],
];
const RPR_ENHANCED_SHARE = 1 - 1 / 1.115;
const reaperEnhancedOverwrites: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  for (const [statusKey, pressedKeys] of RPR_ENHANCED) {
    const status = S[statusKey];
    if (!status) continue;
    const pressed = new Set(ids(...pressedKeys));
    for (const e of ctx.player.buffs ?? []) {
      if (e.abilityId !== status.id || e.buffStatus !== "refreshed" || e.timestamp >= ctx.endMs) continue;
      const cast = ctx.player.casts.find((c) => pressed.has(c.abilityId) && Math.abs(c.timestamp - e.timestamp) <= PROC_CONSUME_MS);
      if (!cast) continue;
      const avg = ctx.values.perUse(cast.abilityId);
      const during = forcedPart(e.timestamp - 1, e.timestamp + 1, ctx.forced);
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: during.ms > 0, cause: during.cause, inference: true,
        label: `${status.name} overwritten`, lostDamage: avg * RPR_ENHANCED_SHARE,
        basis: `${k(avg)} average ${cast.abilityName} × ${Math.round(RPR_ENHANCED_SHARE * 100)}% (the enhancement, measured: enhanced hits ~11.5% over plain)`,
        detail: `${cast.abilityName} at ${clock(e.timestamp)} went unenhanced and granted ${status.name} while one was held`,
      }));
    }
  }
  return out;
};

export const RPR_CHECKS: JobCheck[] = [enshroud, arcaneCircle, deathsDesign, harvestMoon, shroud, rprAoe, reaperStacks, reaperEnhancedOverwrites];
