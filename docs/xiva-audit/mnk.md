# xivanalysis audit: Monk

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/mnk/` in the clone.
- **Patch:** no patch branches; supported 7.01–7.5. 7.2 changed
  Enlightenment's target count (hard-coded at 3 now) and added a 10-GCD
  Brotherhood target; 7.4 changed Chakra gauge events.
- **App:** `lib/damage/ffxiv/jobs/melee.ts` (`MNK_CHECKS`: `riddleOfFire`
  with `blitzesExpected`, `mnkAoe`, `mnkBlitz`), `tracked-cooldowns.ts` ("Monk"),
  generic checks. The only Monk case study is qjCMx4bRfgNKwX9T fight 16;
  L9BzKkD2nxcVgHTC Necron and kC7Y3WbzvKcZrBxT The Tyrant also have one.
- **xivanalysis bugs found** (source-confirmed):
  - `RiddleOfFire.tsx:24-28, 104` and `Brotherhood.tsx:15, 65`: the GCD
    tiers are written for a GCD count (10 Minor, 9 Medium, 6 Major) but
    receive the number *missed*, so 1-5 missed Riddle of Fire GCDs show
    nothing and 6-8 show Major (Brotherhood: 1-4 nothing, 5-7 Major).
  - From the extraction: `Forms.tsx` evaluates form drops inside a hook
    that the form's own removal unregisters, so dropped forms may never
    count; `BrotherhoodEvaluator.tsx:56-59` swaps the early / late note
    ids; Bookending divides 0 by 0 when Formless Fist never comes up.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| mnk/RiddleOfFire/gcd-count | verified | `riddleOfFire` expectedGcds 11 | Riddle of Fire under 11 GCDs | Fight 16's 3 short windows (3:02, 6:02, 7:03) matched; all forced. xivanalysis's own tiers hide 1-5 missed (bug). |
| mnk/RiddleOfFire/blitz-count | verified | `riddleOfFire` Blitzes (`blitzesExpected`) | a Blitz missing from Riddle of Fire | Minor 1, Medium 3, Major 6. Built from fight 16: the opener's Elixir Burst at 0:24, 1.2s after the window (27k). |
| mnk/RiddleOfFire/wasted-gcds | superseded | `mnkBlitz` (Form Shift in uptime) | Form Shift / Meditation GCDs inside Riddle of Fire | Form Shift is judged anywhere in uptime (skipped-form-shift); the Riddle of Fire window's own GCD count carries the burst cost. Meditation not judged (2026-10-15): the top parse YPhxRTb9Ld7BJaXp Meditates at 2:06, 3:23, 3:30, 7:15 with the bosses up and no known movement window, most likely out of reach, which the log can't show. |
| mnk/RiddleOfFire/riddle-of-wind-column | no-damage | — | — | Display only. |
| mnk/Brotherhood/gcd-count | superseded | `riddleOfFire` | Brotherhood under 10 GCDs | Brotherhood sits inside Riddle of Fire, which the app judges. Tiers inverted (bug). |
| mnk/Brotherhood/drift | wrong | — | Brotherhood pressed early or late against Riddle of Fire | Minor. Not adopted (2026-10-15): 305 of 337 Brotherhoods on disk are within 3s of Riddle of Fire. Off it, only the Monk's own 5% misses the 15% window (~3k at 10s apart); 14 of the 32 outliers sit on the party's raid buffs, which matter more (its party value is what moves). |
| mnk/Brotherhood/missed-window | wrong | — | Brotherhood with no Riddle of Fire window | Medium 1, Major 2. Same reason: ~6k at most. |
| mnk/Brotherhood/players-buffed | covered | buffs.ts coverage | Brotherhood missing a player | Display only in xivanalysis. |
| mnk/Brotherhood/raid-buff-overwrite | no-damage | — | — | Note column. |
| mnk/CooldownDowntime/brotherhood | verified | `checkCooldownDrift` | Brotherhood held | Hold 2.425s per use in xivanalysis (its comment says 4.85s). Fight 16 matched. |
| mnk/CooldownDowntime/perfect-balance | verified | `checkCooldownDrift` (charges) | Perfect Balance at 2 charges | Unreported until 2026-10-16 (no damage of its own); now a Blitz − a form GCD a use, as `mnkBlitz` prices one: 36 on disk, 33-118k (Solarus Thalan's Zelenia kills, Apollo Avrani's Enuo). Matched 2026-10-16 on Xk2DKZwVp4Ar6d7y fight 11 (Apollo Avrani): 14 / 15 = 1 lost (70k: 116k Blitz − 46k form GCD). |
| mnk/CooldownDowntime/riddle-of-fire | verified | `checkCooldownDrift` (`selfBuffValue`, +15%) | Riddle of Fire held | Never reported before 2026-10-16 (no damage of its own). Matched 7HVZra4GNRxfpKzT (Fluffy Nline): 9/10 = 1 lost (153k). |
| mnk/CooldownDowntime/riddle-of-wind | verified | `checkCooldownDrift` | Riddle of Wind held | Fight 16 12/13 not adopted: 66s held in all, under one 90s recharge. |
| mnk/AoE/shadow-of-the-destroyer | covered | `mnkAoe` (vs the opo-opo form's three GCDs, minimum 4) | Shadow of the Destroyer on under 4 targets | Built 2026-10-15. Fires on djChYqt4b7K8aAfP Red Hot and Deep Blue 0:33 (only Red Hot up, 36k). On 3 adds (L9BzKkD2nxcVgHTC Necron pull 20 3:43, 3:50) it out-damaged the form's average and passes; xivanalysis counts both (minimum 4). Not adopted: three targets weren't a loss in the log. |
| mnk/AoE/four-point-fury | verified | `mnkAoe` (vs True Strike / Twin Snakes / Rising Raptor, minimum 4) | Four-point Fury on under 4 | Fires on L9BzKkD2nxcVgHTC Necron pull 6 3:51 (two adds, 20k) and pull 20 3:52, 3:58 (three, 10-12k: near even at 3, so only those under the average show). Matched xivanalysis on Necron pull 20 (2 of its 2). |
| mnk/AoE/rockbreaker | verified | `mnkAoe` (vs Demolish / Snap Punch / Pouncing Coeurl, minimum 4) | Rockbreaker on under 4 | Fires on L9BzKkD2nxcVgHTC Necron pull 20 3:48 (three, 3k) and 4:00 (two, 14k); matched xivanalysis there (2 of its 2). |
| mnk/AoE/enlightenment | verified | `mnkAoe` (vs The Forbidden Chakra, minimum 3) | Enlightenment on under 3 | Fires on kC7Y3WbzvKcZrBxT The Tyrant pull 1 6:29 (the boss alone). Matched xivanalysis there (FFLogs fight 2): 1 of 1. The damage comparison makes the pre-7.2 minimum moot. |
| mnk/Positionals/missed | verified | `checkPositionals` | a missed rear / flank | Fight 16 7 matched. |
| mnk/Replies/dropped-fires-reply | covered | `checkProcs` | Fire's Rumination expiring | Major at 1. Not seen firing. |
| mnk/Replies/dropped-winds-reply | covered | `checkProcs` | Wind's Rumination expiring | Medium 1, Major 2. Not seen firing. |
| mnk/Revolution/celestial-revolution | verified | `mnkBlitz` | Celestial Revolution (a wrong Blitz) | Built 2026-10-15: Rising Phoenix less what it dealt, buff-neutral. Found by searching the 122 lowest Red Hot and Deep Blue Monk parses against the top 100. Even a top parse did one (YPhxRTb9Ld7BJaXp 7:48: Dragon Kick, Leaping Opo, Twin Snakes; 72k). Fires on Q18Xc93x4wpfMFdT 3:29, 8:34, bWDLM6zVXkqFAfjT ×4, bqmRpGxDvfT8AZc6 7:41, 8:29, and the user's statics (rgTafHJ9MN47m3Vy, pnLBzfbH8NjGAJRg, wNHvD38WTbFtGJKr): 13-122k. Matched xivanalysis on all four searched pulls with one (2026-10-15): Q18Xc93x4wpfMFdT 2, bqmRpGxDvfT8AZc6 2, bWDLM6zVXkqFAfjT 4, YPhxRTb9Ld7BJaXp 1. |
| mnk/Balls/fury-overcap | verified | `mnkFury` (gauge-overcap; also three timeline lanes) | Opo / Raptor / Coeurl Fury gained at the cap | Built 2026-10-15 as Balls.tsx's simulation (Dragon Kick grants Opo-opo's Fury only in Opo-opo form, Formless Fist or Perfect Balance). A lost Fury is its potency share of her average spender (Leaping Opo 200/460, Rising Raptor 150/480, Pouncing Coeurl 100/440). 32 on disk: 20 bWDLM6zVXkqFAfjT (Quinbeck Solis), 4 Brk8fQGnhJaxFKvb (Akira Maris; 0:29.2 and 0:36.3 Twin Snakes with no Rising Raptor between), 4 rFQT8XZckzvH1LNx, 1 each for four others including the top parse YPhxRTb9Ld7BJaXp (a Demolish with one Coeurl's Fury held, 5:11.7). Matched xivanalysis (2026-10-15): bWDLM6zVXkqFAfjT fight 1 20 of 20, Brk8fQGnhJaxFKvb fight 12 4 of 4, rgTafHJ9MN47m3Vy fight 8 none. |
| mnk/Chakra/overcap | unverifiable | — | Chakra over 5 (10 under Meditative Brotherhood) | Minor 1, Medium 5, Major 8. Read only from gauge events, which only the log's recorder has; party Chakra gain is random. |
| mnk/Forms/formless-combo-starter | covered | `mnkBlitz` | an Opo-opo skill with no form up | Built 2026-10-15. Measured on five reports: Leaping Opo in Opo-opo form always crits and carries the Fury (base 33k against 21k with no form); a formless Dragon Kick grants no Fury. So Dragon Kick is worth 200/460 of her average Leaping Opo, Leaping Opo / Bootshine her average less this one at average crit. Exempt: the opener (a pre-pull Form Shift can fall before the log; every Monk on disk opens with a formless Dragon Kick) and the GCD after Perfect Balance ends (standard, YPhxRTb9Ld7BJaXp 5:21.8; xivanalysis's perfectlyFresh). A death that took the form: shown, not counted. Fires once on disk: rgTafHJ9MN47m3Vy Doomtrain pull 8 4:03.7 (Coeurl Form ran out in the downtime, 27k). xivanalysis drops its cast hook when a form ends, so it can hardly fire there: its rgTafHJ9MN47m3Vy fight 8 page is silent on the 4:03.7 Dragon Kick (its sequence is in the log: Coeurl Form removed 4:03.55, no form at the cast). Covered, with no xivanalysis count to match. |
| mnk/Forms/reset-by-opo | verified | `mnkBlitz` | an Opo-opo skill in Raptor / Coeurl form | Built 2026-10-15 from the form buffs (Perfect Balance and Formless Fist excused): that form's average GCD less what the Opo-opo skill dealt, buff-neutral. None in the top parse; most competent Monks on disk 0-2. Matched xivanalysis: Q18Xc93x4wpfMFdT 1 of 1, bqmRpGxDvfT8AZc6 4 of 5, bWDLM6zVXkqFAfjT 47 of 49 (the rest dealt at least the form's average). Fires on the user's static at 6-17k each (rgTafHJ9MN47m3Vy, pnLBzfbH8NjGAJRg, wNHvD38WTbFtGJKr). |
| mnk/Forms/skipped-form-shift | covered | `mnkBlitz` | Form Shift used while a form was up, outside downtime | Any Form Shift in uptime: its form GCD average. In forced time it's free, and in a fight context's movement window it's shown, not counted (a Monk has no ranged GCD; like a disengage). The movement windows excuse most mid-skill Red Hot and Deep Blue Form Shifts (Hot Aerial, Alley-Oop Inferno, Insane Air). Still counted: at2GMBcywChApnfY 9:07; kNQKG6yHmvZTJ2hf 6:59, 7:01 (1-3s before the Alley-Oop window: early, or the window's edge). Against xivanalysis: it has no downtime or reach exception, so its "2 forms skipped by Form Shift" on bqmRpGxDvfT8AZc6 are both in movement windows here (not counted), and its Form Shift-in-Perfect-Balance counts (bqmRpGxDvfT8AZc6 1, kNQKG6yHmvZTJ2hf 3, YPhxRTb9Ld7BJaXp 1) are movement or downtime except kNQKG6yHmvZTJ2hf's first two. |
| mnk/Forms/dropped-form | superseded | `mnkBlitz` (no form) | a form left to expire (30s) | A dropped form costs only through the formless GCD after it, which the formless-starter finding values. L9BzKkD2nxcVgHTC Necron pulls 5, 6, 14 lose Opo-opo form 0.2s after gaining it (a mechanic strips it) with downtime after: not judged. |
| mnk/Bookending/formless-on-opo | unverifiable | — | Formless Fist spent on a non-Opo-opo skill | Checklist. Its cost depends on the Blitz planned; not measurable from one press (fight 16: "PB after Opo-opo 22/29" not built). |
| mnk/Bookending/pb-fr-after-opo | unverifiable | — | Perfect Balance / Fire's Reply not after an Opo-opo GCD | Same. |
| mnk/Bookending/formless-overwrite | unverifiable | — | a Formless applier while Formless Fist is up | Minor 1, Medium 3. Holds in 24 pulls on disk (2026-10-15), many in Red Hot and Deep Blue's 2:42-2:59 downtime (Form Shift there is free). Not adopted: the lost Formless costs only an Opo-opo skill in place of a later weaker form GCD, which depends on the Blitz planned (as Bookending's other rows). A Form Shift in uptime is already its own finding. |
| mnk/PerfectBalance/dropped-stacks | covered | `mnkBlitz` | Perfect Balance stacks unused | Built 2026-10-15 from the buff's stack events: stacks left at its end lose the Blitz (Beast Chakra only comes from Perfect Balance), her average Blitz over a form GCD. Also a Perfect Balance pressed while one ran (Q18Xc93x4wpfMFdT 7:32 then 7:33: a charge gone, 103k). Shown, not counted in forced time or ending just before a death (the log strips buffs ~2s early): most short ones on disk are deaths. Counted: bqmRpGxDvfT8AZc6 6:47 (pressed before the 7:00 Alley-Oop Inferno, 2 stacks left, 91k). None of the top 100 lost one; 18 of the lowest 122 did. Against xivanalysis (2026-10-15): kNQKG6yHmvZTJ2hf 9:00 matches its "1 GCD missed" (here lost to the death that followed); it misses bqmRpGxDvfT8AZc6 6:47 (the buff's stack events show one Dragon Kick and 2 stacks left when it ran out at 7:08) and doesn't count Q18Xc93x4wpfMFdT's double press. |
| mnk/PerfectBalance/form-shift-in-pb | covered | `mnkBlitz` | Form Shift during Perfect Balance | Folded into skipped-form-shift (the same GCD with no damage). The top 100's ones were all in the 2:52-2:58 downtime, which is free. |
| mnk/PerfectBalance/nadi-overcap | superseded | `mnkBlitz` (Phantom Rushes lost) | a Blitz giving a Nadi already held | A bare overcap rule is fight-blind: 36 of the top 100 Red Hot and Deep Blue Monks generate a Nadi they hold after the opener, and every Monk on disk opens Lunar, Lunar, Solar, Phantom Rush. Built instead (2026-10-15): Phantom Rushes lost by the kill. B Blitzes allow ⌊(B − 1) / 3⌋ with that opener (⌊B / 3⌋ without it, or after a death, which empties the Nadi gauge: Xk2DKZwVp4Ar6d7y Enuo pull 3's 9:12 Elixir Burst came after an 8:43 death), each one short worth a Phantom Rush over an Elixir Burst / Rising Phoenix. Differs from xivanalysis's count, which charges overcaps that only shift the cycle: YPhxRTb9Ld7BJaXp (top parse) and bqmRpGxDvfT8AZc6 got 4 of 4 (it says 1 lost each); bWDLM6zVXkqFAfjT 3 of 4 matches its 1. Fires on 6 pulls on disk, among them the user's static (rgTafHJ9MN47m3Vy Doomtrain pull 4: LLSPLLSPLLLCPSLP, 4 of 5, 66k). |
| mnk/Weaving/too-many | verified | `checkGcdGaps` | triple weaves (4 allowed after Six-sided Star) | Fight 16 12:02 (end-of-P3 hold, forced) matched. |
| mnk/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Fight 16 13:02 delay matched. |
| mnk/AlwaysBeCasting/gcd-downtime | covered | `checkGcdGaps` | a gap past GCD + 150ms | — |
| mnk/Weaving/ignored-job-weave-note | no-damage | — | — | Greased Lightning's 0.8 speed model. |

Core modules that can't fire for Monk: DoTs, Interrupts, Swiftcast, Lucid,
Overheal.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| mnk/RiddleOfFire/gcd-count | modules/RiddleOfFire.tsx:21-33, 104 | min(11, ⌈(len − 250ms) ÷ GCD⌉); tiers 10 Minor, 9 Medium, 6 Major on the missed count | yes | yes | inverted tiers |
| mnk/RiddleOfFire/blitz-count | modules/evaluators/BlitzEvaluator.tsx:11-86 | Blitzes per Perfect Balance charge with time (8s tolerance): Minor 1, Medium 3, Major 6 | yes | yes | — |
| mnk/RiddleOfFire/wasted-gcds | RiddleOfFire.tsx:29-33, 64-69, 139 | Form Shift / Meditation in the window: Medium 1, Major 2 | yes | yes | — |
| mnk/Brotherhood/* | modules/Brotherhood.tsx:12-65; evaluators/BrotherhoodEvaluator.tsx:14-104 | 10 GCDs (inverted tiers); drift vs Riddle of Fire: Minor; no RoF: Medium 1, Major 2 | yes | yes | swapped note ids |
| mnk/CooldownDowntime/* | modules/CooldownDowntime.ts:3-26 | Brotherhood 7s, Perfect Balance 3s (charges), RoF 5s, RoW 10s; hold 2.425s; checklist 95% | yes | yes | — |
| mnk/AoE/* | modules/AoE.tsx:11-29 | Shadow of the Destroyer, Four-point Fury, Rockbreaker under 4; Enlightenment under 3: Minor 1, Medium 4, Major 7 | yes | yes | — |
| mnk/Positionals/missed | modules/Positionals.ts:4-8 | checklist per action | yes | yes | — |
| mnk/Replies/* | modules/Replies.tsx:7-29 | Fire's Reply dropped: Major 1; Wind's Reply: Medium 1, Major 2 | yes | yes | — |
| mnk/Revolution/celestial-revolution | modules/Revolution.tsx:11-44 | any Celestial Revolution: Major | yes | yes | no AoE exception |
| mnk/Balls/fury-overcap | modules/Balls.tsx:19-90 | Fury stacks lost: Minor 1, Medium 3, Major 5 | yes | no (inferred) | — |
| mnk/Chakra/overcap | modules/Chakra.tsx:13-20 | Chakra lost: Minor 1, Medium 5, Major 8 | yes | no (recorder's gauge only) | — |
| mnk/Forms/* | modules/Forms.tsx:39-198 | formless starter: Minor 1, Medium 2; reset / skipped Form Shift: Medium; dropped form: Major | yes | yes | hook reachability |
| mnk/Bookending/* | modules/Bookending.tsx:16-163 | checklists; Formless overwrite: Minor 1, Medium 3 | indirect | yes | 0/0 NaN |
| mnk/PerfectBalance/* | modules/PerfectBalance.tsx:27-161 | stacks dropped: Medium 1, Major 2; Form Shift in PB: Minor; Nadi overcap: Minor 1, else Major | yes | yes / no (Nadi inferred) | no end-of-pull allowance |
| mnk/Weaving/too-many | modules/Weaving.ts:11-22 | 2 weaves, 4 after Six-sided Star: Medium 1, Major 5 | yes | yes | — |

## Open

In priority order (biggest damage cost first).

1. **mnk/Replies/*** (covered). Seen firing 2026-10-16 (ff-probe, 6
   lowest Vamp Fatale Monks; the statuses are Fire's / Wind's / Earth's
   Rumination): 4 of 6 let one run out with no death beside it
   (BfXQyTC6hNgvFb3R fight 43 Wind's 8:40.2, 37PGL4tgpvfjrXNa fight 7
   Fire's 7:17.0, MAJBybNh819Gr2kX fight 2 Fire's 0:25.3,
   APLmHrf3h2Rx1XbN fight 3 Earth's 3:51.1). 37PGL4tgpvfjrXNa fetched:
   the app reports it (121k, the whole Fire's Reply as an upper bound).
   Matched his page 2026-10-16: Fire's Rumination fell off 1 = 1;
   Celestial Revolution 7 = 7; Fury lost 5 = 3 Opo-opo + 1 Raptor + 1
   Coeurl; Brotherhood 4 / 5 = 1. Perfect Balance 13 / 16 and Riddle of
   Fire 8 / 10 against the app's 2 and 1 (three deaths; whole uses
   outside forced time). Its 9 Blitzes missed in Riddle of Fire against
   the app's 6 in five windows, not traced.
