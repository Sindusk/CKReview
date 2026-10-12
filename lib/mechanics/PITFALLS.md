# Pitfalls when building or refining mechanic detection

A checklist distilled from every boss built so far: Sszorak, Nek'zali, The
Lost Explorers, The Twin Fangs, The Coiled Altar, Ula'tek, Red Hot and Deep
Blue, The Tyrant, Lindwurm, and Futures Rewritten P1-P5 (Fatebreaker,
Usurper of Frost, Oracle of Darkness, Enter the Dragon, Pandora). It also
covers Ultimate Kefka. Each item says what goes wrong, what to do instead,
and where it was learned. The module headers hold the specifics.

The `/build-module` and `/refine-module` skills read this at their
verification step. [README.md](README.md) holds the method, the attribution
philosophy and the data semantics this list assumes.

## Fetching

- **Fetch one boss, never the whole report.** Use `--boss "<name>"`. When
  one fight's name contains another's, use `fetch-ff-report.js --boss-exact`
  (`--boss Lindwurm` also matched "Lindwurm II").
- **Rate limits are per token.** Fetch reports one at a time and probe the
  first while the next downloads. The fetch scripts download kills first,
  skip pulls already on disk and wait out a 429. Ula'tek hit the limit
  after ~850MB; The Coiled Altar after 17 of 30 pulls of 10-52MB each.
- **Late or middle phases: fetch only that part.** Use `--from-minutes` and
  `--to-minutes`, optionally with `--min-minutes`. Deaths and combatantInfo
  stay whole, so offsets hold. `validate.js` runs only `lateCapture`
  mechanics on a late-start capture. A capture cut with `--to-minutes`
  still has every death, so bound the module's window by the last damage
  or cast event, not the last death (Usurper of Frost, Ultimate Kefka,
  Enter the Dragon).
- **Two reports from different raids beat one big one.** Label them A/B
  at the top of the header and cite pulls as `A6 +188.9` (The Lost
  Explorers).
- **Every module must gate its entry point on its own fight** (user,
  2026-10-12). A rule keyed on nothing boss-specific, such as "any
  environmental death", otherwise fires on every fight. Dancing Mad's
  jump-off cutoff put 234 Raid markers on five other fights before
  phase1.ts gated on Kefka's casts. `refine-module`'s `pull-errors.js
  --summary` shows rule ids from other modules when one leaks.
- **A checkpoint stub can share the fight's name.** A Lindwurm II
  checkpoint resume was logged as "Lindwurm" (Refreshing Overkill at
  +0:01, then a reset). Self-gate on signature casts so the module skips
  it.

## Mapping IDs and the boss's clock

- **Run `scripts/analyze-report.js` before writing probes.** Start with
  `pulls`, `sweep` and `timeline` on the kill. Map every candidate by its
  event type and by name; the guide's or journal's IDs are rarely the
  log's.
