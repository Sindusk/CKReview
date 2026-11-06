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

## Chauzey Solstice (Dancer), user questions 2026-11-06

Probes (scratchpad, not in the repo): `esprit-whatif.js` (Esprit
simulation with a GCD swapped), `esprit-mc.js` (random party Esprit).

- **1:52 (Cascade → Reverse Cascade → Technical Step 1:56.6).** Two GCD
  slots before Technical Step. Early Technical: the Finish would land
  ~1:57 with the party's buffs at 2:03-2:04; Technical Finish's 5% on
  0.96M instead of 2.06M of party damage plus her burst GCDs out of the
  others' buffs, ~−60-80k. Cascade → Fountain: keeps the combo but the
  Silken Symmetry dies mid-window; about even (the app's 7k). Saber Dance
  at 1:51.6: Esprit an estimated 79, entering the window at 97 overcapped
  26; with the Saber, 0 overcap and all four window spenders still fit
  (Tillana before the second Saber). ~+10k by averages. Best by a little,
  on an estimated gauge.
- **1:52 with the real gauge (user, from the VOD): 80 before the Cascade,
  85 after.** `esprit-anchor.js` (party gains random, +10 at each party
  GCD's rate) from that value to the window's end, Cascade line vs Saber
  Dance at 1:51.6 (then Cascade at 1:54.1, no Symmetry). Per starting
  Esprit: Cascade overcaps 10/20/25/30/35/40 at 50/60/70/75/80/85 (mean,
  rounded to 5) and the window runs one spender short 2-15% of the time;
  the Saber line overcaps ~0-5 and runs short 82/73/62/50/50/36%.
  Valued: the Saber line keeps the overcap Cascade loses (each Esprit
  ~0.84k: a Saber's 71k − a 29k filler, per 50), gives up Reverse
  Cascade's 10, and a short window moves one spender out (~14k).
  Break-even at **60-65 Esprit** before the press; at 80 the Saber is
  ~+15k. Answer: Saber Dance at 1:52 was the better play. Holds while
  the party feeds ~20% per GCD and the window has Tillana plus four
  spenders to place.
- **Presenting Esprit (user, 2026-11-06):** it only moves in steps of 5.
  The simulation's average party rate gives values like 79: round to 5
  when quoting, and say it's an estimate.
- **7:51 (same pattern, Technical Step 7:56.6).** Esprit an estimated
  47: no Saber at 7:51; one at 7:53.5 would leave Dance of the Dawn at
  8:03.6 with ~10. Early Technical: ~−95k (0.78M vs 2.76M of party damage
  under its 5%). As played (Cascade → Reverse Cascade) was right.
- **10:15: fixed** (8db0a81). Fan Dance 10:14.96 re-rolled the Threefold
  held from 10:12.95; the finding named Tillana (first cast within 0.6s).
- **16:17 window: open, user decision.** 8 GCDs, 2 Esprit spenders
  (Dance of the Dawn 16:22.9, Saber 16:27.8) plus Last Dance; Fountainfall
  16:32.8 and Reverse Cascade 16:35.3 instead; Saber 16:37.85, 0.9s after
  the window. She pressed a Saber Dance at 15:58.3; outside Technical only
  the partner feeds Esprit, so she likely entered with ~25-40 (the
  estimate says 52). To have no Saber by 16:35.3 the party (48 GCDs with
  Esprit, ~9.6 procs expected) gave ≤3 procs from an entry of 52 (0.8%),
  ≤5 from 30 (6%), ≤6 from 20 (13%). Low entry plus bad luck.
  The app charges 61k (each missing Saber = its average − the GCD used
  instead). Esprit is only lost at the cap, so a missing Saber is moved
  out of the window, not lost: worth the window's bonus on it, ~5-10k each.
  The same over-valuation applies to every Saber-short window.
- The whole-fight Esprit Monte Carlo rejects all but 1 of 20000 runs
  (some logged Sabers have no Esprit under the model): the gauge model
  drifts over a long fight.

- **16:17: built (user: "value as moved").** A missing Last Dance /
  Saber Dance in a Technical window is now (its average − the GCD used
  instead) × the window's observed bonus (`ExpectedAction.observed`):
  16:17 61k → 8k. Other kills: qjCMx4bRfgNKwX9T 6:03 65k → 13k, 14:05
  40k → 13k; gTkMH91DWRmLbNCn 14:08 71k → 20k, 16:18 58k → 0k (that
  wipe's window ran under Damage Down, multiplier 0.11-0.12: no bonus to
  lose). The four-Saber expectation and its count are unchanged.

## Next

Nothing open for Chauzey. No xivanalysis
pages yet. If the user wants crit luck per damage check in the app, add
it to the phase rows.
