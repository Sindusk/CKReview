# Mechanic Error Detection — How This Directory Works

This directory contains encounter-specific error detection for raid mechanics,
organized per game and per raid:

```
lib/mechanics/
  MODEL-RESEARCH-GUIDE.md     — how to write a boss's encounter model (research stage)
  PITFALLS.md                 — per-boss lessons as a checklist (verification and
                                refinement; the /build-module and /refine-module
                                skills read it)
  fallback.ts                 — the fallback model for bosses with no module: learns
                                each ability's normal targets from the pull and
                                the boss's earlier pulls (never later ones, as in
                                week-1 progression), then flags doubled-up, wrong-target,
                                avoidable and unsurvivable hits, penalties and
                                the pull's cutoff. Boss-agnostic; FFXIV only so far
  player-position.ts          — THE shared "where was player X at time T" lookup
  rule-meta.ts                — mechanic grouping and each rule's exposure (who it tests)
  occurrences.ts              — mechanic instances: Dancing Mad anchors plus the
                                instances modules report with their responsible players
  assignments.ts              — assigned duties detected across a report (carrier,
                                shared, soak groups) and applied to the pulls
  geometry.ts                 — distances/angles (two angle conventions — read its header)
  ffxiv/
    roles.ts                  — MT/OT/H1/H2/M1/M2/R1/R2 party-role detector (MT = the
                                boss's first auto-attack target)
    common.ts                 — general rules for every FFXIV fight, run once per pull
                                after the boss modules (both healers dead with no raiser)
    dancingmad/               — Dancing Mad (Kefka's Return) ultimate
      phase1.ts               — Phase 1 rules (Blizzard III, Tele-Trouncing, Confetti, ...)
      wave-cannon.ts          — Phase 1 Wave Cannon beams + towers
      kefka-says.ts           — Kefka Says / Mystery Magic rules
      graven-image.ts         — cross-pull Graven Image spread analysis
      graven2-strategy.ts     — Graven Image 2 strategy declaration
      forsaken.ts             — tower-soak mechanic (Phase 2)
      limitcut.ts             — gaze + numbered dash mechanic
      blackhole.ts            — tether/Earthquake mechanic
      stompies.ts             — post-Black-Hole Earthquake baits/towers
      exdeath.ts              — Phase 3 Thunder III / Shockwave
      ultimate-kefka.ts       — Phase 5 per-pull rules (Flood, Fell Forces stacks,
                                Maddening Orchestra, Celestriad towers, Stray
                                Apocalypse, Forsaken ground, Null enrage, collapse)
      blackhole-strategy.ts   — cross-pull strategy auto-detect (DSA/SDA/Double Tether)
    fru/                      — Futures Rewritten (Ultimate); one pull, five phases
      common.ts               — shared helpers (alive/raised, hits on the living)
      fatebreaker.ts          — Phase 1 per-pull rules (Cyclonic Break, Powder Mark /
                                Burn Mark, Utopian Sky, Fated Burn Mark tethers,
                                Fall of Faith, towers, deathwall knocks, enrage)
      usurper-of-frost.ts     — Phase 2 + intermission per-pull rules (Diamond
                                Dust cones/stones, gaze, twins, Holy stacks,
                                Mirror cones, Light Rampant tethers/stacks/
                                towers, puddles, walls, Absolute Zero, Endless
                                Ice Age)
      oracle-of-darkness.ts   — Phase 3 per-pull rules (Relativity fires,
                                Unholy, Blizzard, Meltdown baits/beams,
                                rewind Water/Eruption/Shadoweye, Refrain
                                Waters, Apocalypse, Spirit Taker, busters,
                                Darkest Dance walls, Memory's End)
      enter-the-dragon.ts     — Phase 4 per-pull rules (Shiva's dual autos,
                                Akh Rhai, Darklit Lightsteep / chains / Waters,
                                Somber Dance, Akh Morn enmity, Morn Afah HP gap,
                                Crystallize Time stacks / Aero / dragon heads /
                                claw and fang expiry, rewind wings, the memory
                                crystal, enrage)
      pandora.ts              — Phase 5 per-pull rules (Fulgent Blade
                                exalines, Akh Morn stacks, dual autos,
                                Paradise Regained wings / tethers / towers,
                                Cruel Path lines and lanes, Pandora's Box,
                                Paradise Lost enrage)
    top/                      — The Omega Protocol (Ultimate); one pull, six phases
      omega.ts                — Phase 1 per-pull rules (Program Loop towers and
                                Blaster tethers, Pantokrator missiles and shared
                                lines, Flame Thrower / Ballistic Impact, Diffuse
                                and Wave Cannon Kyrios, Atomic Ray enrage)
      omega-mf.ts             — Phase 2 per-pull rules (Solar Ray aggro, Party
                                Synergy clones/laser/glitch range/Fire/Spotlight
                                stacks, Bladedance tethers, Beyond Defense and
                                Pile Pitch, Laser Shower enrage)
      omega-reconfiguredd.ts  — Phase 3 per-pull rules (transition rings, arms
                                and Sniper Cannons; Hello World towers, rot
                                hand-offs, stacks, defamations, tether breaks
                                and penalties; Oversampled Wave Cannon; Ion
                                Efflux enrage)
      blue-screen.ts          — Phase 4 per-pull rules (Wave Repeater rings,
                                protean doubles, afterimages, stack groups
                                and the marker swap, Blue Screen's HP check);
                                the later phase files are research models only
      pantokrator-conga.ts    — cross-pull Pantokrator side order (who should
                                have crossed in a same-number pair)
      synergy-order.ts        — cross-pull Party Synergy row order (which glitch
                                partner was off their row slot or stack)
    trials/                   — Extreme trials
      doomtrain.ts            — Doomtrain (Hell on Rails EX) per-pull rules
                                (avoidables, stored plasma spreads/pairs, orb
                                cones/stacks/spreads and deadline, Arcane
                                stacks, Plummet, Lightning Burst, Derail
                                strandings, falls, mass deaths, enrage)
      zelenia.ts              — Zelenia (Recollection EX) per-pull rules
                                (avoidables, center Bleeding, Specter tethers,
                                Spearpoint Push, Escelons' Fall repeats,
                                Thunder III drops on roses, Magic Break, Bloom
                                towers, stacks, mass deaths, enrage)
      necron.ts               — Necron (Necron's Embrace EX) per-pull rules
                                (avoidables, Mori center, Fear of Death hands,
                                Smite/Embrace/Grand Cross overlaps, empty
                                towers, Shockwave cones, Blue Shockwave swap and
                                cleaves, Mass Macabre portals, abyss deaths,
                                Invitation, add check, mass deaths)
      enuo.ts                 — Enuo (The Unmaking EX) per-pull rules
                                (avoidables, Chains / Deep Freeze /
                                Petrification, Emptiness cones and Return
                                lines, tanks' line fronts, Meltdown spreads,
                                Voidal Turbulence cones and towers, orb
                                pairs, flares, mass deaths, enrage)
      queen-eternal.ts        — Queen Eternal (Sphene's Burden EX) per-pull
                                rules (avoidables, Deep Freeze, Retribute /
                                Aeroquell shares, spreads and baits, Earth
                                towers, meteors and boulder Big Burst, Weighty
                                Blow, Rush tethers, Ice Darts, Prosecution
                                swap, falls, mass deaths)
    arcadion/                 — AAC Heavyweight (Savage)
      vamp-fatale.ts          — Vamp Fatale (M9S) per-pull rules (Stomp bats and
                                Bombpyre overlaps, Aetherletting drops/lines/overlap,
                                Hardcore, Rain, saws/towers/Flails/Doornail, cells,
                                Deathmatch, enrage)
      red-hot-deep-blue.ts    — Red Hot and Deep Blue (M10S) per-pull rules
                                (Damage Down hits, fire, deathwall, Floater, bait
                                overlaps, busters, Deep Impact, stacks, prison
                                tethers/deadline, Xtreme cleanses, enrage)
      tyrant.ts               — The Tyrant (M11S) per-pull rules (Damage Down hits,
                                overlapping personal baits, short stacks, Raw
                                Steel busters, Meteorain comets/fireballs,
                                towers, Stampede fire/lava, falls, kicks, enrage)
      lindwurm-1.ts           — Lindwurm (M12S door boss) per-pull rules (Damage
                                Down hits, Act 1 cones, orb/spread/chain overlaps,
                                Fusion stacks, Visceral Burst, Act 2 Unbreakable
                                chains and In Line towers, Metamitosis towers,
                                falls, Refreshing Overkill enrage)
      lindwurm-2.ts           — Lindwurm II (M12S P2) per-pull rules (Damage Down
                                hits, Rep1 element repeats, Rep2 cones/defams/
                                proteans/stacks, Esoteric Finisher, Blood Mana
                                mutations, Idyllic towers/Doom/portents, mass
                                deaths, Arcadian Hell enrage)
  wow/
    registry.ts               — THE list of per-pull WoW modules; the app and
                                validate.js both run it (a new boss = one line)
    common.ts                 — shared WoW helpers: WowPullContext, debuff
                                windows, playerError, battle-rez / dead-at /
                                alive-at, clustering, hit episodes, raidMarker,
                                and pullOverMarker (the generic "N dead / tank
                                died / wipe called" cutoff every boss ends with)
    vs-dr-mqd/                — Voidspire, Dreamrift, March on Quel'Danas
      midnightfalls.ts        — Midnight Falls per-pull rules
      terminate-kicks.ts      — cross-pull Terminate kick-order detection
      crystal-assignments.ts  — declared crystal assignments
    va/                       — The Venomous Abyss
      entombed-sentinels.ts   — Entombed Sentinels per-pull rules (orbs, Living Venom,
                                Helical Toxins, Protovenom, Miasma soak, pools)
      vashnik.ts              — Vashnik per-pull rules (Malignant Totems, Exploding
                                Infection, Plague Froth/Wave, Bile, venoms, Fangs)
      sszorak.ts              — Sszorak per-pull rules (Serpent's Fury/Virulence,
                                Mutilate groups, Ravage, Tempest, Crosswinds,
                                Viscous Cysts, Howling Maelstrom)
      nekzali.ts              — Nek'zali per-pull rules (Vessel revivals, Ritual/
                                Uncoiled Rage, Pyre soaks, Barrage, pools, Mythic
                                well Curse/Soul Exhaustion, Invoke silence)
      lost-explorers.ts       — The Lost Explorers per-pull rules (fish clock /
                                Final Ascension, Relic Rupture, Blast Wave
                                bounces, Elemental Explosion, Mighty Thud soaks,
                                Shredding Shards swaps, avoidables, called wipes)
      twin-fangs.ts           — The Twin Fangs per-pull rules (Eternal Venom cap
                                and soft enrage, globule bursts/pickups, Feast
                                bites, Visceral Burst kicks, Stone Breaker soaks,
                                Tainted Burst, avoidables)
      coiled-altar.ts         — The Coiled Altar per-pull rules (Venom orb
                                eruptions, Guillotine soaks, Dreadmarch / ghosts /
                                Malevolent Resonance, Soulcoiler Wails and shields,
                                Nightfall, Spirit Erasure, frontals, avoidables)
      ulatek.ts               — Ula'tek per-pull rules (egg hatches and their
                                carrier, Caustic Waves, Spectral Coil soaks,
                                Serpent's Bite / Calcified Corpse, Volatile Purge,
                                Mother's Wrath, Blight Vein, add casts, enrage)
```

