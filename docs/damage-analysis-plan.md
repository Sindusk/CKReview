# Damage Analysis Plan (FFXIV)

Plan for in-app damage and rotation analysis: a new **Damage** dialog
that finds rotation and uptime losses per player, scores them in lost
damage, and explains them using what we know about the fight. The
direction was agreed with the user on 2026-10-06; this doc is the build
brief. Steps 1–4 are built; see "Build status".

Read [dps-analysis.md](dps-analysis.md) first. It records the manual
method and the pitfalls from the first study, where player feedback
overturned two of three rotation claims. This plan turns that method into
app code.

## Goal

The FFXIV community's main rotation tool is
[xivanalysis](https://github.com/xivanalysis/xivanalysis). It knows each
job in depth but knows almost nothing about the fight. Its only fight
awareness is "downtime = boss untargetable or player unable to act", and
its three boss modules (DSR, FRU, one extreme) only exclude actors from
that check.

We do better by using what our mechanic modules already know: phases,
mechanic timings, per-player assignments, deaths and debuffs. A GCD gap
during a tower soak or a knockback is forced; a gap with nothing going on
is a real loss. Holding a cooldown into the phase that decides the enrage
is good play, not drift.

## Decisions (settled with the user)

1. **No LLM calls at runtime.** All user-facing analysis is deterministic
   code. LLM agents build that code, including fight context written from
   careful study of real logs, the same way boss modules are built. Check
   it with `validate.js` like any other module.
2. **Job coverage comes in role batches:** Tank → Healer → Melee →
   Ranged → Caster. The shared engine (below) comes first and serves every
   role.
3. **UI: a "Damage" header button directly to the left of "Mitigation"**,
   opening its own dialog. In `app/page.tsx` the Mitigation button sits
   around line 1098 and its dialog around line 1125; follow the same
   pattern (`showDamage` state, `DamageDialog` component).
4. **Not PullErrors.** Damage findings live in the Damage dialog only,
   the same way mitigation is moving out of the error list (see
   [mitigation-redesign.md](mitigation-redesign.md)). Existing error rules
   such as Damage Down stay as they are; the Damage dialog reads them as
   causes.
5. **Reference clears are picked manually by the user.** Fetching one is
   an explicit button press (CLAUDE.md: no hidden costs on navigation;
   FFLogs is rate-limited). Finding comparable clears automatically is a
   future goal.

## Borrowing from xivanalysis

The code is **MIT licensed**. Porting data and logic is allowed with
attribution: keep their copyright notice in ported files, or in a
`THIRD_PARTY_NOTICES` file, and credit them in the dialog's About text.

What's worth taking (paths are inside their repo):

| Theirs | Use |
|---|---|
| `src/data/ACTIONS/root/*.ts` + `layers/patch*.ts` | Action table: id, name, `onGcd`, `cooldown`, `potency`, charges, speed attribute, per-patch changes. The basis of the potency scoring below. |
| `src/data/STATUSES/` | Status table: buffs, procs, DoTs and raid buffs with durations. |
| `parser/core/modules/AlwaysBeCasting/` | GCD uptime: a gap counts once it exceeds the GCD + 150ms (caster tax and jitter), with a 500ms slidecast allowance. Also double-weave and interrupt detection. |
| `parser/core/modules/CooldownDowntime.tsx` | Cooldown drift. Each cooldown group gets an allowed hold time (default 1250ms), an opener first-use offset, shared-recharge groups and refunds. |
| `parser/core/modules/ActionWindow/` | Buff windows plus evaluators: expected GCD count, expected actions, players buffed, raid-buff overwrites. Their readme explains the design. |
| `parser/core/modules/{DoTs,Procs,Combos,Positionals,RaidBuffs,Tincture,Swiftcast}.tsx` | Generic checks most jobs reuse. |
| `parser/jobs/<job>/modules/` | Gauge and proc logic per job, 2–4k lines per job. Port only the jobs in the current batch. |
| `parser/core/modules/Suggestions/` | Minor / Medium / Major severity tiers chosen by thresholds. |

What not to take:
- **Their event layer.** They read FFLogs' older v1 API through their own
  adapter. We use the v2 GraphQL API (`lib/ffl-client.ts`). Port the
  logic onto our `Pull` / `PlayerInfo` shapes.
- **Their UI** (Semantic UI, lingui translations).
- **Their per-job percentage targets as the scoring.** We score in lost
  potency instead (below), so one scale covers every job.

**Patch upkeep:** potencies change every patch. Vendor a snapshot of the
data tables, record the source commit and patch in the file header, and
add a sync script (`scripts/sync-xiva-data.js`) that refreshes the
snapshot from their repo. Downloaded code is untrusted: the sync script
parses their data files; it does not execute them.

## Architecture

### Layer 1: engine (build first)

Location: `lib/damage/` (game-agnostic analysis) and
`lib/damage/ffxiv/` (data and FFXIV specifics). Keep that split so a WoW
port later replaces only the game layer.

- **Action and status data** (ported, above).
- **Per-player timeline**: GCDs, oGCDs, casts with cast times, buffs and
  procs active, alive/dead windows, all on the pull's relative time.
- **Generic checks**, each emitting findings in a common shape:
  - GCD uptime and idle gaps
  - cooldown drift (used later than it was ready, beyond the allowance)
  - buff-window contents (GCD count and actions inside own and raid buffs)
  - death cost (time dead plus the raise penalty)
  - Damage Down and other penalty debuffs (time under them × their
    penalty); read the existing debuff data and the generic Damage Down
    rule
- **Scoring in lost potency**, the same scale for every job:
  - GCD gap: lost GCDs × the player's average GCD potency
  - drifted cooldown: lost uses over the pull × the action's potency
  - something missed inside a buff window: that loss × the buff's bonus
  - Damage Down: the player's potency during the debuff × its penalty
  Convert to damage using the player's own observed damage-per-potency
  from the pull. Then rank findings and compare their sum with the HP left
  at the enrage (dps-analysis.md, "Estimating impact"). State the basis of
  every estimate; mark inference as inference.
- **Finding shape** (suggested): `{ playerId, kind, start, end,
  lostPotency, lostDamage, forced: boolean, cause?: string, basis: string,
  detail }`. A finding with `forced: true` is shown, but not counted
  against the player.

### Layer 2: fight context (per boss, written by agents)

Each boss module, or a sibling file, exports a **damage context** the
engine reads:
- **Phases** with real start/end anchors (boss casts / targetability),
  and each phase's **HP pool**. Mark whether the pool is fixed and
  whether extra damage carries over (dps-analysis.md, method step 1).
- **Which phase decides the enrage.** Cooldowns held in an earlier phase
  so they land in the deciding phase are not drift, as long as earlier
  damage checks still pass.
- **Forced downtime**, raid-wide (untargetable, transitions, knockbacks)
  and **per player** (soaking a tower, carrying a debuff, being a bait,
  forced movement). Most of this is already computed by the mechanic
  modules; expose it rather than recomputing it.
- **Multi-target windows** (Dancing Mad P3 has two bosses), so
  single-target expectations don't misfire.

This becomes a new step in the per-boss workflow, after detection:
research → verification and detection → **damage context** → review.
Add it to `lib/mechanics/README.md` when the first context is built.

A fight without a context still works: the engine falls back to
xivanalysis-level awareness (untargetable = downtime) and the dialog says
fight context is missing.

### Layer 3: job modules (role batches)

Gauges, procs, combos and job-specific expectations, ported per batch
from xivanalysis and adapted to the potency scoring.
- **Tanks:** downtime from tank swaps and repositioning; GCD clipping by
  defensive weaves; the job's burst alignment.
- **Healers:** the biggest gap in the first study (−3.6k rDPS each).
  Headline check: damage GCDs vs heal GCDs, set against raid damage taken,
  so extra heal GCDs that weren't forced by damage show up. This overlaps
  with the mitigation redesign: over-mitigation and unneeded heal GCDs
  are the same planning conversation.
- **Melee:** positionals; uptime lost to forced movement versus avoidable
  disengages.
- **Physical ranged:** buff alignment and the rDPS split (own / received /
  given) so buffers aren't blamed for their party.
- **Casters:** cast interruptions; slidecasting and movement through
  mechanics.

Within a batch, start with the jobs in the user's static.

**Lesson from the first study, applies to every job module:** gauge or
stack states guessed from cast timing were wrong. Where a damage event
shows the result (stacked spenders), check against the damage event size,
normalised for crit (×1.6), direct hit (×1.25) and the event multiplier,
and compared with the fight's 80th-percentile hit (dps-analysis.md,
Pitfalls).

