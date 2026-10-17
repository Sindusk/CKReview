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
  Void Torrent), `potion.ts`, generic checks; since phase 3,
  `lib/damage/wow/specs/shadow.ts` (Voidform's value per use, and the
  measurements below). Case study: none for Shadow; the spec was built
  from a survey of nine sample players and no WoWAnalyzer page of one has
  been compared.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Shadow sets or
  adds. The class layer's Shadow Word: Pain, Power Infusion self-cast and
  defensives rows are folded in below.
- **Phase 3 (2026-10-17):** done (Claude Opus 5.5). Measured on the 45
  Shadow player-pulls already on disk (36 reports, Mythic Vashnik and
  Entombed Sentinels kills); nothing fetched. Top (WCL's Shadow ranking):
  Kleenonean (fh6bLKy12gzWvGCH, Vashnik 99.9th), Parsetumor
  (baRCnPv62YQ1dJZN, Entombed Sentinels 99.7th; also Vashnik),
  Loyalxdice and Arthaz (Kag91qVZ2YJ7MQAb, 99.4th / 98.6th), Liaisa
  (LckJC7GMhQvD6rdw, 99.2nd), Adeliya (ZC7YNpr2HVQLtjv1, 99.1st), Twicks
  (1nWG9c7t4qHLDmYy, 98.8th), Флоусенх (7L3RKpavDA8T4MjY, 98.8th),
  Nosmite (aZ6NnwL8g9PdpGJ1, 98.5th), Roccorpii (PAgdKqkXDTRfLnJy,
  98.2nd). Weak: Unbread (kZnVcJYpKFRChTzb, 6.7th), Lulousek
  (6kHtGaQXCMWYxFpZ, 16.9th), 无梦之梦 (MaWQwnygjkh1czL8, 17.5th), and
  lower-DPS players of unranked percentile (Twistednun, Tøunsí, Tylithia,
  Finetty, Tetervinas). Talents (casts and buffs): all 45 are Archon
  (Halo, Power Surge, Sustained Potency), with Voidform and Ancient
  Madness, Insidious Ire, Surge of Insanity, Crushing Void, Tentacle Slam,
  Idol of Y'Shaarj and Thing from Beyond; nobody has Void Torrent, Void
  Blast, Entropic Rift, Shadowy Insight, Mind Devourer, Inescapable
  Torment or a pressed fiend. Three 20th-percentile Vashnik players
  probed (aT7GqzfcbNCAW8D2, 7DwYjHR9h64Ga81t, tQ2nvXkGADbPyBfz) are Archon
  too, so the Voidweaver rows can't be measured.
  **Engine:** clipped Mind Flay and Mind Flay: Insanity read as idle; their
  tick counts now time the clip (game.ts, commit 53faf4b). **Tracked
  cooldowns:** Halo and Voidform were worth 0 a use; Halo has its hit id,
  Voidform a value from the presses its window adds, both `burstHold`
  (commit 9c8793d, specs/shadow.ts). No spec check built. Existing checks
  re-run on the top players: the Voidform window 0–0.44M (Флоусенх 6:01,
  35 of 40 GCDs) against up to 1.35M on the weak (Lulousek 0:09, 19 of
  35); Insanity at the cap 0–53k (weak up to 181k); Shadow Word: Pain
  0–96k, weak only; Vampiric Touch never. All kept. No `wrong` rows in
  this ledger.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| priest-shadow/AlwaysBeCasting/downtime-grade | superseded | `checkGcdGaps` | none | idle time | Fails above 20% idle (perfect at 5%, good 10%, ok 20%): looser than core's levels. Whole-fight denominator, Stasis counted as idle. The app values each gap less forced time. Phase 3 (2026-10-17): clipped Mind Flays had read as idle (the lock ran to the last tick); game.ts now times Mind Flay (6 ticks) and Mind Flay: Insanity (4) to the next press. Kleenonean (fh6bLKy12gzWvGCH, 99.9th) GCD delays and drift 2.22M → 0.91M; the spell survey shows no other unlisted press or untimed channel for Shadow. |
| priest-shadow/CancelledCasts/cancel-grade | covered | `checkInterrupts` | none | a cast or channel cut by movement or an interrupt | Cancelled share of cast-time casts, fail above 10%. Counts boss interrupts and stuns too; the app counts the idle. Unguarded divide by zero when no cast-time spell was cast. |
| priest-shadow/InsanityTracker/waste-grade | covered | `primaryResourceCapFindings` (Insanity, scale 100 in shared.ts) | none | generating Insanity into a full bar | WoWAnalyzer grades an absolute amount wasted (fail above 150) whose unit is unclear in its own source (hundredths against whole points), so its tolerance may be near zero. Its Void Torrent waste is derived by hand because those events omit it. The app reads waste from the log. Not matched on a Shadow case study. Phase 3 (2026-10-17): confirmed it fires on Shadow: top players 0–53k a pull (Nosmite 53k, Adeliya 18k), weaker 0–181k (Líme 181k, Sibir and Unbread 127k). Small everywhere; kept. |
| priest-shadow/Shadowform/uptime-grade | candidate | — | Voidform counts as the form | out of Shadowform | Perfect only above 99.9% in form; the guide section shows below 99%. Form is a passive buff, so a real loss is rare and the module's own pre-pull inference (Shadow Word: Madness on an enemy) shows the buff can be missing from the log. Value: 10% shadow damage over the seconds out of form, from the player's own hits. Very low expected value. Phase 3 (2026-10-17), **not built, negligible:** the form isn't logged before the pull (first Shadowform gain 0:31–0:56, when Voidform ends); after that, time out of both forms is 0–10s a pull except where the player died (Unbread 137s, Twistednun 108s: dead time). |
| priest-shadow/VampiricTouch/uptime-grade | covered | `dotUptimeFindings` (Vampiric Touch) | none | the DoT off every enemy | Fail below 90% uptime of the whole fight, pooled over enemies, so Stasis counts as missing uptime and cleave coverage is not scored. The app measures from first application, less forced time. Phase 3 (2026-10-17): never fires on the 45 player-pulls. |
| priest-shadow/ShadowWordPain/uptime-grade | covered | `dotUptimeFindings` (Shadow Word: Pain) | none | the DoT off every enemy | Shared bar, fail below 90% of the whole fight. Same caveats as Vampiric Touch. Phase 3 (2026-10-17): fires 0–96k a pull, weaker players only (Twistednun 96k, Tøunsí 83k). |
| priest-shadow/ShadowWordMadness/uptime-grade | candidate | — | Distorted Reality (longer DoT) | Madness off every enemy | Fail below 70% of the whole fight. The app doesn't list it in `dot(...)`. It is an Insanity-spent DoT, so full uptime is not always possible or wanted. Value: damage of a missing DoT, as the existing DoT check does it, but only for the part not forced. Mistake vs top players: a spender held for Voidform is what top players do, so phase 3 must separate uptime lost to holding from uptime lost to idle. Phase 3 (2026-10-17), **not built; fires on the top players as much, proposed `wrong`** (for the user's review): gaps off every enemy outside forced time, counted only from the first cast with 50 Insanity (its cost), priced at Madness's damage per second of uptime, read top Флоусенх 1.47M (7L3RKpavDA8T4MjY, 0:20, 6.4s), Parsetumor Vashnik 0.87M, Kleenonean 0.87M, Gregsp 0.75M; weak 无梦之梦 1.26M, Unbread 0.77M, Lulousek 0.59M, Twistednun 0.44M. Holding Insanity shifts a Madness, it doesn't lose one; what's lost is Insanity at the cap (the shared check, 0–181k). |
| priest-shadow/Voidform/extension-per-use | candidate | `burstGcdFindings` (Voidform) covers the window itself | Voidform; Ancient Madness (1.5s per Madness cast, five); Sustained Potency (1s per Halo) | a Voidform that ended with fewer than five extension casts | Good at 7.5s of extension or more, fail below 6s. The window check values idle inside the window but not a window that was short because the extending casts weren't made. Value: lost seconds times the window's observed bonus per second. Doubts: a death or fight end reads as a fail; the extension talent is not credited per player; the guide's subsection is gated by a logical-or bug and shows only for Ancient Madness players. Top players may skip extension for Void Volley or Tentacle Slam ordering, so check them first. Phase 3 (2026-10-17), **not built, negligible:** windows run 35.5s (Ancient Madness on all 45), the first of a pull 30.0–31.5s on everyone. Short ones not cut by the kill: 1.5–4s on 8 of 45 player-pulls, top included (Parsetumor baRCnPv62YQ1dJZN Vashnik 2:06, 31.5s; Muddpriest 34.0s; Drprofpatrik 33.0s). At ~30k a second (a Voidform's worth over its window) that's 45–120k. |
| priest-shadow/InescapableTorment/extension-per-use | unverifiable | — | Inescapable Torment | a pet summon extended 4s or less | The extension (0.7s per Mind Blast or Shadow Word: Death) is summed by the module's own model, not seen in the log. Uses are split on Voidform casts, not pet summons, and a leftover tier-set flag adds a fixed 15%. The pet's real lifetime is visible from its events and could be measured, but the grade as written can't be reproduced. Phase 3 (2026-10-17): nobody takes it (no Inescapable Torment hit on any of the 45; the Shadowfiend comes 5s at a time on its own). Not measured. |
| priest-shadow/ShadowyInsight/proc-use | candidate | — | Shadowy Insight | a proc expiring unspent | `checkProcs` finds the consumer from the log. A refresh over a held proc (WoWAnalyzer counts the overwritten one as wasted) isn't an expiry, so that part is not seen. Whether `checkProcs` picks it up on a Shadow pull: phase 3. Phase 3 (2026-10-17), **no longer `covered`:** `checkProcs` sees only the procs listed in procs.ts, and Shadowy Insight isn't (no measured duration). Not measurable here: no gain on any of the 45 (the talent isn't taken). |
| priest-shadow/MindDevourer/proc-use | candidate | — | Mind Devourer | a proc held to its 15s end | Same as above; overwrite by a new Mind Blast proc not seen. A proc held at fight end isn't counted by WoWAnalyzer. Phase 3 (2026-10-17), **no longer `covered`:** not in procs.ts, and no Mind Devourer gain on any of the 45 (not taken). Not measured. |
| priest-shadow/MindFlayInsanity/ticks-and-procs | covered | `checkInterrupts` (cancelled channel) | Surge of Insanity; Manifested Power | a channel cut short, a stacked buff left to expire | Four ticks per cast and stacks up to four. A gain at four stacks (overwrite) isn't visible as an expiry. Cancels from boss interrupts or forced movement count as bad in WoWAnalyzer. Phase 3 (2026-10-17): the cancel half is `checkInterrupts`'s; the expiry half isn't covered (not in procs.ts) and measured negligible: 4 of 985 removals of the buff (391401) had no Mind Flay: Insanity beside them, one at 30.01s, so no duration was set. |
| priest-shadow/VoidTorrent/channel-and-insanity | covered | `checkInterrupts` + `primaryResourceCapFindings` | Void Torrent; Power Surge (skipping it is fine) | the 3s channel cut early, or channelled at a full bar | Two proportion bars, no grade. It merges a cancel with an overcap and says it can't tell them apart; the app counts them separately. Cancel is movement leniency by the user's rule. Phase 3 (2026-10-17): nobody takes Void Torrent (0 casts on the 45 player-pulls and on three 20th-percentile Vashnik players probed); not measured. |
| priest-shadow/VoidBlast/charges-at-rift-start | unverifiable | — | Void Blast; Void Torrent; Thought Harvester | casting Void Torrent with Mind Blast charges spent | Charges at the end of the channel are modelled by hand (shared cooldown with Mind Blast, Shadowy Insight resets, 9s over haste); the log doesn't show them. Phase 3 (2026-10-17): nobody plays Voidweaver in the samples (all 45 Archon, three weak probes too). |
| priest-shadow/EntropicRift/collapsing-void-casts | candidate | — | Collapsing Void; Entropic Rift | a rift with no Madness cast | Each cast during the rift adds 20% to Collapsing Void; good at 2 casts, fail at 0. Value: 20% of that rift's Collapsing Void hit per missed cast, read from the log's own hit. Doubts: module is switched on by the Void Torrent talent, not Collapsing Void; a rift cut by the fight end is never graded. Whether top players skip it for spender timing is the phase 3 question. Phase 3 (2026-10-17), **not measurable:** no Entropic Rift or Collapsing Void on any of the 45 (all Archon), nor on three 20th-percentile Vashnik players probed (aT7GqzfcbNCAW8D2, 7DwYjHR9h64Ga81t, tQ2nvXkGADbPyBfz). Needs a Voidweaver log. |
| priest-shadow/EntropicRift/darkening-horizon-extension | candidate | — | Darkening Horizon; Entropic Rift | a rift with two or fewer Void Blasts | Each Void Blast adds 1s to the rift, up to 3s. Value: the lost rift seconds at the rift's observed bonus. Overlaps the Void Blast efficiency row; build only one. Low value. Phase 3 (2026-10-17), **not measurable:** as above, no Voidweaver. |
| priest-shadow/TentacleSlam/hit-per-cast | candidate | — | Tentacle Slam | a Tentacle Slam that hit nothing | Fails only on a zero-hit cast; target count is not scored (cleave is the user's leniency). Value: the cast's lost average damage. Fires rarely; low expected value. Phase 3 (2026-10-17), **not built, negligible:** 9 of 1,244 casts hit nothing, top players too (Twicks, Флоусенх, Parsetumor twice), three of them pull openers before the boss is hittable. |
| priest-shadow/InsidiousIre/buff-coverage | candidate | — | Insidious Ire | Mind Blast, Void Blast, Void Volley, Void Torrent or Mind Flay: Insanity cast while one of the three DoTs is off | The talent adds 12.5% per rank only with all three DoTs up. Counted per damage instance, buff on any target. Value: the share of those spells' damage dealt without the buff, times the bonus, read from the player's own hits with and without it (as Master of the Elements was measured for Elemental). Most promising row here, but fight-blind risk: target swaps and add phases drop DoTs for everyone, so phase 3 has to compare top players on the same boss. Overlaps the DoT uptime rows. Phase 3 (2026-10-17), **not built; fight-driven, fires on the top players as much:** the buff (373213) sits on the player. Mind Blast, Void Volley and Mind Flay: Insanity damage dealt without it is 3–7% of theirs over the 45; at a 25% bonus the loss reads top Parsetumor Vashnik ~0.9M (18% of Void Volley without it), Флоусенх ~0.8M, Kleenonean ~0.5M, against 9–108k for the Entombed Sentinels top players; weak Unbread ~0.5M, Lulousek ~0.4M, Twistednun ~0.3M. Vashnik's adds take it off everyone; the DoT rows cover sustained gaps. The with/without ratio of non-crit hits (Void Volley 1.07, Madness 1.40) is too confounded to set the bonus from the log. |
| priest-shadow/Abilities/mind-blast-efficiency | candidate | — | Thought Harvester (second charge); Power Surge (target 50%); Shadowy Insight (reset); Void Blast (shared cooldown) | Mind Blast charges held | 85% target whole-fight. Not in tracked-cooldowns.ts, which excludes charge-gated cooldowns. The reset is a proc visible as a buff, but the cooldown is haste scaled and shared, and Stasis counts as ready. Likely mostly superseded by gap and window checks. Low value. Phase 3 (2026-10-17), **not built: no cooldown fits.** Mind Blast intervals run from 2.1s (shortest) with medians 7.7–10.1s on the top players, so held time can't be rebuilt. A lead, unpriced: Lulousek (6kHtGaQXCMWYxFpZ, 16.9th) presses 3.6 a minute, Hamiltony and Líme (nhbCYHXRf1T2qAv9) 3.7–4.0, against 4.7 (Флоусенх, Vashnik) to 7.8 on the top players. |
| priest-shadow/Abilities/voidform-efficiency | covered | `checkCooldownDrift` (Voidform, 120s) | Voidform | Voidform held | 95% target whole-fight. WoWAnalyzer counts Stasis as ready and expects a use even when the fight ends first. No Shadow case study. Phase 3 (2026-10-17): the tracked Voidform was worth 0 a use (it deals nothing under its id), so its drift never showed. Now valued by the presses its window adds (Void Volley, Mind Flay: Insanity, Shadow Word: Madness over the outside rate, each over a Mind Flay; 0.51–1.96M a use, Kleenonean 1.57M, Lulousek 0.77M) and `burstHold` (the Vashnik top players press it at the Imbibes: Kleenonean 0:23, 3:11, 5:58). Fires on none of the 45 (the Entombed Sentinels holds fall in Stasis). specs/shadow.ts. |
| priest-shadow/Abilities/void-torrent-efficiency | covered | `checkCooldownDrift` (Void Torrent, 30s) | Void Torrent | Void Torrent held | 90% target. Archon gets no lower target there though the channel grading says skipping is fine for it. The channel needs standing still, so movement holds are not mistakes. Phase 3 (2026-10-17): nobody takes Void Torrent; the tracked entry never runs. |
| priest-shadow/Abilities/voidwraith-efficiency | candidate | — | Voidwraith; Mindbender (−120s) | the summon held past its cooldown | 90% target, 180s or 60s with Mindbender. Not in the tracked list (the comments don't say why); the talent-set cooldown would need the player's talents, which the pull does not carry per cast. Value: a whole lost summon's damage from the pet's own hits. Low value until the talent-driven length is known. Phase 3 (2026-10-17), **not measurable:** nobody presses a Voidwraith, Shadowfiend or Mindbender; the Shadowfiend (buff 1280172) appears 5s at a time with no cast. |
| priest-shadow/Abilities/halo-efficiency | covered | `checkCooldownDrift` (Halo, 60s) | Halo (Archon) | Halo held | WoWAnalyzer declares no target and draws only the bar; the app tracks it. Phase 3 (2026-10-17): the tracked Halo was worth 0 a use (hits under 390964, not the cast's 120644). Now `damageIds` (Power Surge's echoes included), a pre-pull hit as evidence (Liaisa and Lulousek press it first at 1:00), and `burstHold`. Fires on one of 45: Флоусенх (7L3RKpavDA8T4MjY, 98.8th) 803k, ready 2:25 and 5:09, pressed at the next Imbibe hold (3:07, 5:59), 35s held outside the hold windows: one more Halo before the 6:45 kill. |
| priest-shadow/Abilities/power-infusion-efficiency | no-damage | — | Power Infusion; Twins of the Sun Priestess | PI held past its cooldown | Buffs an ally; its use is the raid lead's call, so holding it is not judged. The self-cast rule from the class layer (a second infusion goes to an ally) is also a raid support call. The app only uses its haste for the GCD fit. Phase 3 (2026-10-17): self-cast into Voidform on the samples (210 of 260 casts inside it); not measured. |
| priest-shadow/VoidVolley/efficiency-custom-max | candidate | — | Voidform; Improved Voidform; Crushing Void; the season 2 four-piece | Void Volley charges unspent when Voidform ends | Target 95% of a maximum worked out as 3 per Voidform, +1 for each of the two talents, plus Tentacle Slam casts with the set bonus. A Voidform cut short by death or the end of the fight isn't excluded. Value: unspent casts times the player's average Void Volley. Partly caught by window idle but not a charge left while casting something else. Phase 3 must check whether top players leave charges. Phase 3 (2026-10-17), **not built, negligible:** no Voidform ended with a charge left on the buff (1242171: three at Voidform, one per Tentacle Slam inside); 0–2 a pull were removed without a press, almost all a Tentacle Slam charge gained 0.0–1.5s before the window closed, top players too (Muddpriest 2; Adeliya, Nosmite, Arthaz 1; weak Lulousek, Twistednun 1). Each is a Void Volley over a Mind Flay, ~120k at most. |
| priest-shadow/VoidBlast/efficiency-custom-max | unverifiable | — | Void Blast; Thought Harvester | a rift ended with Void Blast charges | The maximum is built from modelled charges (9s over haste, shared with Mind Blast); the log doesn't show them. Phase 3 (2026-10-17): no Voidweaver in the samples. |
| priest-shadow/ShadowWordDeath/efficiency-custom-max | candidate | — | Death and Madness (reset); Deathspeaker (35% range) | Shadow Word: Death not cast through an execute phase | Execute time from target health on damage events over its 10s cooldown. WoWAnalyzer's own suggestion flag is off, so it grades nothing. Value: casts missed times the player's Shadow Word: Death damage. Execute phases are short on most bosses and the resets are unseen. Very low expected value. Phase 3 (2026-10-17), **not built, negligible:** a Shadow Word: Death averages 124k (34.2M over 276 casts on the 45), below the average GCD (155–322k), so outside the execute bonus a missed one costs nothing; 0–17 casts a pull (top 2–11). |
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

After phase 3 (2026-10-17) none is worth building on the samples; every
row has its numbers above.

- **Measurable only with a Voidweaver log** (none of 45 sample players,
  nor three weak probes): EntropicRift/collapsing-void-casts and
  darkening-horizon-extension.
- **Talents nobody takes**: ShadowyInsight/proc-use, MindDevourer/proc-use,
  Abilities/voidwraith-efficiency.
- **Fire on the top players as much**: InsidiousIre/buff-coverage
  (fight-driven), ShadowWordMadness/uptime-grade (proposed `wrong`).
- **Negligible**: Voidform/extension-per-use, VoidVolley/efficiency-custom-max,
  TentacleSlam/hit-per-cast, Shadowform/uptime-grade, ShadowWordDeath.
- **No model**: Abilities/mind-blast-efficiency (no cooldown fits; the
  weakest players press it half as often, an unpriced lead).
