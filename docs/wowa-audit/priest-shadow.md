# WoWAnalyzer audit: Shadow Priest

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Priest shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1, fully maintained; last change 2026-08-24
  ("Update Shadow for Midnight Season 2"; the entry doesn't say which
  module changed, so most patches below are that general refresh). 72
  modules, 71 live. No priority list (a TODO only) and no checklist: every
  grade is a guide section. Midnight build: Shadow Word: Madness replaces
  Devouring Plague as the spender, Void Volley replaces Void Bolt, Tentacle
  Slam replaces Shadow Crash, with Voidweaver (Void Torrent, Void Blast,
  Entropic Rift) and Archon (Halo, Power Surge) hero pieces. Dead code in
  the clone: an unenabled pet tracker, unread Void Torrent threshold
  getters, a never-shown Void Volley missed-cast estimate and a commented
  Shadow Word: Death cooldown block.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Shadow Priest"`: Voidform
  window through `burstGcdFindings`, Insanity at the cap through
  `primaryResourceCapFindings`, Shadow Word: Pain and Vampiric Touch
  through `dotUptimeFindings`), `tracked-cooldowns.ts` (Halo, Voidform,
  Void Torrent), `potion.ts`, generic checks. Case study: none for Shadow;
  the spec was built from a survey of nine sample players and no WoWAnalyzer
  page of one has been compared.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Shadow sets or
  adds. The class layer's Shadow Word: Pain, Power Infusion self-cast and
  defensives rows are folded in below.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| priest-shadow/AlwaysBeCasting/downtime-grade | superseded | `checkGcdGaps` | none | idle time | Fails above 20% idle (perfect at 5%, good 10%, ok 20%): looser than core's levels. Whole-fight denominator, Stasis counted as idle. The app values each gap less forced time. |
