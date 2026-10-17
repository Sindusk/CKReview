# WoWAnalyzer audit: Demonology Warlock

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Warlock shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-08-18
  (12.1 compatibility). No priority list and no checklist. The graded
  surface is the Demonic Tyrant window score in the guide, the core
  active-time box and the cast-efficiency targets. Five threshold getters
  are defined but nothing renders them (listed in the ledger as
  display-only).
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Demonology Warlock"`: the
  Demonic Tyrant window through `burstGcdFindings`; Soul Shards are not
  judged), `tracked-cooldowns.ts` (Summon Demonic Tyrant, 60s),
  `potion.ts`, generic checks. Case study: qpZx3mWaG7gcDdYB pull 3 (Fwîî)
  against MAkCVqHfwx1vnDW8 fight 9 (Killulock, 99th); the header of
  ranged.ts records what matched: casts per unforced minute, Tyrant 92%,
  Dreadstalkers 85% vs 80%, Grimoire 91% vs 95%, potions 2/2, and the
  Implosion gap as Stasis counted by WoWAnalyzer.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); the Warlock class layer (Dark Pact,
  Unending Resolve, Healthstone, shard waste rate, Grimoire of Sacrifice
  uptime) is in the shared row below, not repeated per spec.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warlock-demonology/AlwaysBeCasting/spec-threshold-unused | superseded | `checkGcdGaps` | none | nothing (no reader) | A looser 10 / 20 / 30% downtime step the guide never reads; the guide uses the core 5 / 10 / 15%. Treat as the core rule. |
