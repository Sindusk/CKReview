# WoWAnalyzer audit: Vengeance Demon Hunter

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Demon Hunter shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** lagging. It declares patch 12.0.7 while the clone's retail
  version is 12.1.0, and the newest changelog entry (2026-05-07) says
  "marked accurate for 12.0.5", so treat the real accuracy as 12.0.5.
  Maintained but only partially supported (bumped to partial 2026-04-12).
  No priority list and no checklist: every grade is a guide section, and
  almost every threshold getter in the spec is read by nothing (leftovers
  from the removed checklist), so what a user sees is the guide's per-cast
  grades and statistics. Rules for talents that have since changed are
  marked doubtful in the notes, not made candidates.
- **App:** nothing spec-specific. `lib/damage/wow/specs/tank.ts` lists
  Vengeance only as "unverified" in its header and has no check list for
  it (`specs/index.ts` keys Blood and Protection Paladin only), so a
  Vengeance player gets the generic checks (`checkGcdGaps`,
  `checkCooldownDrift`, deaths, interrupts) and `combatPotion`. Tracked
  cooldowns (`tracked-cooldowns.ts`, "unverified", one player): Sigil of
  Spite (63s) and Sigil of Flame (31s). Fury is in the primary-resource
  table of `shared.ts`, but `primaryResourceCapFindings` is not wired for
  this spec. No case study: the single sample player has not been compared
  against a top parse, so nothing here is `verified`.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Vengeance sets or
  adds. The class layer's rows (Immolation Aura and Sigil of Flame
  initial-hit, Felblade, spellbook targets) are folded in below, since
  Vengeance is where they run.
- **Tank spec:** healing and mitigation rules are `no-damage`. Where one
  could be useful to `lib/mitigation/` the note says so; I did not check
  that module.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| demonhunter-vengeance/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Core downtime grade, unchanged: idle above 5 / 10 / 15% of the whole fight, Stasis-like time included. The guide text itself warns some fights have unavoidable downtime but the number is not adjusted. |
