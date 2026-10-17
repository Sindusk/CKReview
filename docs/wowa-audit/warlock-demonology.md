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
  judged), `lib/damage/wow/specs/demonology.ts` (phase 3: Implosion held,
  Call Dreadstalkers held), `tracked-cooldowns.ts` (Summon Demonic Tyrant,
  60s), `procs.ts` (Demonic Core, Infernal Bolt expiries), `potion.ts`,
  generic checks. Case study: qpZx3mWaG7gcDdYB pull 3 (Fwîî)
  against MAkCVqHfwx1vnDW8 fight 9 (Killulock, 99th); the header of
  ranged.ts records what matched: casts per unforced minute, Tyrant 92%,
  Dreadstalkers 85% vs 80%, Grimoire 91% vs 95%, potions 2/2, and the
  Implosion gap as Stasis counted by WoWAnalyzer.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). All Mythic. Fetched
  three single fights: aZ6NnwL8g9PdpGJ1 fight 13 (닭콤, Entombed
  Sentinels, 100th), LCFp3wbHvQqNP4my fight 40 (Embed, Entombed
  Sentinels, 20th) and VbAHWZDdPwJBajmx fight 57 (Lydd, Vashnik, 99.9th);
  probed 燃烧之灭 (99.9th), 닥꼼 (99.7th), Raeffi and Fuzïtîv (23rd) on
  Entombed Sentinels, Hemlöck and 岁月长衣衫薄 (100th) on Vashnik; ~150 WCL
  points with rankings. On disk already: Darkenedlife (LckJC7GMhQvD6rdw,
  ~99.8th by DPS), Bryon, Neltarian, Petonpassive, Swaguldan, Tuskanoita,
  Pazlock, Bulzwei, Lanlv, Happywarlock (a 27.8th-percentile Entombed Sentinels parse elsewhere),
  Wamp, Fetznhi, Fwîî's 16 static pulls (gVDPhzp61Zm29HMw) and the case
  study: 35 player-pulls in all.
  - **Talents:** every player is Diabolist (Ruination, Infernal Bolt,
    Diabolic Ritual) with Grimoire: Imp Lord, To Hell and Back (imps return
    after an Implosion: pet "Wild Imp (Inner Demons/To Hell and Back)") and
    a Gloomhound or Charhound that comes with each Call Dreadstalkers.
    Summon Vilefiend, Power Siphon, Summon Doomguard, Grimoire: Fel
    Ravager, Demonic Calling and Doom are in no log's masterData or
    damage: nobody takes them.
  - **Built** (demonology.ts, commit 054e9cf): **Implosion held** (the
    phase-2 `wrong` overturned: each press brings back ~0.5M of imps) and
    **Call Dreadstalkers held** (it costs no Soul Shards here). The models
    and every measurement are in the file's header.
  - **Not built, with numbers:** the Tyrant-window rows (Dreadstalkers
    timing, shards at the cast and the end, Grimoire, Demonic Cores);
    Soul Shards can't be rebuilt exactly from spender snapshots.
  - **Open (not a decision):** on Vashnik the 99.9th Lydd also holds
    Implosion (2.24M by the check, 14 presses in 6:35 where the other two
    top Vashnik players probed made 18 and 22). WoWAnalyzer's 90% rule
    flags him too; a Vashnik-specific reason (the Venoms after Imbibe) is
    possible but not found: the context's Imbibe hold window is already
    excused.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); the Warlock class layer (Dark Pact,
  Unending Resolve, Healthstone, shard waste rate, Grimoire of Sacrifice
  uptime) is in the shared row below, not repeated per spec.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warlock-demonology/AlwaysBeCasting/spec-threshold-unused | superseded | `checkGcdGaps` | none | nothing (no reader) | A looser 10 / 20 / 30% downtime step the guide never reads; the guide uses the core 5 / 10 / 15%. Treat as the core rule. |
