# WoWAnalyzer audit: Survival Hunter

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Hunter shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.0.7 while the clone's game version is 12.1.0, so
  the config is one minor patch behind (the "lagging" triage label; the
  changelog itself is active). Marked fully maintained; ten changelog
  entries from the 2026-03-18 launch, last 2026-10-13 (Trigger Finger
  haste, in the shared Haste file). Dated spec entries: Tip of the Spear
  2026-03-31 and 2026-05-31, Takedown 2026-04-28 and 2026-05-24, Raptor
  Swipe 2026-03-25 and 2026-04-28, Boomstick 2026-05-31. Every talent the
  spec reads still exists in the clone's Hunter talent data, so no row is
  doubtful for a removed talent; whether talent values moved in 12.1.0
  can't be checked from the code. 43 parser modules, 27 files of spec
  logic. **The priority-list checker is switched off** (empty shell,
  guide section commented out, changelog 2026-05-10), so its two lists
  grade nothing. Several constants (Covering Fire and Explosives Expert
  reductions, the Takedown damage modifier, baseline Aspect of the Eagle
  cooldown) have no reader. Correction to the Hunter shared note: the
  cancelled-casts module is **not** enabled for Survival.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Survival Hunter"`: the
  Takedown window through `burstGcdFindings`, Focus at the cap through
  `primaryResourceCapFindings`), `tracked-cooldowns.ts` (Takedown, 61s,
  unverified), `potion.ts`, generic checks. No case study: the melee.ts
  header counts one Survival player in the sample data, so nothing here is
  `verified`. WoWAnalyzer's rules were never run against a Survival kill.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions) are in
  [core.md](core.md); rows below cover only what Survival sets or adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| hunter-survival/AlwaysBeCasting/active-time-grade | superseded | `checkGcdGaps` | none | idle time | A looser cut than the core default: minor below 87.5%, average 82.5%, major 77.5% active. Whole-fight denominator, forced time counted as idle, nothing excluded. The guide's Active Time section even says it does not account for forced downtime. |
