# WoWAnalyzer audit: Fire Mage

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Mage shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** lagging. Declares patch 12.0.7 while the clone's retail
  version is 12.1.0; fully maintained, last change 2026-05-24. No
  priority list and no checklist: every grade is a guide section, three
  cast-efficiency targets, or the active-time line. The Mage shared layer
  grades nothing (spellbook, a few cooldown-reset models, display
  statistics). Hero-talent and apex references were added in March 2026
  and are the likeliest to have moved since; rows that lean on talents
  that may have changed say "doubtful". The Pyrocosm module is dead code
  (never enabled), and the changelog says Searing Touch and Feel the Burn
  modules were removed while the 30% Scorch and 90% Firestarter crit
  logic remains inside the Hot Streak and Heating Up code.
- **App:** `lib/damage/wow/specs/fire.ts` (since phase 3: the Combustion
  window, Fire Blast under Hot Streak, Combustion's value per use), wired
  from `ranged.ts`; `tracked-cooldowns.ts` (Combustion, 60s, burstHold,
  valued from fire.ts), `potion.ts`, generic checks. No case study.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Fire sets or
  adds.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). Fire is rare on Mythic
  (28 ranked kills on Entombed Sentinels, 24 on Vashnik). 12 player-pulls,
  all Mythic kills:
  - top, fetched for it: Émptinêss (W427KLQwB9hXqAfz fight 22, Entombed
    Sentinels, 100th), 小鸟游小埋 (R9HCnxJzBgXraKMb fight 10, Entombed
    Sentinels, 96.4th; jhdCVyFKxJwG2qQr fight 4, Vashnik, 95.8th), Broadum
    (FAfJNjrknD9QGaLw fight 22, Entombed Sentinels, 92.9th), Tinghao
    (rYNXvKqbzVQDmgPJ fight 14, Vashnik, 100th), Экседо (mGAyZR62qcFhKCT7
    fight 16, Vashnik, 91.7th); on disk Reinyy (6kHtGaQXCMWYxFpZ, Entombed
    Sentinels, 89.3th);
  - weaker: on disk Portalscroll (JQVkMCb8T324yWca, Entombed Sentinels,
    39.3th) and Katbelle (Ndh2H6Qw4Pp1qaMk, Vashnik, 8.3th); fetched
    Sikeyzlol (f892cqQTxC6wMktL fight 43, Entombed Sentinels, 10.7th),
    Splean (fqTXM7bjZ1AzPW4a fight 36, Vashnik, 4.2th), Wardaalsahra
    (bahTK6jXp9kZDzd4 fight 15, Entombed Sentinels, 3.6th).
  - Talents (casts and buffs): 11 Sunfury, Sikeyzlol Frostfire (Frostfire
    Bolt is his filler; no Fireball, Scorch or Heat Shimmer). Nobody
    presses Phoenix Flames. Everyone takes Meteor, Hyperthermia (a 4s
    buff), Pyroclasm, Fired Up and Glorious Incandescence.
  - Built (fire.ts): **Fire Blast under Hot Streak** (from the
    wasted-crits row), a value for the tracked **Combustion** (worth 0 a
    use before: no hits of its own), and the **Combustion window**
    repriced by its measured premium per press (the shared bonus reads
    non-crit hits, nearly none inside Combustion, capped at 30%).
  - Hot Streak never runs out (1 of 1,591 removals without a spender, at a death), so
    it has no duration for procs.ts. The spell survey needed nothing: top
    players' gaps follow Pyroblast, Fireball, Meteor or Blazing Barrier
    (all GCD presses already), mostly on Vashnik's movement.
  - About 330 WCL points (rankings, nine one-fight fetches).

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| mage-fire/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Below 95 / 90 / 87.5% of the whole fight, so the major step is looser than the core's. Its own guide text admits forced downtime isn't accounted for. |
| mage-fire/CancelledCasts/cancelled-percentage | covered | `checkInterrupts` | none | a cast cut by movement or an interrupt | Takes the core's bands (above 2 / 5 / 15% of casts); Fire Blast, Combustion and Shimmer are excluded. Boss interrupts and stuns count as cancels. |
| mage-fire/Abilities/combustion-efficiency | covered | `checkCooldownDrift` (Combustion, 60s, burstHold, `combustionValue`) | Combustion; Kindling | Combustion held | 90% target, whole-fight; WoWAnalyzer counts forced time as ready and expects a last use even when the fight ends first. Phase 3 (2026-10-17): the cooldown is a flat 60s on every top player outside Stasis (60.0–63.9s on Entombed Sentinels; the 32–55 crits per cycle don't shorten it). Vashnik's top players press every 83–86s, held for the Venoms after each Imbibe: the fight's hold windows excuse it (burstHold, one recharge at most); Splean pressed at 60.0s there too. The tracked use was worth 0 (no hits under the cast), so the drift could never show: now valued at what a window adds per press (core damage per GCD press inside ÷ outside, × presses a window × Ignite): 1.4–2.8M a use on Entombed Sentinels, 1.8–7.8M on Vashnik. Fires on none of the 12 player-pulls (nobody held one a whole recharge outside Stasis and the hold windows). |
| mage-fire/Abilities/fire-blast-efficiency | candidate | — | Fire Blast; Flame On; Fervent Flickering; Spellfire Salvo; Fiery Rush; Fired Up; From the Ashes; Spontaneous Combustion; Glorious Incandescence; Cold Snap | Fire Blast charges sat capped or unused | 90% target on two charge-based entries. Not tracked: with its charges and many reductions the recharge doesn't fit a fixed interval, and the reductions are server-side, never logged. WoWAnalyzer hand-models all of them, and as written its haste term appears to scale only the subtracted amount (a reading, not run), so its modelled cooldown is near-constant. Counts Stasis as ready. Phase 3 (2026-10-17), left unbuilt: presses a minute are 19.2–21.9 on six of the seven top players (Экседо 17.1) against 16.8–18.0 on the weaker Sunfury players (Sikeyzlol, Frostfire, 11.9), so weak players do press fewer, but no recharge model fits (Fired Up and Glorious Incandescence are logged, the rest aren't) and a press can't be told from a capped charge. The part of Fire Blast misuse the log does price is built as "Fire Blast under Hot Streak". |
| mage-fire/Guide/meteor-efficiency | candidate | — | Meteor; Blast Zone | Meteor held | A bar only, with the suggestion switched off. Not tracked: observed recharge spread is 53.9 / 68.7s, since Meteor is deliberately held to line up with Combustion. The spec's own text says so, so low efficiency is often intended. No reduction rule to model; Blast Zone only lowers the base. Phase 3 (2026-10-17), left unbuilt: Meteor goes into each Combustion (pressed 0–3.0s before 38 of 64 presses, inside the window on the rest) and once between (two presses on 35 of 52 Combustion cycles), so a hold lines it up by design; expected value near zero. |
| mage-fire/HotStreak/expired-procs | candidate | — | none | a Hot Streak that ran out unspent | Counted against 0.5 / 1 a minute of the whole fight. Phase 3 (2026-10-17), left unbuilt: Hot Streak never runs out. On all 12 player-pulls (weak included: Wardaalsahra 106 removals, Katbelle 116) every removal but one has a Pyroblast or Flamestrike beside it (the one: Portalscroll at 4:45, 0.13s before his death); it's held 0.49–0.84s on average and 13.3s at most. No span measures a duration, so it isn't in procs.ts, and nothing to price. |
| mage-fire/HotStreak/wasted-crits | verified | `fireBlastUnderHotStreak` (fire.ts, "Fire Blast under Hot Streak") | none | a crit from Fireball, Scorch or the like while Hot Streak is up | 0.5 / 1 a minute. Phase 3 (2026-10-17): the premise holds, a crit under Hot Streak makes nothing (0 of 1,679 Heating Up gains came while Hot Streak was up). Built for Fire Blast only, the one press that's a choice (instant, off the GCD, a sure crit; a Fireball or Scorch begun before the proc can't be helped). Counted 150ms+ after the Hot Streak gain, unforced. Top 0–3 a pull: Émptinêss, Tinghao 0; Reinyy 74k (3:57), Экседо 40k, 小鸟游小埋 97k and 213k, Broadum 304k (3; 1:20). Weak: Katbelle 1.60M (16, 10 in Combustion; double presses at 0:15.7–0:21.0), Splean 547k (7), Wardaalsahra 227k (3), Portalscroll 135k, Sikeyzlol 57k. Each priced as half a Hot Streak (one crit): ½ × (average Pyroblast − average filler hit) × Ignite, in or out of Combustion (53–74k outside, 97–135k inside). |
| mage-fire/HotStreak/per-proc-grade | wrong | — | Scorch execute; Firestarter; Combustion; Hyperthermia | a Pyroblast pressed with no precast and no guaranteed crit | Categorical grade per proc. Premise leans on removed talent logic (Searing Touch at 30%, Firestarter at 90%), and target health comes from the last damage snapshot, which can be stale. Doubtful for 12.1.0. Shows a preference (hardcast-first) rather than a loss the log can price. Phase 3 (2026-10-17), kept `wrong`: Hot Streak is spent 0.49–0.84s after it comes, on average, on top and weak players alike, and a Hot Streak never runs out, so the order inside a GCD or two moves no damage the log shows. |
| mage-fire/HeatingUp/fire-blast-utilization | wrong | — | Scorch execute; Firestarter; Combustion; Hyperthermia | Fire Blast used to fish for a crit | 95 / 90 / 80% of Fire Blast casts. It records only casts that crit yet divides by all casts, so the share can read high, and it ignores charge-cap pressure that its own per-cast grade excuses. Doubtful for removed crit sources. Phase 3 (2026-10-17), kept `wrong`: a Fire Blast with no Heating Up up makes one (it always crits), so it isn't wasted: the Hot Streak count is set by the crits, whichever comes first. The one Fire Blast that does waste its crit is the one pressed under Hot Streak, built from the wasted-crits row. |
| mage-fire/HeatingUp/converted-buffs | candidate | — | none | Heating Up lost before it became Hot Streak | 90 / 80 / 70% of procs. Log-visible, but a pre-pull Heating Up is counted on removal and not on apply, so the share can run high, and a short timer expires in forced downtime. Phase 3 (2026-10-17), left unbuilt: converted on 89–99% of removals by everyone (top 132/134, 149/156, 158/159, 153/160; weak Katbelle 117/131, Wardaalsahra 106/111). A Heating Up goes when a non-crit lands (Fireball, Scorch, a hardcast Pyroblast), which the player picks only by having a Fire Blast to press first; the 1–14 a pull it loses are a restatement of Fire Blast charges, not separately priceable. |
| mage-fire/HeatingUp/per-fire-blast-grade | wrong | — | Fervent Flickering; Flame On; Scorch; Firestarter; Combustion; Hyperthermia | Fire Blast pressed with no Heating Up and not near the charge cap | "Near cap" depends on the hand-modelled charge count, whose reductions are mostly invisible in the log, so the exemption can be wrong either way; the hard-coded 5 second window inherits it. Phase 3 (2026-10-17), kept `wrong`: as the utilization row, a Fire Blast without Heating Up starts one rather than wasting a crit; the charge-count it needs isn't in the log. |
| mage-fire/Combustion/active-time-per-cast | verified | `combustionWindow` (fire.ts: `burstGcdFindings`, premium per press) | Combustion | idle inside Combustion | At or above 90 / 80 / 70% of the buff window, per use. Idle inside the window costs more than a normal GCD, and the app already prices that premium; forced time inside the window counts as inactive. A cut-off window at fight end may read 0 and fail. Phase 3 (2026-10-17): the shared window bonus read only non-crit hits (almost none inside Combustion) and capped at 30%; the premium is now the player's core damage per GCD press inside ÷ outside, less one (+72–280%). Top: none on all seven. Weak: Splean 2.25M (0:25: 8 of 13 GCDs, four Fire Blasts back to back), Wardaalsahra 331k (2:08), Sikeyzlol 215k, Katbelle 187k; before 41–347k. |
| mage-fire/Combustion/hardcast-fireball | candidate | — | Combustion; Frostfire Bolt (hero tree) | a Fireball hardcast inside Combustion | Any one fails the use. Phase 3 (2026-10-17), left unbuilt: a Fireball begun inside Combustion is rare and doesn't separate: Broadum (92.9th) 2 (1:12.9, 4:43.7), Splean 2, the other ten 0 (the Fireballs that open a window were begun before it). Frostfire's Sikeyzlol hardcasts 1–3 Frostfire Bolts a window, his only filler; no top Frostfire log to say whether that's a loss. |
| mage-fire/Combustion/precast-delay | candidate | — | Combustion | Combustion pressed too early in the hardcast, or without one | 0.7 / 1.0 / 1.5 seconds. Phase 3 (2026-10-17), left unbuilt: top players press Combustion 0.08–1.52s before their hardcast lands (Broadum 1.06–1.52s on six of seven, the "too early" band), and Vashnik's top players precast Flamestrike; the weak Splean and Sikeyzlol press it with no hardcast on 4 of 5 and 6 of 6. A missing precast loses the first crit's Heating Up head start, under a GCD; Splean's cost shows in the Combustion window (0:25, 5 GCDs short). Small. |
| mage-fire/Meteor/per-cast-grade | wrong | — | Meteor; Burnout; Blast Zone | Meteor cast outside Combustion, or into nothing | Fail if it hit no targets or (without Blast Zone) missed Combustion; perfect within 8 seconds of Combustion ending (Burnout); good outside it with over 20 seconds to the next. The next-Combustion time comes from a hand-kept cooldown model with the Kindling assumption, landing time from the first damage event, and the "hit no targets" case fires in target-less phases. Burnout and Blast Zone may have moved after 12.0.7: doubtful. Phase 3 (2026-10-17), kept `wrong`: Meteor comes back about twice a Combustion cycle (two presses on 35 of 52 cycles, top players included), one into Combustion and one between, so about half of all Meteors land outside it by design. |
| mage-fire/HeatShimmer/per-proc-grade | candidate | — | Heat Shimmer | a Heat Shimmer overwritten or left to expire | Categorical: refreshed or expired is a fail, spent on a Scorch is good. Phase 3 (2026-10-17), left unbuilt: a 10s proc (expiries at 9.98–10.04s), spent by Scorch. Runs out 0–2 times a pull on the top players (Broadum 2, Tinghao, 小鸟游小埋 ×2, Reinyy 1) and 0–3 on the weak (Splean 3, Katbelle 1); worth one Scorch at most (50–60k), so ≤180k on anyone and no separation. |
| mage-fire/HeatShimmer/expired-and-overwritten-counts | superseded | — | Heat Shimmer | — | The counts of the per-proc grade above, as per-minute allowances (expired 0.3 / 0.6, overwritten 0.5 / 1) of the whole fight. Stasis time counts. |
| mage-fire/statistics | no-damage | — | various | — | Display only: Combustion table of spells cast and share, Heating Up Fire Blast counts, Hot Streak average uptime and Pyroblast / Flamestrike split, Heat Shimmer average uptime, Fevered Incantation bonus and uptime, Hyperthermia procs (gated on the wrong talent, a stale name), From the Ashes seconds saved, Combustion damage throughput, Arcane Intellect uptime, barrier absorb. |
| mage-shared/utility-defensives | no-damage | — | — | — | Ice Block and Ice Cold (a damage-taken timeline, no grade), Blazing Barrier, Shimmer / Blink, Counterspell, Frost Nova, Ring of Frost, Alter Time, invisibility, polymorph. Utility and defensives aren't judged. Time Warp (5 min) is a raid cooldown, not a damage check. |

