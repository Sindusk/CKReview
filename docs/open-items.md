# Open Items

This page lists unfinished work and questions waiting on a user decision,
collected from past sessions. Treat it as a starting point, not a
commitment: ask the user before picking an item up, and delete it here once
it's resolved. Module headers carry the full context for mechanic items.

## Mechanic detection — questions for the user

### The Venomous Abyss (WoW)

- **Entombed Sentinels** (report Mvz3r1AnVKYpdFTH; no VOD ground truth yet):
  - **Living Venom blame.** Should it fall on the victim (current), the
    orb collector, or both?
  - **Protovenom eruption.** It flags both the marked and the unmarked
    player. Keep that?
  - **Undispelled Blighted Blood** with no one else hit is a player-less
    Minor. Keep it?
  - **Not built yet:**
    - Mark-refresh (carrying the old Mark indefinitely)
    - Ula'tek's Dominance
    - tank-swap misses
    - non-lethal Blighted Blood ticks
- **Vashnik** (report kGVX7tafBT2pM1N3; no VOD ground truth yet):
  - **Plague Wave blame.** Should the Froth carrier whose lane it was also
    be blamed? The description already names the carrier.
  - **Stygian Burst on non-holders** (92 Minors). It may not be dodgeable.
    Keep it, drop it, or make it a raid-wide healing error?
  - **Player-less errors.** Missed totems and undispelled Exploding
    Infection name no player. Should they?
- **Sszorak** (report rNL38zFGMbyADRTh; not the user's group, no VOD —
  ask once the user's group reaches the boss):
  - **Tempest volume.** Every tornado pass is flagged (~15 per pull, ~4 on
    tanks). Should tank hits count, and should a single hit stay Minor?
  - **Missed Mutilate soaks.** The most frequent misses were a player
    skipping their group's first soak, players knocked back by Crosswinds
    7s before the +55 soak, and the Serpent's Fury mark holder. The
    description names the knockback / mark. Real errors, or assigned
    exceptions to exclude?
  - **Virulence blame.** A reinfection flags both the spreader and the
    reinfected player. Correct, or only one of them?
  - **Early cyst pops** blame whoever stood nearest the drop spot (within
    8yd). A tank dragging the boss is often nearest. Is that the real
    popper, or is the boss/tank pathing the cause?
  - **Two cysts in one gale** is player-less and names both droppers.
    Should blame go to a dropper (placement) or the raid's positioning?
  - **Crosswinds fall** flags only the player who fell and names their
    opposite-direction partners. Should a partner share the blame?
  - **"5 dead" marker** ended two pulls 20-70s before Unbound Ferocity
    actually wiped them. Keep 5 as the threshold?
  - **Not flagged:** Caustic Claws (no target in the log) and Caustic
    Residue (constant brief contact, one death in 36 pulls). Wanted?

### Midnight Falls (WoW)

- **Resume point.** VOD review of report Dn87j4ARzNwYqLvV should resume at
  pull 3. Pulls 1/2/5/16/22 are done. Phase 2 has never been reached in any
  capture.
- **Open questions:**
  - **Crystal-holder-hit.** Is a Dark Quasar landing on a crystal carrier
    intended strategy?
  - **Self-break severity.** Should a Starsplinter breaking your *own*
    crystal be Major on that player instead of Raid?
- **Unmapped:**
  - Dark Rune assignment order
  - Starsplinter blast radius
  - spec 1480
- **Late-kick Terminate misses** are unattributable: WCL has no per-matrix
  instance id.

### Dancing Mad (FFXIV)

- **Phase 1 (graven-image / phase1.ts):**
  - **Graven 2 Puddle Linger** (report h2JvDkntZCaBgmLF pull 41). The user
    flags only one player, but every metric ranks that player mid-pack. No
    ruling yet.
  - **Pull 49 bait positions.** The user named a different pair than
    detection flags.
  - **Not built:**
    - the Graven 3 Spread variant
    - the second Confetti resolution
    - relative Confetti stack cohesion
    - a "Phase 4 enrage / died to Meteor" Raid error
  - The 15% enrage floor has no confirmed-passing sample.
- **Display decision:** should Raid errors after the pull's cutoff be
  hidden too? The user's expected readings suggest yes; not decided.
- **Forsaken:**
  - **Post-death missed towers.** Should a missed-tower flag after a death
    be suppressed?
  - **Not modeled:**
    - the 47807 failed-tower kill
    - the Spread follow-up victim count
    - clone-overlap positioning geometry (the rule is outcome-gated only)
- **Limit Cut:**
  - The 47843/47864 raid pulses are unmodeled.
  - A 4+-player scramble goes unflagged.
  - The gaze look-at vs look-away IDs are unmapped.
- **Black Hole:**
  - **Incorrect Direction** is gated to the SDA strategy until the Support
    vs DPS convention for DSA/Double Tether is confirmed.
  - The DSA/SDA display label is a guess.
  - Earthquake soaks after tethers, and the mechanic past tether 10, are
    unmodeled.
- **Exdeath:**
  - **Thunder III marking two non-tanks** is a distinct, unexplained
    failure.
  - The Warrior/Gunbreaker mitigation name lists are empty.
  - Shockwave role-stack markers are unmodeled.
- **Stompies:**
  - Slides 4-7 of the raidplan are unmodeled.
  - The drop-time offsets are single-pull estimates.
  - Bait-too-close is unfixable on report PM8HY9nJ7kTR4tdQ pull 3: the
    puddle positions are duplicated and grid-snapped.
- **Roles (`ffxiv/roles.ts`):**
  - M1 vs M2 has no signal and is always tentative.
  - MT/OT misses on very short or anomalous-opening pulls.
- **Mitigation:**
  - Paused.
  - Next threads: one player showing 0/12 on the Heatmap, and the user's
    color-scale and grouping feedback once they've used it.

## App

- **Statics:**
  - Importing a different log keeps the previous report's VOD list on
    screen, and it gets saved into the new session.
  - Sessions are ordered by `addedAt`, so out-of-order imports show dates
    that don't ascend.
  - The MVP pedestal ranks by raw counts rather than per-pull rates.
- **Severity picker.** `AddErrorDialog`'s picker is a native `<select>`, so
  it shows text only, with no icons.
- **Stale reference.** The `lib/spec-data.ts` comment near line 165
  references the dead `ckreviewv9.png`.

## Workflow backlog (deferred ideas, in recommended order)

1. **An analysis CLI** (`scripts/analyze-report.js`). It would put the
   standard investigation recipes behind flags on one script: debuff-burst
   clustering, ability sweeps, deaths dump, positions around a timestamp.
   This replaces throwaway analysis scripts.
2. **A reusable "review pull" command/skill.** It would take the user's
   VOD account, run the harness on that pull, propose the narrowest fix,
   and record the ruling.
3. **Fixture curation.** Keep the smallest set of reports that exercises
   every rule's known failure modes.
4. **Baselines for cross-pull strategy output** (Black Hole lanes, kick
   chains) in `expectations/`. Do this only if a regression slips through.
5. **npm script aliases** (`npm run check`).

CI was explicitly rejected: sample data and expectations are local by
design.