- **Journal counts can be off by one.** Toxic Incubation logged 5 hits per
  interceptor, not 4; Stage 2 had four Doomscale Eggs (Ula'tek).
- **Status IDs are reused across phases.** Celestriad's Lightning
  Resistance Down II is Exdeath's Thunder III mark. Sweep a new phase's
  IDs against the older modules; `causeAbilityId` separates the uses
  (Ultimate Kefka).
- **A countdown buff can change ID at the enrage.** A removal counts as a
  death only when no successor appears in the same millisecond (Ula'tek's
  Boiling Venom).
- **"Applied" includes refreshes.** Count distinct players, not events
  (Ula'tek).
- **Timed statuses carry their timer.** `PlayerEvent.durationMs` reads
  10/20/30s assignments straight from the apply (Oracle of Darkness).
- **Stack counters need the `stack` field.** A new stack logs as remove +
  apply + applydebuffstack in one millisecond (Usurper of Frost).
- **Measure enrages from the phase start across pulls.** The same offset
  every pull means a timer, not a resource the raid can influence
  (Nek'zali, +183.4s).
- **Huge amounts (1M+) are FFLogs' unpaired previews of lethal hits.**
  Count them as hits; never compare them as amounts (The Tyrant).
- **Test a guide's "stack" or "fixed damage" claim against the damage.**
  Fell Forces split across the group: a lone DPS took 4x the normal hit
  (Ultimate Kefka).
- **Hits on an NPC live in enemyDamageTaken** (`NpcHit[]`). The memory
  crystal's only trace of being struck (Enter the Dragon).
- **Some debuffs go off at the holder's death.** A Dark Fire holder's
  death fires it on the body ~0.1s later. Report the chain once,
  player-less, and flag the first death's cause (Oracle of Darkness).

## Clean baselines

- **The kill, or every phase clear, is the clean baseline.** A rule that
  fires in the kill measures normal play or needs a threshold. Check the
  kill for "avoidable" volume (Twin Fangs: 21 Stir waves) and for a
  guide's "dangerous" state the kill does routinely (Nek'zali: 17-18
  Hollowing stacks). Gate on the outcome there.
- **No kill: calibrate on the wipes' clean stretches.** Compare the same
  ability inside and outside the failure moments (The Coiled Altar).
- **An enrage cast can complete in a clear.** Gate the enrage on hits
  that actually killed (Pandora, Fatebreaker's third Burnished Glory).
- **Split scripted occurrences from failed ones before blaming.** The same
  spell can be expected in one context and an error in another (Soulcoil
  Rite from Invoke vs from an add leak).
- **Count repeats when the first occurrence is routine.** Both Shriekers
  cast once in every stage-3 pull, the kill included; the second cast is
  the error (Ula'tek).

## Ownership and attribution

- **Progression strategy is improvised; build on outcomes, not spots.**
  Use clock spots or groups only once the user confirms the plan
  (Red Hot and Deep Blue, Lindwurm).
- **Cast targets usually name the bait owner, but check each ability.**
  Mortal Slayer's and the Scourges' targets are the baits. A Hemorrhagic
  Projection cone's target was its *victim*; its owner stood on the cast's
  position (Lindwurm).
- **A cast's position can be its clone's, not its owner's.** Lindwurm II's
  Mana Burst defams cast from the clone that recorded them, with no target,
  so an owner-less defam on 3+ players stays player-less. Its live cones'
  casts did sit on the holder.
- **A status can swap on a timer while the hit decides pass/fail.** Blood
  Mana's alpha/beta flip at fixed times; the failure is a penalty hit on
  the failing player (Unmitigated Explosion), and any damage counts as "hit"
  (Lindwurm II).
- **A cast that hit several players can lose its target.** Find the owner
  among the hit players who held that timer's status (Oracle of Darkness).
- **Head markers name bait owners** (`HeadMarker[]`, marked player as
  `sourceID`; Usurper of Frost).
- **A numbered debuff can be the assignment.** In Line I-IV plus the
  alpha/beta chain fixed which tower each player soaks. Check that the
  tower kind still matches its slot: after a death the order shifts
  (Lindwurm).
- **Instance numbers are per caster, and they get reused.** Key a copy by
  caster + instance (Red Hot and Deep Blue). Add the ability when two
  kinds share a caster (Mortal Slayer's green and purple orbs). Instances
  are reused across waves, stages (Ula'tek's eggs) and even within a
  second (Curtain Call's chain breaks 0.3s apart). Cluster such families
  tightly.
- **Multi-spawn adds need `sourceInstance` on casts and buffs.** WCL logs
  some add applybuffs twice; dedupe by instance (The Twin Fangs, The
  Coiled Altar).
- **Generic families beat one rule per mechanic.** Use table-driven
  personal-bait (`PERSONAL`) and stack (`STACKS`) detectors; see tyrant.ts
  and lindwurm-1.ts.
- **Proximity baits retarget onto survivors.** Gate them on everyone being
  alive, or on the slots not having shifted (The Tyrant, Pandora, Ultimate
  Kefka).
- **A doubled stack usually means a dead target.** 7 of 9 doubled Sharp
  Tastes followed a healer's death (The Tyrant).
- **Name the takers when a stack goes elsewhere.** One player alone under
  it while most stood elsewhere is the stack leaving the group (The
  Tyrant).
- **A nearest-player bait that went to the wrong player:** name whoever
  baited nothing (and anyone in a bait that isn't their role's), not the
  players who caught the leftovers (Lindwurm's Mortal Slayer, user
  ruling).
- **A partner resolution names a group.** A clean tether on one side
  tells who belonged in the failed one (Fatebreaker's Fall of Faith).
- **Process of elimination beats geometry.** With N interchangeable
  candidates and N-1 accounted for, the last one is decisive (Fatebreaker
  towers; Lindwurm's Metamitosis free players).
- **Mirrored misses need a reference layout.** Two players who each miss
  the other's tower are 5.0y off each other symmetrically. The tie-break
  is the clean pulls' launch spots (`LAUNCH_SPOTS`, Lindwurm).
- **Judge position at the moment the mechanic snapshots, not at the hit.**
  The chain connection (Lindwurm) and the Mystery Magic cast (Graven 3)
  were the moments that mattered.
- **When one player's cast starts the chain, blame the cast's timing**
  (The Lost Explorers' fish).
- **"Who caused it" can be the player whose own debuff ended at that
  instant** (The Coiled Altar's ghosts).
- **A lockout debuff counts the soakers.** Companion debuffs at the mark
  turn a soak into arithmetic (Ula'tek's Soul Constrictor, Ingested Venom).
- **Hidden object state shows as player-side traces.** Watch for a
  raid-wide burst (Ula'tek's egg hatch) or a carrier debuff ending early
  just before a huge hit (The Coiled Altar).
- **A debuff's cause names whose error a later death is.** Use
  `causeAbilityId`: Pandora's Resistance Down, Enter the Dragon's
  Lightsteeped stacks.
- **Status hand-offs look like removals.** A removal is a break only
  without the successor in the same millisecond (Enter the Dragon).
- **A scripted hit that stops arriving proves destruction** (Enter the
  Dragon's crystal, `NpcHit[]`).
- **Boss HP at a cast decides a DPS gate** (Enter the Dragon's Morn Afah).
  **Provoke history names an enmity steal** (Enter the Dragon).
- **Check where a lone victim stood before blaming aim.** Pandora's wing
  victims had gone into a tower early.
- **Tabulate a failure's outcomes before choosing blame.** Blast Wave
  split into no-bounce, too-late and too-early, and exposed waves where
  nobody bounced (The Lost Explorers).
- **A raised player drawing a bait from where they were raised is bad
  luck,** not an overlap (The Tyrant's raise grace).
- **Immunity soaks are strategy.** Skip zero-damage hits unless the player
  died (The Coiled Altar).
- **A lethal stack cap needs a ledger, not a threshold** (The Twin Fangs'
  Eternal Venom). An enemy cast with a player target at each application
  can be the cleanest per-stack record.
- **Stack counts need an overlap allowance.** A tank swap can leak one
  stack: clean peak 7, rule at 9, skipped with the other tank dead (The
  Lost Explorers' Shredding Shards).
- **Carriers come from cast targets, not hit counts.** Atomic Impact's
  puddles chained through six players; the casts named the two carriers
  (The Tyrant).
- **Count by outcome, not by object ID.** Egg actors reuse instance
  numbers; spawn counts at each impact accounted for every egg (Ula'tek).
- **A "min targets" penalty shows up as the next hit,** not a separate
  spell (The Twin Fangs' Ravenous Feast).
- **Deaths can spawn the failure.** Tag a burst by its timing: The Twin
  Fangs' globules were released by deaths.
- **Cascades need an "inherited" exemption.** Merge a player's
  back-to-back contacts into one episode (The Coiled Altar).
- **A ground hazard's activation delay separates groups from
  stragglers.** Four or more burning at once is the party on the wrong
  side (Red Hot and Deep Blue).
- **A cleanse can be the fatal hit.** Don't drop death-time removals
  blindly (Red Hot and Deep Blue's Xtreme).
- **With few pulls, annotate instead of exempting.** Add the context to
  the description and list the question in docs/open-items.md
  (Nek'zali).
- **No clean/failure gap means a judgment call.** Use relative attribution
  (the worst member of the cluster) or ask the user. Don't silently pick a
  threshold (Wave Cannon, Tele-Trouncing).

## Deaths with no killing blow

Classify every one before counting a called wipe. Known meanings:

- **A called wipe:**
  - several together;
  - any within ~12s of the end;
  - two jumping together mid-pull while the rest practise on (Lindwurm).
  Detect it first, or the first tank among them becomes a false "Tank
  Died" cutoff (The Lost Explorers).
- **A knockback off an edge or island, at a fixed delay after the hit:**
  - Red Hot and Deep Blue: 2.6s
  - Fatebreaker: 2.8-3.5s
  - Lindwurm: 2.4-2.9s
  - The Tyrant: 4.4s
  - Lindwurm II: 2.2-2.8s after a Mana Burst defam (off a platform)

  Keep these out of the called-wipe count.
- **An uncleansed Doom:** no killing blow ~2s after it runs out at full
  duration (Lindwurm II).
- **Falling with collapsing floor** (Lindwurm, 2.1s after the collapse
  hit).
- **Walking Dead running out unhealed** (Dark Knight): player-less.
- **A reset after the player's own Damage Down** (Fatebreaker): the Damage
  Down's cause is the error.
- **A delayed death:** Mark of Mortality, Doom (Oracle of Darkness).
- **A Dreadmarch walk-off, or a feared player falling** (The Coiled Altar).
- **A death right after another death:** usually the raid resetting
  (Usurper of Frost).

Related:

- **FFLogs death events land ~2.0s after the fatal hit.** Use the hit for
  "alive at the mechanic" (Ultimate Kefka).
- **A later death proves an unseen raise** (Ultimate Kefka).
- **"Near the pull end" must not use -Infinity** (Usurper of Frost).

## Cutoffs (the pull's first Raid error)

- **Set the "N dead" threshold from survival.** `analyze-report.js
  collapse` prints the time from N dead to the pull's end. Results so far:
  - The Lost Explorers: 7.
  - Ula'tek: 7, plus the pull ending within 45s.
  - The Tyrant, Lindwurm and Lindwurm II: 5 within 45s.
- **One mechanic killing 4+ at once is its own cutoff** when the pull ends
  within a minute. It lands seconds before the collapse or the jumps
  (Lindwurm II's Rep1, defams and Blood Wakening; raidwides excluded).
  - Oracle of Darkness: 4, with no window.
- **Tune the tank-death marker per boss.** Some fights carry on with one
  tank (Nek'zali).
- **Scope a failure's escalation to its own aftermath.** Count deaths only
  up to the next mechanic's Raid error (The Coiled Altar).
- **One failure, one Raid marker.** Successive empty towers must not
  recount the same deaths (Lindwurm).
- **After an enrage buff, drop per-player errors,** but keep the Raid
  marker (Nek'zali).
- **A group failure still blames each player when each could have
  avoided it** (Lindwurm, all eight knocked off: user ruling). Add the
  player-less Raid marker as well.

## Multi-phase fights

- **Stop at the next phase's first cast,** not a fixed offset, and list
  the phases in `MODULE_PHASES` (Fatebreaker: P1 handed over between
  +2:49 and +2:58).
- **Phase clears are the baseline.** Check they carry zero Raid errors,
  then read the Majors left one by one (Usurper of Frost).

## Repo hygiene

- **No character names in committed code or docs.** The repo is public.
  Use pull + time and role/job; names belong in the gitignored
  `expectations/`.
- **Shared WoW helpers are in `wow/common.ts`:** `clusterByGap`, `deadAt`,
  `pullOverMarker`, `debuffIntervals`, `playerError`, `raidMarker`.