### Layer 4: comparison

- **Own pulls:** the same finding across the loaded pulls (consistency).
- **Reference clears:** the user picks clear reports in the dialog and
  presses a fetch button. Compare over **equal windows** from the start of
  the deciding phase, using a length every kill reaches (dps-analysis.md
  method step 2). Never compare per-phase averages.
- The prototypes are `scripts/analyze-dps.js` (`phases`, `window`,
  `players`, `rdps`, `casts`, `buffs`, `taken`, `debuffs`, `stacks`) and
  `scripts/fetch-ff-dps.js`. Port their logic; they currently fetch their
  own data instead of reading `Pull`.

## Data changes

Revised after the data check (findings in the next section).

- **Begin-cast events.** `transformFFightToPull` in
  `lib/log-transforms.ts` keeps only `type === "cast"` and drops
  `begincast`, though the query returns both. Keep begin-casts, with their
  `duration`, in a separate `PlayerInfo` field: interruptions and
  cast-time analysis need them. `slim-report.js` drops `duration` from
  casts today; keep it.
- **Damage-done detail on `PlayerEvent`:** `statusIds` (decoded `buffs`),
  `multiplier`, `hitType`, `directHit`, `bonusPercent`, `isDoT` (`tick`)
  and, on simulated DoT ticks, `actorPotencyRatio`. Widen the
  `damageDone` projector in `scripts/lib/slim-report.js` to match.
