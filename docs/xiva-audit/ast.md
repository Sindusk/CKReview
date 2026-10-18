# xivanalysis audit: Astrologian

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** one branch: `AoEUsages.tsx:11` `patch.before('7.2')`, where
  Gravity II needs 3 targets before 7.2 and 2 from 7.2. Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/healer.ts` (header, `AST_CHECKS`:
  `healGcds`, `aoeOnOneTarget`, Combust III `dot`, `divination`, `cards`),
  `gauges.ts` (Arcana lane), `tracked-cooldowns.ts` ("Astrologian":
  Divination, Earthly Star, Macrocosmos), generic checks. Case studies: jN3XDrf2z8PmLgRJ
  Vamp pull 8, 2T1HzdPKgbhM43am, dDar482XvFKBPJYh FRU, qjCMx4bRfgNKwX9T
  (fights 10/16), K6qfMamL7rN8yz2Q (three kills).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| ast/Combust/uptime | verified | Combust III `dot` (`dotFindings`) | Combust III off the target | Matched on qjCMx4bRfgNKwX9T and K6qfMamL7rN8yz2Q (Red Hot 5:02-5:20 gap holds). xivanalysis's 85.6% on fight 16 is overstated: its gaps are boss downtime. |
| ast/Combust/clipping | superseded | Combust III `dot` ("refreshed early", per target) | Combust refreshed early (6s / 9s / 12s a minute) | Target-blind: 11.8s and 17.2s a minute on Dancing Mad were P3's two bosses; per target 2.3s. Rechecked 2026-10-18 on qjCMx4bRfgNKwX9T Pull 4 (FFLogs fight 16, Kaia Oxlong): 7:00.1 Combust on Exdeath, which had none, reads 25.1s clipped from Chaos's; 8:20.4 on Chaos 20.3s against 0.9s on Chaos itself; over the pull 178s target-blind, 86s per target. The real early refreshes are the app's per-target finding (same pull 15:20, 5 in P5, 29.0s, 52k; Pull 3 (fight 9) 8:14, 4 in P3, 13.2s, 24k). Proposed `wrong`; the user chose `superseded` 2026-10-18 (the premise holds, the counting doesn't). |
| ast/Combust/applied-into-invuln | superseded | Combust III `dot` | a Combust shortly before invulnerability | Table only. Every one checked got 5-9 ticks, more than a Fall Malefic. |
| ast/Divination/lightspeed-missing | superseded | `checkGcdGaps` | a Divination window without Lightspeed | Major at 1. What it costs (weaving the burst without Lightspeed) is the GCD gap: K6qfMamL7rN8yz2Q The Tyrant 10:07 5.4s (99k). At qjCMx4bRfgNKwX9T 12:05 every GCD and oGCD fit without it. |
| ast/Divination/expected-gcds | verified | `divination` expectedGcds 8 | under 8 GCDs in Divination | IGNORE in xivanalysis (a table column). It counts heal GCDs too; the app counts damage GCDs and values heals separately. K6qfMamL7rN8yz2Q 8:12 7/8 and 6:36 6/8 matched. |
| ast/Divination/expected-actions | verified | `divination` expected | Lord of Crowns, Oracle or Combust III missing in Divination | IGNORE in xivanalysis (a table column); the app values it. Combust missing from five windows and Oracle at 8:03 matched on fight 16. Lord of Crowns played early at Red Hot 7:45 is caught by the kill-cut rule. |
| ast/Divination/expected-cards | covered | `cards` + buffs.ts | under 2 cards in Divination | IGNORE in xivanalysis. The app values a card never played, not where it was played. |
| ast/Divination/players-buffed | covered | buffs.ts coverage | Divination missing a player | Display only. |
| ast/Divination/raid-buff-overwrite | no-damage | — | two Astrologians' Divinations overlapping | Note column. |
| ast/oGCDs/divination-oracle-uses | verified | `checkCooldownDrift` (Divination) | Divination or Oracle held | Checklist target 100%. Oracle follows Divination in the app, so a missing Oracle is the window's expected action. |
| ast/Draw/total-cards-checklist | candidate | — | fewer Draws than a 65s cadence allows | FRU's 18/20 were draws held across P4's downtime and to align Divination: no damage. Proposed `wrong`; rejected by the user 2026-10-18: a Draw can be lost outright. On disk (2026-10-18) 58 of 62 Astrologian kills meet its count. 9zQqtBRL41XhADxG Red Hot and Deep Blue Pull 1 (O'zinba Ty) falls short only because the Draws followed late Divinations (0:07, 2:08, 4:16, 6:38, 8:44; each had both Draws and every card was played): the drift is Divination's. xydWc2pK74HCbZ8q Red Hot and Deep Blue Pull 1 (Kari Hearthsong, alive throughout) loses cards: last Draw the 5:25 Umbral Draw on a 9:47 kill, its Spear never played, no Astral Draw before the 6:35 or 8:39 Divination (no Balance, no Lord of Crowns in either). The app reports nothing there: Draws aren't in its drift checks and `cards` skips the last Draw (no later one replaced it). What a card is worth, measured on the 62 kills (the recipient's hits under it × bonus ÷ (1 + bonus), melee 6% / ranged 3% for Balance, the reverse for Spear): Balance median 67k in Divination (287 plays, p10-p90 37-90k), 40k outside (33); Spear 66k / 38k; Lord of Crowns 52k / 47k (344 casts, 69 hit two enemies), against a 34k Fall Malefic. All are oGCDs, so nothing replaces a lost one: an Astral Draw lost before a Divination is about 119k, an Umbral Draw about 66k. Kari's loss at those values is about 370k (two Astral sets in Divination, two Spears); at her own weaker plays (Balance 21k, mostly outside Divination; Lord 37-99k; Spear 33-57k) about 200k. Build direction agreed with the user: modelled on Divination, not the recast (an Astral and an Umbral Draw since the previous Divination; a Spear left unplayed at the kill is lost; downtime windows not judged). Needs more firing pulls than Kari's before building. |
| ast/Draw/draw-drift | candidate | — | Draws later than their cooldown | Same: FRU "2 Draws missed" were alignment holds. Proposed `wrong`; rejected by the user 2026-10-18 with the row above, which holds the evidence and the build direction (one check for both). |
| ast/Draw/overwrite-available-card | verified | `cards` | a Draw while The Balance / Lord of Crowns is unplayed | FRU 17:19 → 18:19 matched; K6qfMamL7rN8yz2Q 4 replaced unplayed matched (card log 10/10 draws). The app values the card at what a play of it added to the party. |
| ast/EarthlyStar/missed-uses | verified | `checkCooldownDrift` + `usesLostAtKill` (Earthly Star) | Earthly Star held | The Tyrant: its 1:11 claim was right, and the app was fixed (pre-pull use's recast). Earlier "1 missed" claims were the pre-pull star. |
| ast/EarthlyStar/uncooked-detonation | verified | `earthlyStarEarly` (built 2026-10-16: the user calls an early detonation a mistake worth a finding; each Stellar Burst × (Explosion / Burst − 1), the ratio measured from her base hits, 1.48-1.53 on disk against the 310 / 205 potencies; forced when maturing would run into downtime, past the kill, or she died; 99 on disk, 69 Yoro Shiku's. Against xivanalysis 2026-10-16 on K6qfMamL7rN8yz2Q Red Hot and Deep Blue pull 2 (Yoro Shiku): its "uncooked" suggestion is silent, by a bug: EarthlyStar.tsx counts the pet's Stellar Burst *cast* events, which FFLogs doesn't log here (only its hits and heals). Its overheal table counts Stellar Burst 2, Stellar Explosion 7: the app's 2 (6:39, 7:34), the rest matured.) | Stellar Burst (detonated before it matured) | Lower damage than Stellar Explosion. The app values Earthly Star from its hits, so an early burst lowers the measured value but isn't flagged. Premise check: a heal emergency may justify it. Rare. Checked 2026-10-16 on 410 Astrologian pulls: not rare. 97 detonations came before the star matured (124 Stellar Burst hits, median 20k against 34k for a Stellar Explosion), most by the user's static's Astrologian. They line up with raidwide damage no more often than matured ones (54% vs 52% with 6+ players hit in the 4s before), and many repeat at the same moment across pulls (Red Hot and Deep Blue 5:19, Lindwurm II about 1:05), which looks planned. Not built: waiting on the user (is an early detonation in the static's plan?). Earthly Star is a pet, so its heals aren't in the player's healing stream to judge need. |
| ast/Macrocosmos/underuse | verified | `checkCooldownDrift` (Macrocosmos, `macrocosmosValue` in tracked-cooldowns.ts) | Macrocosmos used under its maximum | `no-damage` rejected by the user 2026-10-18 (it's an AoE). Built 2026-10-18 after measuring 658 casts on 416 Astrologian pulls: on one enemy its base hit is 1.003× the player's Fall Malefic (551 casts, p10-p90 0.96-1.04), so holding it there costs nothing; on two enemies 1.58× (44 casts, Gravity II 1.54× on the same two); no cast on disk hit three. A lost use is priced from the player's own casts in the pull (gain over the better of Fall Malefic and Gravity II on its target count, one-target casts gaining nothing, averaged over every cast), so single-target fights never fire. Sweep: 19 findings, all on Red Hot and Deep Blue and Dancing Mad (two bosses), 5-44k (fJxTNgwtRKjYbvZp Passel Teale, 1 use in a Red Hot kill: 2 lost, 32k). The user's static's (3 uses at ~0:25 / 3:30 / 6:35 on Red Hot) lose 5-7k under the kill rule. xivanalysis's maximum adds invulnerable time (`duration - - invuln`, a sign bug); the app uses its own room count. Against xivanalysis 2026-10-18: fJxTNgwtRKjYbvZp fight 7 (Passel Teale) "only 1 cast of Macrocosmos", Medium, against the app's 2 lost (32k). bVDR2mTL7YGvMxK1 fight 7 (Yoro Shiku, 3 casts): no suggestion (3 of its 4 is under its Minor tier, 50%), while the app counts the 1 lost under the kill rule (6k). |
| ast/Helios/no-horoscope | no-damage | — | Helios / Aspected Helios with Horoscope or Neutral Sect available | Healing plan. It doesn't track Helios Conjunction, so it can't fire at level 100. |
| ast/Synastry/non-synastry-heals | no-damage | — | Benefic / Benefic II with Synastry ready | Healing efficiency. |
| ast/Overheal/overall | superseded | `healGcds` | overheal over 35% | The app values each heal GCD by what it did (healed, absorbed, overhealed), at the healer's filler. |
| ast/Tincture/expected-actions | superseded | tincture.ts | Divination, Lord of Crowns, Oracle or Earthly Star missing under the tincture | The app asks where the same number of tinctures would have covered the most. Red Hot's "8s after Divination" matched. |
| ast/AoEUsages/gravity-ii | verified | `aoeOnOneTarget` | Gravity II on too few targets | 2T1HzdPKgbhM43am, qjCMx4bRfgNKwX9T and K6qfMamL7rN8yz2Q (2) matched. **Patch gap:** before 7.2 xivanalysis needs 3 targets; the app flags only one-target hits, so a 2-target Gravity II on a pre-7.2 log isn't seen. |
| ast/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Uptime matched on five kills (e.g. 94.7% / 95.1%). |
| ast/Weaving | verified | `checkGcdGaps` | too many weaves | 9, 10 and 14 weaving issues matched by time on K6qfMamL7rN8yz2Q. |
| ast/Interrupts | verified | `checkInterrupts` | a cancelled cast | 10, 40 and 7 matched. Some were the boss going untargetable (forced). |
| ast/LucidDreaming/held | no-damage | — | Lucid Dreaming held | MP. |
| ast/Death/died | covered | `checkDeaths` | a death | Generic. |

Core modules that can't fire for Astrologian: Combos, Positionals, Procs
(no proc list), Disengage, Swiftcast (registered for display only).

**Display only, no rule:** the timeline and status-timeline rows, Arcana
tracking and the Arcana Logs table (the app draws its own Arcana lane),
Defensives, Dropped Defensives (Arrow / Spire / Bole / Ewer, mitigation),
Utilities (Lightspeed, Swiftcast, Lucid).

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| ast/Combust/uptime | ast/modules/Combust.tsx:23-41; core DoTs.tsx:136-158 | checklist 95%, averaged over every target | yes | yes | adds dilute it; untargetable not excluded |
| ast/Combust/clipping | Combust.tsx:9-15, 43-57; core DoTs.tsx:92-128, 162-181 | ms clipped per minute summed over targets: Minor 6s, Medium 9s, Major 12s | yes (in principle) | yes | two bosses double it |
| ast/Combust/applied-into-invuln | core DoTs.tsx:183-236 | table only | indirect | yes | — |
| ast/Divination/lightspeed-missing | ast/modules/evaluators/LightspeedEvaluator.tsx:14-51 | no Lightspeed apply / remove inside a Divination window; Major at 1 | indirect | yes | a Lightspeed started >15s before fails |
| ast/Divination/expected-gcds | ast/modules/Divination.tsx:23, 84-92 | min(8, ⌈(len − 250ms) ÷ GCD⌉); IGNORE | yes | yes | counts heal GCDs |
| ast/Divination/expected-cards | evaluators/ExpectedCardsEvaluator.tsx:6-40 | 2 card statuses active or applied in the window; display only | yes | yes | counts applies, not plays |
| ast/Divination/expected-actions | Divination.tsx:98-117 | Lord of Crowns, Oracle, Combust III once each; IGNORE | yes | yes | no allowance for an undrawn Lord |
| ast/oGCDs/divination-oracle-uses | ast/modules/oGCDs.tsx:7-42 | Divination and Oracle (recast set to 120s), hold 2.5s, no offsets; checklist 100% | yes | yes | no end-of-pull allowance |
| ast/Draw/total-cards-checklist | ast/modules/Draw.tsx:16-18, 83-113, 135-177 | 1 + Draws vs 1 + ⌈(pull − 15s) ÷ 65s⌉; checklist 95% | yes | yes | no downtime adjustment (a TODO) |
| ast/Draw/draw-drift | Draw.tsx:20-28, 83-95, 179-209 | ⌊drift ÷ 65s⌋ missed: Medium 1, Major 2; no Draws at all: Major | yes | yes | — |
| ast/Draw/overwrite-available-card | Draw.tsx:25-27, 43-49, 96-133, 214-224 | Draw while Play I or Lord of Crowns is held; Major at 1 | yes | yes | a pre-pull Draw can count |
| ast/EarthlyStar/uncooked-detonation | ast/modules/EarthlyStar.tsx:15-24, 84-110 | Stellar Burst pet actions: Medium 1, Major 2 | yes | yes | emergency heals penalised |
| ast/EarthlyStar/missed-uses | EarthlyStar.tsx:54-82, 112-132 | ⌊held ÷ 60s⌋: Medium 1, Major 2 | yes | yes | counts from 0:00 past a pre-pull star |
| ast/Macrocosmos/underuse | ast/modules/Macrocosmos.tsx:11-15, 39-74 | 1 − uses ÷ max (max = ⌈(pull + invuln) ÷ 180s⌉): Minor 0.5, Medium 0.75, Major 0.9; none: Major | indirect | yes | sign bug |
| ast/Helios/no-horoscope | ast/modules/Helios.tsx:16-80 | Helios with Horoscope / Neutral Sect off cooldown: Minor 1, Medium 5 | no | yes | Helios Conjunction untracked |
| ast/Synastry/non-synastry-heals | ast/modules/Synastry.tsx:12-68 | Benefic / Benefic II with Synastry ready: Minor 1, Medium 10 | no | yes | — |
| ast/Overheal/overall | ast/modules/Overheal.tsx:10-140 | checklist 65% useful healing | no | yes | — |
| ast/Tincture/expected-actions | ast/modules/Tincture.tsx:7-51 | Divination, Lord of Crowns, Oracle, Earthly Star in the window: Minor 1, Medium 2, Major 3 | yes | yes | no end-of-pull allowance |
| ast/AoEUsages/gravity-ii | ast/modules/AoEUsages.tsx:5-25 | Gravity II under 3 targets (before 7.2) / 2 (7.2+): Minor 1, Medium 4, Major 7 | yes | yes | — |
| ast/LucidDreaming, AlwaysBeCasting, Weaving, Interrupts, Death | core | core rules | — | yes | — |

## Open

In priority order (biggest damage cost first):

1. **ast/AoEUsages/gravity-ii, pre-7.2 minimum.** Built 2026-10-16:
   before 7.2 two-target Gravity IIs are judged too (`minTargets` 3 by
   patch) and the damage against Fall Malefic decides. From 7.2 two
   targets came out level with Fall Malefic on disk (0-1k either way on
   14 casts), so they stay unjudged there. Untested: no 7.0/7.1
   Astrologian on disk ever cast Gravity II, and the one fetched for it
   (twTbAknqQgPBxaXF, Brute Bomber 7.1, Clover Puripuri) hit one target
   (1:14.4 and 1:17.9, caught as one-target).
2. **ast/Divination/expected-cards** (covered). The app values unplayed
   cards, not cards played outside Divination. Checked 2026-10-16 on
   every Astrologian on disk: 53 of 1,098 The Balance plays started
   outside Divination (added ~34k each against ~61k inside, from the
   target's hits under it × 6/106). Most aren't misplays: 3-5s before
   Divination (still covering the burst: 9zQqtBRL41XhADxG,
   fJxTNgwtRKjYbvZp, JZ1KXhDbqkNH3jxR), or late in a wipe with no
   Divination left (Yoro Shiku's Lindwurm and Tyrant wipes). The few
   others had the next Divination 47-68s away, past the next Draw
   (L9BzKkD2nxcVgHTC Necron pull 15 1:29, jN3XDrf2z8PmLgRJ Vamp pull 6
   7:12, 9zQqtBRL41XhADxG 7:50). Not built: rare, and the hold that would
   fix it isn't clearly available.
