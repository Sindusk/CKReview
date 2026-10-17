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
- **App (before phase 3):** Enhancement had **no entry** in
  `lib/damage/wow/specs/` and none in `tracked-cooldowns.ts`. A pull of
  one got only the generic checks (`checkGcdGaps`, `checkProcs`, deaths,
  interrupts) plus `combatPotion` (`potion.ts`). Its presses entered the
  spell survey only with the sweep (13104a3, `SWEEP_PRESSES`). No case
  study. Elemental Shaman's keyed entry (`ranged.ts`) and its ledger are
  the nearest reference.
- **Phase 3 (2026-10-17):** done (Claude Opus 5.5). Measured on 23
  Enhancement player-pulls, all Mythic kills: 19 on disk and four top
  parses fetched for this pass (Jshaman amZr6A4Pn8fWqcN9 fight 31, Vashnik
  100th; Fjedn dt9xLXJKMZc62hC3 fight 35, Vashnik 99.6th; Kurugh
  WDNdyzgKArhYM327 fight 23, Entombed Sentinels 100th; Zaappers
  JQVkMCb8T324yWca fight 22, Entombed Sentinels 99.7th). Others by WCL
  rank: Zamostakos (6kHtGaQXCMWYxFpZ, 89th), Greythunder
  (X618LRt7hPqzbVJj, 84th), Glizzylizzy (hjHXmdnJFwTPpMtK, 81st), Ripzug
  (mNkHXhaD6Y2tqQTg) and Lollytotem (Ftj4vwHf9RazPcqV, ~62nd), Vanilla
  (v8bmgMAdcnBCj9Ya, 45th), Toranha (nhbCYHXRf1T2qAv9, 49th), Morkkâ
  (8kVQMJ4rmpnyRjBH, 31st), Tolu (atJRCq3YM8P4KGpD, 28th), Anfall
  (Ndh2H6Qw4Pp1qaMk, 21st), Macroos (LCFp3wbHvQqNP4my, 20th), Niky
  (7pFPAqzc2NHLXjwZ, 4.9th); the static's Cocroach on four pulls of
  gVDPhzp61Zm29HMw; Zóhrg (kZnVcJYpKFRChTzb), Thaw (zpRGrxBgjJH7A3yk),
  Throttnuk (dt9xLXJKMZc62hC3) unranked here.
  **Talents:** every player is the same build: Stormbringer (Tempest, Arc
  Discharge), Ascendance pressed (3–4 a pull), Thorim's Invocation,
  Overflowing Maelstrom (Maelstrom Weapon to 10), Voltaic Blaze in place of
  Flame Shock, Storm Unleashed, Stormsurge, Stormblast. Nobody presses
  Doom Winds, Feral Spirit, Sundering, Surging Totem or Primordial Storm,
  and nobody has Hot Hand: the Hot Hand, Surging Totem and Primordial
  Storm rows have nothing to judge on these pulls. Doom Winds (466772) is a
  10s buff that comes with every Ascendance and 1–3 times a pull with a
  spender; its 469270 "casts" are once-a-second pulses, never a press.
  **Built** (lib/damage/wow/specs/enhancement.ts, whose header holds the
  models and numbers; wired from melee.ts): Ascendance drift (tracked,
  120s, valued by its window, `burstHold`), Voltaic Blaze drift (tracked,
  10s, its hit less a Stormstrike's, `burstHold`), "Maelstrom Weapon
  capped", "Idle in Ascendance", Flame Shock uptime; Stormsurge expiry
  (procs.ts). **Engine** (game.ts): a Stormstrike's Thorim's spender and a
  spender's Storm Unleashed Crash Lightning log 10–30ms after the press
  and read as two presses in one GCD; they are its twins now
  (`COINCIDENT_AUTO`). Enhancement gets **no** generic window check and
  **no** resource cap check: `burstGcdFindings` on Ascendance can't fire
  (presses inside come every ~0.96s against the 1.1–1.25s modelled GCD,
  so no window ever reads short), and `primaryResourceCapFindings` reads
  nothing (Enhancement's casts log only Mana; Maelstrom Weapon is a buff
  stack, which "Maelstrom Weapon capped" reads). No `wrong` rows came from
  phase 2. Proposed `wrong`: Tempest overwritten, Tempest below 10 stacks,
  Chain Lightning on one target, Flame Shock early refresh.
- **Core rules** (active time, cast efficiency, potions, melee uptime,
  consumables) are in [core.md](core.md); rows below cover only what
  Enhancement sets or adds. Shared Shaman rules are in the rows
  `shaman-shared/...`; Elemental's ledger already judged the same Flame Shock
  rules, and its measurements are cited, not repeated.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| shaman-enhancement/AlwaysBeCasting/downtime-thresholds | superseded | `checkGcdGaps` | none | idle time | Loosens the idle tolerance to 12.5 / 17.5 / 22.5% of the fight, but the guide's downtime section appears to read a differently named getter, so the core 5 / 10 / 15% probably still applies. That is not confirmed (read only). Either way a whole-fight share with Stasis counted as idle; the app values each gap less forced time. Phase 3 (2026-10-17): with the sweep's presses and the twins fix, the top players read 87–91% GCD uptime and 0–7 gaps a pull (Jshaman 9.9s, none with a press inside); what precedes them is an ordinary press. |
| shaman-enhancement/Abilities/doom-winds-cast-efficiency | candidate | none | Doom Winds; off for builds with Ascendance or Deeply Rooted Elements | Doom Winds held past ready | 100% target on a 60s cooldown with no reduction modelled. Phase 3 (2026-10-17): unmeasured. All 23 player-pulls take Ascendance, the build the rule excludes, and none presses Doom Winds: its buff (466772) comes with each Ascendance (53 of 120 applications) and with a Lightning Bolt, Chain Lightning or Tempest (52), and its 469270 casts are 1.00s pulses inside that 10s buff (40–70 a pull). Waits for a log of a build that presses it. |
| shaman-enhancement/Abilities/ungraded-cooldown-declarations | verified | "Ascendance drift" (`tracked-cooldowns.ts`, `ascendanceValue` in specs/enhancement.ts) | Ascendance (180s, 60s shorter with Thorim's Invocation); Sundering; Surging Totem | a major cooldown held past ready | WoWAnalyzer grades none of these. Phase 3 (2026-10-17): Ascendance (114051) is 120s here: shortest interval 120.0–125.9s on every player (Glizzylizzy 120.00, Fjedn 119.99), median 120–180s. Its 15s window does 6.3–10.1M, 2.6–4.0× the player's rate outside Ascendance and Doom Winds; a use is worth the window less that rate (3.5–7.5M, median ~5.5M; its own hit 344548 is only 29–106k). The top Vashnik players hold it for the Imbibes (Jshaman 0:25, 3:13, 6:01; Lollytotem the same), so `burstHold`; Kurugh held one 60s on Entombed Sentinels and lost no use before the kill. Fires: top and mid players none; Macroos (LCFp3wbHvQqNP4my) 5.96M (2:13, 4:49: room for a fourth before the 7:00 kill), Toranha (nhbCYHXRf1T2qAv9) 4.27M. Sundering and Surging Totem: nobody takes them. |
| shaman-enhancement/Abilities/windstrike-cast-efficiency | unverifiable | — | Ascendance or Deeply Rooted Elements; Stormblast (second charge) | Windstrike available but not cast in a window | 80% target against a custom maximum built from WoWAnalyzer's own cooldown simulation. Stormstrike's resets and reductions (Elemental Tempo, Stormsurge, Hot Hand) are server-side and never logged, so availability can't be rebuilt from the log (dps-analysis.md, cooldown reductions). The window's lost GCDs are the part the app can value (see `window-unused-gcds`). |
| shaman-enhancement/DoomWinds/window-trigger-rate | unverifiable | — | Doom Winds; Thorim's Invocation; Hot Hand softens it | Stormstrike / Crash Lightning not cast while ready in a window | Share of possible Thorim's Invocation triggers used, from simulated cooldown availability (same limit as Windstrike). It scores single-target priority, weighting Crash Lightning equal to Windstrike whatever the target count, and the rating forgives nothing displaced by Lava Lash under Hot Hand. What is log-visible: free casts per window and the window's GCDs. |
| shaman-enhancement/DoomWinds/window-unused-gcds | verified | "Idle in Ascendance" (specs/enhancement.ts) | Doom Winds / Ascendance | idle GCDs in a window | Idle share of the window's possible casts: perfect to 7.5%, good to 15%, ok to 25%. Phase 3 (2026-10-17): `burstGcdFindings` on Ascendance can't fire: presses inside come a median 0.96–1.12s apart (Windstrike, at the 0.75s floor at p10) against 1.16–1.23s outside, so the GCDs that fit from the ordinary 1.1–1.25s GCD sit under what the top players press. Built instead on the gap check's own unforced idle inside the window (less movement), each GCD priced at a Windstrike press with its Thorim's spender less the average GCD the gap check already priced. Top 0–25k a pull (Fjedn 25k); weak Niky (7pFPAqzc2NHLXjwZ) 404k (2.1s at 2:24 and 5:11), Cocroach 127k (Nek'zali), Vanilla 92k, Anfall 62k. Doom Winds' proc windows outside Ascendance aren't judged. |
| shaman-enhancement/DoomWinds/window-overall | superseded | — | Doom Winds / Ascendance | — | The lower of the trigger-rate and idle-GCD marks. A combiner of the two rows above. Its "Ascendance held" figure ignores a pre-pull cast, as the core does. |
| shaman-enhancement/HotHand/lava-lash-usage | candidate | none | Hot Hand; Totemic Momentum; Thorim's Invocation | Lava Lash left unused during Hot Hand | WoWAnalyzer's version (casts over a simulated maximum) can't be rebuilt: the recharge rate is not logged. What the log shows is Lava Lash casts per Hot Hand window. Phase 3 (2026-10-17): unmeasured: no Hot Hand buff on any of the 23 player-pulls (Lava Lash 5–33 presses a pull, a filler). |
| shaman-enhancement/HotHand/window-unused-gcds | candidate | `checkGcdGaps` (the normal GCD only) | Hot Hand | idle GCDs in a Hot Hand window | Same grading as the Doom Winds idle check. Phase 3 (2026-10-17): unmeasured: nobody has Hot Hand. Build it as "Idle in Ascendance" is built if a Hot Hand log turns up. |
| shaman-enhancement/HotHand/totemic-momentum-efficiency | candidate | none | Totemic Momentum; Hot Hand | Maelstrom Weapon held or capped inside the window | Phase 3 (2026-10-17): unmeasured (no Hot Hand, no Totemic). The Maelstrom Weapon stack model it needs now exists ("Maelstrom Weapon capped": the log keeps every stack count). |
| shaman-enhancement/HotHand/splitstream-link | candidate | none | Surging Totem; Earthsurge; Splitstream; Hot Hand | Lava Lash under Hot Hand with no extra Sundering | Counts Lava Lash casts without a linked extra Sundering hit. Phase 3 (2026-10-17): unmeasured: no Surging Totem or Sundering on any sample. |
| shaman-enhancement/Earthsurge/empty-sundering | superseded | — | Earthsurge; Hot Hand | a Lava Lash whose extra Sundering hit nothing | A per-cast note for the same miss as `splitstream-link`. |
| shaman-enhancement/HotHand/surging-totem-inactive | superseded | — | Earthsurge; Hot Hand; Surging Totem | Hot Hand Lava Lash with the totem down | A per-cast note naming one cause (the totem gone) of the same missing extra hit as `splitstream-link`. |
| shaman-enhancement/HotHand/window-overall | superseded | — | Hot Hand | — | The lower of the Lava Lash usage mark and the average of the other marks. A combiner. |
| shaman-enhancement/PrimordialStorm/maelstrom-spent | candidate | none | Primordial Storm; Overflowing Maelstrom (cap 10) | Primordial Storm cast below 10 stacks | Perfect at 10, good from 8, ok from 5. Phase 3 (2026-10-17): unmeasured: nobody takes Primordial Storm. The same test on the spenders these players press failed (see `Tempest/full-maelstrom-rate`), so expect it to fail too. |
| shaman-enhancement/PrimordialStorm/window-sync | candidate | none | Primordial Storm; Doom Winds (every 2nd cast); Ascendance (every 4th) | the Nth Storm cast outside the window | A fixed ratio that assumes 60s / 30s and 120s / 30s cycles. Phase 3 (2026-10-17): unmeasured (no Primordial Storm). |
| shaman-enhancement/PrimordialStorm/sundering-before-window | superseded | — | Primordial Storm; Sundering; Doom Winds / Ascendance | the Sundering setting up the Storm cast inside the window | Ordering of two casts around the window edge. No loss shown beyond the window's GCDs. |
| shaman-enhancement/PrimordialStorm/sundering-followup | covered | `checkProcs` (expiries) | Primordial Storm; Sundering | a Sundering whose Storm proc expired or was overwritten | Missed Sundering share. The proc buff isn't in procs.ts, so `checkProcs` can't see it run out. Phase 3 (2026-10-17): nobody takes Sundering or Primordial Storm; measure the proc's duration (procs.ts) when a log has it. |
| shaman-enhancement/PrimordialStorm/cast-overall | superseded | — | Primordial Storm | — | The average of the stack, sync and Sundering marks; a combiner. |
| shaman-enhancement/ElementalTempo/cdr-waste-score | unverifiable | — | Elemental Tempo | Maelstrom Weapon spent while Stormstrike and Lava Lash already ready | Wasted cooldown reduction per spend. The reduction is a talent effect never logged, and WoWAnalyzer itself says the section is informative, not a grade. |
| shaman-enhancement/StormUnleashed/wasted-procs | verified | `checkProcs` (procs.ts: Storm Unleashed 20s → Crash Lightning) | Storm Unleashed; Crash Lightning | a proc expired or refreshed unused | Counts only, no grade. Phase 3 (2026-10-17): fires: Cocroach (gVDPhzp61Zm29HMw, Entombed Sentinels) 2:39 and Vanilla (v8bmgMAdcnBCj9Ya) 1:02, both 20.0s after the gain and both in forced time; 2 of 355 removals unconsumed, none on the top players. It's spent by a spender's Crash Lightning (logged beside the Lightning Bolt / Chain Lightning / Tempest), which counts as the consumer. 1 refresh while up in 23 pulls: overwrites negligible. |
| shaman-enhancement/Tempest/proc-usage-rate | unverifiable | — | Tempest (Stormbringer) | a Tempest proc lost | Consumed share of all procs. Was `covered` by `checkProcs`, but Tempest isn't in procs.ts (no duration). Phase 3 (2026-10-17): 152 of 623 removals of the buff (454015) have no Tempest cast within 0.3s, on every player (top Fjedn 11, Kurugh 9, Zaappers 9), 0.3–8s after the gain, with no cast of any kind beside them: something consumes it that the log doesn't show as a cast, so an expiry can't be told from a use. No whole-second span cluster (longest 30.0, 21.8, 20.1, 20.0s). |
| shaman-enhancement/Tempest/expired-procs | unverifiable | — | Tempest | any proc expired | Perfect at zero. Phase 3 (2026-10-17): as the row above, no measurable duration. |
| shaman-enhancement/Tempest/overwritten-procs | wrong | — | Tempest | a second proc while one is held | Phase 3 (2026-10-17): Tempest stacks to 2, and a refresh of a held one shows 3 times in 23 player-pulls (753 gains). Nothing to lose. Proposed `wrong`. |
| shaman-enhancement/Tempest/full-maelstrom-rate | wrong | — | Tempest; Overflowing Maelstrom | Tempest cast below 10 stacks | Casts at 10 stacks over consumed procs. Phase 3 (2026-10-17): Maelstrom Weapon (344179) stack counts are in the log. Pressed spenders outside Ascendance (not the Thorim's casts logged with a Windstrike or Stormstrike) below 10: top Zaappers 24 of 55 (Tempest 7 of 15), Kurugh 11 of 56, Fjedn 13 of 65, Jshaman 14 of 72; weak Niky 20 of 55, Tolu 19 of 54, Anfall 17 of 57, Morkkâ 13 of 64, Macroos 12 of 54. The 99.7th-percentile player spends low most often; spending early is how the top players avoid capping (Zaappers wastes least, below). A spender at 5 stacks does 0.75–0.86 of one at 10 (pooled), and the stacks aren't lost, only spent in another GCD. Proposed `wrong`; the cap is judged instead (`waste-grade`). |
| shaman-enhancement/SurgingTotem/consume-order | unverifiable | — | Surging Totem; Sundering; Doom Winds | Whirling buffs consumed out of order | The preferred order is the author's rotation. Phase 3: nobody takes Surging Totem. |
| shaman-enhancement/SurgingTotem/doom-winds-position | unverifiable | — | Surging Totem; Doom Winds | Doom Winds cast early or late in the totem cycle | The same author-rotation limit; and Doom Winds isn't pressed on any sample. |
| shaman-enhancement/SurgingTotem/filler-casts | unverifiable | — | Surging Totem | casts between the first consume and the sequence end that weren't a consumer | Depends on simulated availability. Not log-derivable. |
| shaman-enhancement/SurgingTotem/window-overall | superseded | — | Surging Totem; Hot Hand | — | A weighted score of the totem rows above; a combiner. |
| shaman-enhancement/S2TierSet/voltaic-blaze-held | verified | "Voltaic Blaze drift" (`tracked-cooldowns.ts`, `voltaicBlazeValue` in specs/enhancement.ts) | Voltaic Blaze; Midnight season 2 set (2 or 4 piece) | Voltaic Blaze held past ready | Counts casts made while it was ready, unrated. Phase 3 (2026-10-17): every player takes Voltaic Blaze (470057; hits 1259101) in place of Flame Shock. A fixed 10s: shortest interval 9.98–10.13s on 22 of 23 player-pulls (no reduction seen), top players' median 10.9–11.9s, the weaker up to 14.3s (Niky). It spreads Flame Shock, which stays up whatever (below), so a lost use is its hit (69–120k) less the Stormstrike (36–50k with the off-hand) that fills the GCD instead. Held time sits mostly outside Ascendance and Doom Winds. The top Vashnik players hold it for the Imbibe's Venoms (Jshaman 0:01 → 0:23 before the 0:24 Imbibe): `burstHold`. Fires (lost a pull): top Kurugh 42k, Fjedn 55k, Zaappers 55k, Jshaman 147k; weak Niky 774k (13 uses), Greythunder 259k, Morkkâ 159k, Anfall 151k, Tolu 141k; Zóhrg 315k. Small on most; a real, common loss. |
| shaman-enhancement/S2TierSet/crash-lightning-held | unverifiable | — | Crash Lightning; season 2 set 4 piece; Fire Nova; Storm Unleashed | another cast while Crash Lightning was ready | Charge, haste scaling, the four-piece's reduction per Fire Nova pulse and Storm Unleashed's cooldown bypass are all invisible. Phase 3 (2026-10-17): also, a quarter of Crash Lightning casts (285 of 1,191) are Storm Unleashed's, logged with a spender. |
| shaman-enhancement/MaelstromWeaponTracker/waste-grade | verified | "Maelstrom Weapon capped" (specs/enhancement.ts) | Overflowing Maelstrom | stacks gained into a full bar | Wasted over generated and wasted (a dead getter in WoWAnalyzer). Phase 3 (2026-10-17): the share doesn't separate the players (top 9–18% of gains, weak 13–24%): most of it is Doom Winds and Ascendance pulses and the refunds that refill the bar right after a spend, which nobody avoids. What separates them is a non-spending press (Stormstrike, Windstrike, Crash Lightning, Lava Lash, Voltaic Blaze) made with the bar full for 0.3s+: built on that. A gain at 10 logs as a lone "refreshed" (3,802 of 3,809 lone refreshes come at 10). Lost per press = stacks wasted until the next press × the player's spender damage per stack spent × 0.5 (a Lightning Bolt at 5 stacks does 0.75 of one at 10, Chain Lightning 0.86, Tempest 0.84), less a GCD's share of that press's average interval × its hits (it would come a GCD later). Fires (lost a pull): top Zaappers 118k, Kurugh 173k, Jshaman 265k, Fjedn 291k; weak Niky 1.01M (Stormstrike at 10 from 0:20), Anfall 824k, Tolu 770k, Morkkâ 424k, Toranha 340k, Macroos 159k; mid Zóhrg 1.74M (54 presses), Lollytotem 549k. |
| shaman-enhancement/ThorimsInvocation/unprimed-chain-lightning | superseded | — | Thorim's Invocation; Ascendance | a free Chain Lightning that hit one target | A per-cast note; same finding as `ChainLightning/single-target-hit`. |
| shaman-enhancement/ChainLightning/single-target-hit | wrong | — | Chain Lightning | a Chain Lightning that hit one target | Annotation only. Phase 3 (2026-10-17): pressed Chain Lightnings (not Thorim's) outside Ascendance that hit one enemy, against the player's Lightning Bolt at the stacks spent: top Fjedn 8 a pull (~293k), Kurugh 5 (~70k), Zaappers 2 (~42k), Jshaman 0; weak Niky 7 (~261k), Toranha 7 (~169k), Anfall 5 (~140k), Greythunder 7 (~136k). The 99.6th-percentile player does it most; whatever it buys (Thorim's Invocation casts the last spender, and Crash Lightning / Lightning Rod interplay) isn't modelled. Proposed `wrong`. |
| shaman-shared/FlameShock/uptime | verified | `dotUptimeFindings` ("Flame Shock off the boss", specs/enhancement.ts) | none; Voltaic Blaze swaps it out of the spellbook | Flame Shock left off | Under 99 / 95 / 85% of the whole fight. Phase 3 (2026-10-17): keyed for Enhancement on 188389, which Voltaic Blaze applies. Top players none; Niky 51k (18s off at 5:26), Thaw 22k. Small: Flame Shock's ticks are ~1% of the damage. |
| shaman-shared/FlameShock/early-refresh | wrong | none | none | Flame Shock refreshed with more than 30% left | Elemental's ledger marked this `wrong` after measurement. Phase 3 (2026-10-17): nobody presses Flame Shock here (0 casts on 23 player-pulls; Voltaic Blaze applies it), so there is nothing to refresh by hand. Proposed `wrong`. |
| shaman-shared/FlameShock/lava-burst-without-shock | no-damage | — | Lava Burst | — | A counter with no grade, and Lava Burst isn't Enhancement's rotation (0 casts on the samples). |
| shaman-shared/utility | no-damage | — | — | — | Astral Shift, Earth Shield family, Earth Elemental, Nature's Guardian, Spirit Wolf, Static Charge and Capacitor, Mana Spring, Spiritwalker's Grace, Feral Lunge, Wind Shear and the other totems: spellbook entries and estimated-mitigation statistics. Utility and defensives aren't judged. |
| shaman-enhancement/statistics | no-damage | — | — | — | Display only: Hot Hand uptime, buffed Lava Lash damage, Stormflurry extra hits, Elemental Assault, Feral Spirit bonus, Stormsurge resets and waste, Thorim's Invocation spells, Ashen Catalyst reduction, Thunder Capacitor bonus, Fire Nova, Voltaic Blaze, the season 2 set bonus, Maelstrom Weapon gain and spend per second and per generator, damage per stack spent. Phase 3 (2026-10-17): "Stormsurge waste" hid a damage effect: a Stormsurge (201846, a Stormstrike reset) that runs out loses a Stormstrike. 12.0s (max span 12.03s); run out on Macroos 4, Cocroach and Vanilla 1–2, six others once, none of the four top players. Added to procs.ts (`checkProcs`, worth a Stormstrike). Stormblast (12s, empowers a Stormstrike; 27 run out, top Kurugh 1) and Converging Storms (8) left out: a whole Stormstrike would overstate them. |

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

After phase 3 (2026-10-17), all unmeasured for want of a log:
1. **Doom Winds held** (`doom-winds-cast-efficiency`): only for a build
   that presses Doom Winds; none of 23 player-pulls does.
2. **Hot Hand** rows (`lava-lash-usage`, `window-unused-gcds`,
   `totemic-momentum-efficiency`) and **Surging Totem / Sundering**
   (`splitstream-link`, Primordial Storm's rows): nobody takes them.
   "Idle in Ascendance" and "Maelstrom Weapon capped" are the models to
   reuse when a log turns up.
