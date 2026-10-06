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

## WoW port (step 8)

Same shape as FFXIV: the engine in `lib/damage/` stays game-neutral, a
WoW layer goes in `lib/damage/wow/` (spell data, tracked cooldowns,
`specs/` grouped by role like `ffxiv/jobs/`), and each Venomous Abyss
boss gets a `damage-context.ts` next to its module. The engine changes
only where WoW can't be expressed through `DamageGame`, and the module
header says why.

### Borrowing from WoWAnalyzer

[WoWAnalyzer](https://github.com/WoWAnalyzer/WoWAnalyzer) is
**AGPL-3.0** (checked 2026-10-06 through GitHub's licence API, `midnight`
branch). The user decided not to take on the AGPL, so unlike xivanalysis
it is a reference only:
- Read it to learn the rules (which cooldowns matter, what a burst window
  holds, how procs work); write our own code in our own structure.
- Copy no code, data tables or comments, verbatim or lightly edited, and
  write no sync script.
- Spell and aura IDs come from real WCL logs (`scripts/analyze-report.js`,
  the report's `masterData.abilities`) and `lib/spell-data.ts`; each ID's
  comment names its source log.
- The dialog's About text credits it as a plain link ("rules informed by
  WoWAnalyzer"), not a licence notice.
- If a rule can only be had by copying, stop and ask the user.

### Data check findings (2026-10-06)

Checked on `kGVX7tafBT2pM1N3` fight 29: Vashnik the Malignant kill,
438s, 20 players. Used the slimmed sample pull plus one unslimmed fetch of
its first 90s: friendly `Casts`, `DamageDone` and `Buffs`, and `Debuffs`
on enemies (2.3k, 13.4k, 14.4k and 4.8k events).

#### 1. Casts and GCD timing

- **The `cast` event lands at the end of the cast,** not 0.5s before it
  as in FFXIV. Smite: begin → cast median 764ms; Lightning Bolt 1200ms;
  Arcane Blast 991ms (hasted, under Heroism).
- **Begin-casts carry no `duration`.** The cast time is cast − begin-cast
  of the same ability. Off-GCD casts can land in between (Fire Blast during
  a Fireball), so match by ability, not by the next event.
- **Instant procs show as begin-cast and cast at the same ms:** 104 of
  411 begin-casts. Pyroblast 44 (Hot Streak), Lava Burst 17, Starfire 15,
  Shadow Bolt 14. A proc consumption is visible on the cast itself.
- **Cancelled or interrupted casts:** a begin-cast with no cast of that
  ability before the next begin-cast. 16 in 90s. Several are re-casts of
  the same spell (Elemental Blast, Shadow Bolt), so moving or cancelling.
- **Channels** (Mind Flay) log one `cast` at the start and no end event.
  The lock must come from the channel's damage ticks or the next cast.
- **Empowered spells** (Fire Breath, Dream Breath) log `empowerstart` and
  `cast` at the same ms, then `empowerend` with `empowermentLevel` at
  release.
- **`fake: true` casts** are WCL-made, not button presses: Shadowy
  Apparition (73), Reclamation (39), Twin Flame (26), Infliction of Sorrow
  (24) and others. Exclude them from GCD counts.
- **WCL gives no GCD information.** No on-GCD flag, no recast, no haste.
  The GCD table (on-GCD, 1.5s or 1.0s base, cooldown, charges) is ours to
  write per spec. Source each entry from cast spacing in real logs.
- **Haste changes inside a pull:** Heroism (+30%) on the whole raid at
  2.9s, Power Infusion on single players. The engine's one speed factor
  per player would read every lust GCD as normal and every normal GCD
  after lust as slow.
- **`classResources` on casts:** the primary resource on every cast
  (amount, max and cost). The secondary appears on spenders, as the amount
  before the spend: Eviscerate `4: 7/7, cost 7` (combo points), Eternal
  Flame `9: 5/5` (Holy Power), Echo `19: 5/5` (Essence). So "finisher
  below max" is measured, not simulated. Builder overcap isn't directly
  visible: builders show only the primary resource.
- Today: `player.casts` holds completed casts only (`fake` ones
  included); begin-casts and `classResources` are dropped by both the
  transform and `slim-report.js`.

#### 2. Buffs: snapshot and stream

- **The per-hit `buffs` snapshot holds every aura on the attacker,**
  unlike FFXIV's damage-modifier-only list:
  - procs (Heating Up, Hot Streak!), cooldowns (Combustion), Heroism and
    Power Infusion (PI on the Warlock's hits from 3.1s to 18.0s)
  - flasks, augment runes, forms
  - passive talent auras applied before the pull (unnamed IDs in the
    report's ability list)
  - not HoTs or shields from others (Echo of Light, Rejuvenation, Renew)
  - not target debuffs: Chaos Brand, Mystic Touch and Hunter's Mark are on
    0 of 13.4k hits
- **It is big:** 14.5 statuses per hit on average (max 27), 107 bytes, 276
  distinct IDs. That's about 8.6MB of strings for this kill's 80k hits. So
  decode only the IDs the game layer asks for into `statusIds`.
- **The Buffs stream** gives apply/refresh/remove and stack changes, with
  the source (Heroism: the Shaman, on all 20 players at 2.9s; PI: the
  Priest, on themselves and on the Warlock). **There is no `duration` on
  applies,** so an expired proc is a removal with no consuming cast, judged
  against a duration we write down.
- **Unfiltered volume:** about 160 events/s for 20 players, 436 distinct
  statuses, 78% self-applied. The top statuses are passive procs and HoTs
  (Rune of Critical Power, Elemental Resistance, Echo of Light). A server
  filter on 9 IDs (lust, PI, Hot Streak, Heating Up, Combustion) cut 60s
  from 10.0k events to 90.

#### 3. Damage events

- **No `multiplier`, `directHit` or `bonusPercent`.** WoW has no
  direct hit, and no combo or positional bonus field.
- **`hitType`:** 1 normal, 2 crit, 0 miss, 8 parry, 10 immune. Parries (18)
  and misses (77) were on Vashnik. Immunes were on Burning Venom (63) and
  Vashnik (8).
- **`unmitigatedAmount`** is before crit and before target-side modifiers
  (armor, vulnerabilities). Caster-side buffs are already in it.
  amount ÷ unmitigated: normal hits median 1.00 (quartiles 0.76–1.06),
  crits median 2.21.
- **DoT ticks:** `tick: true`, 29% of hits, and they crit.
- **Pets: 12.3% of raid damage, and dropped today.** Damage is filtered by
  player `sourceID`, and the actor query doesn't fetch `petOwner`. With
  `petOwner` (metadata only), over the whole kill: the two BM Hunters'
  pets 10.0M and 10.6M, Shaman
  Ancestor and elementals 4.2M, Warlock Darkglare and demons 2.6M, DK Rune
  Weapon 1.8M.
- **Player debuffs on enemies** (DoTs, Mortal Wounds, Atrophic Poison)
  aren't in the WoW fetch. Unfiltered it's about 53 events/s, mostly from
  players, some from pets.

#### 4. Query cost

Measured with `rateLimitData` before and after single queries over the
same 60s:
- **About 1 point per sub-stream per request, whatever its size.**
  Unfiltered Buffs (10.0k events) and filtered Buffs (90) cost the same.
- **A finished stream still costs a point on every later page.**
  `fetchFightData` pins it at `endTime` and keeps requesting it; an empty
  window measured the same 1 point.
- This kill has 80k damage-done and 95k healing events, so about 10
  merged pages × 9 streams ≈ 90 points today. Two more streams, filtered,
  would add about 20.

### Design impact

1. **Keep the per-fight cost flat by dropping finished streams.** Give
   each alias in `FIGHT_EVENTS_QUERY` an `@include(if: $want…)` and turn it
   off once its stream is done. Then only page 1 pays for every stream;
   later pages pay for damage done and healing (≈ 11 + 9 × 3 ≈ 38 points on
   this kill instead of ≈ 90). That pays for the two new streams below with
   room to spare. Re-measure on a real fetch when building.
2. **Two new filtered streams, same pattern as `ffxiv/buff-stream.ts`:**
   - friendly `Buffs` on the game layer's ID list: raid buffs (the lust
     family, PI, and others as found) plus each spec's procs and burst
     cooldowns as its batch lands
   - `Debuffs` on enemies, filtered to each spec's DoTs and party debuffs,
     into `Pull.bossDebuffs`
3. **Begin-casts map onto the FFXIV shape.** The transform pairs each WoW
   begin-cast with its cast and stores `durationMs` = cast − begin, so
   `gcdUses` and the interrupted-cast check work unchanged. Empowers get
   `durationMs` = empowerend − empowerstart. `fake` casts are dropped from
   the engine's view.
4. **Engine change: haste over time.** Replace the per-player speed factor
   with one per window (in and out of Heroism and PI, from the buff
   stream), else lust GCDs look normal and later ones look slow. The FFXIV
   result must not change; check with `validate.js --check`.
5. **Engine change: channels.** A channelled GCD locks until its last tick
   or the next cast, whichever is first. The game layer marks channels.
6. **Snapshot: keep, but filtered.** Decode only the game layer's IDs
   into `statusIds`. The snapshot then confirms what each hit had (Combustion,
   lust, PI), as on FFXIV; the stream gives the windows and expiries.
7. **Buff value without a multiplier.** A damage-% buff is measured as
   the median `unmitigatedAmount` of the same ability with it ÷ without it,
   per pull. Haste buffs (lust, PI) add GCDs instead of hit size, so their
   share of the rDPS split is an estimate (extra GCDs × GCD value) and
   marked approximate. `DamageGame.partyBuff` needs a `haste` field.
8. **Pets.** Add `petOwner` to the actor query, credit pet damage to the
   owner (marked as pet so it doesn't skew GCD values), and count pet DoTs.
9. **Resources on casts** (`classResources`, kept in a new cast field) let
   spender checks read the real amount. Gauge simulation is the fallback
   only for builder overcap.
10. **The GCD and spell table is hand-written,** per spec, with each
    entry's source log. No `xiva-data.ts` equivalent and no sync script.
11. **Existing WoW samples need `--refetch`** after the projector keeps
    `buffs`, `hitType`, `unmitigatedAmount`, `classResources`,
    `begincast`, `fake` and the new streams. Live pulls stored before then
    say so in the dialog, as on FFXIV.

All of the Venomous Abyss samples are from groups the user doesn't know.
The user is fine with that (2026-10-06): build a raw implementation
against them and refine it later.

### WoW build order

1. **Data check.** Done 2026-10-06 (above).
2. **Data changes and spell tables.** Done 2026-10-06 (below).
3. **Engine and game layer:** `lib/damage/wow/game.ts` (a `DamageGame`
   built on `spell-data.ts` plus hand-written corrections), haste per
   window, channels, `fake` casts skipped, and a WoW `validate.js` runner.
4. **Venomous Abyss damage contexts**, one per boss module.
5. **Dialog** for WoW pulls.
6. **Spec batches by role**, the user's static's specs first.
7. **Reference clears** for WoW.

### Build status (WoW)

**Step 2** (2026-10-06):
- **Fetch** (`lib/wcl-client.ts`):
  - Every stream alias has `@include(if: $<key>Want)`, and a finished
    stream is dropped from later pages.
  - Two new streams: `playerBuffs` (friendly Buffs) and `enemyDebuffs`
    (Debuffs on enemies), both filtered on the server
    (`lib/damage/wow/buff-stream.ts`).
  - The actor query now fetches `petOwner`.
  - Measured on `kGVX7tafBT2pM1N3` fight 29 (the 438s kill): 37 points
    for the whole fetch, against 94 with the old query. That includes
    report metadata and the interrupts table.
- **Transform** (`lib/log-transforms.ts`):
  - Damage done:
    - pet and guardian hits, credited to the owner (`pet` names the
      pet; 13.0% of that kill's damage)
    - `statusIds` (the tracked auras only), `hitType`,
      `unmitigatedAmount`, the target's HP after the hit, and the target
      id and instance
  - Casts: `fake` and `resources`.
  - `beginCasts` with `durationMs` paired as in "Data check findings". A
    cast that never went off gets the time until the player's next cast.
    Empowers run from start to release.
  - `buffs` and `Pull.bossDebuffs` (pets' credited to the owner).
  - These fields stay undefined on captures without the aura snapshot, so
    the engine's missing-data note still fires on old samples.
- **Samples:**
  - `scripts/lib/slim-report.js` keeps the new fields and streams. The
    aura snapshot is cut to the tracked IDs, still in WCL's string form.
  - That kill went from 26.4MB to 44.0MB: damage done 21.9MB (4.3MB of it
    the snapshot), player buffs 3.2MB, enemy debuffs 1.8MB.
  - Re-fetched with the new fields: every pull of `kGVX7tafBT2pM1N3`
    (Vashnik), `JZp82Rm7TzycM94a` (Ula'tek), `rNL38zFGMbyADRTh` (Sszorak)
    and `xKP1M6gwC8WpnrBc` (Twin Fangs), plus `nRGxQ1b8LdMvzC4D`'s Nek'zali
    and Nymrissa kills. The other WoW samples are old captures; refetch
    single pulls with `--fight` when a step needs them (the user asked to
    keep API use down).
- **Spell tables** (`lib/damage/wow/spell-data.ts`), generated by
  `scripts/build-wow-spell-data.js` from `scripts/survey-wow-spells.js`
  surveys of 12 fights (every Venomous Abyss kill in the samples, plus the
  two longest Entombed Sentinels wipes and a Coiled Altar kill). It covers
  36 specs. Per spec it lists:
  - **Abilities:** cast count, on-GCD (inferred), median hard-cast time,
    instant share, cast intervals, and whether it's empowered.
  - **Statuses:** share of the spec's hits carrying it, self-applied share,
    events per minute, and a kind:
    - "class": procs, cooldown buffs and talent auras
    - "external": other players' buffs. Exactly Heroism, Bloodlust, Time
      Warp, Fury of the Aspects, Power Infusion, Ebon Might, Prescience,
      Shifting Sands, Sacred Weapon, Lesser Weapon and a few rare ones.
    - "gear": trinkets, embellishments, augment runes and potions. Not
      fetched: they were most of the unfiltered stream.
  - **DoTs, enemy debuffs and pet abilities.**
- **The base GCD checks out:** the 1.0s fixed-GCD specs (every Rogue,
  Feral, Brewmaster and Windwalker) measure exactly 1000ms. Everything
  else is hasted and lands between 940ms and 1380ms.
- **Filtered volume:** 462 buff IDs and 124 debuff IDs. The survey fights
  average ~150 buff events per player-minute (the 438s kill: 29.7k buff
  events, 15.1k debuff events).
- **Known slack, left for later:**
  - A few non-DoT debuffs pass the enemy-debuff filter (Rune of Lingering,
    Banish, Mortal Coil) because they share an ID with something a spec
    casts.
  - Mistweaver's observed GCD (740ms, 2 players) is suspect.
  - On-GCD inference needs 5+ casts, so rare abilities are `null`.

**Step 3** (2026-10-06): engine and game layer.
- **`lib/damage/wow/game.ts`** (`WOW_DAMAGE`), built on `spell-data.ts`.
  - **Base GCD:** 1.0s fixed for every Rogue, Feral, Brewmaster and
    Windwalker; 1.5s hasted for everyone else.
  - **Burst windows:** the lust family plus Power Infusion.
  - **rDPS split:** only Power Infusion is credited, as +20% haste
    (estimated). Lust is left out on purpose.
  - **Taunts:** they label tank-swap gaps.
  - **Channels:** a hand list of cast IDs.
  - `tracked-cooldowns.ts` and `specs/index.ts` are empty until the spec
    batches.
- **Engine changes**, each an optional `DamageGame` hook; with them unset
  FFXIV is unchanged. The full `dQ8wmb1VhKt6yBXk` damage-analysis output
  and a reference-clear comparison are byte-identical before and after.
  - `jobOf`: findings, spec checks and cooldowns key on "<spec> <class>".
  - `speed`, `hasteStatusIds`: a speed factor measured separately inside
    and outside Bloodlust and Power Infusion. The base is the player's most
    common recast, so fixed-GCD specs stay at 1.0s; a Windwalker's
    occasional Vivify had set theirs to 0.9s.
  - `isChannel`: a channel's lock runs to its last tick before the next
    GCD, matched by ability name, because ticks often log under another
    ID (Arcane Missiles 5143 → 7268, Eye Beam → 198030, Fists of Fury →
    117418). It cut one Arcane Mage's GCD-gap loss from 8.2M to 2.7M.
  - `isGcdDamage`: a gap is priced at the player's own on-GCD abilities
    (hits and the DoT ticks that share their ID), not pets or procs.
  - `fake` casts are skipped. Buff-window "fit" counts at the window's own
    speed. `PartyBuff.haste` exists for Power Infusion.
- **Runner:**
  `node scripts/validate.js damage-analysis-wow sampledata/wow/<code> [--pulls=1,3] [--boss=<name>]`.
  It runs only when named (`namedOnly`), since WoW pulls are big.
- **First look** (Vashnik kill `kGVX7tafBT2pM1N3` pull 19, Ula'tek kill
  `JZp82Rm7TzycM94a` pull 25), no boss context yet:
  - Observed GCDs read right: 0.9–1.4s hasted, 1.0s fixed.
  - Tank gaps near Dark Command are labelled as tank swaps.
  - Losses are mostly GCD gaps and small delays. Many big gaps are
    movement (Glide, Shadowstep, Roll), which only a boss context can
    excuse (step 4). WoW raids are rarely fully untargetable, so the
    log-inferred downtime rarely fires.
  - A gap inside lust can be priced high when lust lines up with an AoE
    window: the Ula'tek Rogue's GCDs averaged 1.63M there against 226k
    elsewhere.

**Step 4** (2026-10-06): a damage context for every Venomous Abyss boss
(`lib/mechanics/wow/va/<boss>-damage-context.ts`, registered in
`lib/damage/contexts.ts`). Each header records what was measured and
where.
- **Data:** WoW pulls now keep the boss's casts and enemy buffs
  (`Pull.enemyCasts`, `enemyBuffs`, `enemyBuffRemovals`).
- **Helpers:** `lib/damage/wow/context-helpers.ts` turns debuffs, boss
  casts and enemy buffs into forced windows.
- **Method:** each mechanic was measured on real pulls by comparing
  holders' cast rate with the rest of the raid in the same window. A
  mechanic is excused only when the loss is real, and often for melee only.
- **Per boss:**

| Boss | Phases | Forced windows |
|---|---|---|
| Entombed Sentinels | P2 Vitriolic Stasis `damageCounts: false` (99% damage reduction) | 1.5s rush before Stasis; 3s boss swap after |
| Vashnik | none | melee Plague Froth carriers (+2s walk back) |
| Sszorak | P2 Dig In noted as a burn window | melee Raging Crosswinds; Venomous Surge holders; melee after each charge (Serpent's Fury removal +1s to +7s) |
| Nymrissa | none (no detection module) | none measured |
| Nek'zali | P2 multi-target; P3 decides the enrage | well team (entry −6s to exit +4.5s); Soulcoiled; melee Essence Rend knockback; melee Pyre flame carriers |
| Lost Explorers | all multi-target (council) | melee Blink Nova and Explosive Surprise; fish thrower (−20s to +4s); Blast Wave bounces |
| Twin Fangs | none (two bosses, cleaved) | everyone 3.5s before Sanguine Storm; melee during it (18s); melee Coiling Ichor |
| Coiled Altar | not in these captures | S1→S2 (~8s); Malacrass immune → Zul'jan (4.2s); Dreadmarch; Wail fear |
| Ula'tek | P2 multi-target; P3 `damageCounts: false`; P4 multi-target | P1→P2 transition; Circling Prey (5s); P2 egg clear; melee Doomscale egg |

- **Effect:** on the Ula'tek kill, the intermission's counted loss went
  from 15.9M to 0.3M, and the Rogue's from 47.3M to 37.4M (7.2M forced).
- **Known gaps:**
  - PhaseContext.multiTarget is per phase, so fights without log phases
    (Vashnik's Venoms, Twin Fangs, Nymrissa's Bubblefins) can't mark their
    add windows yet.
  - Partial losses (a mechanic that halves a melee's uptime) are excused
    in full or not at all.
  - Enrage timers are mostly unobserved in these wipes.
- **Refetched for the contexts** (5 pulls, 171 points):
  - Coiled Altar pull 11 (gave its phase ids: 1–2 stages, 3
    intermission, 4 Stage Three)
  - the Twin Fangs (`6Jnq8ycwgkYZpHND` 25) and Lost Explorers
    (`8PQFgdDh3R9BW71t` 20) kills
  - Entombed Sentinels pulls 15 and 24

**Step 5** (2026-10-06): the Damage dialog shows WoW pulls
(`components/DamageDialog.tsx`).
- **Game layer per pull:** each pull uses its own (`WOW_DAMAGE` or
  `FFXIV_DAMAGE`). `useFFPullSelector` takes an optional games list; the
  other dialogs keep FFXIV only.
- **Lazy analysis:** a pull is analysed when first shown and cached for
  the open dialog. Before, every loaded pull was analysed on open. One WoW
  pull takes ~0.3s (the 598s Ula'tek kill). "All loaded pulls" analyses
  them all, so a 25-pull WoW report takes several seconds there.
- **Colours and credit:** WoW players are coloured by class (findings name
  the spec). The About line reads "rules informed by WoWAnalyzer", a plain
  link; FFXIV keeps its xivanalysis credit.
- **Compare with clears** says it isn't built for WoW yet (step 7).

**Step 6, tank batch** (2026-10-06). There's no WoW static, so the batches
go by role in the FFXIV order, the specs with the most sample players first.
- **Rules:** which windows and resources matter was informed by
  WoWAnalyzer (read, not copied). Every ID and number is from our own logs.
- **Helpers** (`lib/damage/wow/specs/shared.ts`, beside FFXIV's
  game-neutral ones):
  - **Burst-window GCD count:** GCDs that fit, at the player's speed in
    the window, less one. Each GCD short is valued at only the window's
    bonus, since the gap is already its own finding.
  - **DoT uptime:** valued at the DoT's own damage per second of uptime;
    WoW ticks are hasted, so there's no fixed 3s tick.
  - **Resource cap:** a cast that doesn't spend the resource, made at its
    max. Each ability's gain is measured from consecutive casts, and the
    loss is valued at the spenders' damage per unit.
  - **Observed window bonus:** median unmitigatedAmount inside the window
    vs outside, capped at 30%. Uncapped, Sentinel read +118%, since
    trinkets and lust line up with it.
- **Blood Death Knight** (15 sample players):
  - Dancing Rune Weapon GCDs, valued at the Rune Weapon's measured share
    (12–48% per window).
  - Blood Plague uptime.
  - Runic Power at the cap: it's logged on every cast, builders included.
    One DK wasted ~405 Runic Power on the Vashnik kill, ~1.2M at Death
    Strike's damage per point.
  - Tracked cooldowns: Dancing Rune Weapon 90s, Raise Dead 120s.
- **Protection Paladin** (8): Sentinel GCDs (bonus observed, inference);
  Sentinel and Divine Toll 60s. Holy Power is logged only on spenders,
  so overcap isn't judged.
- **Brewmaster Monk, Vengeance Demon Hunter** (2 and 1 players,
  unverified):
  - Tracked cooldowns only: Exploding Keg 60s; Sigil of Spite 63s and
    Sigil of Flame 31s.
  - Brewmaster's energy is at 100 on 39 of 183 casts, but time at the cap
    isn't in the log.
- **Guardian Druid, Protection Warrior:** not in any sample, so nothing yet.
- **Cooldown recasts** are the shortest interval measured between one
  player's casts. That's an upper bound on the real recast, so drift errs
  lenient.

**Step 6, healer batch** (2026-10-06), `lib/damage/wow/specs/healer.ts`:
- **Heal-GCD efficiency** for every healer spec: the FFXIV headline (what
  each heal GCD actually healed), adapted to WCL's healing stream.
  - On the Vashnik kill, `heal` events carry amount and overheal: the raid
    overhealed 522M against 572M effective. `absorbed` events are shields
    that took damage (128M).
  - A shield that expires unused leaves no amount, so wasted shields
    aren't visible.
  - Healing is matched by spell name (Prayer of Mending heals under
    another ID) on the cast's own target, so the several Rejuvenations
    running at once don't mix. Spells that land on several players at once
    (Wild Growth, Chain Heal) count on anyone.
  - Under 20% effective = a wasted GCD, valued at the healer's damage
    filler and marked inference. Grouped per spell per phase, since WoW
    healers press ~300 GCDs a pull.
- **WoW heal events** now keep `overheal`.
- **Specs:** Holy Priest (12 sample players), Restoration Druid (10),
  Holy Paladin, Restoration Shaman, Preservation Evoker (9 each),
  Mistweaver (2, unverified), Discipline (none in the samples,
  unverified).
- **First look** (Ula'tek kill): the Holy Priest's Benediction and Holy
  Word: Serenity, the Holy Paladin's Flash of Light and Eternal Flame, and
  the Evokers' Echo show casts under 20% effective, mostly in P1 and P3.
- **Not judged:**
  - Healer DoTs: WoW healers aren't expected to keep them up.
  - Power Infusion's recast: its casts log in pairs 1ms apart, and the
    median gap (23s) is no recast. It still counts in the rDPS split.

**Step 6, melee batch** (2026-10-06), `lib/damage/wow/specs/melee.ts`:
- **Every melee spec** (Arms 19 sample players, Windwalker 10, Havoc 9,
  Retribution 8, Assassination 6, Subtlety 4, Unholy 3; Frost DK, Fury,
  Feral, Survival and Outlaw at 1–2, unverified) gets:
  - **Its main cooldown's window** (Avatar, Recklessness, Avenging Wrath,
    Metamorphosis, Invoke Xuen, Pillar of Frost, Dark Transformation,
    Kingsbane, Shadow Blades, Adrenaline Rush, Berserk, Takedown): GCDs
    that fit vs GCDs pressed, bonus read from the hits (inference).
  - **Its main resource at the cap** (Rage, Fury, Runic Power, Energy,
    Focus, whichever its casts log most):
    - An ability is a spender if any of its casts logged a cost; some of
      Mortal Strike's log none, and it read as waste.
    - Spender damage is matched by name, because Annihilation's hits log
      under another ID.
    - Energy and Focus waste is mostly invisible, since their spenders
      cost them.
- **Tracked cooldowns:** only when the median interval is within 1.25× of
  the shortest. A bigger spread means resets or cooldown reduction
  (Retribution's Divine Toll: shortest 30s, median 62s), and the shortest
  would invent drift. Arms' Avatar and Colossus Smash spread too far, and
  resource- or charge-gated ones (Eye Beam, Breath of Sindragosa, Shadow
  Dance) stay out.
- **First look** (Ula'tek and Vashnik kills):
  - Arms Warriors cast Overpower at full Rage 10–20 times a pull (~150–420
    Rage).
  - The Havoc's Essence Break sat ready ~110s (about 3 uses).
  - The Assassination Rogue's Kingsbane sat ready 203s (about 3 uses).
  - Frost DK cast Exterminate at full Runic Power.
- **Soft spot:** Subtlety's Energy-cap reads come from Secret Technique's
  automatic second cast (282449, cast 65ms apart). Energy at the cap is
  still waste, but its gain estimate there includes regen.

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
8. **The WoW port** ("WoW port (step 8)"). Step 1, the data check, done
   2026-10-06; the build waits on the user's go-ahead and their static's
   specs.
9. **Later:** automatic search for comparable clears.

Verify each step the usual way: `node scripts/validate.js --check` and
`npx tsc --noEmit`. The user reviews the UI.