| hunter-survival/ResourceUseSection/focus-cap-grade | covered | `primaryResourceCapFindings` (Focus) | none | Focus sitting at the cap | Four-step rating on the share of the fight at the cap: 5 / 10 / 15%. Whole-fight, forced time counts as cap time. Focus regenerates, so the app sees only non-spending casts made at the cap (melee.ts header); passive regen lost at the cap isn't in the log. |
| hunter-shared/FocusTracker/percent-at-cap | superseded | `primaryResourceCapFindings` | none | Focus at 100 | The shared half of the row above, same 5 / 10 / 15% tiers. |
| hunter-shared/FocusDetails/generator-waste | covered | `primaryResourceCapFindings` | none | a generator cast at or near a full bar | Wasted over wasted-plus-gained, tiers 5 / 10 / 15%. The app sees only the generator casts made at the cap. |
| hunter-shared/FocusCapTracker/natural-regen-waste | unverifiable | — | none | standing at the cap with regen running | An estimate from a modelled regen rate (5 a second, scaled by haste, cap fixed at 100). Passive gain at the cap isn't logged; forced phases count as all lost regen. |
| hunter-survival/TipOfTheSpear/kill-command-timing-sentinel | candidate | — | Kill Command; Primal Surge (2 stacks a cast); Howl of the Pack Leader selects the other branch | a Kill Command cast while a Tip stack is already held | Without Pack Leader (the code treats that as Sentinel): good at 0 stacks, good at 1 only if Takedown is the next cast, fail at 2+, naming the wasted stacks. Value from the log: stacks wasted (stacks held plus gained, less the 3-stack cap) times the extra damage a Tip-buffed Boomstick, bomb or Swipe does over an untipped one, both measured from the player's own hits. Separating a mistake from what top players do: Kill Command is the generator and Focus starves otherwise, so capped stacks may be routine; count wasted stacks per minute on top players first. Hero-tree detection disagrees between WoWAnalyzer's own files, so the branch split is shaky. Doubtful for 12.0.7 numbers (Tip modified 2026-05-31). |
| hunter-survival/TipOfTheSpear/kill-command-timing-pack-leader | candidate | — | Howl of the Pack Leader; Primal Surge | a Kill Command at 2+ stacks, or 1 stack with no Howl buff and no Takedown next | The Pack Leader branch: good at 0 stacks, good at 1 if a Howl beast buff is up or Takedown is next, fail otherwise. Same valuation and same top-player question as above; build both as one check. A code comment in the branch contradicts its logic, so judge the logic. |
| hunter-survival/TipOfTheSpear/kill-command-low-focus-excuse | superseded | — | none | a Kill Command made to refill Focus | Under 30 Focus before the cast overrides every other grade. It is an exclusion inside the two Kill Command rows, so a built check carries it (read Focus before the cast from the cast's resource, less the gain). |
| hunter-survival/TipOfTheSpear/untipped-casts | candidate | — | Boomstick, Raptor Swipe, Twin Fangs (drops Takedown from the list), Howl of the Pack Leader (bomb excuse) | a Wildfire Bomb, Boomstick, Raptor Swipe or Takedown cast with no Tip stack | Listed as a fail when no Tip buff is up at the cast. Excused: the first bomb in the first 5s, a Pack Leader bomb under 30 Focus, a Boomstick in the first 10s. Value from the log: the Tip bonus on that hit, read as the player's tipped average less untipped average for the same spell. It does not check that a stack was obtainable (Kill Command may have been on cooldown), so the cost to the player is smaller than the count. Mistake vs top: a bomb or Boomstick pressed on cooldown rather than held for a stack is likely routine; measure the top players' untipped share before building. |
| hunter-survival/RaptorSwipe/tipped-and-hit | candidate | — | Raptor Swipe | a Swipe that hit nothing, or went out untipped | Hit none is a fail, tipped is good, untipped is a fail. The untipped half is under `untipped-casts`. The missed-cone half is log-visible (no damage event within 100 ms of the cast) and valued by the player's average Swipe, but is mostly forced downtime or a boss moving out of the cone; low value. The grade is "any hit", so cleave value isn't scored. |
| hunter-survival/Boomstick/tipped | superseded | — | Boomstick | an untipped Boomstick | Fails any Boomstick with no Tip, with no opener excuse, so it contradicts the Tip list (which excuses the first 10s). Subsumed by `untipped-casts`. |
| hunter-survival/Boomstick/channel-ticks | candidate | — | Boomstick | a Boomstick that lost ticks: moved, turned, or cut by another cast | Four ticks expected, a second apart at base haste; good with four, ok with three, fail with two or fewer, fail if cut short by the next ability. Value from the log: missing ticks times the cast's average tick. Movement is the user's leniency, and a tick lost to an untargetable or dead target counts here as a miss; only cuts with no forced window and no movement are the player's. Moderate value if clips are common. |
| hunter-survival/WildfireBomb/tipped-sentinel | superseded | — | Wildfire Bomb; Sentinel (hero tree, for the top grade) | an untipped bomb | Tip is read at impact, not the cast, so a stack gained in flight rescues it; the Pack Leader low-Focus excuse of the Tip list isn't applied here. Subsumed by `untipped-casts`. The "perfect" tier (a Sentinel's Mark on the target) is the mark rows below. |
| hunter-survival/Takedown/tip-stacks-at-cast | candidate | — | Takedown; Twin Fangs (flips the rule) | a Takedown cast with the wrong Tip stack count for the build | With Twin Fangs: good at 0 stacks, ok otherwise. Without it: good at 2+, ok at 1, fail at 0. Does not know why a cast was early (a fight-end Takedown still scores by stacks) and a pre-pull Takedown isn't special-cased. Value: very uncertain. The loss is an unbuffed Takedown window, and the app already checks the window's GCDs and the cooldown. Doubtful for 12.0.7 (Takedown changed 2026-04-28 and 2026-05-24). Low expected value. |
| hunter-survival/Takedown/tip-waste-in-window | superseded | — | Takedown; Primal Surge | a Kill Command in the Takedown window that overflows the 3-stack cap | A wasted-stack check limited to 11 seconds after Takedown (a hard-coded 8s plus 3s, not the buff's real length). It is the Kill Command rows' waste, restricted to a window. It isn't active seconds, so it doesn't double-count idle. Stack ordering at the cast event may already include that cast's own stack. |
| hunter-survival/Cooldown/takedown-bar | superseded | `checkCooldownDrift` (Takedown) | Takedown; Savagery (cooldown) | a Takedown held a full cooldown | The guide bar of the 85% Takedown target below, plus an ungraded Boomstick bar. The dead priority note says to hold Boomstick into Takedown on short fights, which this bar would count against the player. |
| hunter-survival/Abilities/takedown-efficiency | covered | `checkCooldownDrift` (Takedown, tracked 61s) + `burstGcdFindings` (Takedown window) | Takedown; Savagery (15s off per rank, from 90s) | a Takedown held past ready | 85% target, whole-fight, so forced time counts as ready and the last use is expected even when the fight ends first; the app counts whole lost uses less forced time. The tracked 61s is the shortest interval of one sampled player (median 62.5s) and agrees with a two-rank Savagery build; a build with fewer ranks would read as drift only if the 61s were wrong in the strict direction, which it isn't (it errs lenient). The opener offset (36s) also comes from that single player, so an early opener isn't expected. |
| hunter-survival/Abilities/kill-command-efficiency | wrong | — | Alpha Predator (lowers the target to 65%) | Kill Command used too rarely | 85% of a 5-second, two-charge hasted recharge. The Tip rules push the other way (hold Kill Command at 1-2 stacks), so a correct player reads below target by design. The real recharge is also shortened by effects the log doesn't show. Not tracked in tracked-cooldowns.ts. |
| hunter-survival/Abilities/wildfire-bomb-efficiency | candidate | — | Guerrilla Tactics (2 charges); Wildfire Infusion, Wildfire Shells, Lethal Calibration, Moon's Blessing, Stalk and Strike (reductions) | a bomb charge held | 85% target on an 18s hasted recharge. Not tracked: the cooldown is cut by Kill Command (0.5s a cast while it is recharging), by Boomstick ticks (2s a tick, up to 8s a cast, Wildfire Shells), by Moon's Blessing (6s per new mark) and by Stalk and Strike (10s). A candidate in the shape of the `spentCooldownDrift` model (a fixed reduction per event, `reduceOn`, plus `valuePerUse`). The Kill Command and Boomstick reductions come from casts and damage ticks rather than a buff the model reads, so the model needs a second event source; the mark reduction is from a debuff on enemies. Valued from the log as lost uses times a bomb's average damage. Expected value low to moderate and the reductions are not checkable from the log; most such candidates fail phase 3. |
| hunter-survival/Apl/sentinel-priority | superseded | the spec checks | Moonlight Chakram talent selects the list; Sentinel's Mark | nothing (the section is switched off) | Dead code, grades nothing. In one line each: Kill Command when no Tip is held; Boomstick when the target has no mark; a bomb when a mark is up or charges are nearly full; Takedown with no Tip; Chakram; a Swipe when its buff is up; Raptor Strike. Single-target scoring, pre-pull ignored. |
| hunter-survival/Apl/pack-leader-priority | superseded | the spec checks | Howl of the Pack Leader; Twin Fangs | nothing | Dead code. Kill Command with no Tip or with Howl ready at low stacks, then Takedown, Boomstick, a bomb under Wyvern's Cry, Swipe, Raptor Strike, then Kill Command, bomb and Takedown unconditionally, which would let almost anything pass; probably unfinished. |
| hunter-shared/SentinelsMark/mark-outcome-grade | candidate | — | Sentinel (hero tree); Moon's Blessing | a mark that expired, was overwritten, or sat through a target death | Each mark is good if a bomb impact consumed it, ok if the target died within a GCD, fail if it expired (older than 11.7s), was refreshed unused, or was open at the fight end. Log-visible (debuff events plus bomb damage). Value: the mark's payoff, read from bomb hits on marked vs unmarked targets. Doubts: marks land on random targets, so on cleave fights marks on unreachable adds fail; a phase that wipes the mark is graded as the player's failure. Mistake vs top: untested; the top players may let marks lapse equally. Moderate value if the measured bomb payoff is large. |
| hunter-shared/MoonlightChakram/use-grade | candidate | — | Moonlight Chakram; Stalk and Strike | no Chakram after Takedown, or a Chakram with few hits | A Chakram is expected soon after each Takedown; each cast is graded on hits (fail under 4, ok under 7). With Stalk and Strike, a cast wasting over 3s of the 10s bomb reduction fails. The hit-count grade depends on target count, so a correct single-target cast scores ok or fail; the reduction half isn't in the log. Value: a skipped Chakram times its average damage; the hit tiers are not valued. |
| hunter-shared/Stampede/tick-coverage | candidate | — | Howl of the Pack Leader (Stampede launched by Takedown) | a Stampede that crosses few enemies | Graded by ticks landed against nine per target (perfect at nine, good at seven, ok at five). Zero targets fails. A Stampede launched into an untargetable boss fails. Value: the missing ticks times the player's average Stampede tick. Low value (the ticks follow positioning). |
| hunter-shared/HowlBoar/hogstrider-hit | candidate | — | Howl of the Pack Leader | a boar charge that hit nothing | Perfect with any linked damage, fail with none. Fails on walls and vertical offsets, and during untargetable time. Low value. |
| hunter-shared/SentinelsMark/moons-blessing-cdr-waste | no-damage | — | Moon's Blessing; Sentinel | — | Displays the bomb reduction wasted when a mark lands with the bomb nearly ready. Not graded; the reduction isn't in the log. |
| hunter-shared/DeathTracker/feign-death-filter | no-damage | `checkDeaths` | none | — | A death shorter than 0.25% of the fight is treated as Feign Death and dropped. A death-list filter. |
| hunter-shared/CancelledCasts/cancelled-pct | no-damage | — | none | — | Not enabled for Survival (class note corrected). Where it is on, it is the core cancelled-casts rule; Survival has few cast-time spells besides Boomstick's channel. |
| hunter-survival/Abilities/arcane-torrent | no-damage | — | racial | — | A plugin option for Arcane Torrent at 0.5 efficiency, commented as a smaller benefit than for other classes. Racial. |
| hunter-survival/statistics | no-damage | — | — | — | Display only: Bloodseeker uptime, average stacks and attack-speed gain, with the pet's bleed damage; Wildfire Infusion, Wildfire Shells and Lethal Calibration reduction effective and wasted; bomb damage, casts, tipped share and Sentinel share; Raptor Swipe casts and misses; Boomstick damage, targets and clipped casts; Tip stacks wasted; the Takedown damage summary. Guide text without a grade: the Raptor Strike spender advice (a 77 Focus cut-off, nothing computed), the Tip advice (spend before generating), the intro (numbers are guidelines). The Raptor Strike spender is a spender-only efficiency target, superseded by the Focus cap row. |
| hunter-shared/utility | no-damage | — | — | — | Survival of the Fittest, Exhilaration, Aspect of the Turtle, Aspect of the Eagle cooldown only, Binding Shot, Tranquilizing Shot, Harpoon, Muzzle, Disengage, Freezing Trap, Misdirection, Primal Rage, Camouflage, Intimidation, Mend Pet: cooldowns shown, no efficiency target. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the Tip of the Spear stack
tracker and the normalizer that retypes its cast as a tick; the Boomstick,
Kill Command, Raptor Swipe and bomb-impact event links (windows of 100 ms,
2s, 3s and 4s); the shared Haste module with the Trigger Finger rank; the
Focus tracker, graph and the Survival spender list; the buffs timeline;
the cooldown-throughput tracker. Hand-kept in WoWAnalyzer, none of it
graded.

## Candidates left

Ordered by expected value, honest that most fail phase 3. Premise check on
top players comes first for all of them.

1. **Kill Command / Tip stack waste** (the two Kill Command rows and the
   in-window waste row as one check): only with a premise check that top
   players don't waste stacks as often. The loss is real if the bonus is
   large; the risk is that Focus starvation makes it routine.
2. **Untipped casts** (bombs, Boomstick, Swipe): the cleanest damage
   number, but "no stack obtainable" must be excluded or it overcounts.
3. **Wildfire Bomb cooldown drift** with a reduction model: depends on
   what the log lets the model see, and the sources are partly unlogged.
4. **Boomstick channel ticks**: a measured loss, but movement is lenient,
   so only clean cuts count.
5. **Sentinel's Mark outcome**: needs the measured bomb payoff first.
6. **Moonlight Chakram, Stampede, Hogstrider, Swipe misses, Takedown stack
   count at cast**: low value, mostly positioning or forced time.