| warlock-demonology/AlwaysBeCasting/guide-active-time | superseded | `checkGcdGaps` | none | idle time | Colour from the core steps (Good to 5%, Ok to 10%, Fail above). Whole-fight denominator, Stasis included. The text advises instant casts to move, which the user's movement leniency doesn't grade. |
| warlock-demonology/Abilities/call-dreadstalkers-cast-efficiency | verified | `dreadstalkersHeld` (demonology.ts) | none | Dreadstalkers held | 90% target on a fixed 20s cooldown, whole-fight. Phase 3 (2026-10-17), **built as Call Dreadstalkers held**. The premise of the old note was wrong for Midnight: Call Dreadstalkers logs no Soul Shard cost and the shard count across it adds up without one (Darkenedlife 0:40.4–0:53.7), and Demonic Calling is in no log, so it's a flat 20s cooldown (shortest interval 20.0s on every player). A use is the two Dreadstalkers and the hound that comes with them: 0.45M pooled, 0.67M when cast in the 12s before a Tyrant (136 vs 252 casts), so a hold that ends there is excused up to ~11s, its break-even. Top players press it on cooldown (median interval 20.6–21.1s; 닭콤 longest 22.8s); 20th–23rd percentile players hold it (longest 34.1s, 37.4s). Measured: 닭콤 none, Darkenedlife 6k, Lydd 139k; the other Entombed Sentinels kills 0–276k; Tuskanoita 756k, Happywarlock 621k; Fwîî 5k on the case study, 1.26M over his static's 16 pulls (Ula'tek 3:14 → 3:40). Small: Dreadstalkers is well kept. |
| warlock-demonology/Abilities/summon-vilefiend-cast-efficiency | unverifiable | — | Summon Vilefiend, Mark of Fharg, Mark of Shatug | the summon held past its recharge | 90% target; 45s base, 30s for the two hound variants. Phase 3: no sample player takes it (35 player-pulls and six probed top parses; no Summon Vilefiend in any masterData). The Gloomhound / Charhound in every log comes with Call Dreadstalkers instead (one hound ~2.5s after each cast, Darkenedlife 15 of 15), so its value is in `dreadstalkersHeld`. |
| warlock-demonology/Abilities/implosion-cast-efficiency | verified | `implosionHeld` (demonology.ts) | To Hell and Back | Implosion cast below 90% of every 15s | Counts Stasis as ready time (case study 48% vs 79%; outside Stasis only ~42s of holds). Phase 2 proposed `wrong` (imps thought worth more kept). Phase 3 (2026-10-17) overturned it and **built Implosion held**: with To Hell and Back each press brings imps back, 33–54k/s in the 15s after a press against ~2k/s anywhere else, 0.24–0.78M a press (mean 0.51M, 31 player-pulls), the same whether 1 imp was imploded (0.61M) or 5 (0.44M). Implosion's own hits (27–117k) are about the imploded imps' remaining bolts. The top players press it every 16.4–16.8s (median; 18 in a 5:00 kill), the 20th–23rd percentile every 20–31s. A press inside Tyrant returns 0.70M vs 0.47M outside, so a hold that ends there is excused up to ~8s. Measured: 닭콤 (100th) none, Darkenedlife 27k, the other Entombed Sentinels kills 0.29–0.37M; Vashnik's Lydd (99.9th) 2.24M; Embed 6.03M; Fwîî 1.99M on the case study and 15.0M over his static's 16 pulls, the largest Demonology loss found. |
| warlock-demonology/Abilities/demonic-tyrant-cast-efficiency | covered | `checkCooldownDrift` (Summon Demonic Tyrant, 60s) | none | Tyrant held | 90% target, whole-fight. Case study: 92%, its holds were in Stasis. WoWAnalyzer counts forced time as ready and expects a last use even when the fight ends first. Phase 3: top players recast it every 61.2–68.6s; the drift check found no lost use on any of the 35 player-pulls. |
| warlock-demonology/Abilities/power-siphon-cast-efficiency | unverifiable | — | Power Siphon | Power Siphon held | 90% on 30s. Contradicts the Tyrant guide, which says a siphon just before Tyrant costs imps. Phase 3: no sample player takes it (no Power Siphon in any masterData). |
| warlock-demonology/Abilities/grimoire-cast-efficiency | covered | no tracked entry; compared in the case study | Grimoire: Imp Lord, Grimoire: Fel Ravager | Grimoire held | 90% target on 120s (average 80, major 70). Case study 91% vs 95%, no check built. Stasis counts as ready. Phase 3: every player takes Imp Lord (nobody Fel Ravager); shortest recast 121.6–132.1s, and it's cast 2–11s before a Tyrant, so its holds are the Tyrant's own (see window-grimoire). |
| warlock-demonology/Abilities/summon-doomguard-cast-efficiency | unverifiable | — | Summon Doomguard | Doomguard held | 120s base; WoWAnalyzer cuts 3s per Demonbolt cast made with a Demonic Core up. Phase 3: no sample player takes it (no Summon Doomguard in any masterData), so the cooldown model can't be fitted. |
| warlock-demonology/DemonicTyrant/window-spender-casts | covered | `burstGcdFindings` (Demonic Tyrant) + `checkGcdGaps` | Diabolist (Ruination), Dominion of Argus | fewer than eight Hand of Gul'dan / Ruination casts in the 25s window | Half the window score. It grades active time inside a window as a cast count; idle there costs more than a normal GCD, and the app already prices that premium. Eight casts and 25s are fixed, not haste-scaled, and forced time inside the window isn't subtracted. The app values missing GCDs in the window at its bonus. Phase 3: the player's Tyrant buff lasts 20.0s here; 4.5–8.0 Hand of Gul'dan a window, top players included. |
| warlock-demonology/DemonicTyrant/window-dreadstalkers-timing | candidate | — | none | Dreadstalkers not cast in the 12s before Tyrant (best within 6s) | 15 points. Phase 3: measured, not built. Every one of the 140 Tyrant windows on the first 31 player-pulls had a Dreadstalkers in the 12s before (Fwîî's included), so it never fires. Such a cast is worth 0.67M vs 0.45M, which `dreadstalkersHeld` uses as its excuse for holding into a Tyrant. |
| warlock-demonology/DemonicTyrant/window-shards-at-end | candidate | — | none | three or more shards left at the window's end | 15 points, 0 at 3+. Phase 3: measured, not built. Soul Shards can't be rebuilt exactly: between two spenders the count gains a shard no cast explains (no cast between: +1 in 47 of 49 pairs; a Shadow Bolt +1 or +2). Read from the first spender after the window, everyone has 3–5 there, top players included. And a shard spent inside the window is worth 50k (Hand of Gul'dan with its imps) vs 41k outside (875 / 1111 casts): ~9k a shard moved. Negligible. |
| warlock-demonology/DemonicTyrant/window-grimoire | candidate | — | Grimoire: Imp Lord, Grimoire: Fel Ravager | Grimoire available at Tyrant but not cast in the 20s before or in the window | 5 points. Its own guide text allows holding it for a burn phase, yet the score gives 0. Phase 3: measured, not built. Imp Lord was cast 2–11s before Tyrant on every player but once in 35 player-pulls (Pazlock, ready at his 2:15 Tyrant); Wyrmtongues cast it 1s after. Never fires on the weak players. |
| warlock-demonology/DemonicTyrant/window-doomguard | unverifiable | — | Summon Doomguard | Doomguard available at Tyrant, not cast in the 12s before | 5 points; no allowance for it coming off cooldown mid-window. Phase 3: no sample player takes Summon Doomguard. |
| warlock-demonology/DemonicTyrant/window-shards-at-cast | candidate | — | Diabolist (Ruination) | fewer than five shards at Tyrant (Diabolist) or three or more (other trees) | 5 points. The hero tree is read from Ruination alone. Phase 3: measured, not built. Read from the next Hand of Gul'dan when nothing generates in between: 5 on almost every Tyrant; 3–4 at least as often on the top players (Darkenedlife 4, 5, 3, 5, 4; Happywarlock 3; Fwîî 3–4 on 5 of his ~70). Worth ~9k a missing shard (above). |
| warlock-demonology/DemonicTyrant/window-rating | superseded | `burstGcdFindings` | none | any window under 95 | Weights: spenders 50, Dreadstalkers 15, shards at end 15, Grimoire 5, Doomguard 5, shards at cast 5. A weighted sum of the rows above, with a spender floor of six not pro-rated for a fight that ends early. The app has no composite score. |
| warlock-demonology/DemonicTyrant/window-feedback-notes | candidate | `checkProcs` (Demonic Core expiries) | Power Siphon, Demonic Core | under eight Demonic Power stacks, under two Demonic Cores at cast, a Power Siphon in the 7s before | Text only, no points. Phase 3: Demonic Core (264173, 20s) is in procs.ts and fires on Demonology pulls (Happywarlock 2, Lydd 2, Tuskanoita 2 unforced expiries, 51–117k each; Fwîî one at Ula'tek, 135k, two more in forced time); Infernal Bolt (433891) too (Fwîî 5 unforced expiries over 16 pulls, 206–306k each). Cores at Tyrant: top players bring 2–4, Fwîî 0–2, worth a few shards' ~9k each: negligible, not built. Power Siphon: nobody takes it. Demonic Power stacks not measured (low value). |
| warlock-demonology/Doom/uptime-unused | no-damage | — | Doom | nothing (no reader) | A debuff uptime getter, 95 / 90 / 80%, used only in a statistic. Doom is applied by a core spend, so whole-fight uptime is a weak measure. The app's DoT list has no Demonology entry. Phase 3: no Doom damage in any of the 35 player-pulls: nobody takes it. |
| warlock-demonology/DemonicCalling/wasted-procs-unused | unverifiable | — | Demonic Calling | a proc refreshed with Dreadstalkers ready, or expired | Count shown in a statistic, no grade. Per minute above 1 / 1.5 / 2 in an unused getter. Phase 3: no sample player takes Demonic Calling (not in any masterData, no such buff), so not in procs.ts. |
| warlock-demonology/LegionStrike/permanent-felguard-casts-unused | no-damage | — | none | nothing | Fewer than one Legion Strike by the permanent pet; the getter is unused and may not apply to the Midnight default pet. Phase 3: the sample players' permanent pet is a Sayaad or Felhunter; a Felguard (Legion Strike, Felstorm) on one pull of 35. |
| warlock-demonology/SummonVilefiend/summon-efficiency-unused | superseded | the Vilefiend row above | Summon Vilefiend, Mark of Fharg, Mark of Shatug | nothing (no reader) | 90 / 80 / 70% getter duplicating the Abilities-panel entry. |
| warlock-demonology/Guide/cooldown-usage-graph | no-damage | — | the talents listed per ability | — | A timeline of Dreadstalkers, Tyrant, Power Siphon, Implosion, both Grimoires and Doomguard; the spec adds no grade. |
| warlock-shared/class-layer | no-damage | — | Dark Pact, Frequent Donor, Dark Accord, Grimoire of Sacrifice | — | Dark Pact (60% target) and Unending Resolve (33%) efficiency, Healthstone grading, the shard waste rate (0.5 / 1.67 / 3.33 a minute), and Grimoire of Sacrifice uptime (95 / 90 / 85%) are survival, display or, for shards, not read here; shard waste would need the spender fit. Defensives and utility aren't judged. Phase 3: shards can't be rebuilt exactly (window-shards-at-end); no Demonology player sacrifices its pet. |
| warlock-demonology/statistics | no-damage | — | — | — | Display only: Legion Strike, Doom, Demonic Calling counts, Diabolic Ritual hero-demon damage, Dreadlash bonus, Inner Demons, Power Siphon imps taken, Sacrificed Souls bonus, Vilefiend pet breakdown, shard graph, Arcane Torrent, and a cooldown damage tracker (Imp Lord, Fel Ravager, Tyrant, Doomguard windows). |

Not rules (models the rules above rest on): the pet model (which demons
are alive, imps sacrificed or imploded, Demonic Tyrant handling), the
registered normalizers (pre-pull pets, summon order, Imp Lord, Fel
Ravager), the Tyrant window bookkeeping, the Soul Shard tracker, the
shared cooldown model, the shard-graph guide note. Two Power Siphon
normalizers are unregistered, dead code. The pet constant tables are
"table, not extracted".

## Candidates left

Phase 3 (2026-10-17) worked the list below; what's left is measured and
negligible, or untestable because nobody takes the talent.

1. **Call Dreadstalkers cadence**: built (`dreadstalkersHeld`). Demonic
   Calling: nobody takes it.
2. **Wasted Demonic Calling procs**: `unverifiable` (nobody takes it).
3. **Doomguard cooldown model**: `unverifiable` (nobody takes it).
4. **Vilefiend and Power Siphon cadence**: `unverifiable` (nobody takes
   them).
5. **Shards at the window's end / at the cast**: not built; shards can't
   be rebuilt exactly and a shard moved into the window is worth ~9k.
6. Found in the re-check of the `wrong` rows: **Implosion**, built
   (`implosionHeld`), the largest Demonology loss.