Not rules (models the rules above rest on): the event-order normalizers
(Combustion cast before its buff, Hot Streak before Heating Up removal,
Flamestrike before Hot Streak removal, Hot Streak removal before Scorch
damage), the cast-link normalizer (begin casts to casts, casts to damage,
spenders to Hot Streak removal), the per-Combustion, Hot Streak, Heating
Up, Meteor and Heat Shimmer record models, the spell-crit-source ordering
shared by the Hot Streak and Heating Up code, and the Fire Blast
cooldown-reduction models (Fired Up, From the Ashes, Spontaneous
Combustion, Glorious Incandescence, Flame and Frost). Spontaneous
Combustion's listener hangs on every cast, which looks like a bug. Spell
and constant tables: table, not extracted.

## Candidates left

Phase 3 (2026-10-17) worked the list; each row has its numbers.

1. **Hot Streak expiry**: never happens (1 of 1,591 removals unspent, at a death). Unbuilt.
2. **Hardcast Fireball in Combustion**: 2 on a top player, 2 on a weak
   one, 0 on ten. Unbuilt.
3. **Heating Up conversions lost**: 89–99% converted by everyone; not
   priceable apart from Fire Blast charges. Unbuilt.
4. **Fire Blast charges lost at the cap**: weak players press 1–3 fewer a
   minute, but no recharge model fits. Unbuilt.
5. **Heat Shimmer wasted** (≤180k, top and weak alike), **Combustion
   precast delay** (top players sit in WoWAnalyzer's "too early" band):
   unbuilt. **Wasted crits under Hot Streak**: built for Fire Blast.
6. **Meteor held**: the hold is deliberate. Unbuilt.