| demonhunter-vengeance/FuryTracker/time-at-fury-cap | candidate | — (`primaryResourceCapFindings` exists, not wired for Vengeance) | none | Fury sitting at the maximum | Share of the fight at the cap: 0% perfect, to 5% good, to 10% ok, above that fail; hard-coded to ok in Mythic+. Value it as Fury lost at the cap times the player's damage per Fury on Soul Cleave (the damage spender), from their own hits. The app's version sees only casts made at the cap, not time sitting there; Fury is in the logged-on-every-cast table, but I did not measure that for Vengeance. What would separate a mistake: Havoc's Fury waste was a floor shared with the 100th-percentile player, and WoWAnalyzer itself waves the cap through in Mythic+, so expect most of it to be what top players do; compare against a top parse first. |
| demonhunter-vengeance/FuryDetails/fury-wasted | superseded | the Fury cap check, if built | none | Fury gained into a full bar | Wasted over generated plus wasted, above 5 / 10 / 15%. The same loss as the row above measured as a ratio; the getters are unread, only the percentage statistic shows. |
| demonhunter-vengeance/Fracture/fury-at-cast | superseded | the Fury cap check, if built | Unrestrained Fury, Untethered Fury, Celestial Echoes | Fracture cast with Fury near the cap | Good below 75 Fury (60 in Metamorphosis); both limits shift with the max-Fury talents. It is a pre-cast guess at the Fury waste the cap check would count directly, and the limits are tied to the current Fracture gain, so they go stale each patch. The cast's overall grade is the worse of this and the next row. |
| demonhunter-vengeance/Fracture/souls-at-cast | candidate | — | none | Fracture cast holding 5 or more Soul Fragments (4 in Metamorphosis) | Fragments are the fuel for Spirit Bomb and Soul Cleave damage and healing. Fragment stacks are a buff, so visible. Value: fragments lost to the cap, times the player's damage per fragment consumed. Doubtful: the shared tracker caps at 6 while this rule uses 5 and 4, so the extract disagrees with itself on what "full" is. Hero-tree fragment generation is not modelled. Fragment waste is mostly healing, which the app does not value; the damage share may be small. |
| demonhunter-vengeance/Fracture/overcapped-souls-flag | superseded | the fragment check above | none | Fracture whose fragments were partly lost | Counts the same lost fragments from the other side (a linked stack removal). Its getter is unread; only an inefficient-cast marker shows. |
| demonhunter-vengeance/SoulsOvercap/waste | superseded | the fragment check above | Spirit Bomb (required), Feed the Demon (switches it off) | fragments generated at the cap | Share of generated fragments lost, above 5 / 10 / 15%; a statistic, getter unread. |
| demonhunter-vengeance/SpiritBomb/souls-consumed | candidate | — | Spirit Bomb | Spirit Bomb cast with fewer than 5 fragments consumed (4 in Metamorphosis) | Spirit Bomb damage scales with fragments consumed, so a cast at 3 is a weaker cast. Value from the player's own Spirit Bomb hits against fragments consumed (stack removal at the cast). Whether a cast at 4 is a mistake or what top players do needs phase 3; casting early to refresh or to dump at cap is plausible play. Hard-coded 4 and 5. |
| demonhunter-vengeance/SpiritBomb/single-target-check | unverifiable | — | Spirit Bomb, Fiery Demise, Fiery Brand | Spirit Bomb that hit one target | Graded ok, never fail, unless Fiery Demise with Fiery Brand on the target. It rests on the author's view that a lone-target Spirit Bomb loses to another spender; the log cannot say whether more targets were reachable, and it is not a fight-aware rule. Fold into the Spirit Bomb row above if built. |
| demonhunter-vengeance/SpiritBomb/good-cast-share | superseded | the two Spirit Bomb rows | Spirit Bomb | — | Aggregate of the two checks above, shown in the guide; divides by zero with no casts. |
| demonhunter-vengeance/FelDevastation/hit-targets | candidate | — | Fel Devastation | Fel Devastation channelled with no target damaged | A whole cooldown wasted. Value: the player's average Fel Devastation damage. Forced-window casts (untargetable phases) must be excluded or it reads a fail the player could not avoid. Low expected value: top players essentially never do this, so it would only fire on a real blunder. |
| demonhunter-vengeance/FelDevastation/fiery-demise-applied | candidate | — | Fiery Demise | Fel Devastation with no Fiery Brand on any target hit | Perfect only if a damaged target carried Fiery Brand. Value from the player's own hits with versus without Fiery Brand on the target, not a stated percentage (table, not extracted). Conflict: Fiery Brand is on a longer cooldown (one extra charge and 12 seconds less with Down in Flames), so holding Fel Devastation for it can be correct. Phase 3 must show whether top players fail this too. |
| demonhunter-vengeance/FelDevastation/frailty-applied | candidate | — | Vulnerability | Fel Devastation before Frailty is up | Perfect if any damaged target had Frailty. One target is enough, so cleave is not scored; opener casts read fail since nothing is applied before the pull. Frailty comes from the builders every few seconds, so this should rarely fire. Lowest of the Fel Devastation candidates. |
| demonhunter-vengeance/SoulCarver/fiery-demise-applied | candidate | — | Soul Carver, Fiery Demise | Soul Carver cast without Fiery Brand up | Same shape and same hold conflict as the Fel Devastation row. Soul Carver is not in our one sample player's casts, so its cast pattern is unmeasured. |
| demonhunter-vengeance/SoulCarver/frailty-applied | candidate | — | Soul Carver, Vulnerability | Soul Carver cast before Frailty | As the Fel Devastation Frailty row; the pre-pull cast reads fail. |
| demonhunter-vengeance/FrailtyDebuff/uptime | candidate | — (`dotUptimeFindings` could take the debuff) | Frailty, Void Reaver or Soulcrush | Frailty absent from the boss | Under 90 / 85 / 80% of the whole fight, pooled over enemies; unread. Builders apply it constantly, so it should be near full. The app's DoT check measures from first application and subtracts forced time, which fixes the whole-fight denominator. Low value. |
| demonhunter-vengeance/PainbringerBuff/uptime | candidate | — | Painbringer | Painbringer buff lapsing | Under 80 / 75 / 70%; unread. Doubtful: the extract found no Midnight changelog line for it and calls it a damage buff, so the talent's current effect is unconfirmed. Its uptime follows how often Fury is spent, which the cap and gap checks already see. Last in line. |
| demonhunter-vengeance/Abilities/sigil-of-spite-efficiency | covered | `checkCooldownDrift` (Sigil of Spite, 63s) | Cycle of Binding (15% shorter) | Sigil of Spite held | 90% target, 60 seconds declared. The app's measured shortest interval is 63.0s on one player, so Cycle of Binding was not in play there; WoWAnalyzer counts forced time as ready. Cycle of Binding is doubtful: the changelog removed its analysis for Midnight yet the cooldowns still use it. |
| demonhunter-vengeance/Abilities/sigil-of-flame-efficiency | covered | `checkCooldownDrift` (Sigil of Flame, 31s) | Cycle of Binding | Sigil of Flame held | 90% target, 30 seconds declared. Shortest measured interval 30.9s, one player. Same Cycle of Binding doubt and forced-time note. |
| demonhunter-vengeance/Abilities/fel-devastation-efficiency | candidate | — | Darkglare Boon; Fel Desolation (replaces it with Demonic Intensity) | Fel Devastation held | 80% target, 40 seconds declared. Not tracked: its measured intervals are 44.3s shortest and 65.1s median, too far apart. Darkglare Boon cuts the cooldown when the channel ends (WoWAnalyzer applies 6 seconds, a 15% floor, and says the real cut is at least that), a fixed reduction per channel, which is the shape `spentCooldownDrift` takes (`reduceOn`). Also needs the talent swap to Fel Desolation. The 44s shortest interval above 40 suggests something else gates it; measure before trusting. |
| demonhunter-vengeance/Abilities/fiery-brand-efficiency | candidate | — | Down in Flames (12 seconds off, one extra charge) | Fiery Brand held | 50% target, 60 seconds declared. Not tracked: 17.5s shortest, 43.0s median, because of the second charge. The app's tracked entry has a `charges` field, but it needs the talent known per player, and Fiery Brand is also a defensive, so holding it is a choice the user does not judge. Low value as a damage rule. |
| demonhunter-vengeance/Abilities/soul-carver-efficiency | candidate | — | none | Soul Carver held | 80% target, 60 seconds, no modelled reduction. Not in our sample, so the app has no measured interval; it would need one before it could be tracked. |
| demonhunter-vengeance/Abilities/immolation-aura-efficiency | candidate | — | none | Immolation Aura held | 90% target, 15 seconds haste scaled. Not tracked: 8.0s shortest, 13.1s median. Likely charge or haste effects the extract lists none of; the app already fits haste from the log, but the spread means the tracked-cooldown rule would exclude it. Cheap, but it is cast on cooldown by habit, so expect nothing. |
| demonhunter-vengeance/ImmolationAura/initial-hit | candidate | — | none | Immolation Aura whose opening hit hit nothing | Binary on one target hit. Forced untargetable casts read fail, so it needs forced windows excluded. Rare for the same reason as Fel Devastation hit-targets. |
| demonhunter-vengeance/SigilOfFlame/initial-hit | candidate | — | none | Sigil of Flame that landed on nothing | Binary on one target hit; a pre-pull cast is automatically good. The pop delay depends on a link window the extract does not give. Same expected value as the rows above. |
| demonhunter-vengeance/Abilities/felblade-cast-efficiency | candidate | — | Felblade | Felblade held beyond about 5% of its cooldown | 95% target, 15 seconds haste scaled. A code comment says its cooldown reset from Demon Bite cannot be seen in events, so WoWAnalyzer reads efficiency low whenever a reset happens. Not tracked: 8.7s shortest, 16.0s median, off the GCD. Fury builder and gap closer, so indirect; low value. |
| demonhunter-vengeance/Felblade/fury-waste | superseded | the Fury cap check, if built | Felblade | Felblade cast near the Fury cap | Share of Felblade's gain wasted, above 3 / 7 / 10%; a getter with no suggestion, so it fires only if a spec reads it. A slice of the Fury cap loss. |
| demonhunter-vengeance/guide/FuryCapWaste-display | no-damage | — | Spirit Bomb | — | Display paragraph for the Fury grade; its denominator is the spec's. |
| demonhunter-vengeance/SoulBarrier/uptime | no-damage | — | Soul Barrier | — | Shield uptime under 35 / 30 / 25%, unread. A defensive; rewarding uptime encourages using it on cooldown rather than when needed. |
| demonhunter-vengeance/FieryBrand/unmitigated-hits | no-damage | — | Fiery Brand | — | Share of hits taken while Fiery Brand was on the source; its section is never rendered and the getter's direction looks inverted. Mitigation coverage like this may suit `lib/mitigation/`; I did not check that module. |
| demonhunter-vengeance/VoidReaver/unmitigated-hits | no-damage | — | Void Reaver | — | The same shape with Frailty on the source; section never rendered. |
| demonhunter-vengeance/MajorDefensives/coverage | no-damage | — | Calcified Spikes | — | Demon Spikes and Metamorphosis graded per use by the shared defensives framework; hard-coded 12 second spikes and 5% extra mitigation, plus a hand-written armour formula. Defensives are survival calls. If the mitigation view ever wants per-use Demon Spikes timing, this is the place to read. |
| demonhunter-vengeance/InfernalStrike/charge-overcap | no-damage | — | Blazing Path, Erratic Felheart | — | Mobility, and dead: the file says its cast events are not recorded and the spellbook entry is switched off. |
| demonhunter-vengeance/statistics | no-damage | — | — | — | Display only: Soul Fragment consumption by spell and totals, the Fury waste statistic and usage tab, Agonizing Flames, Burning Alive, Feast of Souls (healing), Stoke the Flames, Sigil of Spite damage, Demon Spikes and Metamorphosis mitigation, Soul Barrier absorbed, Metamorphosis throughput, Demonsurge procs spent and wasted (the class layer's real lost-damage count, ungraded), Master of the Glaive, Collective Anguish. The tier-set statistics (2-piece Fracture damage up, 4-piece detonation proc rate against an expected rate) are display only; the 2-piece doc comment says 30% and its constant 35%, a possible mismatch. |
| demonhunter-shared/utility | no-damage | — | — | — | Glide, Disrupt, Torment, Spectral Sight, Chaos Nova, Consume Magic, Sigil of Misery and Chains and Silence, Darkness, Vengeful Retreat. Utility and defensives are not judged. |

Not rules (models the rules above rest on): the Fury tracker and graphs,
the Soul Fragment tracker and stack graphs, the Fracture, Spirit Bomb, Fel
Devastation, Immolation Aura, Sigil of Flame and defensive-buff event links
(they attach resource gain, fragment consumption and hits to casts), the
leftover Soul Cleave link (the Soul Cleave analysis itself was deleted), the
hit-timeline helpers behind two sections that never render, the buff and
constants files. Dead code, so not rules: the Demon Soul module switches
itself off, the Infernal Strike analyzer produces nothing, and both
Fiery Brand and Void Reaver sections are unreferenced.

## Candidates left

Ordered by expected value. All are cheap to build and most should fail
phase 3; the first two are the only ones I expect to move a number.

- **Fury at the cap** (time-at-fury-cap): wire the existing helper and
  value by the player's damage per Fury on Soul Cleave. Havoc showed this
  loss is a floor top players share, so the premise check against a top
  Vengeance parse comes first.
- **Fiery Demise at the cast** (Fel Devastation, Soul Carver): value by
  the player's own hits with versus without Fiery Brand. The question for
  phase 3 is whether top players hold casts for Fiery Brand.
- **Fel Devastation cooldown drift** (Darkglare Boon): a fixed reduction
  per channel for `spentCooldownDrift`; needs the shorter interval
  explained first.
- **Spirit Bomb fragments consumed**: damage per fragment from the
  player's own casts; mistake or habit unknown.
- **Fragments held at a Fracture cast**: mostly a healing and Spirit Bomb
  feed loss; small as damage.
- **Fiery Brand with Down in Flames** and **Soul Carver** tracking: need a
  per-player talent read and a measured interval respectively.
- **Frailty rows and Frailty uptime**: should rarely fire.
- **Zero-hit casts** (Fel Devastation, Immolation Aura, Sigil of Flame):
  fire only on blunders and forced windows must be excluded.
- **Painbringer uptime**: doubtful talent; last.
