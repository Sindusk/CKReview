# Case study: qpZx3mWaG7gcDdYB fight 5 (WoW)

Mythic Entombed Sentinels kill, 6:36, The Venomous Abyss; app Pull 3.
Log dated 2026-10-02 00:56 UTC. The user's first WoW damage study
(started 2026-10-13). The user drives the order of players; there's no VOD
for this kill, so top players' logs stand in for it.

## Data on disk

- `sampledata/wow/qpZx3mWaG7gcDdYB/` — the kill, refetched 2026-10-13
  (haste rating, haste buffs, startTime). Baselined.
- `sampledata/wow/NK1hBtW9rckdjq36/` — reference kill (fight 3, app Pull 2,
  5:26, 2026-10-04): the top Destruction Warlock (Shn, also Bryon) and a
  99th-percentile Arms Warrior (Eroka). Baselined.
- `sampledata/wow/3Vz6Qt2RyTPXwpJn/` — reference kill (fight 22, app
  Pull 1, 5:29), the user's pick (2026-10-13): 100th-percentile parses for
  Marksmanship (Imnotanorc), Devastation (Gilgvoker), Havoc (Hawkerton)
  and Arcane (Màzz). Three players died there (Falkeron 2:20, Forgyy 2:25,
  Unbearievabl 2:57, none raised). Baselined.
- `sampledata/wow/ACmXHMFtaPLR9k8w/` — reference kill (fight 15, app
  Pull 2, 5:03), the user's pick (2026-10-13): 99th-percentile parses for
  Pisslizard, Styphi, Auxeus, Yenvenger (Retribution), Vairuh, Nagafenw,
  Frostydn; WoWAnalyzer pages for all saved. Baselined.
- `sampledata/damage-wow/` — WoWAnalyzer Overview pages for every
  non-healer on the kill (16 pages).

## Players

| Player | Spec | Status |
|---|---|---|
| Wyrmtongues | Destruction Warlock (57th pct) | **Done** |
| Hervous, Cocomber | Arms Warrior | **Done** |
| Shadowmeld | Marksmanship Hunter | **Done** (against Imnotanorc) |
| Nearby | Assassination Rogue | not started |
| Bragontix | Devastation Evoker | **Done** (against Gilgvoker) |
| Sylmigron | Balance Druid | not started |
| Cocroach | Elemental Shaman | not started |
| Mythnarra | Havoc Demon Hunter | **Done** (against Hawkerton) |
| Neximage | Arcane Mage | **Done** (against Màzz) |
| Deathstriker | Beast Mastery Hunter | not started |
| Veinglas | Blood Death Knight | not started (haste fit: 0.90s base, unexplained) |
| Polpo | Retribution Paladin | **Done** (against Yenvenger) |
| Blkphnx | Windwalker Monk | not started |
| Thatapaddlin | Protection Paladin | not started |
| Fwîî | Demonology Warlock | not started |

## What was built (all committed)

- WoWAnalyzer extractor and audit (`tools/wowa-html.js`, `-audit.js`);
  every tool takes WoW codes; `tools/gcd-locks.js`.
- Engine: begin-cast pairing fix (same-instant queued casts); WoW GCD
  model through haste (`lib/damage/wow/haste.ts`); movement as its own
  category (blue; `DamageContext.movementWindows`, Entombed Sentinels
  windows measured); reference comparison shows the references' loss;
  `isAutoCast` (Bladestorm's Mortal Strikes); Bladestorm as a channel.
- Destruction: Summon Infernal 90s / Malevolence 60s, pre-pull Soul Fire,
  Backdraft waste (`castTimeProcFindings`), Havoc on the main target.
- Arms: Avatar / Colossus Smash drift recharged by Rage
  (`spentCooldownDrift`).

## Findings so far

- **Wyrmtongues:** 11.63M counted (2.97M movement). Against the top two
  Destruction Warlocks, ~14k/s of loss is the comparable part; the rest of
  the DPS gap is damage per GCD (gear ~6%, slime targeting 11% vs 3%).
  Havoc on Breath at 2:46 then attacked Breath (top players 0 of 9).
  Soul Fire's cooldown is ~45s (WoWAnalyzer's ~41s is wrong).
- **Hervous vs Cocomber vs Eroka:** Hervous 4 Avatars (24% uptime) vs 7/6
  (43%/42%); 42% of casts at full Rage vs 36%/25%; Rage spent 3,500 vs
  4,552 / ~5,380 per 396s. The app now counts 1 Avatar + 1 Colossus Smash
  use lost for him.
- **Same-spec GCD pace (built 2026-10-13, user's choice;
  `lib/damage/pace.ts`, inference):** Hervous 2.18M against Cocomber
  (1.13s vs 1.02s after ratings). With NK1hBtW9rckdjq36 loaded as a clear:
  Wyrmtongues 1.93M (vs Shn), Sylmigron 1.04M (vs Arzenal), Veinglas 0.71M,
  Thatapaddlin 0.47M. The old ~6–7M estimate double-counted idle the gap
  check already counts.