| warlock-demonology/AlwaysBeCasting/guide-active-time | superseded | `checkGcdGaps` | none | idle time | Colour from the core steps (Good to 5%, Ok to 10%, Fail above). Whole-fight denominator, Stasis included. The text advises instant casts to move, which the user's movement leniency doesn't grade. |
| warlock-demonology/Abilities/call-dreadstalkers-cast-efficiency | covered | `checkCooldownDrift` through the case study only | none modeled | Dreadstalkers held | 90% target on a fixed 20s cooldown, whole-fight. Not tracked: it costs Soul Shards (tracked-cooldowns.ts), so how often it can go is set by shards and by Demonic Calling's free instant cast, which WoWAnalyzer doesn't wire in. Case study compared the casts (85% vs 80%) with no new check. See candidates. |
| warlock-demonology/Abilities/summon-vilefiend-cast-efficiency | candidate | — | Summon Vilefiend, Mark of Fharg, Mark of Shatug | the summon held past its recharge | 90% target; 45s base, 30s for the two hound variants. Not tracked, and no case-study figure. Plain recast intervals from the log would fit; the premise (top players press it on cooldown) isn't tested. |
| warlock-demonology/Abilities/implosion-cast-efficiency | wrong | — | none | Implosion cast below 90% of every 15s | Counts Stasis as ready time (case study 48% vs 79%; outside Stasis only ~42s of holds). Implosion needs Wild Imps, and imps are worth more kept for Tyrant on single target, so skipping it is often right. Scores single-target fights as if cleave. |
| warlock-demonology/Abilities/demonic-tyrant-cast-efficiency | covered | `checkCooldownDrift` (Summon Demonic Tyrant, 60s) | none | Tyrant held | 90% target, whole-fight. Case study: 92%, its holds were in Stasis. WoWAnalyzer counts forced time as ready and expects a last use even when the fight ends first. |
| warlock-demonology/Abilities/power-siphon-cast-efficiency | candidate | — | Power Siphon | Power Siphon held | 90% on 30s. Contradicts the Tyrant guide, which says a siphon just before Tyrant costs imps. Untracked; low expected value. |
| warlock-demonology/Abilities/grimoire-cast-efficiency | covered | no tracked entry; compared in the case study | Grimoire: Imp Lord, Grimoire: Fel Ravager | Grimoire held | 90% target on 120s (average 80, major 70). Case study 91% vs 95%, no check built. Stasis counts as ready. |
| warlock-demonology/Abilities/summon-doomguard-cast-efficiency | candidate | — | Summon Doomguard | Doomguard held | 120s base; WoWAnalyzer cuts 3s per Demonbolt cast made with a Demonic Core up, so the rule's value hangs on that reduction. A `spentCooldownDrift` entry would need a per-Demonbolt reduction (a reduction per cast, not per buff event) and a pre-pull cast; whether the shared helper takes per-cast reductions was not checked here. Not in the case study. |
| warlock-demonology/DemonicTyrant/window-spender-casts | covered | `burstGcdFindings` (Demonic Tyrant) + `checkGcdGaps` | Diabolist (Ruination), Dominion of Argus | fewer than eight Hand of Gul'dan / Ruination casts in the 25s window | Half the window score. It grades active time inside a window as a cast count; idle there costs more than a normal GCD, and the app already prices that premium. Eight casts and 25s are fixed, not haste-scaled, and forced time inside the window isn't subtracted. The app values missing GCDs in the window at its bonus. |
| warlock-demonology/DemonicTyrant/window-dreadstalkers-timing | candidate | — | none | Dreadstalkers not cast in the 12s before Tyrant (best within 6s) | 15 points. Does not check that Dreadstalkers was off cooldown, so an unavailable cast scores 0. Value: the Dreadstalkers' hits missing inside the window, from the log's pet damage. Separating a mistake needs the cooldown and shard state at the cast; top players' timing is untested. |
| warlock-demonology/DemonicTyrant/window-shards-at-end | candidate | — | none | three or more shards left at the window's end | 15 points, 0 at 3+. Soul Shards are logged on spenders only, so the count would come from `spenderSnapshotWaste`-style fitting, not a direct read. The loss is a Hand of Gul'dan moved out of the window; a held-over cast is spent later, so the value is small. |
| warlock-demonology/DemonicTyrant/window-grimoire | candidate | — | Grimoire: Imp Lord, Grimoire: Fel Ravager | Grimoire available at Tyrant but not cast in the 20s before or in the window | 5 points. Its own guide text allows holding it for a burn phase, yet the score gives 0. Low value. |
| warlock-demonology/DemonicTyrant/window-doomguard | candidate | — | Summon Doomguard | Doomguard available at Tyrant, not cast in the 12s before | 5 points; no allowance for it coming off cooldown mid-window. Low value, and it depends on the unmodeled cooldown reduction. |
| warlock-demonology/DemonicTyrant/window-shards-at-cast | candidate | — | Diabolist (Ruination) | fewer than five shards at Tyrant (Diabolist) or three or more (other trees) | 5 points. The hero tree is read from Ruination alone. Same shard-reading problem as the end-of-window rule. Low value. |
| warlock-demonology/DemonicTyrant/window-rating | superseded | `burstGcdFindings` | none | any window under 95 | Weights: spenders 50, Dreadstalkers 15, shards at end 15, Grimoire 5, Doomguard 5, shards at cast 5. A weighted sum of the rows above, with a spender floor of six not pro-rated for a fight that ends early. The app has no composite score. |
| warlock-demonology/DemonicTyrant/window-feedback-notes | candidate | — | Power Siphon, Demonic Core | under eight Demonic Power stacks, under two Demonic Cores at cast, a Power Siphon in the 7s before | Text only, no points. The stacks and cores are log-visible as buffs, and an expired or unspent Demonic Core would fit `checkProcs`; whether it does on a Demonology pull is phase 3. Low value. |
| warlock-demonology/Doom/uptime-unused | no-damage | — | Doom | nothing (no reader) | A debuff uptime getter, 95 / 90 / 80%, used only in a statistic. Doom is applied by a core spend, so whole-fight uptime is a weak measure. The app's DoT list has no Demonology entry. |
| warlock-demonology/DemonicCalling/wasted-procs-unused | candidate | `checkProcs` (unconfirmed) | Demonic Calling | a proc refreshed with Dreadstalkers ready, or expired | Count shown in a statistic, no grade. Per minute above 1 / 1.5 / 2 in an unused getter. A proc is worth a free Dreadstalkers cast. Treat as unverified whether `checkProcs` already sees it; phase 3. |
| warlock-demonology/LegionStrike/permanent-felguard-casts-unused | no-damage | — | none | nothing | Fewer than one Legion Strike by the permanent pet; the getter is unused and may not apply to the Midnight default pet. |
| warlock-demonology/SummonVilefiend/summon-efficiency-unused | superseded | the Vilefiend row above | Summon Vilefiend, Mark of Fharg, Mark of Shatug | nothing (no reader) | 90 / 80 / 70% getter duplicating the Abilities-panel entry. |
| warlock-demonology/Guide/cooldown-usage-graph | no-damage | — | the talents listed per ability | — | A timeline of Dreadstalkers, Tyrant, Power Siphon, Implosion, both Grimoires and Doomguard; the spec adds no grade. |
| warlock-shared/class-layer | no-damage | — | Dark Pact, Frequent Donor, Dark Accord, Grimoire of Sacrifice | — | Dark Pact (60% target) and Unending Resolve (33%) efficiency, Healthstone grading, the shard waste rate (0.5 / 1.67 / 3.33 a minute), and Grimoire of Sacrifice uptime (95 / 90 / 85%) are survival, display or, for shards, not read here; shard waste would need the spender fit. Defensives and utility aren't judged. |
| warlock-demonology/statistics | no-damage | — | — | — | Display only: Legion Strike, Doom, Demonic Calling counts, Diabolic Ritual hero-demon damage, Dreadlash bonus, Inner Demons, Power Siphon imps taken, Sacrificed Souls bonus, Vilefiend pet breakdown, shard graph, Arcane Torrent, and a cooldown damage tracker (Imp Lord, Fel Ravager, Tyrant, Doomguard windows). |

Not rules (models the rules above rest on): the pet model (which demons
are alive, imps sacrificed or imploded, Demonic Tyrant handling), the
registered normalizers (pre-pull pets, summon order, Imp Lord, Fel
Ravager), the Tyrant window bookkeeping, the Soul Shard tracker, the
shared cooldown model, the shard-graph guide note. Two Power Siphon
normalizers are unregistered, dead code. The pet constant tables are
"table, not extracted".

## Candidates left

Ordered by expected value. Most fail phase 3 (Elemental's did); none has
been measured here.

1. **Call Dreadstalkers cadence, with Demonic Calling**: the most-cast
   big hit after Hand of Gul'dan, and the case study saw 85% vs 80%, so
   the top player barely does better. Value from the Dreadstalkers' own
   pet damage per cast; separate a mistake from top play by holds that
   weren't shard-limited. Likely small.
2. **Wasted Demonic Calling procs**: a lost free Dreadstalkers cast is
   cheap to value; first confirm what `checkProcs` already does.
3. **Doomguard cooldown model** (3s per Demonbolt with a core up): only
   if the sample players take Summon Doomguard; the reduction rule is
   unverified.
4. **Vilefiend and Power Siphon cadence**: a plain recast drift; check
   the top player against it before building.
5. **Shards at the window's end**: the rows kept as candidates for the
   shard rules share one blocker, reading Soul Shards from spender
   snapshots. Low value, since held shards are spent later.
