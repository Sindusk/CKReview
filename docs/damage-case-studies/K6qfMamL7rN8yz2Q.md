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

- **Paladin Oath Gauge** on the timeline (jobs/gauges.ts; 570 lost, as
  xivanalysis says). Display only.
- **Chauzey Solstice (Dancer), Vamp Fatale.** Per-claim record in the
  Dancer header of lib/damage/ffxiv/jobs/ranged.ts. Built (user: estimates
  named, never valued): Feathers and Esprit gauges on the timeline after
  xivanalysis's simulation, and a "gauge-estimate" finding kind the dialog
  lists with "—" (1 feather, 1 Saber Dance, the 6:09 window not pooled:
  all three match). The 6:09 window is short on week 6 too, after Fan
  Dances on the 5:44 add wave. App-only finding that holds: the 2:00 gap
  (Technical Step at 2:02.7, everyone else back by 2:01).

- **Siegward Damvir (Warrior), Vamp Fatale.** Per-claim record in
  lib/damage/ffxiv/jobs/pld-war.ts. Built: the Beast Gauge on the
  timeline (gaugeTrack draws any GaugeSpec the overcap check simulates);
  an expired Inner Release stack now costs Fell Cleave minus Maim (50k,
  was 81k).

- **Yoro Shiku (Astrologian), Vamp Fatale.** Per-claim record in
  lib/damage/ffxiv/jobs/healer.ts. Built: the Arcana lane (cards held,
  a tick per play naming its target, amber ticks for cards a Draw
  replaced; GaugeTrack.marks). Fixed in the engine: a stretch with three
  or more weaves spends no movement (8:10, 1.87s: was movement, now a
  32k delay). Lost 477k → 509k.

- **Kevin Brachydiar (Pictomancer), Vamp Fatale.** Per-claim record in
  lib/damage/ffxiv/jobs/caster.ts. Built: Palette and Paint lanes (the
  user reviews them next). Palette and Paint gain with the cast, hit or
  not (the hit came after a spend at 3:19; a Water that never landed on
  Red Hot paid for a later Subtractive): shortfalls across the samples
  went from ~18 pulls to 2 wipes. Checked and kept as is: a GCD cast at
  a timed buff's removal instant snapshots it (4 of 4 hits), so
  xivanalysis's Hammer 1/3 at 8:09 is our 2/3. Open: Living Muse charge
  held to the kill (open-items.md proposal).

- **Sin Dusk (Sage), Vamp Fatale.** Per-claim record in
  lib/damage/ffxiv/jobs/healer.ts. Built: the Addersting lane. The
  transform now keeps each player's shield removals from the healing
  stream (PlayerInfo.shieldRemovals); a removal in the same instant as an
  absorb is a broken shield. Open: Phlegma III held to the kill (the
  charges-at-kill proposal).

- **Sayacissa Morsaelth (Dragoon), Vamp Fatale.** Per-claim record in
  lib/damage/ffxiv/jobs/melee.ts. Built: the Firstminds' Focus lane;
  Life of the Dragon as a +15% window (status 1003177, only in hit
  snapshots: measured 1.26 = 1.10 × 1.15 on three kills; burst windows
  can now take their windows directly); Life Surge drift valued as a
  forced crit (TrackedCooldownSpec.valuePerUse). Lost 748k → 762k + 25k.

### Red Hot and Deep Blue (fight 3, the app's Pull 2, kill)

xivanalysis pages for all eight players saved 2026-10-14 in
`sampledata/damage-ff/`.

- **Mocha Dreams (Viper).** Per-claim record in the Viper header of
  lib/damage/ffxiv/jobs/melee.ts. Built:
  - Steel / Reaving Maw consume the Honed buffs.
  - Maw on under 3 targets is judged against Fangs (3:00, 16k).
  - Poised for Twinfang / Twinblood drops are caught (7:06.9, 4k).
  - A Writhing Snap with an unpooled Rattling Coil held counts as a
    choice (DamageGame.disengageAlternative): 8:15.7 with 2 coils, which
    were left at the kill (34k).
  Lost 839k → 883k. Unresolved (no VOD for this session): 8:33-8:39, no
  GCD for 4.1s inside the last Insane Air volley with 2 coils held. It
  stays counted as movement. The two tanks kept their GCDs rolling; the
  Dragoon was 1.3s late.
