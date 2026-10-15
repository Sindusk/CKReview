# xivanalysis audit: Monk

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/mnk/` in the clone.
- **Patch:** no patch branches; supported 7.01–7.5. 7.2 changed
  Enlightenment's target count (hard-coded at 3 now) and added a 10-GCD
  Brotherhood target; 7.4 changed Chakra gauge events.
- **App:** `lib/damage/ffxiv/jobs/melee.ts` (`MNK_CHECKS`: `riddleOfFire`
  with `blitzesExpected`, `mnkAoe`), `tracked-cooldowns.ts` ("Monk"),
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
| mnk/RiddleOfFire/wasted-gcds | candidate | — | Form Shift / Meditation GCDs inside Riddle of Fire | Medium 1, Major 2. A GCD in the burst that does no damage costs the window's bonus on a real GCD. Downtime casts excused. |
| mnk/RiddleOfFire/riddle-of-wind-column | no-damage | — | — | Display only. |
| mnk/Brotherhood/gcd-count | superseded | `riddleOfFire` | Brotherhood under 10 GCDs | Brotherhood sits inside Riddle of Fire, which the app judges. Tiers inverted (bug). |
| mnk/Brotherhood/drift | candidate | — | Brotherhood pressed early or late against Riddle of Fire | Minor. Like Bard's failed overlap: the app doesn't see a buff outside the burst. Premise check: phase holds. |
| mnk/Brotherhood/missed-window | candidate | — | Brotherhood with no Riddle of Fire window | Medium 1, Major 2. Same check. |
| mnk/Brotherhood/players-buffed | covered | buffs.ts coverage | Brotherhood missing a player | Display only in xivanalysis. |
| mnk/Brotherhood/raid-buff-overwrite | no-damage | — | — | Note column. |
| mnk/CooldownDowntime/brotherhood | verified | `checkCooldownDrift` | Brotherhood held | Hold 2.425s per use in xivanalysis (its comment says 4.85s). Fight 16 matched. |
| mnk/CooldownDowntime/perfect-balance | verified | `checkCooldownDrift` (charges) | Perfect Balance at 2 charges | — |
| mnk/CooldownDowntime/riddle-of-fire | verified | `checkCooldownDrift` | Riddle of Fire held | — |
| mnk/CooldownDowntime/riddle-of-wind | verified | `checkCooldownDrift` | Riddle of Wind held | Fight 16 12/13 not adopted: 66s held in all, under one 90s recharge. |
| mnk/AoE/shadow-of-the-destroyer | covered | `mnkAoe` (vs the opo-opo form's three GCDs, minimum 4) | Shadow of the Destroyer on under 4 targets | Built 2026-10-15. Fires on djChYqt4b7K8aAfP Red Hot and Deep Blue 0:33 (only Red Hot up, 36k). On 3 adds (L9BzKkD2nxcVgHTC Necron pull 20 3:43, 3:50) it out-damaged the form's average and passes; xivanalysis counts both (minimum 4). Not adopted: three targets weren't a loss in the log. |
| mnk/AoE/four-point-fury | verified | `mnkAoe` (vs True Strike / Twin Snakes / Rising Raptor, minimum 4) | Four-point Fury on under 4 | Fires on L9BzKkD2nxcVgHTC Necron pull 6 3:51 (two adds, 20k) and pull 20 3:52, 3:58 (three, 10-12k: near even at 3, so only those under the average show). Matched xivanalysis on Necron pull 20 (2 of its 2). |
| mnk/AoE/rockbreaker | verified | `mnkAoe` (vs Demolish / Snap Punch / Pouncing Coeurl, minimum 4) | Rockbreaker on under 4 | Fires on L9BzKkD2nxcVgHTC Necron pull 20 3:48 (three, 3k) and 4:00 (two, 14k); matched xivanalysis there (2 of its 2). |
| mnk/AoE/enlightenment | covered | `mnkAoe` (vs The Forbidden Chakra, minimum 3) | Enlightenment on under 3 | Fires on kC7Y3WbzvKcZrBxT The Tyrant pull 1 6:29 (the boss alone, 10k). The damage comparison makes the pre-7.2 minimum moot. |
| mnk/Positionals/missed | verified | `checkPositionals` | a missed rear / flank | Fight 16 7 matched. |
| mnk/Replies/dropped-fires-reply | covered | `checkProcs` | Fire's Rumination expiring | Major at 1. Not seen firing. |
| mnk/Replies/dropped-winds-reply | covered | `checkProcs` | Wind's Rumination expiring | Medium 1, Major 2. Not seen firing. |
| mnk/Revolution/celestial-revolution | candidate | — | Celestial Revolution (a wrong Blitz) | Major for any use; worth Rising Phoenix minus Celestial Revolution each. Log-visible. |
| mnk/Balls/fury-overcap | candidate | — | Opo / Raptor / Coeurl Fury gained at the cap | Minor 1, Medium 3, Major 5. Inferred from the form actions; a lost Fury is a lost empowered GCD. |
| mnk/Chakra/overcap | unverifiable | — | Chakra over 5 (10 under Meditative Brotherhood) | Minor 1, Medium 5, Major 8. Read only from gauge events, which only the log's recorder has; party Chakra gain is random. |
| mnk/Forms/formless-combo-starter | candidate | — | an Opo-opo skill with no form up | Minor 1, Medium 2. Forms aren't combos in the app's data, so `checkCombos` doesn't see them. Reachability doubt (see bugs). |
| mnk/Forms/reset-by-opo | candidate | — | an Opo-opo skill in Raptor / Coeurl form | Medium. Same gap. |
| mnk/Forms/skipped-form-shift | candidate | — | Form Shift used while a form was up, outside downtime | Medium. A Form Shift in uptime is a GCD with no damage. |
| mnk/Forms/dropped-form | candidate | — | a form left to expire (30s) | Major. Possibly unreachable in xivanalysis (see bugs). |
| mnk/Bookending/formless-on-opo | unverifiable | — | Formless Fist spent on a non-Opo-opo skill | Checklist. Its cost depends on the Blitz planned; not measurable from one press (fight 16: "PB after Opo-opo 22/29" not built). |
| mnk/Bookending/pb-fr-after-opo | unverifiable | — | Perfect Balance / Fire's Reply not after an Opo-opo GCD | Same. |
| mnk/Bookending/formless-overwrite | candidate | — | a Formless applier while Formless Fist is up | Minor 1, Medium 3. A lost free form; log-visible. |
| mnk/PerfectBalance/dropped-stacks | candidate | — | Perfect Balance stacks unused | Medium 1, Major 2. No end-of-pull or death allowance in xivanalysis. The app's Blitz check sees a late Blitz, not lost stacks. |
| mnk/PerfectBalance/form-shift-in-pb | candidate | — | Form Shift during Perfect Balance | Minor. A wasted stack. |
| mnk/PerfectBalance/nadi-overcap | candidate | — | a Blitz giving a Nadi already held | Minor 1, else Major. A wasted Blitz on the way to Phantom Rush. Inferred from Blitz casts (gauge starts empty). |
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

In priority order (biggest damage cost first). One Monk sample so far;
most of these need a second log first.

1. **mnk/PerfectBalance/dropped-stacks, nadi-overcap;
   mnk/Revolution/celestial-revolution** (candidates). Wrong or lost Blitz
   resources: each costs a Blitz or a Phantom Rush. Log-visible from casts.
2. **mnk/Brotherhood/drift, missed-window** (candidates). Premise check:
   phase holds.
3. **mnk/Forms/*, mnk/Bookending/formless-overwrite,
   mnk/PerfectBalance/form-shift-in-pb, mnk/RiddleOfFire/wasted-gcds**
   (candidates). Form mistakes: a lost empowered GCD each.
4. **mnk/Balls/fury-overcap** (candidate).
5. **mnk/Replies/*** (covered). Not seen firing.
