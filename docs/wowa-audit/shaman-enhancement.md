# WoWAnalyzer audit: Enhancement Shaman

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Shaman shared layer,
  then the spec), spot-checked at their source lines (5 of
  5 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-10-06
  (Tempest full-stack counting). The changelog has no 12.1.0 entry, so
  module dates are the freshness signal. No priority list and no checklist:
  every grade is a guide section with Perfect / Good / Ok / Fail marks per
  window or per cast. Most rules are scoped to a window (Doom Winds or
  Ascendance, Hot Hand, a Surging Totem cycle, one Primordial Storm), so the
  Stasis-as-ready error mostly doesn't reach them; the exceptions are the
  Doom Winds cast efficiency and the proc ratios.
- **App:** Enhancement has **no entry** in `lib/damage/wow/specs/` (not in
  `melee.ts`, `ranged.ts` or `index.ts`) and none in
  `tracked-cooldowns.ts`. A pull of one gets only the generic checks
  (`checkGcdGaps`, `checkProcs`, deaths, interrupts) plus `combatPotion`
  (`potion.ts`). It also has no survey rows in `spell-data.ts`, so no
  cooldown interval or window bonus has ever been measured for it. No case
  study; the melee header's samples list doesn't include it. Elemental
  Shaman's keyed entry (`ranged.ts`) and its ledger are the nearest
  reference.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, melee uptime,
  consumables) are in [core.md](core.md); rows below cover only what
  Enhancement sets or adds. Shared Shaman rules are in the rows
  `shaman-shared/...`; Elemental's ledger already judged the same Flame Shock
  rules, and its measurements are cited, not repeated.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| shaman-enhancement/AlwaysBeCasting/downtime-thresholds | superseded | `checkGcdGaps` | none | idle time | Loosens the idle tolerance to 12.5 / 17.5 / 22.5% of the fight, but the guide's downtime section appears to read a differently named getter, so the core 5 / 10 / 15% probably still applies. That is not confirmed (read only). Either way a whole-fight share with Stasis counted as idle; the app values each gap less forced time. |
