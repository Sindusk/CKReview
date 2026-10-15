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
| sam/Meikyo/gcd-count | covered | `meikyo` | under 3 Sen GCDs in Meikyo Shisui | Medium 1, Major 2. A missing one is a third of a Midare / Tendo Setsugekka. |
| sam/Meikyo/bad-gcd | covered | `meikyo` | a starter (Hakaze, Gyofu, Fuko...) under Meikyo | Major 1. It takes a Sen GCD's slot, which `meikyo` values. |
| sam/OGCDDowntime/meikyo | covered | `checkCooldownDrift` (hold 4.36s) | Meikyo at 2 charges | — |
| sam/OGCDDowntime/guren-senei | covered | `checkCooldownDrift` | Guren / Senei held | — |
| sam/OGCDDowntime/ikishoten | covered | `checkCooldownDrift` | Ikishoten held | — |
| sam/Higanbana/uptime | candidate | — | Higanbana off the target | Checklist 90%. The app has no Samurai DoT check; `dotFindings` against a Gekko / Kasha filler would value it. |
| sam/Higanbana/clipping | wrong | — | Higanbana refreshed early | Target-blind sum, and the tiers barely reach Medium. |
| sam/Combos/combo-issues | covered | `checkCombos` | a broken or timed-out combo | Generic. |
| sam/Combos/meikyo-cast-breaker | wrong | — | Meikyo pressed with a combo open | Meikyo is pressed mid-combo on purpose; an expired combo still counts in xivanalysis. The app's combo check follows the GCDs, not the Meikyo press. |
| sam/Positionals/gekko-kasha | covered | `checkPositionals` | a missed Gekko / Kasha positional | Generic. |
| sam/Interrupts/iaijutsu-cancel | covered | `checkInterrupts` | a cancelled Iaijutsu | Its tiers start at 2; the app counts each. |
| sam/ReadyProcs/dropped | covered | `checkProcs` | Ogi Namikiri / Kaeshi / Tendo / Tsubame / Zanshin Ready expiring | Minor 1, Medium 2, Major 3. Three of its statuses are id 0 (bug). Not seen firing. |
| sam/ReadyProcs/overwritten | candidate | — | Ikishoten with Ogi / Zanshin Ready held | Minor 1, Medium 2, Major 3. Counts one overwrite twice (both statuses). |
| sam/ReadyProcs/ogi-checklist | covered | `checkProcs` | Ogi Namikiri or Kaeshi: Namikiri not pressed | Checklist. |
| sam/ReadyProcs/tendo-checklist | covered | `checkProcs` | Tendo or its Kaeshi not pressed | Checklist. |
| sam/ReadyProcs/tsubame-checklist | covered | `checkProcs` | a Tsubame-gaeshi not pressed | Broken in xivanalysis (id-0 statuses). |
| sam/Kenki/overcap | candidate | — | Kenki over 100 | Minor 5, Medium 20, Major 35. Built from casts and combos; Kenki is spent on Shinten (a damage oGCD). |
| sam/Shoha/meditation-checklist | superseded | — | — | Checklist form of the overcap. |
| sam/Shoha/meditation-overcap | candidate | — | Meditation gained at 3 | Minor 1, Medium 3, Major 6. A lost third of a Shoha each. |
| sam/Sen/wasted-sen | candidate | — | a Sen gained while held | Minor 1, Medium 2, Major 3. A wasted GCD's Sen; log-visible from casts. |
| sam/AoeChecker/too-few-targets/combo | candidate | — | Fuko, or Oka / Mangetsu under Meikyo, on under 3 | Split from the row below 2026-10-15. None seen on too few targets on disk. |
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

In priority order (biggest damage cost first). No Samurai page compared
yet; the covered rows need one.

1. **sam/Higanbana/uptime** (candidate). A dot check like the healers'.
2. **sam/Sen/wasted-sen, sam/Kenki/overcap, sam/Shoha/meditation-overcap**
   (candidates). Resource waste, log-inferred.
3. **sam/ReadyProcs/overwritten** (candidate).
4. **sam/AoeChecker/too-few-targets/combo** (candidate).
   Oka / Mangetsu need the Meikyo condition; wait for a pull with one.
5. Every covered row: compare against a Samurai xivanalysis page.