**Read the header comment of a module before touching it.** Each module's
header is the authoritative model of how that mechanic works. In newer
modules the header has three parts, top to bottom:

1. **VERIFIED AGAINST LOGS** — what real reports showed, with report codes
   and pull numbers. This part wins any disagreement.
2. **RULES IMPLEMENTED** — rule IDs and their severities.
3. **GUIDE-DERIVED MODEL** — the researcher's pre-log model (see
   [MODEL-RESEARCH-GUIDE.md](MODEL-RESEARCH-GUIDE.md)).

Older modules (FFXIV, Midnight Falls) predate the research step, so their
headers are log-derived only. This README covers what is *common* across all
modules.

---

## Architecture: the three kinds of detection

**1. Declarative single-ability rules** live in `lib/error-rules.ts` and are
evaluated by `lib/error-detection.ts`. Use these when a rule is expressible as
"this ability/debuff hit this player (maybe gated by one condition)". Modules
can also hold their own declarative rule tables and run them through
`evaluateRuleSet()` (midnightfalls.ts does this).

**2. Per-pull correlation modules** (forsaken.ts, blackhole.ts, limitcut.ts,
stompies.ts, exdeath.ts, phase1.ts, ultimate-kefka.ts, midnightfalls.ts, entombed-sentinels.ts,
vashnik.ts, sszorak.ts, nekzali.ts, lost-explorers.ts, twin-fangs.ts, coiled-altar.ts, ulatek.ts) exist because they
correlate *multiple* event streams — e.g. a stack-counter debuff against a
specific damage tick, or positions against an assignment schedule. FFXIV
modules export a `detectXErrors(players, deathEvents[, enemyCasts, ...])`
function called from `transformFFightToPull` in `lib/log-transforms.ts`.
WoW boss modules export `detectXErrors(ctx: WowPullContext)` (players,
deaths, enemy casts/buffs/buff removals, friendly-NPC damage, pull length)
and are listed once in `wow/registry.ts`, which both `transformFightToPull`
and `scripts/validate.js` iterate.