- **Yoro Shiku (Astrologian).** Per-claim record in the Astrologian
  header of lib/damage/ffxiv/jobs/healer.ts. Fixed in the engine: a DoT
  gap that runs to the end of the pull is valued at the ticks less the
  GCD re-applying it costs (shared.ts dotFindings). The last 17.1s with
  no Combust went from 53k to 10k. Then (user's call):
  - Kill-cut burst windows are judged up to the kill, not skipped.
  - Divination is valued at its measured bonus.
  - Order checks stay per job (docs/dps-analysis.md).
  The 8:41 Divination now counts Lord of Crowns (31k). Lost 766k → 781k.
- **Kade Kansado (Paladin).** Per-claim record in the Paladin header of
  lib/damage/ffxiv/jobs/pld-war.ts. Built: tincture placement falls back
  to the best passing start within 30s, when the best placement's move
  fails the raid-buff rule. That surfaced 6:43 → 6:33 (10k), and about 55
  small same-burst shifts across the samples. Lost 668k → 678k.
  - Asked the user: the 6:50-6:57 Shield Lobs and gap (140k + 55k).
  - Unresolved: the Divine Might lost at 8:06.7 to a Holy Spirit that
    never went off.
- **Sayacissa Morsaelth (Dragoon).** Nothing to build; per-claim record in
  the Dragoon header of lib/damage/ffxiv/jobs/melee.ts. The biggest real
  loss is one route mistake at 6:42 (Lance Barrage where Spiral Blow was
  due): Power Surge and Chaotic Spring off through the 6:35 burst (158k).
- **Sin Dusk (Sage).** Per-claim record in the Sage header of
  lib/damage/ffxiv/jobs/healer.ts. Fixed in the engine: a moment with no
  enemy to target cuts a DoT gap however short (shared.ts dotFindings).
  The 6:12-6:48 Eukrasian Dosis gap through the prison break went from
  124k to 81k. Across the samples, the 1:22-1:31 Chaotic Spring / Combust
  gaps over Red Hot leaving now read as cut. Lost 524k → 481k.
- **Kevin Brachydiar (Pictomancer).** Per-claim record in the PCT header
  of lib/damage/ffxiv/jobs/caster.ts. Built, from the 8:39 Starry Muse
  the kill cut short:
  - Hammers spent just before it count as missed (107k).
  - Additive spells cast in it count (123k).
  - AoE paint spells are judged on under 3 targets.
  Lost 475k → 705k. The Hammer habit shows on his vVPtwaTQ62Jg391q kill
  too.
- **Siegward Damvir (Warrior).** Per-claim record in the Warrior header of
  lib/damage/ffxiv/jobs/pld-war.ts. Built: Nascent Chaos overwritten by
  Infuriate (0:14.4, 36k). Lost 305k → 341k.
- **Chauzey Solstice (Dancer).** Nothing to build from xivanalysis. Fixed
  on the app's side: a tincture the kill cut short is compared over the
  same length at its new start (tincture.ts). Her 8:35 → 6:31 finding
  (16k) was the kill's doing, as were 8 others across the samples. Lost
  133k → 117k.
- Kade's 6:50-6:57 question: the user doesn't know (no VOD). It stays
  counted as his.

## Open

- Lock-model gaps seen in the drift test (they can hide delay, never
  create it): pre-pull hard casts logged at 0:00, Pictomancer GCDs under
  Starry Muse's haste, Viper's Vicewinder (~0.41s under the modelled
  lock), Sage's Eukrasian Dyskrasia (locked 2.41s, its recast is 1.5s).

- **Mocha Dreams (Viper), Vamp Fatale.** Per-claim record in
  lib/damage/ffxiv/jobs/melee.ts. Built: Rattling Coil and Serpent
  Offerings lanes. Fixed in the engine: gauge left at a kill is judged by
  how long it was held, not the kill's instant (a "boss at 1 HP" window
  made every leftover forced); the coil check now uses leftAtKill.

## Next

- Vamp Fatale is done for all eight players. Waiting on the user: the
  charges-at-kill proposal (open-items.md), the lenient saws/towers/adds
  window (Kade 4:54 / 5:47, Kevin 8:05), the PCT lanes' review.
- Red Hot and Deep Blue kill (session 2026-10-14): Mocha, Yoro, Kade,
  all eight players done (pages in sampledata/damage-ff/; patch review:
  same report and comp as Vamp Fatale, 7.4, nothing new).
  - Unresolved without a VOD: Mocha 8:33-8:39 (idle with coils in Insane
    Air), Kade 6:50-6:57 (Shield Lobs before the divide).
  - Still waiting on the user: the charges-at-kill proposal
    (docs/open-items.md). It comes up for Mocha's coils, Sin's Phlegma
    and Sayacissa's Dragonfire Dive.
- The Tyrant, Lindwurm and Lindwurm II kills are on disk too.
