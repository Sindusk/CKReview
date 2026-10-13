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
- `sampledata/damage-wow/` — WoWAnalyzer Overview pages for every
  non-healer on the kill (16 pages).

## Players

| Player | Spec | Status |
|---|---|---|
| Wyrmtongues | Destruction Warlock (57th pct) | **Done** |
| Hervous, Cocomber | Arms Warrior | **Done** |
| Shadowmeld | Marksmanship Hunter | not started |
| Nearby | Assassination Rogue | not started |
| Bragontix | Devastation Evoker | **In progress**: needs a reference log (Open 1) |
| Sylmigron | Balance Druid | not started |
| Cocroach | Elemental Shaman | not started |
| Mythnarra | Havoc Demon Hunter | not started |
| Neximage | Arcane Mage | not started |
| Deathstriker | Beast Mastery Hunter | not started |
| Veinglas | Blood Death Knight | not started (haste fit: 0.90s base, unexplained) |
| Polpo | Retribution Paladin | not started |
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

## Open

1. **Bragontix's empowers (needs a top Devastation log on Entombed
   Sentinels).** WoWAnalyzer: Fire Breath 86% / Eternity Surge 82%,
   "sat ready" 68.7s / 87.1s, much of it in Stasis. Measured: release →
   next press + 0.5s per Disintegrate tick comes out ~26.6–28s when
   prompt, 34–37s at Fire Breath 3:57 and Eternity Surge 3:54 / 5:04, but
   in Dragonrage the intervals run shorter than 30s − 0.5s/tick predicts,
   so the Causality rule isn't pinned. Also Disintegrate tick efficiency
   340/385 (clips and early chains): no reference to judge it against.
2. **Patch table for WoW** (docs/open-items.md): none yet.

## Next

Get a top Devastation log from the user and fetch it
(`fetch-wow-report.js <code> --fight <id>`); compare empower intervals
(scratchpad script: interval vs Disintegrate ticks) and tick efficiency;
then build empower drift if Bragontix's holds exceed the reference's.
Then the next player the user names. For each: extract the page
(`wowa-html.js --brief`), the app's findings (`--all-findings`), verify
each claim, and compare against a top player of the spec (ask the user for
a log if NK1hBtW9rckdjq36 has none).
