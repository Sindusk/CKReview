# Case study: K6qfMamL7rN8yz2Q (FFXIV)

"Prepull Sorry - Week 5 Reclears", savage reclears,
report started 2026-02-03, patch 7.4. Started 2026-10-14. Analysis starts
with Vamp Fatale (fight 1, the app's Pull 1, kill). xivanalysis pages for
all eight players on that kill are in `sampledata/damage-ff/`.

## Data on disk

- `sampledata/ff/K6qfMamL7rN8yz2Q/` — all 14 fights, full captures:
  Vamp Fatale (fight 1, kill), Red Hot and Deep Blue (2 wipe, 3 kill),
  The Tyrant (4 wipe, 5 kill), Lindwurm (6-7 wipes, 8 kill), Lindwurm II
  (9-13 wipes, 14 kill). Baseline `expectations/ff-K6qfMamL7rN8yz2Q.json`
  created 2026-10-14 (173 entries, no rulings).
- Every boss has a damage context.
- Same static's later Vamp Fatale kills, fight 1 only, for the drift
  test: `sampledata/ff/{grK2z6ptfZWGmVdj,nPLtv4FBZxKNXGYH,n6zTGPJh8wkLFRZ9,ZJ6WqpvNCDYA8X2G}`
  (fetched 2026-10-14) and `vVPtwaTQ62Jg391q` (already on disk).

## Done

- **GCD drift noise (user: "18 GCD drifts for Sin, xivanalysis finds 5").**
  Sin Dusk (Sage, GCD 2.41s). Of the app's 18 `gcd-drift` entries, nine
  were 0.0-0.3s delays (0.17-0.44s past the GCD before the 0.15s
  tolerance): five after one oGCD woven late in the GCD (Kerachole,
  Ixochole, Zoe after Dosis III; Holos after Phlegma), four single late
  presses. A 0.35s floor hid them (a5d1ec8); the user asked instead
  whether they're real, with five more Vamp Fatale kills of the same
  static (grK2z6ptfZWGmVdj, vVPtwaTQ62Jg391q, nPLtv4FBZxKNXGYH,
  n6zTGPJh8wkLFRZ9, ZJ6WqpvNCDYA8X2G; fight 1 each, weeks 6-10). They
  are: 7 of 412 delays of 0.15-0.5s across 13 players were paid back by
  an early next GCD, 360 kept the shift (docs/dps-analysis.md). Floor
  reverted; all 18 stand.
  - xivanalysis's method is why it lists fewer (header of
    lib/damage/checks.ts):
    - Its 5 match ours: gap 7:13 (ours 7:14, 2.0s; it says 0.75s because
      it measures from the Dosis's cast end, not its start) and
      interrupts 1:30, 1:59, 4:03, 7:58 (ours 1:29 1.5s, 1:58 2.2s,
      4:02 2.3s, 8:01 0.8s: the idle, where it lists the cancelled cast's
      1.44s).
    - Four it can't see: 5:15 0.7s (Haima woven 2.27s into the GCD),
      5:21 0.4s after Eukrasia (1.51s for a 1.0s GCD), 7:02 0.6s after
      Eukrasian Prognosis II (2.27s for 1.5s), 5:43 0.4s after Pneuma.
      Its GCD Downtime needs a window over the full GCD + 150ms measured
      from a hard cast's end, which hides ~1.6s after every Dosis and ~1s
      after Eukrasian GCDs.

- **GCD delay / GCD drift split (user, 2026-10-14).** Entries reading
  0.3s late or more (gaps included) are "GCD delay", shorter ones "GCD
  drift"; both headers show their counted time. Sin, Pull 1: 10 delays
  (~11.2s), 8 drifts (~0.7s).

- **Kade Kansado (Paladin), Vamp Fatale.** Verified against xivanalysis;
  the per-claim record is in lib/damage/ffxiv/jobs/pld-war.ts's header.
  Built: the Atonement chain left at the kill (Atonement Ready from 8:19,
  Fast Blade 8:37 and Riot Blade 8:40 pressed instead; 26k, plus the 25k
  Fight or Flight window finding). Kills only. Lost 221k → 248k.
  Open question for the user: GCD gaps at 4:54 (0.97s) and 5:47 (1.2s)
  count as movement in the saws/towers/adds window, but no other melee
  idled at 4:54.

## Open

- Lock-model gaps seen in the drift test (they can hide delay, never
  create it): pre-pull hard casts logged at 0:00, Pictomancer GCDs under
  Starry Muse's haste, Viper's Vicewinder (~0.41s under the modelled
  lock), Sage's Eukrasian Dyskrasia (locked 2.41s, its recast is 1.5s).

## Next

- Per player on Vamp Fatale against their xivanalysis pages (step 3):
  Sin Dusk (SGE) first for the rest of their page (DoTs, Zoe,
  Swiftcast, tincture), then Mocha Dreams (VPR), Kevin Brachydiar (PCT),
  Yoro Shiku, Chauzey Solstice, Kade Kansado, Siegward Damvir,
  Sayacissa Morsaelth.