| priest-shadow/CancelledCasts/cancel-grade | covered | `checkInterrupts` | none | a cast or channel cut by movement or an interrupt | Cancelled share of cast-time casts, fail above 10%. Counts boss interrupts and stuns too; the app counts the idle. Unguarded divide by zero when no cast-time spell was cast. |
| priest-shadow/InsanityTracker/waste-grade | covered | `primaryResourceCapFindings` (Insanity, scale 100 in shared.ts) | none | generating Insanity into a full bar | WoWAnalyzer grades an absolute amount wasted (fail above 150) whose unit is unclear in its own source (hundredths against whole points), so its tolerance may be near zero. Its Void Torrent waste is derived by hand because those events omit it. The app reads waste from the log. Not matched on a Shadow case study. |
| priest-shadow/Shadowform/uptime-grade | candidate | — | Voidform counts as the form | out of Shadowform | Perfect only above 99.9% in form; the guide section shows below 99%. Form is a passive buff, so a real loss is rare and the module's own pre-pull inference (Shadow Word: Madness on an enemy) shows the buff can be missing from the log. Value: 10% shadow damage over the seconds out of form, from the player's own hits. Very low expected value. |
| priest-shadow/VampiricTouch/uptime-grade | covered | `dotUptimeFindings` (Vampiric Touch) | none | the DoT off every enemy | Fail below 90% uptime of the whole fight, pooled over enemies, so Stasis counts as missing uptime and cleave coverage is not scored. The app measures from first application, less forced time. |
| priest-shadow/ShadowWordPain/uptime-grade | covered | `dotUptimeFindings` (Shadow Word: Pain) | none | the DoT off every enemy | Shared bar, fail below 90% of the whole fight. Same caveats as Vampiric Touch. |
| priest-shadow/ShadowWordMadness/uptime-grade | candidate | — | Distorted Reality (longer DoT) | Madness off every enemy | Fail below 70% of the whole fight. The app doesn't list it in `dot(...)`. It is an Insanity-spent DoT, so full uptime is not always possible or wanted. Value: damage of a missing DoT, as the existing DoT check does it, but only for the part not forced. Mistake vs top players: a spender held for Voidform is what top players do, so phase 3 must separate uptime lost to holding from uptime lost to idle. |
| priest-shadow/Voidform/extension-per-use | candidate | `burstGcdFindings` (Voidform) covers the window itself | Voidform; Ancient Madness (1.5s per Madness cast, five); Sustained Potency (1s per Halo) | a Voidform that ended with fewer than five extension casts | Good at 7.5s of extension or more, fail below 6s. The window check values idle inside the window but not a window that was short because the extending casts weren't made. Value: lost seconds times the window's observed bonus per second. Doubts: a death or fight end reads as a fail; the extension talent is not credited per player; the guide's subsection is gated by a logical-or bug and shows only for Ancient Madness players. Top players may skip extension for Void Volley or Tentacle Slam ordering, so check them first. |
| priest-shadow/InescapableTorment/extension-per-use | unverifiable | — | Inescapable Torment | a pet summon extended 4s or less | The extension (0.7s per Mind Blast or Shadow Word: Death) is summed by the module's own model, not seen in the log. Uses are split on Voidform casts, not pet summons, and a leftover tier-set flag adds a fixed 15%. The pet's real lifetime is visible from its events and could be measured, but the grade as written can't be reproduced. |
| priest-shadow/ShadowyInsight/proc-use | covered | `checkProcs` (expiries) | Shadowy Insight | a proc expiring unspent | `checkProcs` finds the consumer from the log. A refresh over a held proc (WoWAnalyzer counts the overwritten one as wasted) isn't an expiry, so that part is not seen. Whether `checkProcs` picks it up on a Shadow pull: phase 3. |
| priest-shadow/MindDevourer/proc-use | covered | `checkProcs` (expiries) | Mind Devourer | a proc held to its 15s end | Same as above; overwrite by a new Mind Blast proc not seen. A proc held at fight end isn't counted by WoWAnalyzer. |
| priest-shadow/MindFlayInsanity/ticks-and-procs | covered | `checkInterrupts` (cancelled channel) + `checkProcs` (expiries) | Surge of Insanity; Manifested Power | a channel cut short, a stacked buff left to expire | Four ticks per cast and stacks up to four. A gain at four stacks (overwrite) isn't visible as an expiry. Cancels from boss interrupts or forced movement count as bad in WoWAnalyzer. |
| priest-shadow/VoidTorrent/channel-and-insanity | covered | `checkInterrupts` + `primaryResourceCapFindings` | Void Torrent; Power Surge (skipping it is fine) | the 3s channel cut early, or channelled at a full bar | Two proportion bars, no grade. It merges a cancel with an overcap and says it can't tell them apart; the app counts them separately. Cancel is movement leniency by the user's rule. |
| priest-shadow/VoidBlast/charges-at-rift-start | unverifiable | — | Void Blast; Void Torrent; Thought Harvester | casting Void Torrent with Mind Blast charges spent | Charges at the end of the channel are modelled by hand (shared cooldown with Mind Blast, Shadowy Insight resets, 9s over haste); the log doesn't show them. |
| priest-shadow/EntropicRift/collapsing-void-casts | candidate | — | Collapsing Void; Entropic Rift | a rift with no Madness cast | Each cast during the rift adds 20% to Collapsing Void; good at 2 casts, fail at 0. Value: 20% of that rift's Collapsing Void hit per missed cast, read from the log's own hit. Doubts: module is switched on by the Void Torrent talent, not Collapsing Void; a rift cut by the fight end is never graded. Whether top players skip it for spender timing is the phase 3 question. |
| priest-shadow/EntropicRift/darkening-horizon-extension | candidate | — | Darkening Horizon; Entropic Rift | a rift with two or fewer Void Blasts | Each Void Blast adds 1s to the rift, up to 3s. Value: the lost rift seconds at the rift's observed bonus. Overlaps the Void Blast efficiency row; build only one. Low value. |
| priest-shadow/TentacleSlam/hit-per-cast | candidate | — | Tentacle Slam | a Tentacle Slam that hit nothing | Fails only on a zero-hit cast; target count is not scored (cleave is the user's leniency). Value: the cast's lost average damage. Fires rarely; low expected value. |
| priest-shadow/InsidiousIre/buff-coverage | candidate | — | Insidious Ire | Mind Blast, Void Blast, Void Volley, Void Torrent or Mind Flay: Insanity cast while one of the three DoTs is off | The talent adds 12.5% per rank only with all three DoTs up. Counted per damage instance, buff on any target. Value: the share of those spells' damage dealt without the buff, times the bonus, read from the player's own hits with and without it (as Master of the Elements was measured for Elemental). Most promising row here, but fight-blind risk: target swaps and add phases drop DoTs for everyone, so phase 3 has to compare top players on the same boss. Overlaps the DoT uptime rows. |
| priest-shadow/Abilities/mind-blast-efficiency | candidate | — | Thought Harvester (second charge); Power Surge (target 50%); Shadowy Insight (reset); Void Blast (shared cooldown) | Mind Blast charges held | 85% target whole-fight. Not in tracked-cooldowns.ts, which excludes charge-gated cooldowns. The reset is a proc visible as a buff, but the cooldown is haste scaled and shared, and Stasis counts as ready. Likely mostly superseded by gap and window checks. Low value. |
| priest-shadow/Abilities/voidform-efficiency | covered | `checkCooldownDrift` (Voidform, 120s) | Voidform | Voidform held | 95% target whole-fight. WoWAnalyzer counts Stasis as ready and expects a use even when the fight ends first. No Shadow case study. |
| priest-shadow/Abilities/void-torrent-efficiency | covered | `checkCooldownDrift` (Void Torrent, 30s) | Void Torrent | Void Torrent held | 90% target. Archon gets no lower target there though the channel grading says skipping is fine for it. The channel needs standing still, so movement holds are not mistakes. |
| priest-shadow/Abilities/voidwraith-efficiency | candidate | — | Voidwraith; Mindbender (−120s) | the summon held past its cooldown | 90% target, 180s or 60s with Mindbender. Not in the tracked list (the comments don't say why); the talent-set cooldown would need the player's talents, which the pull does not carry per cast. Value: a whole lost summon's damage from the pet's own hits. Low value until the talent-driven length is known. |
| priest-shadow/Abilities/halo-efficiency | covered | `checkCooldownDrift` (Halo, 60s) | Halo (Archon) | Halo held | WoWAnalyzer declares no target and draws only the bar; the app tracks it. |
| priest-shadow/Abilities/power-infusion-efficiency | no-damage | — | Power Infusion; Twins of the Sun Priestess | PI held past its cooldown | Buffs an ally; its use is the raid lead's call, so holding it is not judged. The self-cast rule from the class layer (a second infusion goes to an ally) is also a raid support call. The app only uses its haste for the GCD fit. |
| priest-shadow/VoidVolley/efficiency-custom-max | candidate | — | Voidform; Improved Voidform; Crushing Void; the season 2 four-piece | Void Volley charges unspent when Voidform ends | Target 95% of a maximum worked out as 3 per Voidform, +1 for each of the two talents, plus Tentacle Slam casts with the set bonus. A Voidform cut short by death or the end of the fight isn't excluded. Value: unspent casts times the player's average Void Volley. Partly caught by window idle but not a charge left while casting something else. Phase 3 must check whether top players leave charges. |
| priest-shadow/VoidBlast/efficiency-custom-max | unverifiable | — | Void Blast; Thought Harvester | a rift ended with Void Blast charges | The maximum is built from modelled charges (9s over haste, shared with Mind Blast); the log doesn't show them. |
| priest-shadow/ShadowWordDeath/efficiency-custom-max | candidate | — | Death and Madness (reset); Deathspeaker (35% range) | Shadow Word: Death not cast through an execute phase | Execute time from target health on damage events over its 10s cooldown. WoWAnalyzer's own suggestion flag is off, so it grades nothing. Value: casts missed times the player's Shadow Word: Death damage. Execute phases are short on most bosses and the resets are unseen. Very low expected value. |
| priest-shadow/Guide/cooldown-bars | superseded | the cooldown rows above | as above | — | Draws the efficiency bars (core spells, short and major cooldowns) with graded colours; it is the display of the efficiency rows. Shadow Word: Death's block is commented out. |
| priest-shadow/defensives-and-utility | no-damage | — | Dispersion, Desperate Prayer, Fade, Protective Light, Power Word: Shield, Vampiric Embrace, Silence, Mass Dispel | — | Dispersion (75% reduction), Desperate Prayer value, Fade (Translucent Image) and Protective Light value rate survival, not output. Utility and defensives aren't judged. |
| priest-shadow/statistics | no-damage | — | many | — | Display only: Insanity graph and usage, Shadowform percentage, Shadowy Apparitions and its four talent add-ons, the per-talent damage tables (Dark Evangelism, Mind's Eye, Mastermind, Mental Decay, Psychic Link, the three Idols and others), Death and Madness resets, Inescapable Torment damage, Tentacle Slam damage and average targets, Void Empowerment, Depth of Shadows, Archon pieces (Perfected Form, Energy Compression, Sustained Potency, Manifested Power), the cooldown throughput tracker. Tentacle Slam's cast-efficiency row (10%, suggestions off, held for target count) is also here. |

Not rules (models the rules above rest on): the Insanity tracker and costs
(Void Torrent waste derived by hand), the Shadowfiend and Mindbender
normalizer, the Death and Madness reset model, the Shadowy Insight
cooldown reset, the Void Blast shared cooldown with Mind Blast, the
channel normalizer, the cooldown throughput tracker, the buff/aura
timeline list, the execute helpers, the dead pet tracker.

## Candidates left

Ordered by expected value; all are unmeasured and most will fail phase 3.

- **InsidiousIre/buff-coverage**: best of the set (a clean percentage of
  damage read from the player's own hits). Risk: DoTs fall off together on
  add and target swaps, so the top players may miss it as often.
- **Voidform/extension-per-use**: a short Voidform is real lost window
  time, but top players may trade extension for other casts; check.
- **VoidVolley/efficiency-custom-max**: unspent charges at Voidform end;
  build after the window check shows whether a gap remains.
- **EntropicRift/collapsing-void-casts**: Voidweaver only; value readable
  from the Collapsing Void hit.
- **ShadowWordMadness/uptime-grade**: separate holding for Voidform from
  true idle before trusting it.
- **Abilities/voidwraith-efficiency, mind-blast-efficiency,
  Shadowform/uptime-grade, TentacleSlam/hit-per-cast,
  EntropicRift/darkening-horizon-extension, ShadowWordDeath**: low or very
  low expected value.
