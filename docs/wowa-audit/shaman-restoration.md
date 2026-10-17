# WoWAnalyzer audit: Restoration Shaman

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Shaman shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-10-08
  (Water Shield uptime section), oldest entry 2026-01-11. No priority list
  and no checklist. The guide has five sections: Always Be Casting,
  Core Spells and Buffs, Healing Cooldowns, Advanced HoT and Buff tracking
  and Defensives. Many threshold getters in the spec (Water Shield, Earth
  Shield, Tidal Waves, Chain Heal and rain targets) are read by nothing, so
  they grade nothing; they are listed because they exist. What grades is
  cast-efficiency bar colours, per-cast good / ok / fail boxes (Nature's
  Swiftness, Ancestral Swiftness, Unleash Life, Surging Totem motes) and the
  Ascendance rows.
- **App:** `lib/damage/wow/specs/healer.ts` (`"Restoration Shaman"` shares
  `HEALER_CHECKS` with the other healers: one check, `healGcds`, which values
  a heal GCD that mostly overhealed at the healer's own damage filler),
  generic checks (`checkGcdGaps`, `checkInterrupts`, `checkDeaths`),
  `potion.ts`. Restoration Shaman has no entry in `tracked-cooldowns.ts` and
  no burst window. **No case study** exists for this spec (the saved
  case-study pages are all damage specs), so nothing here is `verified`.
  Healers are scored by what a heal GCD healed and what idle cost; DoTs are
  deliberately not judged on them (healer.ts header).
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Restoration sets or
  adds. Shaman class-layer records are reconciled in
  [shaman-elemental.md](shaman-elemental.md); the one row for them here is
  the utility row.

This is a healer spec, so the audit is about damage and most of the
spec's grading is healing, mana or mitigation. Those rows are `no-damage`
and say so; where one could inform `lib/mitigation/`, the note says it.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| shaman-restoration/AlwaysBeCasting/healing-gcd-list | superseded | `checkGcdGaps` | Surging Totem, Ascendance, Stormstream Totem counted | idle time | Only supplies which abilities count as healing GCDs (heals, totems, Ascendance, Earth Shield, Downpour, dispels); the panel is core's, whole fight, 5 / 10 / 15% idle. The app takes active time from the log's own casts and subtracts forced time. WoWAnalyzer counts dispels and totem drops as active casting, which hides idle; the app counts any GCD cast. |
| shaman-restoration/Guide/riptide-cast-efficiency | no-damage | — | Riptide; Echo of the Elements, Elemental Reverb (charges); Rip Current; Offering from Beyond, Mystic Knowledge (modelled reductions) | Riptide left off cooldown a full recharge | Default 80% bar, whole fight. Not tracked: charges and modelled reductions spread the intervals too far (survey 1.2s shortest, 5.2s median). A skipped Riptide is healing throughput; the GCD it would fill is not idle, so there is no damage to value. What `healGcds` does cover is a Riptide that was cast and mostly overhealed. |
| shaman-restoration/Guide/healing-stream-totem-cast-efficiency | no-damage | — | Surging Totem raises the target to 90%; charges; Totemic Momentum, Water Totem Mastery, Totemic Surge | totem charges sitting full | 80% (90% with Surging Totem), whole fight, forced time counted as ready. Charge-gated and off the GCD (survey 2.6s shortest, 16.9s median), so not trackable by the drift rule either. Healing. |
| shaman-restoration/Guide/healing-rain-cast-efficiency | no-damage | — | Healing Rain (shown only without Surging Totem) | not recast near its 12s cooldown | 80% target, average 70, major 50. Healing. |
| shaman-restoration/Guide/surging-totem-cast-efficiency | no-damage | — | Surging Totem (Totemic); Totemic Surge (−5s) | totem left down a full cooldown | Default 80%, cooldown 30s less 5. It does pass the tracked-cooldowns spread rule (survey 25.0s shortest, 27.1s median), but a lost cast is lost healing, not a damage GCD, so a drift entry would value it at nothing. The module is active only with Whirling Elements (unverified how the guide behaves otherwise). Pre-pull totem is faked by a normalizer, the kind of correction `roomForUses` does from the log. |
| shaman-restoration/Guide/surging-totem-mote-use | no-damage | — | Surging Totem, Whirling Elements | motes expiring unused | 3 consumed perfect, 2 good, 1 ok, 0 fail per cast. A mote present at the pull is invented as a cast at fight start; casts near the kill get rated before motes could be used. Healing. |
| shaman-restoration/Guide/natures-swiftness-use | no-damage | — | Nature's Swiftness | the buff spent on a damage spell or Healing Wave | Chain Heal good, Healing Wave ok, anything else fail, one box per buffed cast; a buff that expires unused makes no box. Mana and throughput. An instant damage spell under the buff is graded "fail" here although it is not a damage loss. |
| shaman-restoration/Guide/ancestral-swiftness-use | no-damage | — | Ancestral Swiftness (Farseer) | not on cooldown, or spent on a non-heal | Same boxes; 90% efficiency target (average 80, major 70) on a 30s cooldown, whole fight, forced time counted as ready. Lava Burst under it is a fail since 2026-09-21. Healing. |
| shaman-restoration/Guide/unleash-life-use | no-damage | — | Unleash Life; Call of the Ancestors (changes Riptide rating); Earthen Accord | buff wasted or spent on the wrong heal; off cooldown | Chain Heal good, Healing Wave ok, expired buff fail; 90% efficiency (average 80, major 70), 20s less 3 with the set bonus. Healing. |
| shaman-restoration/Ascendance/use-quality | no-damage | — | Ascendance (Restoration); Surging Totem widens the valid set | Riptide, Healing Rain, Lightning Bolt or dispels cast inside Ascendance; no Swiftness cast | Grades each window by the share of casts that are valid heals (above 75% good, above 50% ok) plus a Swiftness check. It counts every cast including off-GCD ones, so it is not an active-time grade and does not double the idle check; the idle inside a window is `checkGcdGaps`'s. The app has no Ascendance window for this spec. Healing. |
| shaman-restoration/Guide/major-cooldown-efficiency-bars | no-damage | — | First Ascendant; Totemic Surge | a 3-minute cooldown left a full recharge | Spirit Link Totem, Healing Tide Totem, Ascendance; stricter source targets are commented out, so the 80% default applies. Whole fight, last use expected even if the kill comes first, forced time counted as ready. Spirit Link Totem is mechanic-timed. Healing cooldowns; **possible input for `lib/mitigation/`** (when these were available against the damage that needed them), not for damage. |
| shaman-restoration/Guide/defensives-timeline | no-damage | — | Astral Shift, Earth Elemental (Primordial Bond) | — | The core defensives framework with two shared analyzers: usage against a damage-taken timeline. Survival calls, not judged. Same ground as `lib/mitigation/`. |
| shaman-restoration/WaterShield/uptime-unconsumed | no-damage | — | Resurgence, Reactive Warding, Therazane's Resilience | nothing graded | Uptime over the whole fight drawn as a bar; the 95 / 90 / 85% getter and the pre-pull flag are read by nothing. Mana. |
| shaman-restoration/EarthShield/uptime-unconsumed | no-damage | — | Earth Shield; Elemental Orbit, Earthen Harmony | nothing graded | Spec getter 90 / 85 / 80% (shared 95 / 90 / 80%), unread. Summed over players, so two shields can read over 100% and hide a gap. Mitigation and healing. |
| shaman-restoration/TidalWaves/unused-rate-unconsumed | no-damage | — | Tidal Waves; Primordial Capacity (cap 2 to 3) | nothing graded; Riptide cast at the cap | The unused-rate getter (50 / 80 / 90%) is unread; the guide prints generated, consumed and overcapped counts. Healing throughput. |
| shaman-restoration/Targets/chain-heal-healing-rain-targets-unconsumed | superseded | `healGcds` | Ancestral Reach, Flow of the Tides (Chain Heal targets) | nothing graded | Average targets per Chain Heal (minor below 97% of the maximum) and per rain or totem tick; shown in statistic boxes only. `healGcds` measures what a Chain Heal actually healed against its overheal, which is the effect of too few targets. The core hits-per-cast candidate (core.md) would not add to it here. |
| shaman-shared/utility | no-damage | — | — | — | Class-layer utility and defensives used by this spec: Astral Shift, Earth Elemental, Spirit Wolf, Static Charge, Elemental Orbit, Earthen Harmony, Mana Spring, Nature's Guardian, Wind Shear, Capacitor, Tremor, Spiritwalker's Grace and the other spellbook-only entries. Utility and defensives aren't judged (dps-analysis.md). |
| shaman-restoration/statistics | no-damage | — | — | — | Display only: mastery effectiveness by spell, healing efficiency and HPM, mana charts, cooldown throughput, Undercurrent and Coalescing Water graphs, Earth Shield breakdown, the talent and hero-talent boxes (Deluge, Downpour, Torrent, Ancestral Vigor, Healing Rain position, Spirit Link damage reduction and the like), Nature's Swiftness mana saved, Water Shield passive mana, Unleash Life healing. |

Cast-efficiency targets summary (all with suggestion text switched off, so
they only colour guide bars): Healing Stream Totem 80% or 90%, Healing Rain
80%, Unleash Life 90%, Ancestral Swiftness 90%, everything else the 80%
default; Ascendance, Healing Tide Totem and Spirit Link Totem use the default
because their stricter targets are commented out. Nothing is graded for
Lava Burst, Flame Shock, Lightning Bolt, Chain Lightning or Frost Shock,
which are in the spellbook only: **this spec grades no damage spell**, and no
Flame Shock uptime or early-refresh module is enabled for it.

Not rules (models the rules above rest on): the Riptide and Earthliving
trackers and attributors, the stat tracker (mastery as spellpoints), spell
mana cost with Current Control, the healing-done correction that removes
Spirit Link damage, the healing-efficiency tracker, the cooldown modifiers
for Offering from Beyond, Mystic Knowledge and Lava Surge (a proc ends Lava
Burst's cooldown), the Riptide / Unleash Life / Chain Heal / Earth Shield /
pre-pull-totem normalizers and the cast-to-heal event links. Hand-kept
constants such as the Healing Rain target count and the event-link buffer
fall here too. Eight files are dead code (not in the parser's module list):
Cast Behavior, Earthweaver, Tidewaters, a Purify Spirit override, a talent
box helper, a Cloudburst normalizer, an empty Lively Totems normalizer and a
stylesheet. The shared Flame Shock, Static Charge and Abilities records
(shaman-elemental.md's layer) are not instantiated as graded modules by this
spec.

## Candidates left

None worth building from this audit. The only damage on a healer is the
damage filler a wasted heal GCD could have been, and `healGcds` already
values that; WoWAnalyzer grades no damage spell here, so it has nothing to
add. Two weak options, listed for completeness and ordered by expected
value, both likely to fail phase 3:

- **Surging Totem and Nature's Swiftness cadence through
  `checkCooldownDrift`:** both pass the tracked-cooldowns spread rule in the
  survey (Surging Totem 25.0s shortest, 27.1s median; Nature's Swiftness
  60.2s, 64.7s). A late cast would be valued from the log's damage filler,
  which understates healing the cast was timed for, and a healer holding a
  totem for a damage window is a raid-lead call. To value it, compare
  the healer's own filler damage per GCD; top healers hold these for
  mechanics, so a mistake would have to be a hold with no heavy damage in
  the window. Low value.
- **Healing cooldown timing against damage taken** (Spirit Link Totem, Healing
  Tide Totem, Ascendance): a mitigation question, not a damage one; if built,
  it belongs in `lib/mitigation/`, not the damage checks.
