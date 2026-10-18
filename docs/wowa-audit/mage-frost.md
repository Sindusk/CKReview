# WoWAnalyzer audit: Frost Mage

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Mage shared layer,
  then the spec), spot-checked at their source lines (3 of 3 matched;
  the first extract quoted source comments and was redone), and the
  ledger drafted by a Sonnet subagent, then reviewed in the main
  session. Reference only (AGPL): our own words, no ids or tables taken.
- **Spec:** declares 12.0.7, fully maintained, but phase-0 triage marked it
  "lagging" (the sibling specs declare newer patches). Last change
  2026-07-25 was a patch bump with "no spell changes needed"; earlier
  edits: 2026-03-29 (Ice Lance and Flurry feedback), 2026-02-22 (Ray of
  Frost), 2026-01-20 (Winter's Chill deleted). No priority list and no
  checklist: every grade is a guide section, and the Mage shared layer
  grades nothing. Rules tied to talent values (Freezing stack targets,
  shatter counts) are marked doubtful below, not built on.
- **App:** `lib/damage/wow/specs/frostmage.ts` (since phase 3: Fingers of
  Frost wasted), wired from `ranged.ts` (no burst window: nobody presses
  Icy Veins; mages log only mana, so no resource-cap check).
  `tracked-cooldowns.ts` tracks Frozen Orb (valued by its hits since
  phase 3, burstHold), Comet Storm (worth 0 a use, see its row) and Ray of
  Frost (burstHold); Fingers of Frost expires in `procs.ts` (15s); the
  generic checks (`checkGcdGaps`, `checkInterrupts`, `checkProcs`,
  `checkCooldownDrift`, `checkDeaths`) and `potion.ts` apply. No case study
  against a WoWAnalyzer page exists for this spec.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). 21 Frost Mage
  player-pulls, all Mythic kills:
  - top, fetched for it: Zhenglanxin (q1khJN3tL7Qcpg9d fight 30, Entombed
    Sentinels, 100th), Choechoi (nHavrDhPVtBYkMXA fight 48, 99.8th),
    악용유저 (gtQBmXVDnHqYChRG fight 32, 99.6th, with Redhexs, unranked
    here), 夏夜椿湫 (3ZYVyGkBqpDhKLFt fight 28, Vashnik, 100th); on disk
    Serasín (BTAdZMzQxgJf4XyH, 98.5th), Noribert (NvX17Tb9yMY8QrDf,
    94.8th), Huggmark (PAgdKqkXDTRfLnJy, 93.3th), Choechoi on Vashnik
    (phzkLrdNBgtfCmW9, 89.5th), Pheanixx (dp6am4TQhG3cKFxR, Vashnik,
    87.2th);
  - weaker, fetched: Purer and Voxdeii (p4G1xa2yMqCDznZT fight 10, Purer
    20.6th), Mabho (hRr3amXQtW1FNgnf fight 2, 21.0th), Raisedxfist
    (K4anTbXNgf1H6Dzd fight 47, 21.6th); on disk, ranks unchecked:
    Babymage, Kysoon, Angelona, Lariel, Gerky, Shaddâr, Supertitis.
  - Talents (casts and buffs): every Entombed Sentinels player is
    Spellslinger (Frost Splinter, Splinterstorm; Frostbolt filler, no
    Comet Storm); three Vashnik players are Frostfire (Frostfire Bolt,
    Comet Storm, Meteor; Choechoi switches to it there). Nobody presses
    Icy Veins. Shatter (an Ice Lance shattering Freezing stacks) is ~40%
    of a top player's damage.
  - Built: **Fingers of Frost wasted** (frostmage.ts, from the overcap
    row); **Fingers of Frost expiry** (procs.ts, 15s); the tracked
    **Frozen Orb** valued by its hits (worth 0 a use before: hits under
    another id) with burstHold; burstHold on **Ray of Frost** (the
    100th-percentile Vashnik Frostfire holds it to reset Comet Storm into
    the Venoms; read as drift it was a lost use).
  - The idle gaps of the top players follow ordinary presses (Ice Lance,
    Glacial Spike, Flurry, Frostbolt) and movement; Ray of Frost's channel
    is timed. Nothing for the survey.
  - About 150 WCL points (rankings, seven one-fight fetches).
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Frost sets or adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| mage-frost/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Above 5 / 15 / 25% of the whole fight idle (looser than the core 5 / 10 / 15). Whole-fight denominator, forced time counted as idle; the app values each gap less forced time. |
| mage-frost/CancelledCasts/cancelled-pct-guide | covered | `checkInterrupts` | none | a cast cut by movement or a boss interrupt | Core bands 2 / 5 / 15% of cast-time casts; counts boss interrupts and stuns too. Fire Blast, Combustion and Shimmer are excluded from the count. |
| mage-frost/BrainFreeze/proc-utilization | superseded | — | Brain Freeze | procs not spent | Share neither overwritten nor expired, 95 / 90 / 80%. It is the sum of the two rows below, so it is not scored separately. |
| mage-frost/BrainFreeze/overwritten-pct | candidate | — | Brain Freeze | a second proc landing while one is held | Refreshes ÷ procs, perfect at 0, fail above 10%. The grade's own source comment admits the numbers are tuned by feel. Value: the Flurry the lost proc would have paid, less the filler cast it displaced, from this player's own Flurry hits with and without the buff (the log has about 10.6 procs a minute). What would separate a mistake from top play: whether top players also let procs overlap during Flurry cooldown or movement. Not measured; likely low. Phase 3 (2026-10-17), left unbuilt: a Brain Freeze "refreshed" while held comes at a Frozen Orb press or the landing of a Frostbolt / Glacial Spike pressed with it up. Top 0–3 a pull (Zhenglanxin 1, Choechoi 0, 악용유저 3, 夏夜椿湫 1), the others 0–9 (Purer 7, Mabho 7, Babymage 9, Raisedxfist 3, Huggmark 0). An empowered Flurry press (its hits and the Shatter after) is worth −57k to +43k more than a plain one, so ≤0.4M a pull at that price; whether a Brain Freeze also grants the Flurry (a charge) isn't in the log (5–17 Flurries a pull are cast without it), so a whole-Flurry price can't be backed. |
| mage-frost/BrainFreeze/expired-pct | candidate | — | Brain Freeze | a proc running out unspent | The app sees only expiries, which is this row. A proc lost in forced downtime counts as expired in WoWAnalyzer; the app nets forced time. Phase 3 (2026-10-17), was `covered` by `checkProcs`, which never saw it (not in procs.ts); left unbuilt: Brain Freeze never runs out. 0 of ~600 removals on the 21 player-pulls lack a Flurry beside them, held up to 26.0s (Purer), so no duration and nothing to price. |
| mage-frost/FingersOfFrost/proc-utilization | superseded | — | Fingers of Frost | stacks lost | 95 / 85 / 70% of procs neither expired nor gained at two stacks. The sum of the two rows below. Pre-pull stacks are not credited by WoWAnalyzer. |
| mage-frost/FingersOfFrost/expired-pct | covered | `checkProcs` (expiries) | Fingers of Frost | stacks lapsing unspent | Fail above 10% of procs. Phase 3 (2026-10-17): `checkProcs` never saw it until Fingers of Frost went into procs.ts (15s, consumer Ice Lance): 2 expiries at 14.97s and 15.00s (Voxdeii p4G1xa2yMqCDznZT 1:08, in forced time; Supertitis X618LRt7hPqzbVJj 1:38, 30k), max span 15.00s of ~1,400 gains, the next 13.67s. Read as "Fingers of Frost expired unused", priced at an Ice Lance's own hits (its Shatter isn't matched by name, so an under-count). Rare: none on the other 19. |
| mage-frost/FingersOfFrost/overcapped-pct | verified | `fingersWasted` (frostmage.ts, "Fingers of Frost wasted") | Fingers of Frost | a proc gained while two stacks are held | Fail above 10% of procs (about 23 a minute in the sample). WoWAnalyzer reads the stack count 10ms before the event and skips refreshes caused by spending, so its own count is noisy. Phase 3 (2026-10-17): the overcap logs as a "refreshed" with no stackRemoved beside it (1–16 a pull). Most come inside Ray of Frost: a full channel grants two, the top players enter it holding none (Zhenglanxin 10 of 10, Choechoi 8 of 8), the weaker often with one (Purer 6 of 10). Built for a proc landing in a press made with two held, or a Ray of Frost pressed with one, held 300ms+ before the press; two procs in one press begun with none, or a proc arriving as the press began, aren't counted. Each priced as the player's Ice Lance press with Fingers − without (its hits and the Shatter after): 36–200k. Top: Zhenglanxin, Choechoi, 夏夜椿湫, Noribert, Kysoon, Gerky none; 악용유저 199k (Ray of Frost at 0:02 with one held), Serasín 90k. Others: Redhexs 2.94M (14; five Rays entered with two, 1:00, 1:40, 3:52, 5:25), Babymage 1.17M (Frostbolt with two held at 1:13, 2:36, 4:10, 5:12), Pheanixx 1.16M, Shaddâr 504k, Lariel 491k, Huggmark 303k, Raisedxfist 222k, Purer 109k, Mabho 80k. |
| mage-frost/IceLance/freezing-stacks-shattered | unverifiable | — | Heart of Ice, Polished Focus, Thermal Void, Frostfire Bolt (Frostfire tree), Splintering Sorcery (Spellslinger tree) | Ice Lance cast with no Fingers into a target with few Freezing stacks | Four buckets, fixed "poor" cutoff under 4 stacks; target stack count is 10 for the Frostfire tree and 6 for Spellslinger. Doubtful: the counts are talent-driven and may have shifted since 12.0.7, and the cleave handling is admittedly absent. Freezing is a debuff in the log, so a cast's stacks are readable. Value would be the Lance's damage against a with-Fingers or high-stack Lance from the same player; a candidate only if the stack numbers are re-measured. Expected value low. Phase 3 (2026-10-17): unverifiable with the current fetch. Freezing (1221389, in the reports' masterData) isn't in the fetched enemy debuffs, so a cast's stack count can't be read. It matters: Shatter is ~40% of a top player's damage (Zhenglanxin 43.2M; average hit 131k against Purer's 90k), and the weaker players press more Frostbolts (53–63 a pull against 14–29). Fetching Freezing's stacks would settle it. |
| mage-frost/Flurry/brain-freeze-priority | candidate | — | Brain Freeze, Flurry, Thermal Void | a Flurry cast into an active Thermal Void window | Prose priority "Flurry first when Brain Freeze is up", with the one exception of Thermal Void being active. Only the exception is checked (a donut and a timeline flag, no grade); the "without Brain Freeze" bucket is shown neutral. Value: the Thermal Void time lost by recasting early. Single-target logic. Top players likely munch it to avoid overwriting a proc, so low. Phase 3 (2026-10-17), left unbuilt: Thermal Void (1247730) is an 8.0s buff (spans 8.00–8.02s); a Flurry pressed inside it happens 0–2 times a pull on top and weak alike (Zhenglanxin 0, 악용유저 1, 夏夜椿湫 2, Mabho 2, Purer 0), Redhexs 5. Negligible. |
| mage-frost/RayOfFrost/channel-hits | wrong | `checkGcdGaps` | Ray of Frost | a channel cut short | Perfect at all 8 ticks, good at 7, fail at 6 or fewer. A cut channel from forced movement or an untargetable boss is graded as the player's fault. What remains real is the idle after a cut channel, which `checkGcdGaps` counts. The text also asks for under 12 Freezing stacks on the target; that part is not checked at all. Phase 3 (2026-10-17), re-checked, kept `wrong`: a full Ray is 8 ticks (2.0–3.5s); a tick is ~110–150k against ~65k of GCD time it takes, so a clipped tick nets ~70k. But top players clip as often as weak ones (악용유저 99.6th 5 of 10 Rays at 7 ticks, Mabho 7 of 10, Babymage 5 of 10; Zhenglanxin, Choechoi, Serasín, Huggmark none), and Frostfire players clip on purpose to reset Comet Storm (Choechoi on Vashnik: all 5 Rays at 2–3 ticks; 夏夜椿湫 1:51.7 at 2). No separation, and the shortest cuts are deliberate. |
| mage-frost/RayOfFrost/cast-efficiency | covered | `checkCooldownDrift` (Ray of Frost, 44s) | Ray of Frost; Glaciate; Hand of Frost (second charge) | Ray of Frost held | Core default target 80%, whole-fight; WoWAnalyzer counts Stasis and forced time as ready. The tracked 44s is the shortest sampled interval (44.8 / 47.5s median), so the app is already lenient. WoWAnalyzer's model is a 60s cooldown less a tenth of a second per Freezing stack shattered by Ice Lance (Glaciate); that reduction is not applied in the app. Phase 3 (2026-10-17): Spellslinger has a second charge (5.7–16s between some presses, median 29–45s); Frostfire 45–71s. The single 44s charge stays lenient. Valued per use by its own hits (Spellslinger 0.79–1.08M, Frostfire 0.17–0.51M). It read a lost use on the 100th-percentile 夏夜椿湫 (Vashnik, 308k: held 4:11 → 4:38), who holds it to reset Comet Storm into the Venoms after each Imbibe; now burstHold, which excuses that. Left firing: Supertitis 1.66M (X618LRt7hPqzbVJj, 86.6s held), Choechoi on Vashnik 17k. |
| mage-frost/CometStorm/cast-quality | wrong | — | Comet Storm | a single-target Comet Storm | The shattered-projectile count is hard-coded to zero in the source (a TODO says the tracker is missing), so every single-target cast grades Fail and only casts into two or more targets pass. Non-functional for single target. Phase 3 (2026-10-17), re-checked, kept `wrong`: only Frostfire takes Comet Storm (three Vashnik players, none on Entombed Sentinels). On Vashnik each Imbibe gets a Comet Storm pressed as the Venoms appear (it hits them for 0, then the boss: 170–300k) and a second after Ray of Frost resets it, into the Venoms (0.9–1.9M). The single-target one is worth about a GCD (199k on 夏夜椿湫) and its recharge is restarted by the Ray anyway, so its "quality" moves no damage the log shows. No Frostfire sample on a single-target boss. |
| mage-frost/CometStorm/cast-efficiency | candidate | — (tracked, worth 0 a use) | Comet Storm; Hand of Frost | Comet Storm held | Target 90%, whole-fight, Stasis counted as ready. The source itself flags its 60s cooldown and charges as wrong (it says the real cooldown is tied to Ray of Frost casts). Phase 3 (2026-10-17): it is: a Ray of Frost resets Comet Storm (Comet Storm, Ray, Comet Storm, the two Comet Storms 2–18s apart, on all three Frostfire players), so no fixed recast fits. The tracked 43s had no value (hits under 153596), so it never fired; valued, it fired on all three Frostfire players (夏夜椿湫 100th 725k, Choechoi 329k, Pheanixx 129k), who press it once per Imbibe plus once after the reset, holding ~40s a cycle for the Venoms, more than Vashnik's 30s hold window covers. Left unvalued, so not judged; was `covered`. |
| mage-frost/FrozenOrb/cast-efficiency | covered | `checkCooldownDrift` (Frozen Orb, 60s, burstHold, hits 84721) | Frozen Orb; Spellfrost Teachings | Frozen Orb held | Target 90%, whole-fight, Stasis counted as ready. WoWAnalyzer cuts the cooldown a quarter second per Frost Splinter hit. Phase 3 (2026-10-17): the tracked Orb was worth 0 a use (its hits log under 84721, not the cast's 84714), so its drift could never show: now `damageIds`. Frostfire: a flat 60.0–64.6s (夏夜椿湫, Choechoi on Vashnik); Pheanixx presses one per Imbibe for the Venoms (1.49M read as drift, now excused by burstHold). Spellslinger: 17–27s between presses at the shortest (median 27–43s), cut by Frost Splinter hits (120–180 between presses). The best fit, 60s less 0.3s per Splinter hit, puts only 18 of 110 intervals within 1.5s of it, and its excess runs 58–80s a pull on the top players, so it isn't built; the 60s judges Frostfire only and never fires on Spellslinger. |
| mage-frost/Abilities/other-efficiency | no-damage | — | none | — | Flurry (30s, haste-scaled, two charges), Blizzard, Cold Snap, Frostbolt, Ice Lance and Glacial Spike declare no efficiency target, and Arcane Torrent's is turned off; nothing is graded. |
| mage-frost/statistics | no-damage | — | — | — | Display only: Brain Freeze counts, Ice Lance total and average Freezing stacks shattered, Splitting Ice damage share, Glaciate and Spellfrost Teachings cooldown-reduction totals, the active-time gauge. |
| mage-shared/utility | no-damage | — | — | — | Utility and defensives aren't judged: Arcane Intellect (uptime statistic), Frost Nova, Ring of Frost, Blink or Shimmer, Counterspell, Remove Curse, Slow Fall, Spellsteal, Alter Time, Invisibility, Mirror Image, Polymorph variants; Ice Barrier absorbed, Ice Block or Ice Cold mitigation (a list of uses, no grade). Time Warp is a raid cooldown, not graded here. |

Not rules (models the rules above rest on): the cast-to-damage and
Brain Freeze or Fingers event links with their fixed windows (up to 18s),
the cooldown-reset models (Glaciate, Spellfrost Teachings, a Brain Freeze
proc giving a Flurry charge back, Cold Snap resetting its group, Barrier
Diffusion, Master of Time, Quick Witted), the aura list for timeline
highlights, the shared spellbook and constants (table, not extracted). The
Water Elemental module switches itself off in its constructor, so its pet
uptime and pre-pull summon thresholds are never evaluated. Preparation
(consumables) is the core question in core.md. Frost has no priority list;
its prose priorities are not machine-checked.

## Candidates left

Phase 3 (2026-10-17) worked the list; each row has its numbers.

1. **FingersOfFrost/overcapped-pct**: built ("Fingers of Frost wasted",
   frostmage.ts); the top players enter Ray of Frost holding none.
2. **BrainFreeze/overwritten-pct**: top 0–3, others 0–9 a pull; worth
   ≤0.4M at the empowered-Flurry price, and whether Brain Freeze grants
   the press isn't in the log. Unbuilt.
3. **Flurry/brain-freeze-priority** (Thermal Void): 0–2 a pull on
   everyone. Unbuilt.
4. **IceLance/freezing-stacks-shattered**: `unverifiable` until Freezing
   (1221389) is fetched; likely the spec's biggest lever (Shatter is ~40%
   of a top player's damage).
5. **BrainFreeze/expired-pct**: never happens. **CometStorm/cast-efficiency**:
   no fixed recast fits (Ray of Frost resets it); valued, it fired on all
   three Frostfire players on Vashnik. Unbuilt.

A Glaciate-style Ray of Frost reduction (tenth of a second per stack
shattered) is not listed: the app already tracks Ray of Frost at a single
44s charge, lenient, and the stacks aren't fetched. A Spellslinger Frozen
Orb recharge (60s less ~0.3s per Frost Splinter hit) didn't fit cleanly
enough to judge (FrozenOrb row).