- **A new player-buff stream is needed** (the `buffs` snapshot covers only
  damage modifiers): friendly `dataType: Buffs`, filtered on the server
  to the job statuses the checks use (procs, job buffs, raid buffs,
  Swiftcast), not mitigation, food or shields. Take the ID list from the
  ported status table. Remember the template-literal pitfalls in
  `FIGHT_EVENTS_QUERY` (no `//` comments, no backticks).
- **Boss debuff windows** (Chain Stratagem, Dokumori, Mug) already arrive
  in the `enemyDebuffs` stream, which is fetched unfiltered for NPC
  targets but reaches `Pull` only as Kefka Says signals. Carry its
  apply/remove events through for the damage engine.
- **Truncated tables.** The DamageDone table returns only each player's
  top 5 abilities; per-ability totals need events.
- Pulls stored before these changes lack the new data. Re-fetching is an
  explicit user action; the dialog says when a pull needs a re-fetch.
  Existing samples need `--refetch`.

## Data check findings (2026-10-06)

Checked on `dQ8wmb1VhKt6yBXk` fight 11 (988s, reached P5; party GNB,
DRK, SCH, AST, SAM, VPR, DNC, PCT):
- the whole slimmed sample pull
- one unslimmed fetch of its first 90s (friendly `DamageDone`, `Buffs`
  and `Casts`; 1.3k, 1.0k and 0.6k events)

### 1. `buffs` on `damageDone` is a damage-modifier snapshot only

