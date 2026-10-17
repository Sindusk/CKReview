# WoWAnalyzer audit: Assassination Rogue

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Rogue shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** stale. It declares patch 12.0.0 while the clone's retail is
  12.1.0, and is only partly maintained (the overview admits a missing
  Implacable module). Last substantive change 2025-04-09 ("Spells
  adjusted and partial support for 12.0.0"); the Envenom and finisher
  work dates from 2023-11, the Mutilate checks and the experimental
  Kingsbane analysis from 2023-12. No priority list and no checklist:
  every grade is a guide section or a cast-efficiency target. Rules that
  lean on talents or numbers that may have changed since (Subterfuge,
  Crimson Tempest as a builder, the Sepsis buff, Without a Trace, the
  Garrote and Rupture duration models) are marked doubtful, not turned
  into candidates.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Assassination Rogue"`: the
  Kingsbane window through `burstGcdFindings`, and the energy cap through
  `primaryResourceCapFindings`), `tracked-cooldowns.ts` (Kingsbane,
  Deathmark, Vanish with its Garrote value and opener use), `potion.ts`,
  generic checks. There is no Rupture or Garrote uptime check for this
  spec. Case study: qpZx3mWaG7gcDdYB pull 3 (Nearby) against
  ACmXHMFtaPLR9k8w (Auxeus, 99th percentile); the header of melee.ts
  records what matched.
- **Core rules** (active time, cast efficiency, potions) are in
  [core.md](core.md); the Rogue shared layer (combo point and energy
  waste, finisher tracker, instant poison) is judged in the rows below.
  Rows cover only what Assassination sets or adds.
