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
| Hervous, Cocomber | Arms Warrior | **Done**, one open item (below) |
| Shadowmeld | Marksmanship Hunter | not started |
| Nearby | Assassination Rogue | not started |
| Bragontix | Devastation Evoker | not started |
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

## Open

1. **Same-spec GCD check (user to decide; proposed 2026-10-13).** Hervous
   presses on a ~1.2s rhythm; his fitted GCD is 1.13s against Cocomber's
   0.98s. Their haste ratings (947 vs 1063) explain ~3%, their talents
   differ in one choice node only (node 108676, entries 134216/134217,
   unnamed), and no haste buff differs. So ~0.1–0.2s per press (~6–7M) is
   likely play, which the per-player GCD model excuses. Proposal: when a
   same-spec player (on the pull or a reference clear) has a faster fitted
   GCD, expect that × the rating ratio; count the excess, as inference.
2. **Patch table for WoW** (docs/open-items.md): none yet.

## Next

Ask the user whether to build the same-spec GCD check (Open 1), then take
the next player the user names. For each: extract the page
(`wowa-html.js --brief`), the app's findings (`--all-findings`), verify
each claim, and compare against a top player of the spec (ask the user for
a log if NK1hBtW9rckdjq36 has none).