- **Bragontix (Devastation, Scalecommander):** 5.42M → 4.64M after four
  engine fixes (empowers read as cancelled, Dragonrage windows split by
  Animosity, Deep Breath's flight read as idle, channels counted as
  missing burst GCDs; they moved other casters' totals too). Dragonrage
  held 2:03 → 2:46 across Stasis: no lost use (WoWAnalyzer's 87% counts
  it). New: Strafing Run expired at 2:15 (one Deep Breath, ~0.25M). Record
  in the header of lib/damage/wow/specs/ranged.ts.

- **Bragontix vs Gilgvoker (3Vz6Qt2RyTPXwpJn):** rDPS 190k vs 281k.
  Est. loss 15.2k/s vs 11.0k/s, so ~4k/s is comparable play; the rest is
  damage per GCD and haste (rating haste 16.6% vs 34.7%: 31.8 vs 34.8 GCDs
  a minute). Empowers: release → next press + 0.5s per Disintegrate tick
  is ~27–28s for Fire Breath in both; Eternity Surge ~27s vs ~24–26s.
  Bragontix's clear holds outside Stasis (Fire Breath 3:57 ~6s, Eternity
  Surge 3:54 ~10s and 5:04 ~4s) add up to under one use each: no empower
  check built. Disintegrate: 4.66 vs 4.93 ticks per cast (~6%, ~2M) and
  12.6 vs 16.6 casts a minute (Essence income, not built).
- **Dead-time fix (found on the reference):** a dead window closed at the
  player's next logged damage, and dead players' DoTs and pets keep
  logging; it now closes at the next cast. Bragontix's 2:27 death went
  from 0.2s to 6.6s dead (battle res, 1.15M). The comparison also leaves
  reference players who died out of their spec's median.

- **Shadowmeld vs Imnotanorc:** same pace (1.43s vs 1.44s) but 30.9 vs
  37.5 GCDs a minute: idle in his own mechanic windows (Murk 52%, Miasma
  40%, slime switch 29% vs 0–1%). Left as movement by the user's choice
  (lenient; docs/dps-analysis.md). Trueshot: no lost use (WoWAnalyzer's
  88% overstated). New combat potion check: his second potion from 5:04,
  0.89M; it also flags several players on all three kills.
- **GCD value fix (2026-10-13, found on Mythnarra):** hits logged under
  another id than their cast didn't count toward a GCD's value, so most
  players' gaps were underpriced; the numbers above predate it. Estimated
  loss per second now, own vs references: Wyrmtongues 46.2k vs 21.2k,
  Hervous 30.8k vs 15.7k (Cocomber 13.0k), Bragontix 20.6k vs 16.5k,
  Shadowmeld 21.3k vs 8.2k, Mythnarra 28.2k vs 24.6k, Neximage 13.2k vs
  7.7k. Pace findings: Hervous 3.46M, Wyrmtongues 3.23M, Sylmigron 2.99M.
- **Mythnarra vs Hawkerton:** Eternal Hunt wasted 4 of 6 (Eye Beam pressed
  just before The Hunt; the empowered one hits ~2×): new check, 0.58M.
  Metamorphosis 79% overstated (Stasis; no fourth use possible). Fury cap
  and small delays are a Havoc floor (Hawkerton shows them too). Pace
  right for his haste; 47.8 vs 53.7 GCDs a minute.
- **Neximage vs Màzz:** no new check. Excess is small GCD delays (9.5s
  vs 1.9s) and gaps; Touch of the Magi 84% overstated (held through
  Stasis to sync with Arcane Surge); Arcane Orb "bad" casts still beat his
  average GCD; casting through Stasis showed no payoff after it. The pace
  check's threshold went 3% → 5% (it flagged Màzz on fit noise).
- **Polpo vs Yenvenger (ACmXHMFtaPLR9k8w):** est. loss 38.7k/s vs
  12.2k/s. New check: Holy Power lost at the cap, rebuilt from spender
  snapshots (33% vs 6%; WoWAnalyzer 41.9% vs 12.9%): 5.62M. Pace 1.15s vs
  1.02s (3.06M); second potion missed (1.77M). Cooldowns fine (Divine
  Toll at most one cast at the end).
- Potion buffs added to the stream; all three kills refetched
  (2026-10-13) and baselines checked.

## Open

1. **Patch table for WoW** (docs/open-items.md): none yet.

## Next

The next player the user names. The remaining players (Nearby, Sylmigron,
Cocroach, Deathstriker, Veinglas, Polpo, Blkphnx, Thatapaddlin, Fwîî)
have references only where NK1hBtW9rckdjq36 or 3Vz6Qt2RyTPXwpJn has the
spec; ask the user for a top log otherwise:
`damage-compare-wow sampledata/wow/qpZx3mWaG7gcDdYB --refs=NK1hBtW9rckdjq36,3Vz6Qt2RyTPXwpJn`. For each: extract the page
(`wowa-html.js --brief`), the app's findings (`--all-findings`), verify
each claim, and compare against a top player of the spec (ask the user for
a log if NK1hBtW9rckdjq36 has none).
