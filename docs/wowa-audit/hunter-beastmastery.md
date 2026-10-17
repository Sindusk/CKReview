# WoWAnalyzer audit: Beast Mastery Hunter

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Hunter shared layer,
  then the spec), spot-checked at their source lines (6 of
  6 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** lagging. It declares patch 12.0.7 against a clone at 12.1.0,
  flagged partially maintained; last change 2026-10-13 (Trigger Finger
  haste). The big talent and cooldown fixes were 2026-07-09, so every
  talent rule below is unverified on 12.1.0. The guide has one graded
  element, Focus at the cap, plus the shared preparation section. There is
  no cooldown section, priority list or checklist. Most other rules are
  threshold getters nothing in the guide reads, per-cast annotations, or
  statistics; each row says which. The hunter modules Stampede, Howl of
  the Pack Leader's boar, Sentinel's Mark, Moonlight Chakram, Survival of
  the Fittest and Exhilaration are not wired for this spec, so those
  shared records do not apply.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Beast Mastery Hunter"`:
  Bestial Wrath window, Focus at the cap with Barbed Shot excluded),
  `lib/damage/wow/specs/beastmastery.ts` (phase 3: Bestial Wrath held,
  Kill Command without Nature's Ally, Wild Thrash on one enemy),
  `potion.ts`, generic checks. Bestial Wrath was in `tracked-cooldowns.ts`
  (30s) until phase 3 moved it to beastmastery.ts. Case study:
  qpZx3mWaG7gcDdYB pull 3 (Deathstriker) against jmprxRc62fHCZy7g fight 25
  (Matcheh, 99th); the header of ranged.ts records what matched. Cast
  rates matched (Kill Command 17.0 vs 15.8 a minute, Barbed Shot 9.2 vs
  9.9, Cobra Shot 13.7 vs 15.4, Bestial Wrath 1.9 vs 2.0). WoWAnalyzer's
  page showed only Focus waste (19.2% vs 17.9%, both "bad") and potions
  (2 of 2 both).
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Beast Mastery
  sets or adds.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). All Mythic, 40 BM
  player-pulls:
  - top: Luumu (baRCnPv62YQ1dJZN, 99.6th) and Yaji (NvX17Tb9yMY8QrDf,
    99.8th) on Entombed Sentinels, with Волкерокхант (Vr8dLPtFYWA4G1yg) and
    Levipeepee (6kHtGaQXCMWYxFpZ); on Vashnik 爹丶爹 (RbhPKYWd6t1nAC3f fight
    40, 100th, fetched), Yaji (tcdpmV7MBHK1jGYk), Käächhunt
    (zdyhBj7pxWG6A8QZ), 小红手经年 and Minttu (MaWQwnygjkh1czL8), 干嘛喵
    (VbAHWZDdPwJBajmx), and the other Vashnik BMs on disk (7B1wQbjNhgXJDaHC,
    7L3RKpavDA8T4MjY, 8kVQMJ4rmpnyRjBH, 9rGDw4WB3bv6VmnK, hjHXmdnJFwTPpMtK,
    Ftj4vwHf9RazPcqV, r9CX1kpRGLmKJH4M);
  - weaker: Koralie (8AFnLQKdrcgawzDC fight 224, 20th, fetched) and
    Snobshot beside her, Jimache and Nidzoz (v8bmgMAdcnBCj9Ya), and the
    static's Deathstriker (the case study and his 16 pulls on seven bosses
    in gVDPhzp61Zm29HMw).

  Fetched two single fights (~80MB); ~290 WCL points with rankings.

  Talents, from casts, buffs and pet hits: all 40 play Pack Leader (Howl
  of the Pack Leader, the boar's Boar Charge, the bear's Rend Flesh) with
  Nature's Ally, Bloodshed (the pet casts it at each Bestial Wrath), Stomp
  and Dire Beast summons; 16 of 37 take Wild Thrash (and the Beast Cleave
  it applies). Nobody plays Dark Ranger: no Black Arrow in any log.

  Built in `lib/damage/wow/specs/beastmastery.ts`: **Bestial Wrath held**
  (b3f1610), **Kill Command without Nature's Ally** (02e3f4d, narrowed in
  8348062), **Wild Thrash on one enemy** (e8e0053; the phase-2 `wrong`
  Beast Cleave row overturned). Two engine fixes in `game.ts`, each its
  own commit: a BM GCD now counts the press's pet hits (98055af: Kill
  Command's attack is the pet's, so a GCD read about half its worth and
  every BM gap was priced at half), and Font of Venomous Rage, an on-use
  trinket, is a 2s channel for every spec (f67c727). Not built, with
  numbers below: Kill Command and Barbed Shot efficiency (`unverifiable`:
  their recharges can't be rebuilt from the log), the pet's macro'd basic
  attacks (negligible). Kept `wrong`: Cobra Shot at low Focus.

  Covered rows checked: the Focus cap check fires on BM (Luumu 119k, Yaji
  100k, Deathstriker 65k on the case study). No BM buff runs out as a proc
  in the samples (`_scratch/proc-spans.js`): Stampede! and the Pack Leader
  summon buffs are taken by Kill Command (1–2 removals without one in
  165–211); Hogstrider and Cobra Fang go with a Cobra Shot mostly, and
  their other removals (42 of 158, 311 of 836) fall at scattered spans
  after a stack or refresh, no whole-second cluster; Howl of the Pack
  Leader 471877 is a timed 17–23s countdown, not a proc. So nothing goes
  in procs.ts. The spell survey covers the presses: the top players' gaps
  follow only Cobra Shot, Kill Command, Barbed Shot and Bestial Wrath once
  Font of Venomous Rage is a channel.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| hunter-beastmastery/ResourceUseSection/focus-at-cap | verified | `primaryResourceCapFindings` (Barbed Shot excluded) | none | standing at the Focus cap | The only graded guide element: share of the fight at the cap, perfect at 5% or under, good 10%, ok 15%, fail above. Case study 19.2% vs 17.9% on the page; the app measures lost generation instead and does not count Barbed Shot pressed at full Focus (its Focus arrives over time and it runs on charges: Matcheh did it 38 times, Deathstriker 28). WoWAnalyzer counts forced downtime as time at the cap, the app does not. The same rule is shared with the hunter generator-waste rule. Phase 3 (2026-10-17): fires on BM pulls (Luumu 119k, Yaji tcdpmV7MBHK1jGYk 100k, Koralie 87k, Deathstriker 65k on the case study); the casts it finds at full Focus are Bestial Wrath, Dire Beast summons and Light's Blessing, each with its measured gain. BM players sit at 100 Focus most of the fight (every top player), so the check prices only those casts. |
| hunter-beastmastery/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Own minor / average / major tiers below 90 / 85 / 80% of the whole fight; no guide section reads it. Forced time counts as inactive. Case study: 39.9 vs 43.2 GCDs a minute, pace 1.22s vs 1.11s, which the app shows as gaps and delays. Phase 3 (2026-10-17): the app's gap value was half of a BM GCD's worth: it priced a GCD at the player's own hits, and Kill Command's attack, Bestial Wrath's and Wild Thrash's hits and the Barbed Shot Stomp are the pet's (Deathstriker 71k → 150k a GCD; ×1.8–3.3 on all 37 on disk; game.ts `PET_PRESS_HITS`, 98055af). Font of Venomous Rage, an on-use trinket, read as ~1s of idle per use (a 2s channel; f67c727). |
| hunter-beastmastery/Abilities/kill-command-efficiency | unverifiable | none (Kill Command is not in tracked-cooldowns.ts) | Alpha Predator (second charge); Cobra Shot, War Orders, Killer Cobra (reductions) | Kill Command held | 85% target, whole fight, forced time counted as ready; base recharge 7.5s, haste-scaled. Left out of the tracked list because it runs on charges and reductions, a skipped cast is never a whole lost use. Phase 3 (2026-10-17): its recharge can't be rebuilt from the log. Three Kill Commands come as close as 2.9–4.3s (first to third; Deathstriker 2.9s, Luumu 4.3s) against a 7.5s base with two charges, so reductions and resets the log doesn't carry set it. And there is no skipped Kill Command to find: its share of the player's GCDs (Kill Command ÷ Kill Command + Cobra Shot) is 0.48–0.57 on the top players (Luumu 0.52, Käächhunt 0.57, Minttu 0.48) and 0.47–0.55 on the weaker ones (Jimache 0.52, Nidzoz 0.47, Deathstriker 0.55). The weaker players' lower rates (Jimache 11.2 a minute against 15–18) come with fewer GCDs of everything, which `checkGcdGaps` prices. |
| hunter-beastmastery/Abilities/bestial-wrath-efficiency | verified | `bestialWrathHeld` (beastmastery.ts) + `burstGcdFindings` window | The Beast Within (90 → 30s) | Bestial Wrath held | 90% target, whole fight. **Overstates:** forced time counts as ready, and with a 30s recharge a one-minute Stasis reads as two missed casts. Phase 3 (2026-10-17): the tracked-cooldown drift that covered this was worth 0 a use: Bestial Wrath's damage is the pet's (its hit, the Bloodshed it casts, a ×1.2–1.6 bonus to the pet's hits in the 15s window), so it never fired. Valued by those, a use is 1.1–2.1M. Valued but left in the tracked list, it would have flagged both top players on MaWQwnygjkh1czL8 (1.55M, 1.68M) for holding it into Vashnik's Venom burst after Imbibe, which the fight's hold windows allow and that check doesn't read. Built as held time instead (ready → press, past 2s a cycle, outside forced time and hold windows, priced as a share of a use). Top players 0–229k a pull (Luumu, Yaji, Волкерокхант, 小红手经年 none; 爹丶爹 229k: 2.4s at 3:44, 1.6s at 5:09); weaker Koralie 154k, 嗜血魔圣 2.10M (2:20 → 2:41, 3:44 → 4:19), Jimache 1.84M (3:57 → 4:50); Deathstriker 125k on the case study (5:02 → 5:07), 0–881k on each of his 16 static pulls (Ula'tek 881k). |
| hunter-beastmastery/CobraShot/kc-cdr-efficiency | no-damage | — | Cobra Shot | — | Share of each Cobra Shot's one-second Kill Command reduction that landed on a running cooldown; tiers 85 / 80 / 75% but no consumer in the guide. Needs the modelled cooldown, so not log-visible. Display only. |
| hunter-beastmastery/CobraShot/wasted-casts | unverifiable | — | Cobra Shot | Cobra Shot with Kill Command ready | Counts shots made while Kill Command was fully available (0 / 1 / 2+ tiers); no consumer. The cooldown state is a model, and the shot is the filler that fits there anyway. |
| hunter-beastmastery/CobraShot/cast-over-barbed-shot | unverifiable | — | Barbed Shot, Cobra Shot | Cobra Shot while a Barbed Shot charge was available | Marks a Cobra Shot cast when a charge existed, an absolute "Barbed Shot first". Barbed Shot's cooldown (18s, two charges, with reductions from Barbed Scales, Pack Mentality and Scent of Blood) is modelled in their code. Holding a charge to avoid capping Focus is allowed. Phase 3 (2026-10-17): no recharge fit reproduces it. The slowest flat two-charge recharge no cast beats is 3.6–5.4s (Luumu 5.0s, Käächhunt 5.4s, Jimache 3.6s; three charges 5.8–6.4s), against an 18s base: the first-to-third gap is as short as 4.5–7.2s, so charges come back through reductions and resets the log doesn't carry. A flat model that fits would read every top player as holding (Luumu 70s at two charges, Yaji 105s). Barbed Shot rates: top 9.4–10.8 a minute; weaker 6.5–9.7 (Jimache 6.5 with Kill Command 11.2: a slower player overall, which the gap check prices). |
| hunter-beastmastery/CobraShot/low-focus-early-cast | wrong | — | Cobra Shot | Cobra Shot under 50 Focus with under a second of reduction gained | A per-cast annotation, no grade. It rests on the modelled Kill Command state, and a Cobra Shot is the filler when Focus is low anyway. Phase 3 (2026-10-17), premise tested: Focus is almost never low enough to matter. Cobra Shots under 50 Focus are 0–7% on the top players (Luumu 0 of 70, Käächhunt 4 of 82) and 0–15% on the weaker (Arteyparty 14 of 95, Deathstriker 5 of 86), and a GCD pressed under 30 Focus (Kill Command's cost) happens 0–1 times a pull on all 13 checked. So a low-Focus Cobra Shot never left Kill Command waiting on Focus; the next GCD after one comes as fast as any other (Deathstriker 1.14s vs 1.26s). Kept `wrong`. |
| hunter-beastmastery/NaturesAlly/kill-command-without-buff | verified | `killCommandUnbuffed` (beastmastery.ts) | Nature's Ally | Kill Command cast before Cobra Shot, Barbed Shot or Black Arrow gave the buff | Annotates each Kill Command made without the buff as missing 30% extra damage (the note itself says it is fine on cleave and the code cannot tell, so it applies on every fight). Phase 3 (2026-10-17): Nature's Ally (1276720, all 40 players) comes from each Cobra Shot or Barbed Shot and goes at the next Kill Command; the pet's and the Pack Leader beasts' Kill Command non-crit hits are ×1.13–1.65 with it (median ~1.3). An unbuffed Kill Command is nearly always two in a row (Deathstriker 0:03.9 → 0:04.8, 0:20.8 → 0:21.9 on the case study). Lost = its pet hits × (1 − 1/ratio). Kill Commands that hit two or more enemies aren't counted: on Vashnik the top players double up in the Venom burst (爹丶爹 0:29, 1:52, 3:17, 4–5s after Imbibe), where a held GCD can land on dead adds. Top 0–104k a pull (Luumu, Yaji Entombed Sentinels, Волкерокхант none; 爹丶爹 47k; 小红手经年 104k); weaker Koralie 144k, 嗜血魔圣 277k; Deathstriker 159k on the case study (10) and 113–342k on each of his 16 pulls (6–18 a pull). |
| hunter-beastmastery/BeastCleave/hit-less-windows | verified | `wildThrashOneTarget` (beastmastery.ts) | Beast Cleave (Wild Thrash) | Beast Cleave with no cleave hits | Counts pet buff windows in which the cleave hit nothing as wasted. Phase 2 marked it `wrong` (on a single target every window is hit-less by design). Phase 3 (2026-10-17) overturned that: in 12.x Beast Cleave (268877) comes only from pressing Wild Thrash (1264359, 35 Focus like a Cobra Shot; the pet's hit 1264355 on every enemy in reach), so a hit-less window is a Wild Thrash pressed for nothing. On one enemy it hits for 16–83k against the player's Cobra Shot's 72–113k, and the buff changes nothing visible there (pet Claw and melee ×0.95–0.98 with it, Deathstriker Kith'ix Pull 2). Built: a Wild Thrash whose pet hit one enemy and whose Beast Cleave cleaved nothing lost a Cobra Shot less its own hit. Top 0–181k a pull (Luumu, Yaji Entombed Sentinels, Käächhunt, Minttu none; 爹丶爹 76k, 1; 小红手经年 181k, 3); weaker Koralie 284k (5). Deathstriker none on the case study, a habit on single-target bosses: Kith'ix Pull 2 782k (17 of 19 presses, one every ~10s to keep Beast Cleave up), Nek'zali 648k and 682k, Ula'tek 637k. |
| hunter-beastmastery/KillerCobra/wasted-resets | unverifiable | — | Killer Cobra | Cobra Shot in Bestial Wrath with Kill Command off cooldown | Counts Cobra Shots inside the window whose reset found Kill Command already ready (0 / 1 / 3+); no consumer. Needs the cooldown state; a Cobra Shot is the right filler with the reset available. |
| hunter-beastmastery/BasicAttacks/macro-delay | candidate | — | none | the pet's basic attacks firing late | Pet Bite, Claw or Smack events closer than 3.4s count as chained, and the delay beyond a 3.15s macro cadence is turned into potential extra casts and damage. Phase 3 (2026-10-17), **measured, not built** (negligible). The main pet's basic attack is in every log (Claw on most, Bite, Smack), 17–19 a minute: its median interval is 3.12–3.17s for players who macro it (Deathstriker, Käächhunt) and 3.22–3.27s for the rest (Luumu 3.22, Yaji 3.23–3.24, 小红手经年 3.24), top players on both sides. That's ~3% more basic attacks, each 1.4–4.3% of the player's damage: about 0.1%, 50–100k a pull. |
| hunter-beastmastery/BeastMasteryFocusCapTracker/regen-config | unverifiable | — | Pack Tactics | Focus at the cap with regen running | Configures the shared natural-regen-waste rule for this spec (5 Focus per second base, +75% with Pack Tactics, max fixed at 100). Passive regen lost at the cap is not in the log (dps-analysis.md); the app measures lost generation from casts made at the cap. The values are not checked on 12.1.0. |
| hunter-beastmastery/FocusDetails/generator-waste | covered | `primaryResourceCapFindings` | none | generators cast into a full bar | The shared rule: Focus wasted over Focus generated, at 5 / 10 / 15% wasted. It is the cap rule seen through the generators; the app counts it once. |
| hunter-beastmastery/CancelledCasts/cancelled-pct | covered | `checkInterrupts` | Black Arrow (the module is switched off for the spec without it) | a cast cut by movement | Completed share under 97.5 / 95 / 90%. Counts casts cut by forced phases against the player. Not graded in the guide. Phase 3 (2026-10-17): nobody takes Black Arrow, and every BM press in the samples is instant, so there is nothing to cancel. |
| hunter-beastmastery/statistics | no-damage | — | — | — | Display only: Cobra Shot, War Orders, Barbed Scales and Pack Mentality cooldown reduction totals, Scent of Blood charges, Killer Cobra resets, Bestial Wrath buff uptime, Bloodshed, Beast Cleave damage, Dire Beast and Dire Command damage with a proc-likelihood chart, Dark Hound, Animal Companion, Aspect of the Beast, Stomp, Deathblow, Binding Shot, Tranquilizing Shot, Master Marksman, Focus graphs. Phase 3 (2026-10-17): the damage effects behind these (Bloodshed, Stomp, Beast Cleave) are now in Bestial Wrath's worth, the BM GCD value and the Wild Thrash check; Dire Beast summons come by themselves (no press). |
| hunter-shared/utility | no-damage | — | — | — | Aspect of the Turtle, Exhilaration, Survival of the Fittest, Camouflage, Misdirection, Feign Death and its death filter, Disengage, Cheetah, Concussive Shot, Counter Shot, traps, Flare, Hunter's Mark, pet abilities. Utility and defensives aren't judged. The case study's 3.9s gap in Aspect of the Turtle at 5:02 was a survival call and is counted as idle. |

Not rules (models the rules above rest on): the cooldown model for Kill
Command and Barbed Shot (Cobra Shot, War Orders, Killer Cobra, Barbed
Scales, Pack Mentality, Scent of Blood, Alpha Predator charges, Trigger
Finger in the shared haste model), the Dire Beast normalizers that tell
a Dire Command proc or a Bestial Wrath set bonus apart from a normal
summon, the Barbed Shot Focus regen accounting that back-computes waste
the log doesn't report, event links, timeline highlights, and the spender
list for the resource display. Several constants (Killer Instinct, Thrill
of the Hunt, Stampede hits) are unused; their values are not extracted.

## Candidates left

Phase 3 (2026-10-17) worked the list: Nature's Ally built; Barbed Shot
and Kill Command efficiency `unverifiable` (no recharge fit); the macro
delay measured negligible. One row stays `candidate`, unbuilt with its
numbers: `macro-delay`. The phase-2 `wrong` Beast Cleave row turned out to
be the spec's largest single-target habit (Wild Thrash on one enemy) and
is built.

For the user's review (after every spec's pass): `low-focus-early-cast`
kept `wrong`, evidence in its row.
