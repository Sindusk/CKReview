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
- **App:** (as phase 2 found it; phase 3 below valued the sigils and
  added Sigil of Chains as a GCD press) nothing spec-specific. `lib/damage/wow/specs/tank.ts` lists
  Vengeance only as "unverified" in its header and has no check list for
  it (`specs/index.ts` keys Blood and Protection Paladin only), so a
  Vengeance player gets the generic checks (`checkGcdGaps`,
  `checkCooldownDrift`, deaths, interrupts) and `combatPotion`. Tracked
  cooldowns (`tracked-cooldowns.ts`, "unverified", one player): Sigil of
  Spite (63s) and Sigil of Flame (31s). Fury is in the primary-resource
  table of `shared.ts`, but `primaryResourceCapFindings` is not wired for
  this spec. No case study: the single sample player has not been compared
  against a top parse, so nothing here is `verified`.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). Three kills fetched
  (one fight each, ~110 WCL points with the rankings), the rest on disk.
  All Mythic, 24 player-pulls:
  - top, Entombed Sentinels: Avade (1nWG9c7t4qHLDmYy, 100th), Elruth
    (VBPkNJnWMdZx8wQ1, 99.6th), Xkito (aZ6NnwL8g9PdpGJ1, 97.5th);
    Vashnik: Supadh (atJRCq3YM8P4KGpD, 99.5th), Felsky
    (9w3bK4qhrRC82gVX), Thanquiol (Kag91qVZ2YJ7MQAb);
  - weaker: Tormfella (6kHtGaQXCMWYxFpZ), Chajinadh (Ftj4vwHf9RazPcqV)
    and the static's Misohornie (16 pulls on seven bosses,
    gVDPhzp61Zm29HMw; ~40–60th on Entombed Sentinels).

  Talents, from casts, buffs, debuffs and hit ids: all 24 play
  Annihilator, Spirit Bomb, Fel Devastation, Fiery Demise (fire hits on a
  branded target ×1.2–1.5), Fiery Brand on two charges (48s recharge)
  and Felblade. Nobody plays Aldrachi Reaver, Soul Carver or Frailty (no
  Frailty debuff in any log), so those rows have nothing to measure;
  Painbringer shows on two player-pulls. No spec check was built:
  `lib/damage/wow/specs/vengeance.ts` holds the model and numbers. What
  changed: the two tracked sigils hit under other ids than their casts,
  so a lost use was worth 0 and their drift never showed (since
  2026-10-06). They're now valued by their own hits less the GCD they
  take, at the measured 30s / 60s, with pre-pull presses read and holds
  for Vashnik's Venoms allowed (bfef451). Engine fix (7f25152): Sigil of
  Chains wasn't in the survey, so each press read as an idle GCD
  (Supadh's gaps 3.51M → 2.86M). A lead outside the rules: Metamorphosis
  is the spec's big damage window (rate ×1.8–3.2 inside, 40–58% of the
  pull) and comes mostly from Untethered Rage (1270476, a 12s proc a
  Metamorphosis cast spends; one expiry in 24 player-pulls). A
  `burstGcdFindings` trial on it read 6–338k a pull, top (Supadh 338k) as
  weak, so it wasn't kept.
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
| demonhunter-vengeance/FuryTracker/time-at-fury-cap | wrong | — (`primaryResourceCapFindings` trialled, not wired) | none | Fury sitting at the maximum | Share of the fight at the cap: 0% perfect, to 5% good, to 10% ok, above that fail; hard-coded to ok in Mythic+. Value it as Fury lost at the cap times the player's damage per Fury on Soul Cleave (the damage spender), from their own hits. The app's version sees only casts made at the cap, not time sitting there; Fury is in the logged-on-every-cast table, but I did not measure that for Vengeance. What would separate a mistake: Havoc's Fury waste was a floor shared with the 100th-percentile player, and WoWAnalyzer itself waves the cap through in Mythic+, so expect most of it to be what top players do; compare against a top parse first. **Phase 3 (2026-10-17), proposed `wrong`:** Fury isn't what limits the spenders, the GCD is. Fury comes back fast enough that top players cast Soul Cleaves back to back at 120 Fury (Elruth VBPkNJnWMdZx8wQ1, 4:48–4:52, every GCD filled), and they cast 30–41 of 109–121 Fractures at full Fury (Avade 1nWG9c7t4qHLDmYy 41, Supadh atJRCq3YM8P4KGpD 38, Elruth 30). The shared cap check, wired as a trial, read the top players Avade 2.39M, Supadh 1.05M, Thanquiol 1.19M, Elruth 0.78M, Xkito 0.49M, Felsky 0.21M against the weaker Misohornie 1.50–4.05M a pull, Tormfella 1.56M and Chajinadh 0.44M. Not wired. |
| demonhunter-vengeance/FuryDetails/fury-wasted | superseded | the Fury cap check, if built | none | Fury gained into a full bar | Wasted over generated plus wasted, above 5 / 10 / 15%. The same loss as the row above measured as a ratio; the getters are unread, only the percentage statistic shows. |
| demonhunter-vengeance/Fracture/fury-at-cast | superseded | the Fury cap check, if built | Unrestrained Fury, Untethered Fury, Celestial Echoes | Fracture cast with Fury near the cap | Good below 75 Fury (60 in Metamorphosis); both limits shift with the max-Fury talents. It is a pre-cast guess at the Fury waste the cap check would count directly, and the limits are tied to the current Fracture gain, so they go stale each patch. The cast's overall grade is the worse of this and the next row. |
| demonhunter-vengeance/Fracture/souls-at-cast | candidate | — | none | Fracture cast holding 5 or more Soul Fragments (4 in Metamorphosis) | Fragments are the fuel for Spirit Bomb and Soul Cleave damage and healing. Fragment stacks are a buff, so visible. Value: fragments lost to the cap, times the player's damage per fragment consumed. Doubtful: the shared tracker caps at 6 while this rule uses 5 and 4, so the extract disagrees with itself on what "full" is. Hero-tree fragment generation is not modelled. Fragment waste is mostly healing, which the app does not value; the damage share may be small. **Phase 3 (2026-10-17), left unbuilt:** the fragment buff (203981) logs its stack, so it's measurable, but the top players do it as much: Fractures cast at 5–6 fragments Avade 19 of 109, Supadh 10, Elruth 9, Xkito 4; weaker Misohornie 11–12, Tormfella 15, Chajinadh 9. A lost fragment is a slice of a Spirit Bomb, which barely scales with them (next row). |
| demonhunter-vengeance/Fracture/overcapped-souls-flag | superseded | the fragment check above | none | Fracture whose fragments were partly lost | Counts the same lost fragments from the other side (a linked stack removal). Its getter is unread; only an inefficient-cast marker shows. |
| demonhunter-vengeance/SoulsOvercap/waste | superseded | the fragment check above | Spirit Bomb (required), Feed the Demon (switches it off) | fragments generated at the cap | Share of generated fragments lost, above 5 / 10 / 15%; a statistic, getter unread. |
| demonhunter-vengeance/SpiritBomb/souls-consumed | wrong | — | Spirit Bomb | Spirit Bomb cast with fewer than 5 fragments consumed (4 in Metamorphosis) | Spirit Bomb damage scales with fragments consumed, so a cast at 3 is a weaker cast. Value from the player's own Spirit Bomb hits against fragments consumed (stack removal at the cast). Whether a cast at 4 is a mistake or what top players do needs phase 3; casting early to refresh or to dump at cap is plausible play. Hard-coded 4 and 5. **Phase 3 (2026-10-17), proposed `wrong`:** the top players do it more than the weak. Spirit Bombs consuming 4 or fewer: Avade 13 of 26, Elruth 12/19, Supadh 13/25, Xkito 8/11; Misohornie 9/23 (Entombed Sentinels Pull 5) and 11/27 (Vashnik Pull 4), Tormfella 9/18. And the damage barely follows the count: the median non-crit hit (no Fiery Brand) at 3 consumed is 0.91×, at 4 0.78× a 6-fragment one (pooled over the 24 player-pulls, each player's own 5–6 median; noisy, many absorbed hits). |
| demonhunter-vengeance/SpiritBomb/single-target-check | unverifiable | — | Spirit Bomb, Fiery Demise, Fiery Brand | Spirit Bomb that hit one target | Graded ok, never fail, unless Fiery Demise with Fiery Brand on the target. It rests on the author's view that a lone-target Spirit Bomb loses to another spender; the log cannot say whether more targets were reachable, and it is not a fight-aware rule. Fold into the Spirit Bomb row above if built. |
| demonhunter-vengeance/SpiritBomb/good-cast-share | superseded | the two Spirit Bomb rows | Spirit Bomb | — | Aggregate of the two checks above, shown in the guide; divides by zero with no casts. |
| demonhunter-vengeance/FelDevastation/hit-targets | candidate | — | Fel Devastation | Fel Devastation channelled with no target damaged | A whole cooldown wasted. Value: the player's average Fel Devastation damage. Forced-window casts (untargetable phases) must be excluded or it reads a fail the player could not avoid. Low expected value: top players essentially never do this, so it would only fire on a real blunder. **Phase 3 (2026-10-17), left unbuilt:** two in 24 player-pulls (Chajinadh Ftj4vwHf9RazPcqV 2:53, Misohornie Entombed Sentinels Pull 4 4:22), and a press is worth little more than the two GCDs its channel takes (Abilities/fel-devastation-efficiency row): ~150k at most a blunder. |
| demonhunter-vengeance/FelDevastation/fiery-demise-applied | candidate | — | Fiery Demise | Fel Devastation with no Fiery Brand on any target hit | Perfect only if a damaged target carried Fiery Brand. Value from the player's own hits with versus without Fiery Brand on the target, not a stated percentage (table, not extracted). Conflict: Fiery Brand is on a longer cooldown (one extra charge and 12 seconds less with Down in Flames), so holding Fel Devastation for it can be correct. Phase 3 must show whether top players fail this too. **Phase 3 (2026-10-17), left unbuilt:** Fiery Demise is taken by all 24 (Fel Devastation non-crit hits on a branded target 6k vs 4k, Avade). The top players fail it as often as the weak: with Fiery Brand on a target hit, Avade 4 of 7, Elruth 3/5, Xkito 3/4; Misohornie 7/8 on both pulls checked, Tormfella 3/6, Chajinadh 7/9. Worth ~30–50k a press (Fel Devastation is 1.7–3.3% of their damage). |
| demonhunter-vengeance/FelDevastation/frailty-applied | candidate | — | Vulnerability | Fel Devastation before Frailty is up | Perfect if any damaged target had Frailty. One target is enough, so cleave is not scored; opener casts read fail since nothing is applied before the pull. Frailty comes from the builders every few seconds, so this should rarely fire. Lowest of the Fel Devastation candidates. **Phase 3 (2026-10-17):** no sample player takes Frailty (no Frailty debuff on any enemy in the 24 player-pulls); nothing to measure. |
| demonhunter-vengeance/SoulCarver/fiery-demise-applied | candidate | — | Soul Carver, Fiery Demise | Soul Carver cast without Fiery Brand up | Same shape and same hold conflict as the Fel Devastation row. Soul Carver is not in our one sample player's casts, so its cast pattern is unmeasured. **Phase 3 (2026-10-17):** none of the 24 player-pulls (six top parses included) casts Soul Carver; nothing to measure. |
| demonhunter-vengeance/SoulCarver/frailty-applied | candidate | — | Soul Carver, Vulnerability | Soul Carver cast before Frailty | As the Fel Devastation Frailty row; the pre-pull cast reads fail. **Phase 3 (2026-10-17):** nobody casts Soul Carver or takes Frailty; nothing to measure. |
| demonhunter-vengeance/FrailtyDebuff/uptime | candidate | — (`dotUptimeFindings` could take the debuff) | Frailty, Void Reaver or Soulcrush | Frailty absent from the boss | Under 90 / 85 / 80% of the whole fight, pooled over enemies; unread. Builders apply it constantly, so it should be near full. The app's DoT check measures from first application and subtracts forced time, which fixes the whole-fight denominator. Low value. **Phase 3 (2026-10-17):** no Frailty debuff in any of the 24 player-pulls (the Annihilator build doesn't take it); nothing to measure. |
| demonhunter-vengeance/PainbringerBuff/uptime | candidate | — | Painbringer | Painbringer buff lapsing | Under 80 / 75 / 70%; unread. Doubtful: the extract found no Midnight changelog line for it and calls it a damage buff, so the talent's current effect is unconfirmed. Its uptime follows how often Fury is spent, which the cap and gap checks already see. Last in line. **Phase 3 (2026-10-17):** the buff (212988) shows on three of 24 player-pulls (Elruth among them), so few take it; not measured. |
| demonhunter-vengeance/Abilities/sigil-of-spite-efficiency | verified | `checkCooldownDrift` (Sigil of Spite, 60s, `sigilValue` in vengeance.ts) | Cycle of Binding (15% shorter) | Sigil of Spite held | 90% target, 60 seconds declared. The app's measured shortest interval is 63.0s on one player, so Cycle of Binding was not in play there; WoWAnalyzer counts forced time as ready. Cycle of Binding is doubtful: the changelog removed its analysis for Midnight yet the cooldowns still use it. **Phase 3 (2026-10-17):** the tracked entry was worth 0 a use (hits log as 389860, the cast is 390163), so it never reported. Now valued by its hits less the GCD it takes (132–412k a cast against 52–78k GCDs); shortest interval 60.2s over 83 (median 65.8s), so 60s and no Cycle of Binding; a hit before the first cast reads as a pre-pull press. Measured: top Avade 66k, Xkito 192k (2:28); Chajinadh 178k, Misohornie 156k (Nek'zali Pull 2) and 337k (Vashnik Pull 1, 2:12). |
| demonhunter-vengeance/Abilities/sigil-of-flame-efficiency | verified | `checkCooldownDrift` (Sigil of Flame, 30s, `sigilValue` in vengeance.ts, `burstHold`) | Cycle of Binding | Sigil of Flame held | 90% target, 30 seconds declared. Shortest measured interval 30.9s, one player. Same Cycle of Binding doubt and forced-time note. **Phase 3 (2026-10-17):** worth 0 a use until now (hits 204598, cast 204596). Valued by its hits less the GCD (108–285k a cast; Vashnik's Venoms make it 9-target); shortest 30.0s over 171 (median 32.8s); pre-pull presses read from a hit before the first cast (Supadh, Avade, Xkito); `burstHold`, since Supadh pressed it 1–9s after three of the five Imbibes. Fires on the top players more than on the static's tank: Elruth 407k (ready 3:23, pressed 5:15 with every GCD filled by Fracture and Soul Cleave), Supadh 560k (skipped the 4:36 Imbibe, 3:42 → 6:09), Felsky 426k, Avade 81k, Xkito 82k, Thanquiol 48k; Chajinadh 524k, Tormfella none, Misohornie 64–101k on 4 of 16 pulls (he presses it every 30–33s). Each is a whole use missed, which WoWAnalyzer's 90% target flags too, so it's kept as a real, common loss. |
| demonhunter-vengeance/Abilities/fel-devastation-efficiency | candidate | — | Darkglare Boon; Fel Desolation (replaces it with Demonic Intensity) | Fel Devastation held | 80% target, 40 seconds declared. Not tracked: its measured intervals are 44.3s shortest and 65.1s median, too far apart. Darkglare Boon cuts the cooldown when the channel ends (WoWAnalyzer applies 6 seconds, a 15% floor, and says the real cut is at least that), a fixed reduction per channel, which is the shape `spentCooldownDrift` takes (`reduceOn`). Also needs the talent swap to Fel Desolation. The 44s shortest interval above 40 suggests something else gates it; measure before trusting. **Phase 3 (2026-10-17), left unbuilt:** a press is worth little more than the GCDs it takes: Avade's average Fel Devastation is ~163k for a channel whose next GCD comes 2.2–2.3s later (two ~66k GCDs), so ~+30k a use, its 50 Fury aside (Fury isn't binding, see the cap row). Top players hold it freely: Supadh (99.5th) pressed it once in 6:26 (at 6:16 on the Venoms), Felsky twice in 6:34; Avade 7, Elruth 5; Misohornie 8 a pull. Shortest interval 40.5s (Avade). Also a defensive. |
| demonhunter-vengeance/Abilities/fiery-brand-efficiency | candidate | — | Down in Flames (12 seconds off, one extra charge) | Fiery Brand held | 50% target, 60 seconds declared. Not tracked: 17.5s shortest, 43.0s median, because of the second charge. The app's tracked entry has a `charges` field, but it needs the talent known per player, and Fiery Brand is also a defensive, so holding it is a choice the user does not judge. Low value as a damage rule. **Phase 3 (2026-10-17), left unbuilt:** every player has the second charge; a 48s recharge fits Elruth, Thanquiol, Tormfella and Misohornie exactly (no cast before it). At 48s, time at both charges is under one recharge on everyone: Elruth 0s, Supadh 12s, Avade and Xkito 32s, Misohornie 15–16s, Tormfella 17s, Felsky 28s, Chajinadh 36s. With Fiery Demise a use adds ×1.2–1.5 to fire hits on the target, but no player loses a use. |
| demonhunter-vengeance/Abilities/soul-carver-efficiency | candidate | — | none | Soul Carver held | 80% target, 60 seconds, no modelled reduction. Not in our sample, so the app has no measured interval; it would need one before it could be tracked. **Phase 3 (2026-10-17):** none of the 24 player-pulls casts Soul Carver; still unmeasured. |
| demonhunter-vengeance/Abilities/immolation-aura-efficiency | candidate | — | none | Immolation Aura held | 90% target, 15 seconds haste scaled. Not tracked: 8.0s shortest, 13.1s median. Likely charge or haste effects the extract lists none of; the app already fits haste from the log, but the spread means the tracked-cooldown rule would exclude it. Cheap, but it is cast on cooldown by habit, so expect nothing. **Phase 3 (2026-10-17), left unbuilt:** intervals 7.3–29s with medians 10.4–12s on every player, top and weak alike (Avade 30 casts in 5:37, Supadh 31 in 6:26, Misohornie 36 in 6:48). Its hits are 4–6% of damage over ~30 casts, ~70k a cast; nothing separates the players. |
| demonhunter-vengeance/ImmolationAura/initial-hit | candidate | — | none | Immolation Aura whose opening hit hit nothing | Binary on one target hit. Forced untargetable casts read fail, so it needs forced windows excluded. Rare for the same reason as Fel Devastation hit-targets. **Phase 3 (2026-10-17), left unbuilt:** an Immolation Aura with no hit in 1.5s happens to the top players too (Avade 4:33, Elruth 2:45, Xkito 2:38, plus pre-pull casts) and to Misohornie 6 times in 16 pulls; its opening hit is a fraction of a ~70k cast. |
| demonhunter-vengeance/SigilOfFlame/initial-hit | candidate | — | none | Sigil of Flame that landed on nothing | Binary on one target hit; a pre-pull cast is automatically good. The pop delay depends on a link window the extract does not give. Same expected value as the rows above. **Phase 3 (2026-10-17), left unbuilt:** one Sigil of Flame with no hit in 3s in 24 player-pulls (Misohornie Nek'zali Pull 2, 1:16; it lands ~1.1s after the cast). |
| demonhunter-vengeance/Abilities/felblade-cast-efficiency | wrong | — | Felblade | Felblade held beyond about 5% of its cooldown | 95% target, 15 seconds haste scaled. A code comment says its cooldown reset from Demon Bite cannot be seen in events, so WoWAnalyzer reads efficiency low whenever a reset happens. Not tracked: 8.7s shortest, 16.0s median, off the GCD. Fury builder and gap closer, so indirect; low value. **Phase 3 (2026-10-17), proposed `wrong`:** the top players barely press it: Avade 6 in 5:37, Supadh 3 in 6:26, Elruth 2 in 6:06, Xkito 4, Felsky none; Misohornie 22–36 a pull. It logs a ~0.5s lock (the next GCD 0.49–0.57s after it), its own hit is ~16k (Misohornie, Vashnik Pull 4: 1.1% of his damage over 36 presses), and its Fury isn't binding (the cap row). |
| demonhunter-vengeance/Felblade/fury-waste | superseded | the Fury cap check, if built | Felblade | Felblade cast near the Fury cap | Share of Felblade's gain wasted, above 3 / 7 / 10%; a getter with no suggestion, so it fires only if a spec reads it. A slice of the Fury cap loss. |
| demonhunter-vengeance/guide/FuryCapWaste-display | no-damage | — | Spirit Bomb | — | Display paragraph for the Fury grade; its denominator is the spec's. |
| demonhunter-vengeance/SoulBarrier/uptime | no-damage | — | Soul Barrier | — | Shield uptime under 35 / 30 / 25%, unread. A defensive; rewarding uptime encourages using it on cooldown rather than when needed. |
| demonhunter-vengeance/FieryBrand/unmitigated-hits | no-damage | — | Fiery Brand | — | Share of hits taken while Fiery Brand was on the source; its section is never rendered and the getter's direction looks inverted. Mitigation coverage like this may suit `lib/mitigation/`; I did not check that module. |
| demonhunter-vengeance/VoidReaver/unmitigated-hits | no-damage | — | Void Reaver | — | The same shape with Frailty on the source; section never rendered. |
| demonhunter-vengeance/MajorDefensives/coverage | no-damage | — | Calcified Spikes | — | Demon Spikes and Metamorphosis graded per use by the shared defensives framework; hard-coded 12 second spikes and 5% extra mitigation, plus a hand-written armour formula. Defensives are survival calls. If the mitigation view ever wants per-use Demon Spikes timing, this is the place to read. **Phase 3 (2026-10-17):** Metamorphosis hides a damage effect: the damage rate inside it is ×1.8–3.2 the rate outside (Avade 212k/s vs 65k/s), 40–58% of the pull, and Fracture hits ×1.2–1.4. It comes mostly from Untethered Rage (1270476), a 12s proc a Metamorphosis cast spends (one expiry in 24 player-pulls: Tormfella 6kHtGaQXCMWYxFpZ 4:24; Avade waits a median 7.9s on each). A `burstGcdFindings` window on it read 6–338k a pull, top (Supadh 338k) as weak, so it isn't built. A lead, not a rule. |
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

Phase 3 (2026-10-17) measured every row below; none was built (numbers
in each row). Fury at the cap and Spirit Bomb fragments are now proposed
`wrong`; the Soul Carver, Frailty and Painbringer rows have no player
who takes the talent. The list as phase 2 left it:

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