| shaman-enhancement/Abilities/doom-winds-cast-efficiency | candidate | none yet (`checkCooldownDrift` once tracked) | Doom Winds; off for builds with Ascendance or Deeply Rooted Elements | Doom Winds held past ready | 100% target on a 60s cooldown with no reduction modelled, so it passes the tracked-cooldowns rule (gated by nothing but its recast). Not tracked, and never surveyed: the intervals have to be measured on Enhancement logs first (rule of tracked-cooldowns.ts: skip it if the median runs past 1.25x the shortest). WoWAnalyzer counts forced time as ready and expects a late last use; the app counts whole lost uses less forced time. Value: a lost Doom Winds is a whole window, the largest single loss the spec has. Phase 3 must check that top players don't hold it for burn phases or a Primordial Storm sync (the guide itself tells players to compare to top logs). |
| shaman-enhancement/Abilities/ungraded-cooldown-declarations | candidate | none yet (`checkCooldownDrift`) | Ascendance (180s, 60s shorter with Thorim's Invocation); Sundering; Surging Totem | a major cooldown held past ready | WoWAnalyzer grades none of these; it only draws a cooldown graph. They are the same tracked-cooldown candidates as Doom Winds: Ascendance (Elemental's is tracked at 120s), Sundering (30s, and its Primordial Storm proc ties it to the Storm), Surging Totem (60s, hero tree). Lava Lash, Stormstrike and Crash Lightning have charges, haste scaling and invisible reductions, so they stay out (see the unverifiable rows). Low to moderate; measure intervals first. |
| shaman-enhancement/Abilities/windstrike-cast-efficiency | unverifiable | — | Ascendance or Deeply Rooted Elements; Stormblast (second charge) | Windstrike available but not cast in a window | 80% target against a custom maximum built from WoWAnalyzer's own cooldown simulation. Stormstrike's resets and reductions (Elemental Tempo, Stormsurge, Hot Hand) are server-side and never logged, so availability can't be rebuilt from the log (dps-analysis.md, cooldown reductions). The window's lost GCDs are the part the app can value (see `window-unused-gcds`). |
| shaman-enhancement/DoomWinds/window-trigger-rate | unverifiable | — | Doom Winds; Thorim's Invocation; Hot Hand softens it | Stormstrike / Crash Lightning not cast while ready in a window | Share of possible Thorim's Invocation triggers used, from simulated cooldown availability (same limit as Windstrike). It scores single-target priority, weighting Crash Lightning equal to Windstrike whatever the target count, and the rating forgives nothing displaced by Lava Lash under Hot Hand. What is log-visible: free casts per window and the window's GCDs. |
| shaman-enhancement/DoomWinds/window-unused-gcds | candidate | `checkGcdGaps` (the normal GCD only; `burstGcdFindings` if keyed) | Doom Winds / Ascendance | idle GCDs in a window | Idle share of the window's possible casts: perfect to 7.5%, good to 15%, ok to 25%. Not a double count: idle inside the window costs more than a normal GCD (as Elemental's Call of the Ancestors, re-measured), and the app has no Enhancement window check. Counts forced movement and untargetable time as lost, and floors each gap separately so many short ones go unseen. A real window finding for Enhancement would be the app's own `burstGcdFindings` on the Doom Winds buff, the way Elemental has one on Ascendance; that is a keying job, not a WoWAnalyzer rule. |
| shaman-enhancement/DoomWinds/window-overall | superseded | — | Doom Winds / Ascendance | — | The lower of the trigger-rate and idle-GCD marks. A combiner of the two rows above. Its "Ascendance held" figure ignores a pre-pull cast, as the core does. |
| shaman-enhancement/HotHand/lava-lash-usage | candidate | none | Hot Hand; Totemic Momentum; Thorim's Invocation | Lava Lash left unused during Hot Hand | WoWAnalyzer's version (casts over a simulated maximum, Hot Hand multiplying Lava Lash's recharge 2.5x or 4x) can't be rebuilt: the recharge rate is not logged. What the log does show is Lava Lash casts per Hot Hand window, which could be compared with top players' and valued by the Lava Lash average hit. The premise to test in phase 3 is that a weaker player casts fewer per window than top ones; if rates match, it fails like Elemental's candidates did. Low to moderate. |
| shaman-enhancement/HotHand/window-unused-gcds | candidate | `checkGcdGaps` (the normal GCD only) | Hot Hand | idle GCDs in a Hot Hand window | Same grading as the Doom Winds idle check (it floors the sum of gaps instead of each gap). Idle inside the window costs more than a normal GCD; build as `burstGcdFindings` on the Hot Hand buff, valued at its measured bonus. Low: Hot Hand windows are short. |
| shaman-enhancement/HotHand/totemic-momentum-efficiency | candidate | none | Totemic Momentum; Hot Hand | Maelstrom Weapon held or capped inside the window | Stacks spent in the window over spent plus avoidable waste plus spendable stacks left; each stack extends the buff by about a fifth of a second in WoWAnalyzer's model. Needs the Maelstrom Weapon stack model the app lacks (see `MaelstromWeaponTracker`); the extension itself is visible as Hot Hand's duration. Low: a short extension per stack, built on a tracker that is the main work. |
| shaman-enhancement/HotHand/splitstream-link | candidate | none | Surging Totem; Earthsurge; Splitstream; Hot Hand | Lava Lash under Hot Hand with no extra Sundering | Counts Lava Lash casts without a linked extra Sundering hit (perfect at 0, ok at 1, else fail). The extra hit is a logged damage event, so a missed one is visible and valued by the Sundering average. WoWAnalyzer links it by a hard-coded time buffer. Needs a Surging Totem build to exist in the sample; the top players' miss rate decides it. Low to moderate. |
| shaman-enhancement/Earthsurge/empty-sundering | superseded | — | Earthsurge; Hot Hand | a Lava Lash whose extra Sundering hit nothing | A per-cast note for the same miss as `splitstream-link`. |
| shaman-enhancement/HotHand/surging-totem-inactive | superseded | — | Earthsurge; Hot Hand; Surging Totem | Hot Hand Lava Lash with the totem down | A per-cast note naming one cause (the totem gone) of the same missing extra hit as `splitstream-link`. |
| shaman-enhancement/HotHand/window-overall | superseded | — | Hot Hand | — | The lower of the Lava Lash usage mark and the average of the other marks. A combiner. Buff uptime and average Lava Lash per proc are display only. |
| shaman-enhancement/PrimordialStorm/maelstrom-spent | candidate | none | Primordial Storm; Overflowing Maelstrom (cap 10) | Primordial Storm cast below 10 stacks | Perfect at 10, good from 8, ok from 5. Stacks at the cast are visible. Joined with `Tempest/full-maelstrom-rate`: the candidate is a Maelstrom Weapon spend-size check for the two big spenders, valued by the missing stacks over the stack-scaled average hit. WoWAnalyzer has no hold-versus-lose logic (waiting costs the proc), which is where top players will differ, so phase 3 must count how often top players cast below 10 first. Moderate. |
| shaman-enhancement/PrimordialStorm/window-sync | candidate | none | Primordial Storm; Doom Winds (every 2nd cast); Ascendance (every 4th) | the Nth Storm cast outside the window | A fixed ratio that assumes 60s / 30s and 120s / 30s cycles, counts casts from the start of the fight with no pre-pull Storm, and ignores holds for burn phases. This is the author's rotation, not a log fact. Value would be Storm damage inside versus outside the buff, which the log does show; most likely to fail phase 3. Low. |
| shaman-enhancement/PrimordialStorm/sundering-before-window | superseded | — | Primordial Storm; Sundering; Doom Winds / Ascendance | the Sundering setting up the Storm cast inside the window | Ordering of two casts around the window edge. The GCD it displaces is already a window question (`burstGcdFindings` once keyed) and no loss is shown beyond that. |
| shaman-enhancement/PrimordialStorm/sundering-followup | covered | `checkProcs` (expiries) | Primordial Storm; Sundering | a Sundering whose Storm proc expired or was overwritten | Missed Sundering share: perfect at zero, good to 20%, fail above. The proc buff expiring unused is the generic proc check's case; it needs the buff to meet the check's thresholds (three removals and a consumer cast beside them). Not run on an Enhancement log, so whether it picks the buff up is phase 3. Overwrites by a second Sundering are not counted in the WoW path of `checkProcs` (see `Tempest/overwritten-procs`). |
| shaman-enhancement/PrimordialStorm/cast-overall | superseded | — | Primordial Storm | — | The average of the stack, sync and Sundering marks; can average a fail into a good. A combiner. |
| shaman-enhancement/ElementalTempo/cdr-waste-score | unverifiable | — | Elemental Tempo | Maelstrom Weapon spent while Stormstrike and Lava Lash already ready | Wasted cooldown reduction per spend. The reduction is a talent effect never logged, and WoWAnalyzer itself says the section is informative, not a grade. It also mixes in a stack-count preference (see the spend-size candidate). |
| shaman-enhancement/StormUnleashed/wasted-procs | covered | `checkProcs` (expiries) | Storm Unleashed; Crash Lightning | a proc expired or refreshed unused | Counts only, no grade. Expiry unused is the generic check; overwrites aren't (WoW path). Not run on an Enhancement log. |
| shaman-enhancement/Tempest/proc-usage-rate | covered | `checkProcs` (expiries) | Tempest (Stormbringer) | a Tempest proc lost | Consumed share of all procs: perfect from 95%, good from 85%, ok from 70%. The generic check counts the expired ones; overwritten ones are the next row. A fight-wide ratio of procs, so no Stasis problem. Not run on an Enhancement log. |
| shaman-enhancement/Tempest/expired-procs | covered | `checkProcs` | Tempest | any proc expired | Perfect at zero. Same check. WoWAnalyzer counts a proc at the very end of the fight. |
| shaman-enhancement/Tempest/overwritten-procs | candidate | none | Tempest | a second proc while one is held | The WoW path of `checkProcs` reads expiries only (overwrites are FFXIV's, via a per-game set). Random procs overwrite unavoidably, which top players share, so most likely a floor. Low. |
| shaman-enhancement/Tempest/full-maelstrom-rate | candidate | none | Tempest; Overflowing Maelstrom | Tempest cast below 10 stacks | Casts at 10 stacks over consumed procs; free Thorim's Invocation casts count as full. Hard-coded 10 even when Overflowing Maelstrom changes the cap. Folded into the spend-size candidate with `PrimordialStorm/maelstrom-spent`. |
| shaman-enhancement/SurgingTotem/consume-order | unverifiable | — | Surging Totem; Sundering; Doom Winds | Whirling buffs consumed out of order | The preferred order (earth, then fire, then air under Doom Winds) is the author's rotation. The log shows the order, but nothing shows the order costs damage; an expired Whirling buff is the generic proc case. |
| shaman-enhancement/SurgingTotem/doom-winds-position | unverifiable | — | Surging Totem; Doom Winds | Doom Winds cast early or late in the totem cycle | A pass / fail on Doom Winds sitting between two consumers; assumes a 60s Doom Winds fits each 60s totem and isn't checked for the longer Ascendance cycle. The same author-rotation limit. |
| shaman-enhancement/SurgingTotem/filler-casts | unverifiable | — | Surging Totem | casts between the first consume and the sequence end that weren't a consumer | Whether a cast was a filler depends on availability (simulated cooldowns) and ignores spenders cast for other reasons. Not log-derivable. |
| shaman-enhancement/SurgingTotem/window-overall | superseded | — | Surging Totem; Hot Hand | — | A weighted score of the totem rows above plus the Totemic Momentum mark; a combiner. The 30s cycle is hard-coded. |
| shaman-enhancement/S2TierSet/voltaic-blaze-held | candidate | none yet (`checkCooldownDrift`) | Voltaic Blaze; Midnight season 2 set (2 or 4 piece) | Voltaic Blaze held past ready | Counts casts made while it was ready, unrated. Gated only by its recast, so it could be a tracked cooldown, but WoWAnalyzer applies the Hot Hand / Ascendance exemption to other modules and not to this one, and the cooldown is shortened by a talent. Needs interval measurement. Low. |
| shaman-enhancement/S2TierSet/crash-lightning-held | unverifiable | — | Crash Lightning; season 2 set 4 piece; Fire Nova; Storm Unleashed | another cast while Crash Lightning was ready | Charge, haste scaling, the four-piece's reduction per Fire Nova pulse and Storm Unleashed's cooldown bypass are all invisible. Unrated in WoWAnalyzer too. |
| shaman-enhancement/MaelstromWeaponTracker/waste-grade | candidate | none (`primaryResourceCapFindings` is the nearest) | Overflowing Maelstrom | stacks gained into a full bar | Wasted over generated and wasted: perfect to 10%, good to 20%, ok to 30%. The getter is **dead code** in WoWAnalyzer; nothing reads it (only Hot Hand's avoidable-only figure does). The app's resource-cap check reads a class resource from cast records; Maelstrom Weapon is a buff stack, so the check probably doesn't see it. The stack buff events are in the log, so the cap rebuild is possible; whether a cast-record resource exists is the first thing to check. Moderate: a wasted stack is a fraction of a spender. |
| shaman-enhancement/ThorimsInvocation/unprimed-chain-lightning | superseded | — | Thorim's Invocation; Ascendance | a free Chain Lightning that hit one target | A per-cast note; same finding as `ChainLightning/single-target-hit`. |
| shaman-enhancement/ChainLightning/single-target-hit | candidate | none | Chain Lightning | a Chain Lightning that hit one target | Annotation only. On Elemental the same rule is a real loss of ~35k a cast, top players included (shaman-elemental.md, re-measured 2026-10-16). Not measured for Enhancement, where a free Thorim's cast makes the choice differently; value it the same way, against the player's own Lightning Bolt. |
| shaman-shared/FlameShock/uptime | candidate | `dotUptimeFindings` (not keyed for Enhancement) | none; Voltaic Blaze swaps it out of the spellbook | Flame Shock left off | Under 99 / 95 / 85% of the whole fight, pooled over enemies. Enhancement's guide shows no grade, only a statistic. Elemental verified the rule (99.5% both players) and has the dot check; keying it for Enhancement is one line, but the premise is untested for this spec, where Flame Shock feeds Ashen Catalyst and is a smaller part of the rotation. Low to moderate. |
| shaman-shared/FlameShock/early-refresh | candidate | none | none | Flame Shock refreshed with more than 30% left | Elemental's ledger marked this `wrong` after measurement (top players refresh early, WoWAnalyzer calls it a movement filler). Not remeasured here; carried as a candidate expected to fail. Lowest. |
| shaman-shared/FlameShock/lava-burst-without-shock | no-damage | — | Lava Burst | — | A counter with no grade, and Lava Burst isn't Enhancement's rotation. In the Elemental measurement it came from target swaps, not skill. |
| shaman-shared/utility | no-damage | — | — | — | Astral Shift, Earth Shield family, Earth Elemental, Nature's Guardian, Spirit Wolf, Static Charge and Capacitor, Mana Spring, Spiritwalker's Grace, Feral Lunge, Wind Shear and the other totems: spellbook entries and estimated-mitigation statistics. The guide says any use of a defensive is good and ungraded. Utility and defensives aren't judged. |
| shaman-enhancement/statistics | no-damage | — | — | — | Display only: Hot Hand uptime, buffed Lava Lash damage, Stormflurry extra hits, Elemental Assault, Feral Spirit bonus, Stormsurge resets and waste, Thorim's Invocation spells, Ashen Catalyst reduction, Thunder Capacitor bonus, Fire Nova, Voltaic Blaze, the season 2 set bonus, Maelstrom Weapon gain and spend per second and per generator, damage per stack spent. The cooldown throughput tracker (Ascendance, Berserking, Blood Fury, Doom Winds) is also display. |

## Not rules

Models the rules above rest on:

- The Maelstrom Weapon resource model: tracker, graph, per-generator
  breakdown, and the avoidable / unavoidable waste classification.
- The normalizers: the Maelstrom Weapon resource normalizer (stack buffs to
  resource events with a best-fit reconciliation), cast, event link, event
  order and buff normalizers, with their hard-coded millisecond link buffers
  that decide what counts as linked (free Thorim's casts, Whirling buffs,
  extra Sundering hits).
- The window builders (Doom Winds, Hot Hand, Surging Totem), the interval
  helper and the simulated cooldown availability, including the spellbook
  subclass that makes Stormstrike unavailable during Ascendance and
  Windstrike available only in it. Every availability figure above rests on
  it, and its cooldown reductions are not in the log.
- Constants: the merge-spell table, the Maelstrom-eligible spell list, the
  GCD tolerance and the link buffers (table, not extracted).
- The aura timeline and the shared rating helpers (score breakpoints, the
  weighted aggregate).

## Candidates left

In order of expected value; all are unmeasured, and most fail phase 3.

1. **doom-winds-cast-efficiency** plus the other major cooldowns
   (Ascendance, Sundering, Surging Totem): track them in
   `tracked-cooldowns.ts` after measuring intervals on Enhancement logs. The
   biggest loss if real; first test is that top players don't hold Doom
   Winds for burn phases.
2. **Maelstrom spend size** (`PrimordialStorm/maelstrom-spent`,
   `Tempest/full-maelstrom-rate`) and **Maelstrom Weapon cap waste**
   (`MaelstromWeaponTracker/waste-grade`): both need the stack model; build
   it once for both. Count how often top players spend below 10 before
   believing it.
3. **splitstream-link**: visible and valuable per miss, only for Surging
   Totem builds.
4. **Hot Hand Lava Lash count per window** (`lava-lash-usage`): a cast-rate
   comparison against top players, not WoWAnalyzer's simulated maximum.
5. **Flame Shock uptime**: cheap to key; worth only if a page disagrees.
6. **totemic-momentum-efficiency**, **window-sync**,
   **overwritten-procs**, **voltaic-blaze-held**, **early-refresh** and
   **single-target-hit**: low, and expected to fail.

Also worth doing before any of the above: key an Enhancement entry in
`melee.ts` with `burstGcdFindings` on the Doom Winds buff, as the other
melee specs have; that is the app's counterpart of the idle rules marked
`wrong` here, and today an Enhancement pull has no window finding at all.
