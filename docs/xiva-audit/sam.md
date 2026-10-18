# xivanalysis audit: Samurai

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/sam/` in the clone.
- **Patch:** one branch: `AoeChecker.ts:27` `patch.before('7.4') ? 3 : 2`
  for Guren / Senei. The changelog says 7.2 raised it from 2 to 3, so 7.05-7.1
  logs are likely judged at 3 when they should be 2. Supported 7.05–7.5.
- **App:** `lib/damage/ffxiv/jobs/melee.ts` (header, `SAM_CHECKS`: Fugetsu
  `uptime`, `meikyo`, `samAoe`), `tracked-cooldowns.ts` ("Samurai"), generic checks.
  Verified on dQ8wmb1VhKt6yBXk only; no xivanalysis page compared yet.
- **xivanalysis quirks found** (from the extraction):
  - `data/STATUSES/root/SAM.ts:92-94`: three Tsubame-gaeshi statuses are
    `SHARED.UNKNOWN` (id 0), so their drops, overwrites and checklist
    counts can't work.
  - `OGCDDowntime.ts:14, 22`: Meikyo's 4.36s hold is dead config (charges
    ignore the allowance).
  - `Tincture.ts:8` sets a `buffAction` core never reads.
  - Higanbana clipping tiers (1s Minor, 30s Medium, 60s Major a minute)
    can hardly reach Medium.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| sam/Buffs/fugetsu-fuka-uptime | covered | Fugetsu `uptime` | Fugetsu or Fuka dropping | Checklist 95%. Fugetsu +13% from FFLogs' multiplier; Fuka is haste, seen through the gap check. Not matched against a page. |
| sam/Meikyo/gcd-count | covered | `meikyo` | under 3 Sen GCDs in Meikyo Shisui | Medium 1, Major 2. A missing one is a third of a Midare / Tendo Setsugekka. Against xivanalysis 2026-10-16: its one (7zwpcLxk2Fd1h6Vr 1:42, 2 of 3) is the bosses leaving at ~1:47, its third GCD's Kasha only previewed: forced, not counted here, rightly. None counted on the three pages. |
| sam/Meikyo/bad-gcd | covered | `meikyo` | a starter (Hakaze, Gyofu, Fuko...) under Meikyo | Major 1. It takes a Sen GCD's slot, which `meikyo` values. |
| sam/OGCDDowntime/meikyo | covered | `checkCooldownDrift` (hold 4.36s) | Meikyo at 2 charges | Unreported until 2026-10-16; now its Tendo pair over the plain Midare / Kaeshi pair (the three Sen it gives aren't counted, so low; none without a plain Midare in the pull or below level 100): 17 on disk, 112-377k (7jtwv9aVpJmDbCXk, LmwgxA7B4d1NzqWH 2 uses). Matched 2026-10-16 on 7jtwv9aVpJmDbCXk fight 6 (Rogue Region): 10 / 12 = 2 lost (154k each; the app counts 9 casts, the opener's before the pull), and VhyrDATFKNGt8f6M's 11 / 12 = 1. |
| sam/OGCDDowntime/guren-senei | covered | `checkCooldownDrift` | Guren / Senei held | — |
| sam/OGCDDowntime/ikishoten | covered | `checkCooldownDrift` | Ikishoten held | — |
| sam/Higanbana/uptime | covered | `higanbana` (dotFindings, against Gekko) | Higanbana off the target | Built 2026-10-15: uptime on any enemy, forced time excused, refreshes valued against Gekko (a one-Sen GCD). Fires widely (235 on 58 reports). Checked kNQKG6yHmvZTJ2hf (Genichiro Ashina): off 6:20-7:28 while he hit both bosses throughout (the 7:17 cast left no debuff), 118k. xivanalysis agrees it's low on all three pages (uptime 50%, 57%, 57%: kNQKG6yHmvZTJ2hf fight 1, at2GMBcywChApnfY fight 13, 7zwpcLxk2Fd1h6Vr fight 2); its checklist has no per-gap count to match. |
| sam/Higanbana/clipping | wrong | — | Higanbana refreshed early | Target-blind sum, and the tiers barely reach Medium. |
| sam/Combos/combo-issues | verified | `checkCombos` | a broken or timed-out combo | Generic. **Gap fixed 2026-10-16:** a finisher with no combo but a hit positional logs a bonusPercent too (Kasha 23 = 1 − 160/210; combo'd 56 / 61), which read as "combo landed". The potency table now gives each combo step its no-combo bonus values (`GameAction.comboMissedBonus`; `checkCombos`, `comboLanded`), so 7zwpcLxk2Fd1h6Vr 8:06.8 (Kasha after Gyofu, no Shifu) counts. About 40 more broken combos on disk, Samurai and Dragoon (e.g. Xk2DKZwVp4Ar6d7y Enuo pull 3 2:11.3, a Gekko with no Jinpu after Meikyo ran out; jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 39 0:56.7, Fang and Claw twice); valued at the combo share (56%, was the misread 23%). Against xivanalysis 2026-10-16: Alexia Renzella 3 = 3; Alison Octavious its 3 = 2 here + 1 Meikyo-breaks-combo (not adopted, row below); Genichiro Ashina its 3 are all Meikyo (0 here). Xk2DKZwVp4Ar6d7y Enuo pull 3 (Tsuki Hoshino): its 8 = the app's 7 (5 of them found only since the fix) + 1 Meikyo; Sen 5, Meditation 1, Kenki 5 matched too. |
| sam/Combos/meikyo-cast-breaker | wrong | — | Meikyo pressed with a combo open | Meikyo is pressed mid-combo on purpose; an expired combo still counts in xivanalysis. The app's combo check follows the GCDs, not the Meikyo press. |
| sam/Positionals/gekko-kasha | verified | `checkPositionals` | a missed Gekko / Kasha positional | Generic. Matched xivanalysis 2026-10-16 time for time: Alexia Renzella 10 + 8, Genichiro Ashina 3 + 10, Alison Octavious 8 + 6 against its 8 + 7. Its extra Kasha (1:46.4) never landed (FFLogs previewed it as Deep Blue left; xivanalysis reads the preview). |
| sam/Interrupts/iaijutsu-cancel | verified | `checkInterrupts` | a cancelled Iaijutsu | Its tiers start at 2; the app counts each. Genichiro Ashina 7 = 7 (2026-10-16). |
| sam/ReadyProcs/dropped | verified | `checkProcs` | Ogi Namikiri / Kaeshi / Tendo / Tsubame / Zanshin Ready expiring | Minor 1, Medium 2, Major 3. Three of its statuses are id 0 (bug). Matched 2026-10-16: Alexia Renzella's Tendo (4:27.5) and Genichiro Ashina's Ogi Namikiri Ready (4:44.3), 1 each. Genichiro's Tendo checklist 10 / 11 isn't reported here (not traced). Searched 2026-10-16 (10 lowest Red Hot and Deep Blue Samurai): VhyrDATFKNGt8f6M fight 6 (Heddy Donc) let Ogi Namikiri Ready run out 4 times and never pressed Ogi Namikiri, so it has no average and shows nothing (the never-pressed-consumer gap in open-items). Closed 2026-10-16: fight 6 fetched, Ogi Namikiri Ready declared (→ Ogi Namikiri) and priced at 1.75 × the player's Midare Setsugekka when never pressed (measured on disk): 4 show, 193k each (upper bound: its Kaeshi is lost too, the GCD in its slot isn't subtracted), 2:44 forced. Page: "Use Your Ogis 0 / 10" (Ogi and Kaeshi from 5 Ikishotens); the fifth Ogi Namikiri Ready was still up at the kill. Its Meikyo 11 / 12 = the app's 1 lost (the app counts 10 casts; the opener's is pressed before the pull). Tendo 20 / 22 was missing: Tendo's removals split 5 Tendo Setsugekka / 5 Tendo Goken, under the 60% the consumer inference needs. Declared 2026-10-16 (Tendo → Tendo Setsugekka, Goken accepted; priced against Midare Setsugekka, its Kaeshi's upgrade not counted): the 5:13.1 expiry now shows (63k). 9 on disk, each checked in the log (Tendo out 30s after Meikyo, a plain Midare 1-4s later): P6bRcxfmwqAda3NB 5:23.9, 7:17.4, 9:21.0 (Moira Ideon spent those Meikyos on two Higanbanas), Xk2DKZwVp4Ar6d7y pulls 6 and 10 3:03.9, gNBGDwLzva1JdHXA 4:14.2, pG319BgHTnPJc6Ft pull 10 5:54.4, at2GMBcywChApnfY 4:27.5 (already matched). |
| sam/ReadyProcs/overwritten | wrong | — | Ikishoten with Ogi / Zanshin Ready held | Minor 1, Medium 2, Major 3. Counts one overwrite twice (both statuses). Proposed 2026-10-18, awaiting the user's approval: it can't happen in 7.x. Ogi Namikiri Ready and Zanshin Ready last 30s (logged duration 30000 on every application; longest lifetime on disk 30.6s) and Ikishoten's shortest recast on disk is 119.98s (160 intervals), so nothing it gave is still up at the next press. 0 of 228 Ikishotens on disk, no refreshbuff of either status. |
| sam/ReadyProcs/ogi-checklist | covered | `checkProcs` | Ogi Namikiri or Kaeshi: Namikiri not pressed | Checklist. |
| sam/ReadyProcs/tendo-checklist | covered | `checkProcs` | Tendo or its Kaeshi not pressed | Checklist. |
| sam/ReadyProcs/tsubame-checklist | covered | `checkProcs` | a Tsubame-gaeshi not pressed | Broken in xivanalysis (id-0 statuses). |
| sam/Kenki/overcap | verified | `samGauges` (gauge-overcap; also a timeline lane) | Kenki over 100 | Built 2026-10-15 from casts (combo steps when the combo landed or under Meikyo) plus Meditate ticks, Hagakure and Tengentsu (+10 when hit in its 4s, read from the cast and damage taken: the status isn't in the buff stream; without it 43 of 66 lanes ran negative, now 13 with 1-3 spends each, marked inference). Lost Kenki is her Shinten per 25. 0-65 lost in most pulls. Combos are read from the cast order (the previous combo-chain weaponskill within 30s, Enpi not breaking it) or Meikyo, including a pre-pull Meikyo seen first as a stack removed: the hit's bonus can't be used, as Gekko / Kasha's positional shows there too (7zwpcLxk2Fd1h6Vr 8:07.45, a Kasha after Gyofu at +23%). Matched xivanalysis on at2GMBcywChApnfY fight 13 (80) and 7zwpcLxk2Fd1h6Vr fight 2 (65); kNQKG6yHmvZTJ2hf fight 1 reads 40 against its 30 (that lane has 2 spends the simulation had no Kenki for: one 10-Kenki event read differently). |
| sam/Shoha/meditation-checklist | superseded | — | — | Checklist form of the overcap. |
| sam/Shoha/meditation-overcap | verified | `samGauges` (gauge-overcap; also a timeline lane) | Meditation gained at 3 | Built 2026-10-15: +1 per Iaijutsu / Ogi Namikiri and per 3s of Meditate, Shoha −3; a third of her Shoha each. 35 on disk (20 counted). Matched xivanalysis: 7zwpcLxk2Fd1h6Vr fight 2 4, none on the other two pages. |
| sam/Sen/wasted-sen | verified | `samGauges` (gauge-overcap; also timeline lanes) | a Sen gained while held | Built 2026-10-15: Setsu / Getsu / Ka each one at most, cleared by Iaijutsu and Hagakure; a wasted one is a third of (her Midare − an average GCD). Premise: the FFLogs top 20 waste 3 in all (two near 4:32-4:36); the samples 115, only 6 just before a Meikyo. kNQKG6yHmvZTJ2hf (Genichiro Ashina) 5 Setsu, e.g. Yukikaze 5:07.6 and again 5:11.9. Sen held at a death are lost too (shown, not counted: the death carries it), as xivanalysis counts them. Matched xivanalysis: kNQKG6yHmvZTJ2hf fight 1 7 (5 + 2 at the death), at2GMBcywChApnfY fight 13 3 (2 + 1), 7zwpcLxk2Fd1h6Vr fight 2 none (its 8:07.45 Kasha had no Shifu before it, so no Sen: read from the cast order, see Kenki). |
| sam/AoeChecker/too-few-targets/combo | verified | `samMeikyoAoe` (Oka / Mangetsu under Meikyo) | Fuko, or Oka / Mangetsu under Meikyo, on under 3 | Split from the row below 2026-10-15. Built 2026-10-16 for Meikyo only (Kasha / Gekko's average is the alternative; outside Meikyo a 2-step Fuko combo against a 3-step finisher misprices). Matched xivanalysis on 7zwpcLxk2Fd1h6Vr (Alison Octavious): Oka 3:01.8, 3:51.5, Mangetsu 3:46.9 on Red Hot and Deep Blue, 20-23k each = its 2 + 1; its 3 Kyuten and both Tendo Gokens match too. LmwgxA7B4d1NzqWH's Samurai does it in every Meikyo on two bosses (15). Fuko not built. |
| sam/AoeChecker/too-few-targets | verified | `samAoe` | Tenka / Tendo Goken, their Kaeshi, Kyuten or Guren on too few targets | Built 2026-10-15: Kyuten, Tenka / Tendo Goken and both Kaeshi under 3; Guren on one target only (7.4's breakpoint; pre-7.4 two-target Gurens go unseen). Fires on Xk2DKZwVp4Ar6d7y Enuo pull 2 0:27 (Tendo Goken + Kaeshi, 179k + 154k: the second Meikyo went Gekko, Kasha, Gekko, so 2 Sen where Yukikaze makes 3 in the same GCDs, so the whole Setsugekka difference is lost), pull 4 6:42, pull 5 0:23 (Kyuten); pG319BgHTnPJc6Ft Necron pulls 2, 3, 10; L9BzKkD2nxcVgHTC Necron pull 15 1:13 (Guren, 38k). Matched xivanalysis (2026-10-15): Enuo pull 2 (Tendo Goken 1, Tendo Kaeshi Goken 1) and Necron pull 15 (Guren 1). Fuko, Oka, Mangetsu: the row above. |
| sam/Defensives/use-table | no-damage | — | — | Mitigation. |
| sam/Tincture/window-table | no-damage | — | — | Table only. |

Core modules that can't fire for Samurai: Swiftcast, Lucid, Overheal.
Weaving, AlwaysBeCasting and Death run unconfigured (covered by
`checkGcdGaps`, `checkDeaths`).

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| sam/Buffs/fugetsu-fuka-uptime | modules/Buffs.tsx:27-51 | uptime ÷ (pull − invulnerable): checklist 95% | yes | yes | untargetable not excluded |
| sam/Meikyo/* | modules/Meikyo.tsx:13-106 | 3 Sen GCDs (Medium 1, Major 2); a starter: Major 1 | yes | yes | expectation not clamped |
| sam/OGCDDowntime/* | modules/OGCDDowntime.ts:7-35 | Meikyo (charges), Guren / Senei 13.4s, Ikishoten 2.5s; hold 2.18s; checklist 95% | yes | yes | Meikyo hold is dead config |
| sam/Higanbana/* | modules/Higanbana.tsx:9-58 | uptime checklist 90%; clipping 1s / 30s / 60s a minute | yes | yes | target-blind |
| sam/Combos/* | modules/Combos.ts:14-54 | core tiers; Meikyo with a combo open is a break | yes | yes | expired combos counted |
| sam/Positionals/gekko-kasha | modules/Positionals.ts:3-8 | checklist 95% | yes | yes | — |
| sam/Interrupts/iaijutsu-cancel | modules/Interrupts.tsx:6-10 | core: Medium 2, Major 5 | yes | yes | one cancel shows nothing |
| sam/ReadyProcs/* | modules/ReadyProcs.tsx:13-150 | dropped / overwritten: Minor 1, Medium 2, Major 3; three checklists | yes | yes (3 statuses id 0) | Tsubame broken |
| sam/Kenki/overcap | modules/Kenki/Kenki.tsx:14-72 | Kenki lost: Minor 5, Medium 20, Major 35 | yes | no (inferred, starts at 0) | — |
| sam/Shoha/* | modules/Shoha.tsx:15-133 | Meditation lost: Minor 1, Medium 3, Major 6 | yes | no (inferred) | 0/0 NaN |
| sam/Sen/wasted-sen | modules/Sen.tsx:99-379 | Sen wasted: Minor 1, Medium 2, Major 3 | yes | yes | Hagakure not waste |
| sam/AoeChecker/too-few-targets | modules/AoeChecker.ts:18-92 | AoE pairs; Guren / Senei 3 before 7.4, 2 from: Minor 1, Medium 4, Major 7 | yes | yes | likely wrong before 7.2 |

## Open

In priority order (biggest damage cost first). Three pages compared
2026-10-16 (at2GMBcywChApnfY, 7zwpcLxk2Fd1h6Vr, kNQKG6yHmvZTJ2hf).

1. **sam/ReadyProcs/overwritten** (proposed `wrong` 2026-10-18): 30s
   procs against a 120s Ikishoten; awaiting the user's approval.
2. Fuko on too few targets: built 2026-10-16 (`samFukoAoe`), the chain
   per GCD against the single-target rate with Sen valued. 14 on
   LmwgxA7B4d1NzqWH (Jena Steel), 14-41k each; 1 on 7jtwv9aVpJmDbCXk.
   Matched her page 2026-10-16: Fuko 14 = 14, and the whole AoE table
   (47): Oka 9 and Mangetsu 6 under Meikyo, Kyuten 2, Tenka / Tendo
   Goken and both Kaeshi 4 each.
3. OGCDDowntime: Alison's Guren / Senei 8 / 10 on her page, about 1
   lost here (83.2s held). Traced 2026-10-16: Senei at 0:04, 1:05, 2:06,
   3:22, 4:23, 5:27, 7:25, 8:41, kill 9:32; on time, 10 fit. The app's
   "one more before the kill" counted only the charges in hand at the
   end, never more than one for a one-charge cooldown; it now counts the
   presses that fit (93 drift findings on disk change, most by one use;
   23 drop, where the "unused" charge was in fact pressed inside the
   final 15s, e.g. K6qfMamL7rN8yz2Q Red Hot pull 2 Kevin's Clawed Muse
   at 8:47.2). Alison stays at 1: shifted by her holds, the second extra
   Senei would land at 9:18, 14s before the kill, inside the deliberate
   15s kill margin (KILL_USE_MARGIN_MS). Not adopted past that. (Genichiro's Tendo 10 / 11, traced
   2026-10-16: the 8:49.3 Meikyo's Tendo was removed at 9:07.9 by his
   death, 11s into its 30s; lost to the death, not counted here.)
