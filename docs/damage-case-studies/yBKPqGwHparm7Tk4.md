# Case study: yBKPqGwHparm7Tk4 (FFXIV)

"Reclear attempt day 1", Dancing Mad kill (fight 5, the app's Pull 2;
fight 3 is a 62s P1 wipe, the app's Pull 1), report started 2026-10-13,
patch 7.5. Started 2026-10-13; one question from the user from the
Dragoon's POV (Sayacissa Morsaelth). No xivanalysis page.

## Data on disk

- `sampledata/ff/yBKPqGwHparm7Tk4/` — fights 3 and 5 only, full
  captures. No mechanic baselines.

## Done

- **Dragoon, `dot-uptime` 8:54 (13k): "Chaotic Spring wasn't on the boss
  for 6.5s". User: Exdeath may go untargetable shortly after, so the DoT
  isn't warranted.** Doesn't hold in this log:
  - The finding is Chaos's DoT, not Exdeath's. P3 history: the DRG kept
    it on both bosses (Chaos 7:39.9 / 8:04.9 / 8:30.0, Exdeath 7:52.3 /
    8:17.5), switched to the Lance Barrage combo at 8:39.5 and let
    Exdeath's lapse at 8:41.4 (no finding: the uptime check merges
    targets, Chaos still had one). Chaos's ran out at 8:54.0 and went back
    on at 9:00.4, then ran a full 24s.
  - Both bosses took hits with no gap over 4s from 7:09.9 to 12:12.5
    (Exdeath) / 12:05.9 (Chaos); the engine's only P3 downtime is
    12:12.5-12:17.8. Neither went untargetable after 8:54.
  - Cause of the gap: Elusive Jump 8:48.3, Piercing Talon 8:49.7 and
    8:52.2, back in with Winged Glide 8:54.2. Two GCDs out pushed
    Raiden → Spiral Blow → Chaotic Spring from ~8:54.7 to 9:00.0. The
    Viper went ranged too (Uncoiled Fury 8:47.5, 8:50.5); both tanks
    stayed in. Kefka casts Ultima Blaster ×8 at 8:51.2-8:52.7, after
    Cyclone / Aetherlink at 8:40-8:41. No module models this mechanic.

