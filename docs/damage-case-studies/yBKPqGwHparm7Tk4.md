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

## Next

- Ask the user what the 8:47-8:54 mechanic is and whether it forces
  melee out. If it does, the two Piercing Talons (7k each), the Viper's
  ranged GCDs and the knock-on DoT gap are forced: a per-player busy
  window in `dancingmad/damage-context.ts`.