- **Whose statuses:**
  - the attacker's damage-affecting statuses, self-applied and received:
    No Mercy, Fugetsu, Hunter's Instinct, Standard Finish, Devilment,
    Technical Finish, Divination, Starry Muse, The Balance / The Spear,
    Medicated
  - the attacker's penalty debuffs (Weakness, Damage Down)
  - debuffs on the **hit's target** (Chain Stratagem)
- **Chain Stratagem is listed per target.** In P3 (Chaos and Exdeath),
  hits on the boss without it don't list it (0 of 179 across both
  windows). Dokumori and Mug are unconfirmed: no Ninja or Rogue in the
  sample.
- **No procs and no non-damage job statuses.** Silken Symmetry, the Fan
  Dance procs, Ready to Rip, Hyperphantasia, Hammer Time, Swiftcast,
  Meikyo Shisui and Lightspeed all appear in the Buffs stream but never in
  `buffs`. The field is omitted when no listed status is active (about
  37% of hits).
- **DoT ticks carry the snapshot from when the DoT was applied.**
  Biolysis and Higanbana ticks list Chain Stratagem after it fell off.
  Ground DoTs (Salted Earth, "Combined DoTs") carry no `buffs`.
- The `damageTaken` `buffs` list is wider (Well Fed, every shield and
  mitigation), but it is also without procs.

### 2. What still needs apply/remove events

The Buffs stream gives everything the snapshot can't:
- apply / refresh / remove, with `duration` on applies and `stack` on
  stack changes
- **expired procs are detectable:** a consumed proc's `removebuff` lands
  within 150ms of the consuming cast (Jugular Rip, Reverse Cascade,
  Hammer Stamp ...); an expired one lands at apply + `duration` with no
  cast (Lightspeed 15.1s of 15s, Giant Dominance 10.0s of 10s)
- exact raid-buff windows on every target, so GCDs inside a window can
  be counted without the ~0.85s snapshot lag

**So one new stream is needed.** Volume: about 11 events/s unfiltered,
half of them self-applied (111 distinct self statuses in 90s), so roughly
10k events for a 16-minute pull. Filtering to the ported status IDs cuts
that further.

### 3. `damageDone` fields

Present on every landed hit:
- **`hitType`:** 1 normal, 2 crit.
- **`directHit: true`** marks a direct hit. It is a separate field, not
  part of `hitType`.
- **`multiplier`:** the product of the **damage %** modifiers only
  (Standard Finish 1.05, Fugetsu + Standard Finish 1.19, full burst
  1.54). Crit and direct-hit rate buffs (Chain Stratagem, Devilment) are
  not in it, and Medicated counts as 1.05. So a hit normalises as
  amount ÷ multiplier ÷ crit factor ÷ 1.25 for a direct hit.
- **`unmitigatedAmount`** equals `amount` on outgoing hits.
- **`bonusPercent`** appears on combo and positional actions only
  (Gekko 61, Souleater 45, Hindsbane Fang 60 or 48). Different values on
  one action look like positional hit vs miss. Map them per action when
  porting the melee batch, against xivanalysis's positional data.
- **DoT ticks** have `tick: true`. Most are `simulated: true`, carrying
  `expectedAmount`, `expectedCritRate`, `directHitPercentage` and
  **`actorPotencyRatio`**: FFLogs' own damage-per-potency estimate for
  the player (AST 115, SCH 114, SAM 87, GNB 70 in this pull). The engine's
  potency-to-damage conversion can be checked against it.
- `calculateddamage` previews: one per hit. `onlyLanded` already drops
  them; keep that.

### 4. Begin-casts

- `begincast` carries **`duration`**, the cast time after speed (Broil IV
  1437ms, Fall Malefic 1447ms, motifs 3000ms).
- **The `cast` event lands about 505ms before the cast bar ends**
  (1437ms → 932ms after begin, every cast-time action in the window). It
  marks the slidecast point, not the end of the cast. GCD-gap math must
  use begin + `duration` as the end of the cast lock.
- **Interrupted casts** are begin-casts with no `cast`: 4 of 731 in the
  pull (three Fall Malefic, one Broil IV).