- **P3's Epic Hero (1004192) / Fated Hero (1004194)** (user: "you get a
  debuff where you cannot deal damage to the other boss"). Epic Hero:
  only Chaos takes your damage; Fated Hero: only Exdeath. Every hit on
  the other boss logs 0. Here both went out 7:12.3-7:43.8 and
  9:06.6-12:05.9 (DRK, SGE, DRG, VPR Epic; PLD, AST, BRD, BLM Fated).
  - The DRG is Epic Hero, so Chaos, where the 8:54 gap was, was theirs
    the whole time: the finding stands. Exdeath does go out of their
    reach at 9:06.6, so a DoT on Exdeath at 8:54 would have got ~4 ticks;
    letting it lapse at 8:41 is fine (not flagged anyway).
  - **Fixed:** `aoeOnOneTargetFindings` counted the 0-damage hit on the
    other boss as a second target. Now only hits that dealt damage (or
    were absorbed) count. Across every FF sample the only change is a new
    BLM finding: Foul at 7:43.7, 99k (Xenoglossy 181k − Foul 82k), its
    Chaos hit 0 under Fated Hero.
  - **BLM Foul at 9:06.2 (user):** the Chaos "hit" at 9:06.17 was an
    unpaired `calculateddamage` preview (79k); Fated Hero went on at
    9:06.6 and only Exdeath took the real hit (9:07.3). Now flagged:
    "Foul hit only Exdeath", 76k. Same for the AST's Gravity II at 9:04.8
    (20k).
  - **Fixed, all FF:** unpaired previews were counted as player damage.
    FFLogs' damage-done table leaves them out: this kill's nine players
    match FFLogs exactly only without them (Dragoon 41.90M, the app had
    42.63M). They are 0.2-1.1% of player damage in every sample, all at
    moments the target turned immune (Kefka at 0% 6:15-6:23, untargetable
    3:18 / 14:28, the Hero debuffs, the kill). log-transforms now keeps
    them out of `damageDone` and in `unlandedHits`; `noDamageCasts`
    marks a press with such a preview forced ("the target turned immune
    before it landed") and skips presses whose hit would land after a
    kill. Damage taken still keeps them (fully absorbed hits).
  - Not handled: a DoT on the boss you can't damage still counts as
    uptime in `dotFindings`. Not seen here (one 0 tick each for four
    DoTs at a window's start).

- **Dragoon, `dot-uptime` 3:01 (23k, "11.2s") (user: the boss is dead
  ~10s later).** Holds. Chaotic Spring ran out at 3:00.8; Kefka was
  untargetable to 3:02.0 and under 15% (P1 check) at 3:10.7, so only
  3:02.0-3:10.7 counted (the other 2.5s was P2's opening, within grace).
  After Drakesbane 3:01.3 the DoT needed Raiden → Spiral Blow → Chaotic
  Spring (~3:08.9): at most 2 ticks (12k) before the check, for the
  Spiral route (37.0k + 45.6k) in place of Lance Barrage → Heavens'
  Thrust (48.4k + 67.4k), ~33k less. Actual 3:03.8-3:10.7: Lance Barrage
  71k, Heavens' Thrust 97k under Lance Charge.
  - **Fixed:** `dotFindings` values a stretch of the gap that forced
    time cuts off as the ticks a fresh DoT gets there less its cost
    (`DotSpec.applyCost`, default its hit against an average GCD; Dragoon
    the route difference). Only the stretch ending at the re-application
    keeps the plain ticks × grace rule. This kill: 3:01 gone, 6:06 32k →
    10k. Across the FF samples 937 → 865 DoT findings, mostly healer DoTs
    just before downtime dropping or shrinking.

- **Dragoon Piercing Talons 4:19.4 / 4:32.0 and Chaotic Spring 4:21
  (user: back of a Forsaken tower, out of melee).** Holds. Its soaks:
  4:10.5 Stack inner 5.5y (kept melee), 4:19.9 Spread outer 10.9y, 4:31.0
  Cone flare 10.4y; a Talon at each outer soak. The Paladin's three
  outer soaks (10.3-10.7y) line up with its ranged GCDs. The Talon at
  4:19.4 pushed Raiden → Spiral → Chaotic a GCD: Chaotic 4:24.5 instead
  of ~4:21.9. **Built (user: Movement, not forced):** Dancing Mad
  `movementWindows`, a melee player's Path of Light soak at r ≥ 9y, from
  2.5s before to 1.5s after. `checkDisengages` reads a ranged GCD inside a
  movement window as movement; `dotFindings` reads a DoT gap that is
  within grace but for such GCDs as movement. Dragoon: both Talons, 4:21
  and 4:48 Chaotic Spring gaps → movement (56k).

- **Dragoon Power Surge 3:05 (23k, user: boss dead seconds later).**
  Not a loss. It fell off at 3:05.2, the P1 check passed at 3:10.7.
  Keeping it meant Spiral Blow at 3:06.4 (the route for Chaotic Spring),
  in place of Lance Barrage → Heavens' Thrust (~33k): the bonus was 10% of
  226k = 23k. Actual 3:06.4-3:10.7: Lance Barrage 71k + Heavens' Thrust
  97k + High Jump 68k (237k) vs ~180k on the Spiral route with Power
  Surge. **Fixed:** `uptimeFindings` takes `refreshCost` (Dragoon: the
  same route cost); a stretch cut off by forced time counts only its
  bonus beyond that cost. Forced stretches under 5s don't cut a gap (both
  checks; a 0.3s blip on vVPtwaTQ62Jg391q had). This kill: 3:05 gone,
  6:10 45k → 12k.

## Next

- Ask the user what the 8:47-8:54 mechanic is and whether it forces
  melee out. If it does, the two Piercing Talons (7k each), the Viper's
  ranged GCDs and the knock-on DoT gap are forced: a per-player busy
  window in `dancingmad/damage-context.ts`.
