# Case study: GKnDWAxdbmhNaV7c (FFXIV)

"Day 47 - clear", Dancing Mad kill (fight 4, the app's Pull 4 with the
whole report loaded; 18:32), patch 7.5. Started 2026-11-06. The user has a
VOD of the kill and asked about crit luck on the damage checks. No
xivanalysis pages yet.

## Data on disk

- `sampledata/ff/GKnDWAxdbmhNaV7c/` — fight 4 only, full capture
  (8.2MB). No mechanic baselines.

## Done

- **Crit luck per phase (raid-wide)**, every player's rolling hits summed
  per phase with `lib/damage/crit-luck.ts` (rates: Chauzey from gear,
  Kairu / Aniyun / Kade / Sae from DoT ticks, Wazzeldorp / Jack / Ayumi
  estimated from this pull alone, so those three lean to the 50th):

  | Phase | Raid pct | vs average | Crits / expected |
  |---|---|---|---|
  | P1 | 73rd | +0.31M (+0.7%) | 320 / 320 |
  | P2 | 60th | +0.11M (+0.3%) | 288 / 273 |
  | P3 | 13th | −0.64M (−0.9%) | 465 / 496 |
  | P4 | 89th | +0.55M (+1.6%) | 241 / 230 |
  | P5 (enrage) | 87th | +0.58M (+1.2%) | 362 / 354 |
  | Whole kill | 72nd | +0.65M (+0.3%) | 1673 / 1672 |

  Nothing out of the ordinary: a raid's per-phase luck sits within ±2%.
  P3 was the unlucky one (~2.6s of P3 raid DPS). Wazzeldorp's 0 direct
  hits in 826 hits is a tank with no direct-hit stat (0% at base), not a
  bug.
- Probe used: `<scratchpad>/tools/phase-luck.js <code> <boss> <pull>`
  (not in the repo yet; the app has no per-phase crit luck).

- **App bug, fixed 2026-11-06:** with the whole report loaded, Kairu,
  Aniyun and Ayumi read 100th. Rates were pooled over every loaded pull,
  including the 22 Dragonsong's Reprise pulls (level 90): the DoT ticks'
  most common direct-hit rate became 0% (18.1% / 12.5% at 100). Now only
  pulls at the same sync level pool (`crit-rates.ts sameSyncPlayers`).
  The kill then reads Kairu 67th, Aniyun 97th, Kade 96th, Sae 8th,
  Chauzey 34th; Ayumi, Jack and Wazzeldorp need more pulls (the four
  Dancing Mad pulls give 643-1940 unbuffed hits, under 2,000).

## Data on disk (update)

- The whole report is now on disk: Dancing Mad pulls 1-4 (4 = the kill)
  and Dragonsong's Reprise pulls 1-22.

## Next

No xivanalysis pages yet. If the user wants crit luck per damage check
in the app, add it to the phase rows (raid-wide, as above).