- They reach the samples (the slim projector keeps `begincast`), but
  without `duration`.

### Design impact

1. **One new stream: a filtered friendly `Buffs`.** It is needed for
   procs, job buffs, raid-buff windows and expired procs. The snapshot
   alone can't answer them.
2. **The snapshot is still useful,** as the check of what each hit
   actually got (raid buffs, Chain Stratagem on that target, Damage Down
   on the attacker). Use the stream for windows and the snapshot to
   confirm hits inside them.
3. **The GCD model must read begin-casts with `duration`,** because the
   `cast` event comes before the cast ends.
4. **Penalty debuff time already reaches `Pull`** through the friendly
   `debuffs` stream (Damage Down, Weakness). The snapshot confirms which
   hits they reduced.
5. **The Layer 3 stacked-spender check gets simpler:** `multiplier`,
   `hitType` and `directHit` are on every hit, so the per-hit
   normalisation needs no guessing. Only the crit factor stays an
   approximation (it depends on the player's crit stat).

## Build status

Built 2026-10-06 (steps 1–4), no UI yet.

- **Data** (step 1): `PlayerInfo.beginCasts` and `PlayerInfo.buffs` (the
  filtered player-buff stream, `lib/damage/ffxiv/buff-stream.ts`).
  `PlayerEvent` on damage done now carries `statusIds`, `multiplier`,
  `hitType`, `directHit`, `bonusPercent`, `isDoT`, `actorPotencyRatio` and
  the target actor. `Pull.bossDebuffs` holds the statuses players put on
  enemies. The app's sample loader now maps every stream the live fetch
  returns; before this it dropped `enemyDebuffs`, `headMarkers` and
  `enemyDamageTaken`.
- **Healing tab fix:** `PlayerEvent.healType` plus `isLandedHeal()`.
- **Data tables** (step 2): `lib/damage/ffxiv/xiva-data.ts`, generated by
  `scripts/sync-xiva-data.js` from xivanalysis f532855 (patch layers
  through 7.4); notice in `THIRD_PARTY_NOTICES.md`.
- **Engine** (step 3): `lib/damage/` (`analyze.ts`, `checks.ts`,
  `timeline.ts`, `types.ts`; FFXIV layer in `ffxiv/`). Each file's header
  documents its rules. Print-only runner:
  `node scripts/validate.js damage-analysis sampledata/ff/<code>`.
- **Dancing Mad context** (step 4):
  `lib/mechanics/ffxiv/dancingmad/damage-context.ts`.

Departures from the plan, found while building:
- **Scoring is in observed damage, not potency.** xivanalysis records
  potencies for only a few jobs (none for GNB, DRK, SCH, AST, DNC or
  PCT), and only where their positional checks need them. Each loss is
  instead valued in the player's own damage from the pull:
  - a GCD gap at their average GCD in that phase, buffed or not
  - a lost cooldown use at that action's average per use
  - a death at their damage per second alive
  - a penalty at the damage they dealt under it × (1 ÷ factor − 1)

  The scale is still the same for every job. FFLogs' `actorPotencyRatio`
  is there if potency is wanted later.
- **Penalties are measured, not looked up.** The ultimate's Damage Down
  (1002911) is ×0.10, a 90% loss; Weakness is ×0.75. Both were read from
  the per-hit multiplier.
- **Cooldown drift judges only listed cooldowns**
  (`ffxiv/tracked-cooldowns.ts`). Judging every 20s+ action flagged
  gauge- and proc-gated ones (Mog of the Ages, Finishing Move, Guren) as
  hundreds of seconds of drift. xivanalysis itself tracks only six jobs.
  Ours ports those six; every other job has just its party buff until its
  batch.
- **Downtime is inferred from the log** for every fight: 3s+ with no
  player landing a direct hit on any enemy. On `dQ8wmb1VhKt6yBXk` that
  found exactly the phase transitions and Forsaken's 46s untargetable
  stretch.
- **P4 is marked `damageCounts: false`.** Its damage doesn't carry over,
  so losses there are shown as forced. Revisit this if P4 turns out to
  have its own check.

**Tank batch** (step 6, first role, 2026-10-06), awaiting the user's review:
- **Engine, every job:**
  - **Broken combos**, measured: a combo step's hit carries `bonusPercent`
    only when the combo landed (every Solid Barrel 47, every Souleater 45
    on `dQ8wmb1VhKt6yBXk` pull 11).
  - **Triple-weave clipping**, with the defensives woven named.
  - **Tank-swap labels** on gaps near Provoke or Shirk.
  - **Disengage GCDs** (Lightning Shot, Unmend, Tomahawk, Shield Lob),
    each valued at the player's average GCD minus the filler.
- **Job modules** in `lib/damage/ffxiv/jobs/`. The shared helpers cover a
  job's burst window, a damage buff's uptime, and a gauge simulated from
  casts that checks itself: if the simulation goes below zero, its
  findings become inference.
  - **GNB:**
    - No Mercy contents: 9 GCDs (8 at 2.47s+) plus the expected actions
    - cartridge overcap, with Bloodfest's 7.4 cap of 6
    - tracked cooldowns (Sonic Break left out: it needs No Mercy's proc)
  - **DRK:**
    - Delirium contents
    - Darkside uptime, simulated: it's a gauge timer, and FFLogs'
      multiplier doesn't include it
    - Blood overcap, with Blood Weapon gains read from its stack removals
    - tracked cooldowns
  - **PLD and WAR**, unverified (no sample has them): Fight or Flight
    contents, Surging Tempest uptime, and tracked cooldowns.
- **Window end:** windows include their removal's own timestamp.
  Delirium's last stack goes at the same instant as the GCD that uses it;
  without this, every Delirium read as one GCD short.

**Healer batch** (step 6, second role, 2026-10-06), no review yet. The
user will refine each job later with the people who play it:
- **Heal-GCD efficiency** (`jobs/healer.ts`), the first study's biggest
  gap measured per cast. It counts:
  - the direct heal and its overheal
  - HoT ticks of the statuses the GCD applies
  - shield absorbs, credited to the latest cast that applied the shield
    to that player
  Under 20% effective is a finding, valued at the healer's damage filler
  and marked inference (whether the heal was needed for safety is the
  healer's call). During forced time it's free. The dialog shows heal vs
  damage GCDs per player and the raid's damage taken per phase.
- **On `dQ8wmb1VhKt6yBXk`:** the AST's Helios Conjunction is the
  recurring finding (its HoT alone overhealed 17.0M against 10.4M
  effective in pull 11). The SCH's three Adloquiums on one tank in 7s
  before P2 overwrote each other: only the last absorbed, but it was
  downtime, so forced.
- **DoT uptime and early refreshes** (`shared.ts dotFindings`) from
  `Pull.bossDebuffs`: Biolysis, Combust III, Dia, Eukrasian Dosis III /
  Dyskrasia.
- **AST Divination contents** (8 GCDs, Lord of Crowns, Oracle, Combust
  III). Cooldown drift as before; WHM Presence of Mind added (unverified).
- WHM and SGE are unverified: no sample has them.
- `PlayerEvent.overheal` is now kept on heals.

**Melee batch** (step 6, third role, 2026-10-06), no review yet:
- **Positionals** (engine, `checkPositionals`), ported from xivanalysis.
  A hit missed when its `bonusPercent` is one the potency table gives
  without the positional. Checked: the SAM's Gekko shows 61 = 1 − 160/420.
  Lost = the missed hit × the potency the positional adds.
- **Melee disengages:** Enpi, Piercing Talon, Throwing Dagger, Harpe and
  Writhing Snap join the disengage check.
- **Buff uptime:** SAM Fugetsu (+13%, from the multiplier), VPR Hunter's
  Instinct (+10%, from the multiplier), DRG Power Surge.
- **Windows** (`jobs/melee.ts`): SAM Meikyo (3 Sen GCDs), VPR Reawaken
  (4 Generations, 4 Legacies, Ouroboros), MNK Riddle of Fire, DRG Lance
  Charge, NIN Kunai's Bane (an enemy debuff, read from
  `Pull.bossDebuffs`), RPR Enshroud. Arcane Circle's window isn't ported.
- **Tracked cooldowns:** SAM, VPR, DRG, NIN. SAM Guren and Senei now share
  one recast; before, each was judged alone and showed hundreds of seconds
  of drift.
- MNK, DRG, NIN and RPR are unverified: no sample has them.

**Physical ranged batch** (step 6, fourth role, 2026-10-06), no review
yet:
- **rDPS split for every player** (`lib/damage/buffs.ts`, shown in the
  dialog and the runner): own damage, buffs given, buffs received.
  - Each party buff on a hit is attributed to whoever applied it.
  - % buffs are re-measured per pull from hits carrying them alone, which
    covers Radiant Finale and the card role split.
  - Crit and direct-hit buffs are estimated and marked ≈.
  - A dance partner's hits list Devilment twice, so status ids are
    de-duplicated.
  - On `dQ8wmb1VhKt6yBXk` pull 11 the DNC gave ≈6.9M (Devilment and
    Standard Finish on her partner, Technical Finish on the party). The SAM
    received the most, 6.2M.
- **Buff coverage** (every buffer): a party-wide cast that missed a living
  party member who was dealing damage is a finding. Checked: 269 casts in
  the sample report; the 4 that reached fewer than 8 players all missed
  someone dead or idle.
- **DNC** (`jobs/ranged.ts`): Technical Finish contents (xivanalysis
  Technicalities), filler GCDs inside it (an upper bound: Fountainfall is
  fine when out of Esprit), and tracked cooldowns.
- **BRD and MCH**, unverified: BRD DoTs and cooldowns; MCH Wildfire (an
  enemy debuff), Hypercharge and cooldowns.

**Caster batch** (step 6, last role, 2026-10-06), no review yet. Step 6
is complete:
- **PCT** (`jobs/caster.ts`):
  - **Starry Muse contents** (xivanalysis StarryMuse): a missing action is
    valued at the window's bonus measured from the multiplier (`bonus:
    "observed"` in `shared.ts`), since Starry Muse lines up with the
    party's buffs.
  - **Additive spells inside Starry Muse**, an upper bound. In P3 they're
    mostly Holy in White during movement.
  - **The Hammers question:** on `dQ8wmb1VhKt6yBXk` every Starry Muse
    holds only one Hammer (Hammer Time starts at the window's end). It's
    consistent across pulls, so probably a chosen line; confirm with the
    player.
  - **Dropped:** a "motif painted in uptime" check (~20 per pull: the
    standard rotation repaints in uptime). Doing it properly needs
    knowledge of upcoming downtime.
- **BLM, SMN and RDM**, unverified: BLM High Thunder DoTs; SMN Searing
  Light with Searing Flash; cooldowns for all three (xivanalysis lists).
- **Cast interruptions** were already an engine check; begin-cast +
  duration gives casters their real cast locks. Slidecast timing isn't
  observable (no movement data), so it isn't judged.

**Reference-clear comparison** (step 7, 2026-10-06):
- **`lib/damage/compare.ts`.** Equal windows from the start of the
  deciding phase. Each own pull is measured over its own length (capped
  at the shortest reference phase) against the clears over that same
  length; several own pulls combine by median. Per player: rDPS = own +
  given (the buff ledger restricted to the window), GCDs and heal GCDs per
  minute, deaths, and the analysis's estimated loss in the window, each
  against the median of the clears' players of the same job. Role rows sum
  tanks (2), healers (2) and DPS (4) per log.
- **Dialog:** a "Compare with clears" tab (`components/DamageCompare.tsx`).
  Paste an FFLogs URL with `?fight=` and press Fetch clear
  (`lib/damage/reference-clears.ts`). It loads local sample data if
  present, else one fight from FFLogs. Kills of the same fight only.
  Clears stay loaded while the app is open.
- **Runner:** `node scripts/validate.js damage-compare sampledata/ff/<own>
  --refs=<code>,<code>`.
- **First run:** the user picked six clears (2 with GNB + DRK, 2 with AST
  + SCH, one PCT, one DNC): `tjwXMZ76G8TJWDPv`, `y6Hmp1W2KLXYnTq7`,
  `bfjJWH9hGKgMtnvk`, `WmpQRyZ62LzdvM3x`, `6GbNrpW137ncCVZ2`,
  `LpaxT1wMF39JWzjG`. Against them, `dQ8wmb1VhKt6yBXk`'s three P5 pulls
  reproduce the first study's manual result:
  - healers −22% rDPS (AST −16%, SCH −24%), with the AST at 7.5 heal GCDs
    per minute against the clears' 5.4
  - tanks −3%
  - DPS +2%

Open:
- **Per-player busy windows** (tower soaks, debuff carriers, baits) aren't
  in the Dancing Mad context yet. Gaps during a mechanic are labelled
  ("during Limit Cut") but still counted. One candidate: the DRK's 4.6–4.9s
  idle after their LB3 during Limit Cut, which recurs in every pull.
- Proc overwrites and "the right actions inside buffs" are left to the
  job batches.
- The runner is print-only. Snapshots and rulings come once findings have
  survived player feedback.

## UI: the Damage dialog

- **Header button** "Damage", directly left of "Mitigation".
- **Pull selector** (reuse `hooks/useFFPullSelector.ts`) plus an "all
  loaded pulls" view.
- **Player list** with the total estimated loss per player, ranked.
- **Per player:** findings ranked by lost damage, each showing its
  basis; forced findings shown greyed out with their cause ("soaking
  tower"); a timeline strip of GCD use, buff windows and forced downtime.
- **Phase summary:** each phase's pool, whether it decides the enrage, and
  the raid's estimated loss in it versus the HP left at the enrage.
- **Reference clears panel:** add report codes, fetch on button press,
  then the equal-window comparison by role and player.

UI rules from `docs/app-architecture.md` apply: inline `style` objects,
no page scroll, panels clip internally, and the shared `ck-*` theme
classes.

## Feedback loop

Treat player feedback on findings the way mechanics treat VOD review:
ground truth the analysis must survive. Record confirmed and overturned
findings in `expectations/` like mechanic rulings. Give the engine and each
job module a `validate.js` runner so baselines catch regressions.

## Suggested build order

1. **Data check (no app changes):** done 2026-10-06; see "Data check
   findings". The data changes above, and the Healing-tab fix (shield
   absorbs and `calculatedheal` previews counted as heals, from
   [mitigation-redesign.md](mitigation-redesign.md)), come before the
   engine.
2. **Port the data tables** with attribution and the sync script.
3. **Engine** with the generic checks and potency scoring, plus a
   `validate.js` runner that prints findings for a sample report.
4. **Dancing Mad damage context**: phases, pools (P2 44.1M, P3 75.1M and
   P5 56.9M are fixed; P4 varies and doesn't carry over; P5 decides the
   enrage), and forced downtime pulled from the existing modules.
5. **Damage dialog**: the header button, per-player findings and the
   phase summary.
6. **Tank batch**, user review, then Healer, Melee, Ranged, Caster.
   Done 2026-10-06 for every combat job. The user will refine each job
   with its players over time (see "Build status").
7. **Reference-clear comparison.** Done 2026-10-06.
8. **Later:** automatic search for comparable clears; the WoW port.

Verify each step the usual way: `node scripts/validate.js --check` and
`npx tsc --noEmit`. The user reviews the UI.
