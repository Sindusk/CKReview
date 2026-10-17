# WoWAnalyzer audit: Discipline Priest

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Priest shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** **lagging.** Declares 12.0.1 while the clone's retail version is
  12.1.0; maintained at Foundation support level. Last change 2026-08-31
  (Mind Blast reduction from the Season 2 tier 2-piece), and the Master the
  Darkness proc checks were updated for 12.1 on 2026-08-29 without
  bumping the declared patch. So talent numbers (Harsh Discipline ranks,
  Castigation and Twinsight bolt counts) are doubtful until checked on a
  recent log. No priority list and no checklist: every grade is a guide
  section, and the guide has no cast-efficiency panel.
- **App:** `lib/damage/wow/specs/healer.ts` (`"Discipline Priest"` is keyed
  to the shared healer checks: `healGcds`, which values a heal GCD that
  was mostly overhealed at the healer's damage filler, and nothing else),
  `shared.ts` (no Discipline entry), `tracked-cooldowns.ts` (no Discipline
  entry), `potion.ts`, generic checks in `checks.ts`. **No case study:**
  the healer.ts header says Discipline isn't in any sample, so nothing
  here is `verified`, and the `healGcds` check is untested on a Discipline
  log (Atonement healing is credited to the damage spells, which that check
  may price differently from a plain heal).
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Discipline sets or
  adds. Shared-layer rules (Shadow Word: Pain grade, Twins of the Sun
  Priestess self-cast, Desperate Prayer, Fade, Protective Light) are not
  repeated in full; the one row near the end covers how this spec uses
  them.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| priest-discipline/Penance/bolts-fired | candidate | — | Castigation; Harsh Discipline (rank); Twinsight (Oracle) | a Penance channel that fires fewer bolts than the talents predict | Per cast, any shortfall fails; the expected count is a hard-coded base plus talent bonuses. A cut channel loses bolt damage (and the Atonement healing that follows), so it is a damage rule and log-visible. The app has no per-cast channel check; a cancelled Penance shows only as the idle after it. **Doubtful:** the bolt table dates from before 12.1 and the declared patch lags. Valuation would be missing bolts × the player's own average bolt, minus bolts lost to forced time. What would separate a mistake from top play: movement in a boss window is the user's leniency case, and a pre-pull or last-second Penance cut by the kill is not a mistake. Expected value low: the bolts are cut mostly by movement, which is not judged. |
| priest-discipline/Penance/target-choice | no-damage | — | Twinsight (Oracle) vs not (Voidweaver) | Voidweaver healing with Penance, or an Oracle hitting the boss | Perfect / good by hero tree and target. A build opinion about which trade is better, not an output loss the log can price; the hero tree is inferred from a talent. |
| priest-discipline/MasterTheDarkness/wasted-proc | no-damage | — | Master the Darkness | Penance or Mind Blast cast at two buff stacks | The lost value is a Void Shield upgrade, a healing-ramp effect. WoWAnalyzer's own proc state is approximate (to-dos in the module; the Penance chance is described as a fixed cycle it does not model; the denominator counts Mind Blast casts as Penance). Not worth building from this. |
| priest-discipline/PowerWordRadiance/five-atonements | no-damage | — | Power Word: Radiance | Radiance into a half-empty group or an already-Atoned target | Healing ramp quality. "Five" is hard-coded and only counts applications on the same tick. If lib/mitigation/ ever models Atonement coverage this is where the source of that rule is, but nothing there wants it now. |
| priest-discipline/SelfAtonement/manual-self-cast | no-damage | — | Binding Heals | self-targeted shields, Plea or Penance with the talent | Healing bookkeeping; a self-cast Penance is arguably fine. |
| priest-discipline/DotUptimes/shadow-word-pain-uptime | no-damage | — | none | Shadow Word: Pain off the boss for over 10% of the fight | The shared grade (downtime up to 1 / 5 / 10%), a damage rule, but the app **chooses not to judge healers' DoTs** (healer.ts header), so it is no-damage by that decision, not a candidate. The whole-fight denominator also counts Stasis and intermissions as missing uptime. See Candidates left for the one reason to ask again. |
| priest-discipline/Atonement/early-refresh | no-damage | — | none | Atonement refreshed with over 3s left | A display-only count, no grade. |
| priest-discipline/Abilities/radiance-efficiency | no-damage | — | Power Word: Radiance; Bright Pupil; Light's Promise | Radiance held | 80% target, whole-fight. A healing-ramp spell with a fixed, non-hasted cooldown; Evangelism free casts are rewritten so they spend nothing. Not a damage cooldown. |
| priest-discipline/Abilities/evangelism-efficiency | no-damage | — | Evangelism | Evangelism held | 80% target. Extends Atonement and gives a free Radiance: healing. |
| priest-discipline/Abilities/ultimate-penitence-efficiency | candidate | — | Ultimate Penitence | the 240s cooldown held past ready | 80% target, whole-fight, with the Stasis-as-ready error from core.md. It is a long channel that does damage to the enemy and heals through Atonement, so part of it is a damage cooldown. Not tracked in tracked-cooldowns.ts, and there is no Discipline sample to measure an interval from, so the cooldown would be unmeasured; fixed recasts of this length leave room for only one or two uses a kill. Value would be one lost use's channel damage from the log, less forced time. Expected value low: a 240s spell is cast once or twice and healers hold it for raid damage on purpose. |
| priest-discipline/Abilities/power-infusion-efficiency | candidate | — | Power Infusion (not with Twins of the Sun Priestess) | Power Infusion held | 80% target, 120s. When the priest has the Twins talent the shared Twins module owns it instead. The loss is the receiver's damage, which the app already prices through its partyBuff credit to the priest in the rDPS view, but a held cast is not checked. **Obstacle recorded in healer.ts:** Power Infusion casts log in pairs 1ms apart and the measured median interval (23s) shows no real recast, so any interval would have to de-duplicate pairs first. Who asks for it and when their burst lands is the priest's call, so a late cast is not obviously a mistake. Expected value low; most of it is a measurement job. |
| priest-discipline/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | The healing variant: counts shields, Radiance, Plea and a few other healing GCDs as casting, ignores Penance follow-up bolts with a hard-coded 2.5s buffer (a to-do marks it as unfixed), and uses the core thresholds with the whole-fight denominator. The app finds idle from the casts themselves, less forced time. Its gap check is the right place for any Discipline idle, since heal GCDs count as GCDs there; the pace check leaves healers out. |
| priest-shared/uses-in-this-spec | no-damage | — | Twins of the Sun Priestess; Desperate Prayer; Fade; Protective Light | — | The shared Shadow Word: Pain bar, covered above; the Twins self-cast (a count of Power Infusion cast on oneself, whose loss is another player's damage and which the app would not flag); Desperate Prayer, Fade and Protective Light rate survival value per use. None is a damage rule. |
| priest-discipline/utility | no-damage | — | — | — | Class utility and defensives are not judged: Desperate Prayer, Fade, Power Word: Shield as a defensive, Pain Suppression, Power Word: Barrier, Leap of Faith, Psychic Scream, Purify, Mass Dispel, Angelic Feather, Dominate Mind and Protector of the Frail (each Shield cast shortens Pain Suppression by 3s). If any of it is useful it is for lib/mitigation/ (the Pain Suppression and Barrier timing), not for damage. |
| priest-discipline/statistics | no-damage | — | — | — | Display only: Atonement healing, source and applicator tables; wasted absorb (a shield that expires unused leaves no amount in the log, healer.ts, so the app could not show it); Grace; Encroaching Shadows (a DoT bar not placed in the guide); the talent value boxes (Castigation, Harsh Discipline, Indemnity, Lenience, Expiation, Pain and Suffering, Blaze of Light, Enduring Luminescence, Abyssal Reverie, Weal and Woe, Eternal Barrier); the tier 2-piece Mind Blast reduction; mana charts; low-health healing. |

Not rules (models the rules above rest on): the Penance bolt-to-cast
event link and the 3.5s window that makes a multi-bolt channel one
cooldown start; the Evangelism normalizer (the free Radiance rewritten to
spend nothing and cost no GCD); the Radiance normalizer (moves the
Atonement applications beside the cast); the Atonement tracker and its
duration and damage-source lists (table, not extracted); the Shadowfiend
variant normalizer; the cooldown models for Penance (haste-scaled, two
charges with Guiding Light), Power Word: Shield and Void Shield, Mind Blast
and the rest. One of them matters for the app: the tier 2-piece shortens
Mind Blast by 2s per Penance cast, which is the shape `spentCooldownDrift`
takes (a fixed reduction per event, `reduceOn`). WoWAnalyzer does not
grade Mind Blast's efficiency, so no rule rests on it, and Mind Blast is
not in tracked-cooldowns.ts.

## Candidates left

Ordered by expected value; all are low, and the first needs no new
measurement, just a decision.

1. **Shadow Word: Pain uptime (a question, not a build):** Discipline is
   the healer whose damage feeds its healing, so the "healers aren't
   expected to keep DoTs up" call in healer.ts may fit it worse than
   others. It is already built (`dotUptimeFindings`); the only question is
   whether the user wants it on for this spec. Unverified: there is no
   Discipline log on disk to read.
2. **Penance bolts-fired:** valued from the log's bolt events; cheap, but
   the 12.0.1 bolt table is doubtful and movement-cut channels are the
   user's leniency case.
3. **Power Infusion and Ultimate Penitence drift:** both need the cooldown
   measured from a Discipline sample first, and both are decisions the
   healer makes around raid damage.

A first step for any of these is a Discipline report in sampledata: none
of the case-study logs has one.