- **Self-gate on the mechanic's signature debuffs/abilities** so the module
  can run safely on every pull, including pulls that never reach the
  mechanic. No caller-side gating.
- Duplicate raid-level errors are suppressed by `suppressDuplicateRaidErrors`
  (2s per-ruleId window, keeps the first).
- `PullError` severity `"Raid"` is usually player-less and marks the pull's
  cutoff (see `types/PullError.ts` and philosophy point 4).
- Encounter modules (the WoW `va/*.ts` ones) are one module per boss, with
  a single `detect<Boss>Errors` entry point running every rule for that
  fight plus the pull-over markers.

**3. Cross-pull / strategy-driven detection** (terminate-kicks.ts,
blackhole-strategy.ts, graven-image.ts, crystal-assignments.ts) runs over
ALL of a report's pulls and is NOT called from the
transform layer — `app/page.tsx` recomputes it (typically into a separate
`displayPulls` layer or the Strategy dialog) because it depends on
report-wide context or user-selectable configuration.

**The fallback model** (`fallback.ts`) is cross-pull detection for every
boss without an encounter module. It is listed by fight name in its
`COVERED_ENCOUNTERS`, so **a new boss module must add its fight name
there**, or the fallback keeps running beside it. A module covering only
some phases of a multi-phase fight goes in `MODULE_PHASES` instead (by the
log's phase ids): the fallback keeps running on those pulls but drops its
errors inside the covered phases (Futures Rewritten P1). On fallback pulls it
replaces the generic `ffxiv-damage-down` rule. Keep it boss-agnostic: a fix
for one boss belongs in that boss's module, not here.

**The declared-strategy pattern** (worth reusing): when ground truth is NOT
derivable from logs (e.g. per-matrix kick assignments — the log carries no
instance data and timing/position/order were all proven non-discriminating),
the user's strategy gets DECLARED in the module as data, then VALIDATED
against what detection *can* see. Display the declared strategy when
consistent; fail closed to raw detection when not. Declared config may power
attribution elsewhere, but only in provably-unambiguous cases.

---

## Attribution philosophy (follow strictly)

These rules were established through explicit user corrections. They apply to
every mechanic, in every game. When in doubt, come back here.

1. **Flag only the ROOT-CAUSE player.** Never auto-blame whoever took a stray
   hit. Decide by who was out of their *assigned* position / failed their
   *assigned* job, not by where the damage landed.
2. **Deaths are sometimes nobody's fault, and death fallout is never
   flagged.** When a player dies, every downstream consequence of that death
   (re-targeted dashes, tethers, cones, redistributed soaks) stays UNFLAGGED.
   The death's own cause is flagged where it happened — once.
   **A death to raw damage in a correctly executed mechanic is not a player
   error** (user, 2026-10-12, Fatebreaker's Fall of Faith): low HP or missing
   mitigation is the Mitigation Analysis's territory, not a mechanic flag.
   Don't flag it here, in any module. (Existing tank-buster "died to the
   buster" rules predate this and are pending the user's call.)
3. **When attribution is ambiguous, flag all candidates rather than guess.**
   When fallout vs. genuine error can't be distinguished at all, stay silent.
   A false accusation is worse than a miss.
4. **Severity means consequence, not the kind of mistake.**
   - **Minor** = avoidable damage that didn't kill anyone or cause the wipe.
   - **Major** = caused the death of the player or another player, or led to
     the wipe.
   - **Raid** = leads to an inevitable wipe. A Raid error is the pull's
     cutoff point; errors after it don't count toward Report/PullList/statics
     totals.
   - **FFXIV exception:** avoidable damage is Major even when nobody died.
     It hands out a Damage Down, which costs the group the enrage check
     (user, 2026-10-08). A Damage Down is never suppressed or downgraded by
     default. Avoidable damage that hands out NO Damage Down (a DoT the
     healers can heal through, e.g. Vamp Fatale's saws) stays Minor unless
     it killed (user, 2026-10-08).

   A Major must name a player (`report-data.ts` asserts `e.player!` on
   Majors). A failure nobody can be blamed for from the log (assigned by
   callout, dispel duty, ...) is therefore Minor or Raid, never a forced
   name. When a player-attributable failure also dooms the pull, emit the
   Major(s) on the players **and** a separate Raid marker. Put the marker
   `RAID_MARKER_SORT_OFFSET_MS` (1ms) after them, so the Analysis panel
   lists the causes first.
5. **Put distances/specifics in descriptions.** "~5.6 yalms off their spot"
   is the desired style — the number goes in the error *description*, even
   when the attribution decision itself didn't need geometry. Descriptions
   also explain what went wrong and why: name the penalty (FFXIV: say when
   it handed out Damage Down) and, for a mechanic failure, the correct play
   ("their bat chain exploded … stay close to your own bat"). A plain
   ground hit needs only "hit by X, got Damage Down" (user, 2026-10-08:
   "Hit by Coffinfiller" alone was too terse).
6. **The user's review is ground truth.** The first version of a rule will
   not be perfect. The user reviews pulls on VOD and reports precise
   corrections, e.g. "only X should flag" or "overload is always Major".
   Tune to that (code change plus a ruling) instead of defending the first
   guess. The research model and the logs are evidence; the user's call
   overrides both.
7. **Narrow overrides over wholesale replacement.** When a working check
   fails for one specific case, add a narrow override for that case — do not
   swap the whole mechanism for a new one that handles the exception.
8. **A ruling's `mechanic` is the HARNESS key, not the ruleId's prefix.**
   Several rules are namespaced `ffxiv-phase1-*` but are emitted by a
   different runner (every `ffxiv-phase1-wave-cannon-*` error comes from the
   `wave-cannon` mechanic, not `phase1`). A ruling scoped to the wrong
   mechanic silently matches nothing and fails as a phantom violation —
   check `--list` and the actual run output, not the ruleId.
9. **Pin a `mustNotFlag` tightly enough that it can't swallow a real error.**
   A player-only matcher forbids EVERY firing of that rule for that player in
   that pull. When the same rule legitimately fires again later (Dancing
   Mad's Damage Down does this constantly — a blameless raid-wide one
   followed seconds later by a real personal one), add `t` so the ruling
   pins the specific occurrence the user adjudicated.
10. **Raid-severity descriptions shouldn't assert a definitive outcome like
   "the raid wiped."** A raid can rez and keep pushing prog past a mistake
   this severe even though detection treats it as a cutoff point for further
   per-player analysis (confirmed 2026-07-30, Dancing Mad report
   Q3GzJNZg64k1hLRm pull 26: a death to the raid's SECOND Graven Image/
   Mystery Magic did not end the pull, unlike the first — see phase1.ts's
   GRAVEN_1_DEATH_WIPE_RULE_ID). Phrase these as "unresolvable from here" /
   "treated as a cutoff point," not "the raid wiped."

---

## The working method for building a new detection

Since the Venomous Abyss raid (Entombed Sentinels, Vashnik), a new boss goes
through four stages, plus a fifth for the damage analysis:

1. **Research model.** A researcher (Codex) writes the encounter model as
   the module's header comment, following
   [MODEL-RESEARCH-GUIDE.md](MODEL-RESEARCH-GUIDE.md), and commits it with no
   detector code. The model supplies how the fight works, correct play,
   failure modes with their expected log signal, fault, and consequence,
   strategy variance, and what is NOT an error. It is a strong starting
   point, but its spell IDs are journal links and usually wrong for the log.
2. **Verify against a real report.** The user supplies a log, ideally with
   many wipes and a kill. Fetch it
   (`node scripts/fetch-wow-report.js <URL> --boss "<name>"`) and check the
   model claim by claim. Write what the log showed as a
   `VERIFIED AGAINST LOGS` section above the model; the log wins every
   disagreement. In particular:
   - **Map every candidate spell to its real log IDs by event type** (cast
     vs begincast vs player aura vs boss aura vs damage vs tick vs penalty).
     Sweep ability names per stream across all pulls first; the name is
     more reliable than the journal ID.
   - **Use the kill as the clean baseline.** A rule that fires a lot in the
     kill is either measuring normal play or needs a threshold. Derive
     invariants from clean resolutions first, then look for what uniquely
     separates the failure.
   - **Confirm or refute each failure mode's log signal.** Record counts,
     cadences and thresholds with the evidence behind them (the worst clean
     value and the best failure value, with pull numbers).
   - **Check attribution feasibility.** When the model's "who is at fault"
     isn't recoverable from the log (e.g. Vashnik's missed totems: the
     nearest Froth lane missed each one by 3-10yd), fall back to a Raid or
     player-less Minor error and say why in the header.
3. **Survey every wipe for what ended it.** Every wipe should get one Raid
   error marking "the pull was basically over", in one of two forms:
   - a mechanic-specific Raid error (e.g. a missed-totem Malignance, a
     Helical overload), or
   - a generic pull-over marker when no mechanic caused it: 5+ players dead
     net of battle-rezzes, a tank death not recovered by a quick rez, a
     boss left untanked, or Berserk.

   Emit only the earliest generic marker, and only when no mechanic Raid
   came first. List any wipe the log can't explain in the header, since the
   user can Call Wipe those.
4. **Implement, validate, ship, report.** Build the rules (Architecture
   above; shared WoW helpers are in `wow/common.ts` — use `pullOverMarker`
   for the generic cutoff rather than writing a new one). Register the
   module with one line in `wow/registry.ts`; that wires it into the app and
   gives it a `scripts/validate.js` mechanic of the same name. Add the
   boss's fight name to `COVERED_ENCOUNTERS` in `fallback.ts` so the
   fallback model stops running on it. Then pass
   the regression bar (below). Commit and push. Then tell the user
   what each wipe's cutoff was, and list the attribution calls you were
   unsure of as explicit questions. Their VOD review answers them (principle
   6 above).

   **Classify every rule's exposure as part of this stage**
   ([docs/archive/exposure-plan.md](../../docs/archive/exposure-plan.md)).
   The Statics count a player's chances by it, so a mechanic left at the
   default reads bad luck or a job as playing worse:
   - **everyone** (default): every player is tested at every instance.
   - **targeted**: only the players the log names at each instance (a
     debuff, bait or cast target), or only one role when only that role
     can fail it (a tank swap, the non-tanks' side of a tankbuster).
   - **assigned**: a job the raid lead gives out (a carrier, a soak
     group). It goes to the Strategy dialog, not the player ranking.

   One scope per rule id: when a rule blames different targets (the tank
   who stood wrong vs the DPS who stood in the tank's spot), give each its
   own rule id (user, 2026-10-11). Then add `exposure()` in
   `rule-meta.ts` and report **every** instance, clean ones included, with
   its responsible players: WoW through `ctx.occurrences`, FFXIV through
   the entry point's `occurrences` sink (lib/mechanics/occurrences.ts
   ReportedOccurrence). Stamp each instance no later than its errors. For
   an assigned duty report the performers; `lib/mechanics/assignments.ts`
   detects the assignee, shared carriers or soak groups across the report.
   Write the classification in the module header. `validate.js`'s
   `exposure-ffxiv` / `exposure-wow` and `duty-assignments` entries
   snapshot the instances and the reassigned failures.

5. **Damage context, after detection settles.** Write the boss's
   `DamageContext` (`lib/damage/types.ts`) in a sibling `damage-context.ts`
   (WoW: `<boss>-damage-context.ts` beside the module) and register it in
   `lib/damage/contexts.ts`. It holds:
   - phase pools: fixed or not, carries over or not, which phase decides
     the enrage, and any phase whose damage doesn't count
   - forced windows the log can't infer: per-player busy time such as
     tower soaks, debuff carriers and forced movement. Raid-wide
     untargetable time is inferred automatically.
   - labels for the mechanic occurrence keys
   `lib/mechanics/ffxiv/dancingmad/damage-context.ts` is the first one.
   Check it with `node scripts/validate.js damage-analysis
   sampledata/ff/<code>`. The method and pitfalls are in
   [docs/dps-analysis.md](../../docs/dps-analysis.md).

   **WoW** (every Venomous Abyss boss has one, `lib/mechanics/wow/va/`):
   - WoW raids are rarely fully untargetable (there's nearly always an add
     to hit), so the inferred raid downtime almost never fires. The
     context's windows do most of the work.
   - Build them from `lib/damage/wow/context-helpers.ts`, which turns
     player debuffs, boss casts and enemy buffs into windows. Melee-only is
     common: ranged usually keep casting while moving.
   - Excuse a mechanic only when measured. Compare holders' cast rate (or
     2.5s+ cast gaps) with everyone else's in the same window, on a real
     pull, and record the numbers in the header. Several plausible
     mechanics measured as no loss at all.
   - Check it with `node scripts/validate.js damage-analysis-wow
     sampledata/wow/<code> --pulls=<n>`.

Useful event-level recipes during verification — most are commands of
`node scripts/analyze-report.js <code> <command>` (`--help` lists them;
see docs/dev-tooling.md):
- `pulls`, `sweep` and `timeline <pull>` first: every ability ID by
  stream, then the boss's clock (casts that never finished are kicks).
- `bursts <debuff>` finds mechanic starts and raid-wide penalties.
- `hits <abilities>` sweeps damage by ability, clustered per resolution.
- `adds <npc>` separates concurrent copies of one NPC by `sourceInstance`.
- `deaths` traces deaths via `killingAbilityGameID`; `collapse` sets the
  "N dead" threshold; `soakers` counts players per cast via a debuff.
- `window <pull> <from> <to> <abilities>` reads one moment in detail.
- For a debuff whose removal triggers something, check whether the removal
  was a death: a death within ~300ms of it.
- Recover positions per the position-semantics table below.
Write a scratchpad probe only for questions the CLI can't answer, and
consider adding the recipe to it afterwards.

The same principles apply when refining any module:

1. **Geometry often fully overlaps between clean and failed pulls** (proven
   repeatedly: Forsaken flare plants, Forsaken cone-bait distances). When it
   does, gate on OUTCOME — who the follow-up actually hit, who died to what —
   instead of position. Reserve exact distance math for the error
   *description*.
2. **Process of elimination beats precise position matching** for
   attribution: if there are exactly N interchangeable candidates and N−1
   are already accounted for in the same resolution, the remaining candidate
   is decisive with zero geometry.
3. **Encode every threshold with both extremes in a comment** — the worst
   clean value observed and the best failure value observed, with report
   codes (e.g. `// clean max observed 1.06%, failure observed 2.69%`). This
   is what lets future logs retune a threshold instead of guessing.
4. **Sometimes there is no clean/failure gap.** Some deviations form an
   unbroken continuum (Tele-Trouncing arrows, Wave Cannon positions). Then
   an absolute threshold is a judgment call. Either switch to relative
   attribution (Wave Cannon flags only the worst member of an overlap
   cluster), or ask the user where to draw the line. Don't silently pick
   one.
5. **Before hardcoding a cross-report threshold from one pull, run
   `--check` with no arguments.** A "confirmed good" reading from another
   report, possibly cited only in a header comment, can contradict the new
   ground truth. Resolve that with the user instead of choosing a threshold
   that quietly satisfies neither.
6. **Validate before calling it done:** run `node scripts/validate.js` (no
   args = every mechanic against every report folder under `sampledata/` —
   run it all, one pull's log usually exercises several mechanics; pass a
   mechanic name and/or report folder to narrow), and `npx tsc --noEmit`.

### Pitfalls learned per boss

The per-boss lessons (Sszorak through Lindwurm, FRU P1-P5, Ultimate
Kefka) are distilled into a topical checklist in
[PITFALLS.md](PITFALLS.md): fetching, ID mapping, clean baselines,
ownership and attribution, deaths with no killing blow, cutoffs and
multi-phase fights. Read it before verifying a new boss or refining a
module. The `/build-module` and `/refine-module` skills
(`.claude/skills/`) walk through the procedure. When a session learns
something new, add it to the matching section of PITFALLS.md.

---

## Data-shape knowledge (read before designing any new check)

### Player position semantics (FFLogs)

**Never reimplement position lookup in a module.** The one shared
implementation is `findPlayerPosition` / `interpolatePlayerPosition` in
`lib/mechanics/player-position.ts`.

**It always checks every stream that can carry a player's own position, and
this is not configurable.** Per-call stream toggles were removed on
2026-07-31. A module that had quietly narrowed its streams produced a real
false positive: a stale sample made a stationary player look like they were
still walking.

The remaining per-call options are:
- `windowMs` — the staleness cutoff; always choose it deliberately
- `direction` — nearest vs at-or-before
- `maxSpanMs` — how far apart the two interpolation brackets may be; a 4.9s
  bracket once put a player in the wrong quadrant
- `positionSamples` — the FFXIV boss-hit stream (see below)

If a mechanic genuinely needs to exclude a stream, change the shared
function visibly, as a reviewed change. The semantics below are what it
encodes.

Every friendly-sourced FFLogs event stream carries position only for the
event's TARGET — never the source:

| Stream        | Position belongs to...          | Usable as "this player's own position"? |
|---------------|---------------------------------|------------------------------------------|
| `damageTaken` | the player (they're the target) | yes, always                              |
| `healing`     | the heal recipient              | only self-heals — see dual-check below   |
| `healingReceived` | the player (heals landing on them) | yes, always (FFXIV; often the densest non-damage source) |
| `casts`       | the cast's target               | only self-targeted casts                 |
| `damageDone`  | the enemy being hit             | never                                    |

- **The `healing` dual-check:** `PlayerInfo.healing` in the app is heals
  CAST BY the player, so its x/y is the recipient's. The validation harness
  builds the stream the opposite way, as heals RECEIVED. Position lookups
  therefore check both `target === player.name` and
  `source === player.name`, so a self-heal counts under either orientation.
  Natural HP regen (ability 1302, ~3s) makes self-heals a dependable
  passive source.
- **The one source-side exception:** querying `dataType: DamageTaken,
  hostilityType: Enemies` ("damage the boss took") returns the *attacking
  player's* own position.
  - It is wired end-to-end as `fflBuildPlayerPositionSamples` /
    `buildFFPlayerPositionSamples`.
  - Density varies a lot: roughly one sample per GCD for active attackers,
    but very sparse for healers (17 samples in a 13-min pull) and on some
    fights almost none.
  - Always gate its use with a staleness or distance ceiling, and prefer
    interpolation over trusting any single sample.

### WoW (Warcraft Logs) event semantics

- **`damageTaken` x/y is the victim's (the player's) position.** It is the
  main source of player positions for WoW.
- **Enemy events are filtered in the live pipeline.** `enemyCasts` holds
  completed `cast` events only; a `begincast` that never completes is
  invisible. That is what makes "the cast completed" a failure signal
  (Vashnik's Malignance). `enemyBuffs` is `applybuff` only; removals are a
  separate stream (`wclBuildEnemyBuffRemovalEvents`). Both buff streams
  carry `sourceInstance` = the buffed NPC's instance. Raw enemy cast events
  also carry the caster's x/y, but `EnemyEvent` doesn't expose it yet. Add
  it when a rule needs an object's position.
- **Debuff stack counts** arrive on `applydebuffstack` as
  `PlayerEvent.stack`. Sometimes the stack is the only visible form of a
  mechanic's state (Helical Toxins merge totals, Dripping Fangs double hits).
- **Aura removals don't say why.** Expiry, dispel and death all look alike.
  A death within ~300ms means it was death-stripped. A dispeller shows up
  only as a player cast (Purify, Cleanse, ...) targeting the holder at that
  instant.
- **Journal spell IDs rarely match log IDs.** Map by ability name across all
  streams first (see MODEL-RESEARCH-GUIDE.md for real examples).
- **Shared ability IDs cross encounters.** The arena-edge Deadly Venom
  (1297338) rims more than one Venomous Abyss arena, so every module must
  self-gate on its own encounter's signature before running any rule.
- **Raw enemy casts carry the caster's resources.** Besides x/y, each raw
  enemy `cast` has `classResources` (boss energy/rage, e.g. Nek'zali's
  type 3 energy), `hitPoints`/`maxHitPoints` and `facing`. Sampling them
  across a pull recovers the boss's energy curve and HP% at any cast —
  that is how Nek'zali's "no passive energy in phase 1" and "Uncoiled Rage
  at exactly phase 2 +183.4s" were found. `EnemyEvent` exposes only
  `hitPoints` (FFXIV); add fields when a rule needs them.
- **Instance numbers are reused.** A new spawn takes a freed instance
  number, so an instance casting its spawn ability a second time is NOT
  proof of a revival. Confirm with a companion event at the same instant
  (Nek'zali: Gravebound Advance + Vessel of Awakening, same millisecond).
- **Add deaths without enemy HP.** Sampled `damageDone` has no
  `targetInstance` or target HP, so an add's death time isn't directly
  visible. When the add has an on-death spell (Corpse Blight), its damage
  events' `sourceInstance` + timestamp give each copy's death.

### Coordinates, angles, and timestamps

- **Angle/bearing/distance math lives in `lib/mechanics/geometry.ts`** —
  never reimplement it in a module. Critically, TWO angle conventions
  coexist (its header explains): `polarAngleDeg` (0°=east, math convention —
  limitcut's internal slot fitting) vs `compassBearingOf` /
  `facingToCompassBearing` (0°=north — anything compared against strategy/
  VOD language or an actor's facing). Never compare an angle from one
  convention against the other. FFLogs `sourceResources.facing` is in
  **centi-radians**; convert with `facingToCompassBearing`.
- Positions are **centi-yalms**; Dancing Mad arena center is (10000, 10000)
  (`geometry.ts`'s `ARENA_CENTER`). Known radii: Forsaken tower ring r=800,
  Limit Cut bait slots r≈1880, Limit Cut clone spawns r=2000. The y-axis
  grows SOUTH (screen-style).
- Event timestamps are **absolute report milliseconds**. Fight-relative
  offset = t − min(all event timestamps in the pull).
- **`Pull.startTime`/`endTime` are seconds into the report** in transformed
  FFXIV pulls (Vamp Fatale pull 1: 180 → 435); the pull's length in ms is
  `Pull.fightDuration`. Subtracting the two gave 255 "ms" and silently
  broke the mitigation rarity check (2026-10-08).

### FFLogs damage-taken semantics (found building the mitigation analysis)

- **DoT damage has no `tick` flag.** It arrives under the status's ID
  (1,000,000+: "Sustained Damage", "Flesh Wound", "Electrocution") or the
  500000 "Combined DoTs" pseudo-ability, so `PlayerEvent.isDoT` misses it.
  `FFXIV_MITIGATION.isTick` encodes the ID rule.
- **Enemy auto-attacks are named "Attack"** (several ability IDs).
- **A dead player's body still logs hits:** `hitType` 10 (immune), amount
  0, `hitPoints` 0. Anything that counts targets must drop
  `healthBefore === 0`.
- **A tank invulnerability can leave 0 HP with no death:** a Living Dead
  hit logged 294,989 damage to 0 HP, multiplier 1, no overkill or death
  event. Check for the invuln status before reading 0 HP as a failure.
- **`unmitigatedAmount` is missing on fully absorbed hits.** Rebuild it as
  (amount + absorbed + overkill) / multiplier.

### FFXIV boss debuffs don't reach every attack (recurring; user, 2026-10-11)

Reprisal, Feint, Addle and Dismantle sit on one enemy and reduce only that
enemy's attacks. Whether a given attack counts as "that enemy's" is the
hard part, and experienced players get it wrong too:
- Many raidwides come from helper actors that the game still treats as
  the boss: the debuff applies even though the helper never carries it
  (107 of 209 debuffed hits in the mitigation data check).
- Some attacks aren't reduced at all, whatever the debuff is on.
- With several bosses (Red Hot and Deep Blue), a debuff on one boss
  doesn't touch the other boss's attacks.

The attack's source actor can't settle it. Only an attempt can: the
debuff was up on boss X when the attack hit, and the hit's `buffs`
snapshot (checked against its `multiplier`) either lists it or doesn't.
Key what you learn by (ability, boss, debuff). An attack nobody has
tried it on is **unknown**, not reached. Never suggest or credit a boss
debuff on an attack without evidence that it reaches it. User
corrections from VOD win over the log. Red Hot and Deep Blue is the
reference fight for this. Built in `lib/mitigation/debuff-reach.ts`
(evidence) and `debuff-reach-overrides.ts` (VOD corrections). One ability
name can be two attacks: key by the dealing actor too (both M10S bosses
cast their own Divers' Dare at once). Design record:
[docs/archive/mitigation-optimizer-plan.md](../../docs/archive/mitigation-optimizer-plan.md)
("Boss-debuff reach").

### Fields that exist but aren't in the TypeScript types

FFLogs events routinely carry more fields than the declared types — check the
raw sampledata JSON before assuming a field needs a fetch change. Examples
already exploited: `extraAbilityGameID` on debuff applies (the attack that
CAUSED the debuff, surfaced as `PlayerEvent.causeAbilityId`/`causeAbilityName`),
`overkill`, `buffs` (dot-separated active-buff ID list on damage events),
`x`/`y` on various streams.

### "Missing field" triage — three different failure modes, three fixes

Before designing around a missing field (or concluding a re-fetch is needed),
identify WHERE it's missing:

1. **Dropped at fetch time** by `scripts/lib/slim-report.js`'s projectors →
   widen the projector and re-fetch (this happened with `overkill`/`buffs`).
2. **On disk but unread** by the transform layer / harness builders → just
   add the read (this happened with `healing` x/y — no re-fetch needed).
3. **Genuinely never sent by the API** (e.g. WCL sends no
   `targetInstance`/`sourceInstance` for Midnight Falls NPCs — concurrent
   copies of one NPC are indistinguishable) → design detection that doesn't
   need it. Verify by re-fetching ONE fight with a widened projector before
   concluding this.

---

## Known pitfalls (each one cost a real debugging session)

- **A dramatic damage/overkill number is not evidence of a problem.** Before
  concluding "X's hit is unusually big," pull the SAME ability's numbers
  across several CLEAN pulls — millions of overkill turned out to be one
  ability's constant, always-present signature (Black Hole Primordial Crust
  investigation). Cheap insurance: grep the ability ID across every pull in
  the sample set first.
- **FFLogs' "Limit Break" pseudo-actor** used to leak into the app's live
  `players` array and silently distort per-player logic. Filtered at the
  source in `buildFFPlayers` (log-transforms.ts) — but if a phantom "player"
  ever appears again, check for pseudo-actors before debugging detection.
- **Damage-event dedup timing:** the event that survives FFLogs' dedup can be
  the "landed" tick instead of the "calculateddamage" preview and may arrive
  slightly AFTER a paired debuff change (~90ms late observed). Correlation
  windows should extend to BOTH sides of the anchor timestamp.
- **A cast's own HP snapshot undercounts the raid's real progress** — hits
  landing a few seconds after a cast completes can still matter (Forsaken
  enrage check scans 6s past the final cast for an exact-0 HP hit; only
  exact 0 means the boss died).
- **`//` inside a `gql\`...\`` template literal breaks FFLogs' parser** — use
  `#` for comments inside GraphQL query strings.
- **Old notes' pull numbers may not match current captures.** Pull numbering
  has gone through three generations of sample tooling; when cross-referencing
  old findings, match by content (player names + timestamps + ability), not
  by pull-number label.

---

## Sample data & validation

- `sampledata/` (gitignored) holds one folder per fetched report:
  `sampledata/{ff,wow}/<reportCode>/` with `meta.json` + one
  `<Boss>_Pull<N>.json` per fight. Produced ONLY by
  `node scripts/fetch-ff-report.js <code-or-URL>` /
  `fetch-wow-report.js` (auth: `.credentials/`, see script headers).
  Re-fetching is cheap; don't hand-edit captures.
- `scripts/validate.js` is THE regression harness — one script, all
  mechanics (plus a `rules` entry that runs the declarative
  `lib/error-rules.ts` table through `detectPullErrors`, so single-ability
  rules get the same snapshot coverage the correlation modules have):
  `node scripts/validate.js [mechanic ...] [reportDir ...]`
  (`--list` prints mechanic names; no args = everything). It auto-discovers
  all report folders (any subdirectory containing `meta.json`) and rebuilds
  `PlayerInfo[]`/`DeathEvent[]`/etc. the same way the live pipeline does,
  via `scripts/lib/{load-report-folder,build-ff-players,build-wow-players,require-ts}.js`.
  A new mechanic needs only a new entry in its `MECHANICS` manifest — no
  new harness file.
- **Regression bar for any mechanic change:**
  `node scripts/validate.js --check` passes (see below) and
  `npx tsc --noEmit` is clean.

### Expected-output baselines (`expectations/`, gitignored)

`expectations/` holds log-derived data (real player names, error text), so
like `sampledata/` it stays out of git — both are local development tools,
not part of the codebase. It records what detection produces for each
report currently on disk. Two tiers with very different rules:

1. **Snapshots** (`expectations/<game>-<reportCode>.json`) — machine-generated
   full error output per report. `node scripts/validate.js --check` re-runs
   detection and reports every added (`+`), removed (`-`), and changed (`~`,
   with per-field before→after) error vs the baseline, exiting nonzero on any
   difference. `--update` regenerates them. Both accept the same
   mechanic/report narrowing args as a normal run.
2. **Rulings** (`expectations/rulings.json`) — small, hand-curated
   adjudications the user made during VOD review ("pull 15: only X should
   flag", "pull 10: Y must NOT flag"). Checked on every `--check`; NEVER
   written by `--update`. Pin the decision (who flags), not incidental detail
   like severity or wording, so rulings survive presentation-level changes.
   Schema and an example live in the file's own `_doc` block.

**Detection philosophy evolves — snapshot changes are the normal case, not a
test failure to fear.** The baseline's contract is "no behavioral change
ships unseen", not "output never changes". When a change is intentional
(e.g. a severity downgrade across a whole rule): make the code change, run
`--check`, and read the diff as the review artifact — it should show exactly
the intended delta (e.g. N lines of `severity: Major -> Minor`) and nothing
else. Then `--update`. An unexpected extra line in that diff is the system
working — investigate it before updating.

A **ruling** violation is different: it means the change contradicts a call
the user personally made. Never regenerate around it — either the change is
wrong, or the user has consciously revised their ruling, in which case edit
`rulings.json` by hand.

When a new report's pulls get reviewed, run
`--update sampledata/<game>/<code>` to snapshot it, and capture any explicit
user adjudications from the session as rulings.

**Sample-data lifecycle — reports are disposable, distilled knowledge is
not.** Old report folders get deleted to free space (re-fetching is cheap;
keep a curated subset whose pulls collectively exercise each mechanic's
known failure modes). A snapshot whose sampledata is gone is unverifiable —
detection can't re-run against it, so it can never fail again — and is
therefore dead weight: `--check`/`--update` warn about such orphans, and
`node scripts/validate.js --prune` deletes them (orphaned *rulings* are only
listed, never auto-deleted — hand-remove them once their lesson is
distilled). The one thing to check **before** deleting a report: anything it
uniquely proved must already be encoded durably — threshold comments with
clean/failure extremes, README rules, rulings whose lesson made it into the
module. The snapshot itself is never the long-term record; the code comments
and this README are.