- **Phase 3 (2026-10-17):** done. Measured on the 46 Assassination
  player-pulls on disk: four top parses fetched for it (遗伤
  v6NnRz4KDtYCJ3Mw, Vashnik 100th; Ireath z8rQ23NBy4LwM6PZ, 99.8th; Kvá
  yQ1DNYpG7XFZMzk2, 99.4th; Lokistar ZC7YNpr2HVQLtjv1, Entombed Sentinels
  100th), Auxeus and 무법은장식 (98–99th), 22 mid-table players, and the
  static's Nearby (16 pulls). Every player runs the same build: Fatebound,
  Deathmark, Kingsbane, Improved Garrote, Implacable Strikes, Crimson
  Tempest as a 60-Energy builder that applies Garrote, 7 combo points; no
  Subterfuge, Blindside or Echoing Reprimand. Built (specs/assassination.ts,
  whose header has the models and numbers): "Rupture off every enemy" /
  "Garrote off every enemy" and "Rupture refreshed early" (a38e532). Vanish
  drift now prices a player with no Vanish Garrote (28f0f9d: Hofix read 0,
  now 1.45M). Not built, numbers in the rows: combo-point waste and
  low-point finishers (top players as much), Improved Garrote overwritten
  (its price is Deathmark's), Fan of Knives on one enemy (~13k a press).
  Re-run on the top players: Vanish, Deathmark, Energy cap and the Kingsbane
  window fire little or not at all on them; Kingsbane drift reads 777k on
  Ireath (his whole burst opened at 0:19–0:22, so a sixth Kingsbane missed
  the 5:35 kill).

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| rogue-assassination/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Overrides the core thresholds to 40 / 45 / 50% of the whole fight, so it practically never fires. The app values each gap less forced time. |
| rogue-assassination/Abilities/deathmark-cast-efficiency | covered | `checkCooldownDrift` (Deathmark, 122s) | Deathmark | Deathmark held | 90% target, whole fight, a hard-coded 2 minutes. WoWAnalyzer counts forced time as ready and expects a last use even if the fight ends first; the app counts whole lost uses less forced time. Case study: Deathmark similar for both players. Phase 3 (2026-10-17): shortest interval 120.0s on 46 player-pulls (tracked at 122s, lenient). Fires on no top player; Nearby Kith'ix Pull 2 162k, Antilyr 40k. Every Deathmark has a Kingsbane 1.0–2.0s after it but three (the pull's last Deathmark). |
| rogue-assassination/Abilities/kingsbane-cast-efficiency | covered | `checkCooldownDrift` (Kingsbane, 60s) | Kingsbane | Kingsbane held | 90% target, whole fight, same overstatement. The measured 60s agrees with the hard-coded minute. Holding it to line up with Deathmark is penalised here and by the alignment row below. Phase 3 (2026-10-17): shortest interval 60.0s. Top players: none but Ireath 777k (z8rQ23NBy4LwM6PZ: Vanish, Deathmark and Kingsbane at 0:19–0:22 while his raid opened at 0:01, so five uses in 5:35 and the sixth missed the kill; a burst opened late on purpose, perhaps for lust, but a real lost use). Weaker: Nearby 0.55–1.11M on 3 of 16 pulls (Ula'tek 1.11M), Antilyr 556k, Shiddlesz 524k. Kept. |
| rogue-assassination/Abilities/vanish-cast-efficiency | verified | `checkCooldownDrift` (Vanish, `valuePerUse`, `openerUse`) | Without a Trace (a charge, doubtful) | Vanish held or the opener use skipped | 90% target. Case study matched: Nearby 61% with the opener use skipped; the app values a use as the Garrote it empowers (784k) less an ordinary Garrote. WoWAnalyzer cannot see Vanish held for adds or an untargetable phase. Phase 3 (2026-10-17): shortest interval 120.0s; every player presses Garrote first after a Vanish (Improved Garrote), mostly within 3s of Deathmark. Fires on no top player (遗伤 Vanishes at 0:32, 26s after Deathmark, four uses in 6:57: none lost). Weaker: 盗拾六 1.49M (two uses in 6:35), Izanami 586–653k and Flyce 650k (no opener Vanish), Shiddlesz 691k, Antilyr 657k; Nearby 383k–1.76M on 12 of 16 pulls (he skips the opener Vanish every time). The player's own Vanish ÷ ordinary Garrote ran 0.5–5.6 (median 2.6; ~1.0–1.3 for a Vanish outside Deathmark: 遗伤, Калимист, Morllinor). A player with no Vanish Garrote was priced at nothing (Hofix JvQpZk3CXj78Dx2f, none in 5:22); now 2× their ordinary Garrote (28f0f9d): 1.45M. |
| rogue-assassination/Guide/CooldownGraph/use-on-cooldown | superseded | `checkCooldownDrift` | Kingsbane, Deathmark | a cooldown held a whole recharge | The same efficiency bars drawn on a graph, with gaps of a full cooldown shown red. The gap highlight counts forced time too. |
| rogue-assassination/Guide/EnergyCapWaste/percent-at-cap | covered | `primaryResourceCapFindings` | Vigor | Energy generated into a full bar | Perfect to 5%, good to 10%, ok to 15%, fail above. The app sees only non-spending casts made at the cap; regen lost while capped isn't in the log (unverifiable part). Case study: 4.0% vs 0.7%, both "perfect"; not adopted. Pooling for Deathmark or Kingsbane is penalised. Phase 3 (2026-10-17): the app's Energy capped reads none on the six top players, 11–118k on mid-table ones (Demo 118k, Sellathurus 113k), Nearby 0–236k (Ula'tek). The top players' GCD uptime is 73–80% (the Energy floor in dps-analysis.md), and the spell survey shows no missing press before their gaps. |
| rogue-shared/EnergyCapTracker/regen-lost-at-cap | unverifiable | — | Vigor | passive regen lost at the cap | Predicted, not logged (core.md, ResourceTracker regen-cap). Merged into the energy row above for the part the log shows. |
| rogue-shared/EnergyDetails/wasted-generator-energy | covered | `primaryResourceCapFindings` | none | energy gains at a full bar | Event-based gains only, kept share below 95 / 90 / 80%. The app's cap check sees the same casts. |
| rogue-shared/ComboPointDetails/wasted-cp | wrong | — | stratagem talents | generators landing at max combo points | See "Candidates left". The combo-point waste of Assassination's builders, valued by the finisher damage it delays. The own tooltip admits some bonus-point waste can't be avoided. Phase 3 (2026-10-17), **proposed `wrong`**: combo points (type 4, cap 7) log on finishers only, so a trial rebuilt them with shared.ts spenderSnapshotWaste. It fires on the top players as much as on the weak: Vashnik top 5–6% of generation (遗伤 2.38M, Kvá 1.60M, Ireath 1.54M), Entombed Sentinels top 1–4% (Auxeus 571k, Loobster 812k), the weaker 1–2% (Nearby qpZx3mWaG7gcDdYB 309k, Hofix 538k), only Antilyr apart (15%, 4.05M). Seal Fate's crit points and the cleave builders (Fan of Knives, Crimson Tempest) make the fit noisy (Sprint fitted at 3.7 points). |
| rogue-assassination/BuilderUse/wasted-builder | wrong | — | none | a builder that gained no points at max | Counts only builders that gained nothing; Garrote and Shiv at the cap are often right. Same measurement as the row above; merge them. Phase 3 (2026-10-17), **proposed `wrong`** with the row above (same measurement, same result). |
| rogue-assassination/FinisherUse/low-cp-finisher | wrong | — | Echoing Reprimand, Deeper Stratagem | Envenom or Rupture below the combo cap | Target is a fixed 5 (ignores the 6th point); the first 30 seconds are excused; Kidney Shot and Slice and Dice are counted by mistake. Value by the finisher's missing combo points. Case study: Envenom 20 bad vs 25 for the 99th percentile, so no difference there. Phase 3 (2026-10-17), **proposed `wrong`**: the cap is 7 here, and the top players finish at 5 points 12–33% of the time (遗伤 11 of 95 Envenoms, Kvá 16 of 82, Auxeus 22 of 66, Lokistar 19 of 63), the weaker 5–28% (Hofix 3 of 56, Nearby 24 of 85). Below 5 almost never (one 4-point Envenom in 46 player-pulls). No signal to value. |
| rogue-assassination/Envenom/spend-cps | wrong | — | Echoing Reprimand | Envenom below 5 combo points | The same measurement as the finisher row (merge). No allowance for the opener or a dump before Vanish. Phase 3 (2026-10-17), **proposed `wrong`** with the row above: Envenoms below 5 points are nearly absent on every player. |
| rogue-shared/FinisherTracker/inefficient-finishers | superseded | — | stratagem talents | finishers under the recommended points | A third copy of the finisher rule (the spec's own version above replaces it). |
| rogue-assassination/Envenom/rupture-time-left | superseded | "Rupture off every enemy" (specs/assassination.ts) | none | Envenom cast while Rupture is nearly gone or absent | Fails under 3 seconds of Rupture left, including none. Needs a Rupture timeline from the log; value by the Rupture time lost. A boss that leaves the target list makes Rupture look absent. Phase 3 (2026-10-17): an Envenom instead of a Rupture costs the time Rupture is off, which the new gap check prices (the bleed's rate less the Rupture's combo points and Energy as Envenom and Mutilate). The gaps are small for everyone: top 0, weaker up to 162k a pull (Antilyr 5:12–5:28). |
| rogue-assassination/RuptureUptimeAndSnapshots/clip-and-downgrade | verified | "Rupture refreshed early" (specs/assassination.ts) | Echoing Reprimand, Deeper Stratagem | Rupture recast with time left | The pandemic rule (core.md) with hard-coded durations (doubtful for 12.0). The snapshot-downgrade branch has no snapshot source registered, so it likely never fires. Value by the duration overwritten, as the FFXIV side does. Phase 3 (2026-10-17), **built**: durations from the log (4s a combo point + 4s; 30% carry-over; a refresh never shortens one). Lost = the time paid for past the carry-over ÷ the duration × the Rupture's combo points as Envenom and Energy as Mutilate, from 0:20. Top 遗伤, Ireath, Kvá, Lokistar, 무법은장식 none, Auxeus 90k (4:14, 10.7s), Loobster 111k; weaker Antilyr 457k (r9CX1kpRGLmKJH4M, a 1-point Rupture at 0:24 over 34.8s), Vro 435k (xN9cWhzbvqTVfrG8, three in 15s from 4:09), Nearby 0–260k (Vashnik Pull 4). |
| rogue-assassination/GarroteUptimeAndSnapshots/clip-and-downgrade | candidate | — | Improved Garrote | Garrote refreshed outside stealth while a stealth Garrote has time left | Duration model flat 18s and a stealth snapshot window of 3s; the Sepsis clause is stale. The app already values the Vanish Garrote, so what's left is the refresh that drops the stronger one. Phase 3 (2026-10-17), **not built**: Garrote is 24s here, not 18s. An ordinary Garrote over an Improved one happens 0–2 times a pull, 0–18s of Improved Garrote, top players included (무법은장식 aZ6NnwL8g9PdpGJ1 17.7s: 2:32, pressed while the boss took ~500-damage ticks). Its price can't be separated from Deathmark: the Vanish Garrote sits in the Deathmark window, so the player's improved vs ordinary rate (48k vs 15k/s) is mostly the window, and a trial priced 무법은장식 at 591k. Ordinary over ordinary: 0–10s a pull for the top players, ~20s at most (Hofix), at ~3k a second. |
| core/DebuffUptime (Rupture, Garrote) | verified | "Rupture off every enemy", "Garrote off every enemy" (specs/assassination.ts) | none | a DoT left off | Neither bleed has an uptime check in the app (`dotUptimeFindings` isn't wired for this spec). WoWAnalyzer shows both as ungraded bars. Needs the bleed status ids from our own logs. Phase 3 (2026-10-17), **built** with its own valuation: a gap counts from the first press after the bleed fell off (not the walk from a dead target), less forced time, movement, the pull's last 10s and the reapplying GCD, at the bleed's per-enemy rate less what the skipped press's resources were worth. Top none but Ireath 20k; weaker Demo 315k (8AFnLQKdrcgawzDC, Garrote 18.1s), Antilyr 223k, Natvg 198k; Nearby 0–164k (10 of 16 pulls none). The shared `dotUptimeFindings` read up to 1.44M and flagged Lokistar 176k in his kill's last 5s, so it isn't used. |
| rogue-assassination/HitCountAoE/fan-of-knives-targets | candidate | — | Blindside | Fan of Knives into one or two targets | Needs two or more targets, three with Blindside. Case study: Fan of Knives on one target 56% vs 51%, similar for both players. Hits come from damage, so immune targets count as misses. No separate app check for it. Phase 3 (2026-10-17), **not built, negligible**: by the player's own hits within 0.6s, Entombed Sentinels always has two enemies, so one-enemy presses are 0–8 a pull on every player (Nearby Vashnik Pull 5: 8). One-enemy Fan of Knives ~12k and a point for 35 Energy against Mutilate's ~19k and two points for 50: ~13k a press. On two enemies it beats Mutilate per Energy (~23k and two points), so the two-target line holds. Nobody takes Blindside. |
| rogue-assassination/CrimsonTempest/spread-check | wrong | — | Crimson Tempest | Crimson Tempest with no enemy carrying both bleeds | Passes whenever any one enemy has both, so on one target it nearly always passes; it does not test that the spread did anything. Treated as a builder, which may be outdated (doubtful). Phase 3 re-check (2026-10-17), **stays `wrong`**: Crimson Tempest is now a 60-Energy builder (its casts log Energy, no combo points; the combo fit gives it 1.5–4.9 points) that applies Garrote to the enemies it hits (Auxeus 0:01.4: Garrote on the second Sentinel with the press). It is pressed on two or more enemies by everyone (one-enemy presses 0–1 a pull). Whether a spread "did anything" is the Garrote it lays, which the press always does. |
| rogue-assassination/CrimsonTempest/combo-points-waste | wrong | — | Crimson Tempest | cast at max combo points | Same measurement as the builder row (merge); doubtful on talent drift. Phase 3 (2026-10-17), **proposed `wrong`** with the combo-point waste rows: same measurement, fires on the top players as much. |
| rogue-assassination/Mutilate/no-mutilate-in-subterfuge | candidate | — | Subterfuge | Mutilate while Subterfuge is active | Reads the buff at the exact cast time with no latency tolerance. Doubtful: Subterfuge may be gone from the tree. Cast-id based, so cheap, but only worth it if the talent exists. Phase 3 (2026-10-17): nothing to measure; no Subterfuge buff in any of the 46 player-pulls. |
| rogue-assassination/Mutilate/no-mutilate-in-vanish | wrong | — | none | Mutilate within 3s of Vanish | The event link is declared from Envenom to Vanish, not from Mutilate, so the check likely never fires. The 2023-12 changelog's Blindside and Shadow Dance Mutilate checks aren't in the file. Phase 3 re-check (2026-10-17), **stays `wrong`**: of ~110 Vanishes on 46 player-pulls, none is followed first by a Mutilate. The first press is Garrote (Improved Garrote) on all but six: Envenom (Lokistar 0:09.7, Misshides ×3, Vro), Rupture (Nearby), Ambush (盗拾六, Vallkillgash). What the rule protects, the empowered Garrote, is how the Vanish drift check values a use. |
| rogue-assassination/Deathmark/kingsbane-alignment | wrong | — | Kingsbane, Deathmark | Deathmark cast more than 2s from a Kingsbane | With a 60-second Kingsbane and a 120-second Deathmark, only every second Kingsbane lines up, so the rule demands Kingsbane be held for Deathmark and contradicts its own use-on-cooldown row. Whether top players pool it isn't measured. Phase 3 re-check (2026-10-17), **stays `wrong`**: every player presses Kingsbane 1.0–2.0s after each Deathmark (Kingsbane on cooldown lines up by itself every other use). Of ~140 Deathmarks only three had none within 2s, each the pull's last (Domirogue 57.9s, Shiddlesz 50s, 遗伤 10.1s), with Kingsbane on its own cadence. The rule fires on nothing a player chooses. |
| rogue-assassination/Deathmark/improved-garrote-and-vanish | covered | `vanishGarroteValue` (tracked-cooldowns.ts, Vanish) | Improved Garrote, Deathmark | Deathmark without Improved Garrote while Vanish was ready | The app values a Vanish by the Garrote it empowers, which is the same thing seen from the Vanish side. The Deathmark pairing itself isn't checked. Rank combiner hides the "ok" outcome. Phase 3 (2026-10-17): the pairing is where a Vanish's worth comes from (Vanish Garrote ÷ ordinary 2.6× median, ~1.0–1.3× for a Vanish outside Deathmark), so the drift check's per-player value already carries it. |
| rogue-assassination/Kingsbane/valid-target | no-damage | — | Kingsbane | — | Fails a Kingsbane with no resolved enemy; a parser-level check. Hidden behind a default-off session toggle. |
| rogue-assassination/Kingsbane/deathmark-window | wrong | — | Deathmark, Kingsbane | Kingsbane cast while Deathmark is ready | Contradicts the cooldown rules, uses a buff test at the wrong time, and sits behind the experimental toggle. The comments record a sequence from a player that isn't implemented. Phase 3 re-check (2026-10-17), **stays `wrong`**: Deathmark is pressed 1.0–2.0s before a Kingsbane on every Deathmark but the three above, so a Kingsbane with Deathmark ready doesn't happen outside the pull's end. |
| rogue-assassination/Kingsbane/shiv-after | unverifiable | — | Shiv, Kingsbane | no Shiv within 2s after Kingsbane | The code's own warning says the timing is inaccurate (the real rule ties the Shiv to the first Kingsbane application expiring). Toggle-hidden. The envenom-uptime-in-window check is a stub. Phase 3 (2026-10-17), stays `unverifiable`: Shiv is pressed on 27 of 46 player-pulls, and three of the six top players (Kvá, Lokistar, 무법은장식) press none at all, so it isn't tied to Kingsbane in practice; its effect isn't in the log to time against. |
| rogue-shared/InstantPoison/proc-rate | no-damage | — | none | — | Poison hits over melee hits, below 20 / 15 / 10%. A luck measure. |
| rogue-assassination/statistics | no-damage | — | — | — | Display only: DoT uptimes and snapshot share, Envenom and bleed uptime bars, per-cast colour breakdowns, builder and spender donuts, energy and combo graphs, damage inside Deathmark windows, Echoing Reprimand and Deeper Daggers figures. |
| rogue-shared/utility | no-damage | — | — | — | Crimson Vial, Evasion, Feint, Cloak of Shadows, Shroud of Concealment, Blind, Kidney Shot, Sprint, Shadow Step, Thistle Tea, Kick, Tricks of the Trade, Grappling Hook. Cooldowns declared for tracking only. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the combo point and energy
trackers (cap 5 plus the stratagem ranks, energy cap and regen scaled by
Vigor, Shadow Focus cost reduction), Garrote, Rupture and Crimson Tempest
duration models, the Improved Garrote snapshot definition, the stealth
helpers and stealth damage tracker, the event links (cast to debuff and
damage, Deathmark to Kingsbane, Deathmark to Improved Garrote, Shiv to
Kingsbane, Thistle Tea to its energy gain), the Blindside event reorder,
the Kingsbane toggle. The Shiv cooldown reduction from Toxic Stiletto is
only a code comment; the spec models no cooldown reduction or reset.

## Candidates left

Phase 3 (2026-10-17) worked this list: item 1 built as "Rupture off
every enemy", "Garrote off every enemy" and "Rupture refreshed early"
(the Improved Garrote downgrade part not built); item 2 proposed `wrong`
(fires on the top players as much); item 3 superseded by the gap check;
item 4 not built (~13k a press); item 5 has nothing to measure (nobody
takes Subterfuge). The phase-2 text follows.

Ordered by expected value, which is low for all of them: the case study
found Envenom, Rupture, Garrote, Fan of Knives, Deathmark and Kingsbane
similar for the reference and the weaker player, and the app's floor
(GCD gaps, Kingsbane window, Vanish) already reproduces the visible
gap between them.

1. **Rupture and Garrote clip and uptime** (merging the three DoT rows):
   value the bleed time overwritten past the pandemic carry-over, and the
   bleed time missing from first application, from the player's own
   applications and ticks, less forced time. Separating a mistake from
   what top players do: compare against the top player's clip total per
   minute on the same boss; Garrote refreshes dropping a stealth
   snapshot are the one part that is real damage. Most likely to survive
   phase 3.
2. **Combo-point waste and low-point finishers** (merging the builder,
   combo point and finisher rows): value each wasted point as a share of
   a finisher's damage. The case study's Envenom count was similar
   (20 vs 25 bad), and WoWAnalyzer's fixed 5 ignores real exceptions, so
   expect it to fail the premise check.
3. **Envenom with Rupture nearly gone**: needs a Rupture timeline; value
   by the Rupture time lost. Overlaps item 1.
4. **Fan of Knives into few targets**: needs the target count at each
   cast; the case study measured 56% vs 51% one-target, so the top
   player does it as often.
5. **Mutilate in Subterfuge**: only if the talent still exists; cheap but
   small.
