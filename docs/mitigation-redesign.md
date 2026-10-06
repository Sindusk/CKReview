# Mitigation Redesign Plan (FFXIV)

Plan for replacing the sheet-based mitigation system with one that reads
the party's actual mitigation from the log. The direction was agreed with
the user on 2026-10-06; this doc is the build brief. Build step 1 (the
data check) is done; its results are in
[Data check findings](#data-check-findings-2026-10-06) and override the
Model sections where they disagree. Steps 2–4 are built; see
[Build status](#build-status).

## Why

The current system (`lib/mechanics/ffxiv/dancingmad/mitigation-*.ts`)
grades every player against the Ikuya community sheet. That only helps a
group that follows Ikuya exactly. Any group-specific tweak makes the
Heatmap and Review read as misses, so the tool says nothing useful about
what the group could improve.

## Goal

For each damaging mechanic in a pull, show:
- which mitigations were used and by whom
- which were available but unused, and which of those were **free**
  (defined below)
- how close the raid came to dying, and so whether the mechanic was
  over-mitigated, tight or under-mitigated
- how much mitigation could be dropped while everyone still survives

This has to work on a **brand-new fight in prog with no plan and no
per-fight setup**. The user's target workflow: "we're using too much
mitigation on X and that's why we die to Y, so move Feint from X to Y."

## Decisions (settled with the user)

1. **No plan input.** Drop the Ikuya sheet entirely. Plugging a published
   plan back in as a reference to compare against is a possible future
   feature and **out of scope** here.
2. **No PullErrors.** Mitigation is a team planning problem, not a player
   error. It lives only in the Mitigation dialog. The
   `ffxiv-mitigation-missed` rule is removed.
3. **Personal and extra mitigation are in scope** (previously excluded as
   "Extras"): Magic Barrier, Dismantle, role personals, and so on.
4. **Raidwides first.** Tank busters, invulnerabilities and tank personal
   mitigation are a later phase.
5. **FFXIV first.** The design should not block a later WoW port. Keep
   the game-specific parts (catalog, event decoding) separate from the
   analysis.

## Model

### 1. Detect mechanics from the log

A **hit** is one boss ability's damage landing on multiple players at
about the same time. Example: Ultima landing on 7 players within ~1s.
- Build hits from player `damageTaken` where the source is an enemy.
  Group by ability ID and a short time cluster.
- Treat it as a raidwide when it hits most of the living party. Start
  around ≥4 targets and tune against real pulls.
- Label each hit by ability name plus occurrence number (Ultima #1,
  Ultima #2), and attach the matching boss cast from `pull.enemyCasts`
  when there is one. The current `mitigation-review.ts` already anchors on
  boss casts; reuse that idea.
- Match hits across pulls by (ability ID, occurrence number). Fall back
  to phase-relative time if occurrence counts diverge, for example after
  a phase skip.
- Exclude DoT ticks (`isDoT`) from hit detection, but record them in the
  damage sequence (see Pitfalls).

### 2. Mitigation catalog (shared by every fight)

One FFXIV catalog, keyed by status ID and by the ability (cast) ID that
applies it. Suggested home: `lib/mitigation/ffxiv-catalog.ts`. It is not
tied to an encounter. For each entry:
- ability ID (cast) and status ID (buff or debuff)
- job(s)
- **kind**: `bossDebuff` (Reprisal, Feint, Addle, Dismantle), `partyBuff`
  (Shield Samba, Troubadour, Tactician, Magic Barrier, Holos, ...),
  `shield` (a fixed absorb rather than a percentage), `personal`
  (Second Wind is a heal, not mitigation; role personals such as Third
  Eye, Manaward, Arm's Length do count)
- **reach**: self / single target / party
- **reduction**: physical % and magical %, kept separate (Feint 10%
  physical and 5% magical; Addle the reverse)
- duration and cooldown (and charges, if any)

The existing `ABILITY_DURATION_MS` / `FORCE_DURATION_OVERRIDE` tables in
`mitigation-detection.ts` record durations where FFLogs' buff data was
confirmed wrong. Fold that knowledge into the catalog before deleting the
module.

Values change with game patches. Cite the patch they came from in the file
header.

### 3. What was active at each hit, and what was available

**Active:**
- Target-side buffs: each FFLogs damage event already carries `buffs`, the
  status IDs active on the target at that hit. It is decoded today into
  `PlayerEvent.activeBuffNames` (`log-transforms.ts`
  `fflDamageTakenToPlayerEvent`). Keep the **IDs**, not only the names,
  so the catalog can be looked up directly.
- Boss-side debuffs (Reprisal, Feint, Addle, Dismantle): the
  `enemyDebuffs` stream (`ffl-client.ts`, filter `target.type="npc"`)
  already returns every debuff on NPCs. Reconstruct each debuff's window
  from apply/remove/refresh and check it covers the hit's timestamp, on
  the actor that dealt the hit.

**Available:** for each player and each catalog ability they have, track
cooldowns from their own casts (`player.casts`). At each hit, every
ability is in one of three states:
- **used**: active on the hit
- **available**: off cooldown and not active
- **on cooldown**: spent elsewhere

A player who is dead at the hit has nothing available; reuse the
dead / freshly-raised logic in `mitigation-detection.ts`
(`isDeadOrFreshlyRevived`).

**Free:** available, and if it were cast at this hit it would come back
off cooldown before that player's next actual cast of it. A free cast can
be added without changing anything else the group does. This is the
"what aren't you using" answer.

### 4. Survival margin

For each target of a hit:
`margin = (healthBefore − damage) / maxHealth`.
`PlayerEvent` already has `healthBefore`, `healthAfter` and `maxHealth`.

- The hit's margin is the **lowest player's**, not the average.
- Exclude players carrying a vulnerability-up debuff, or show them
  separately, since they inflate the worst case.
- Verdict per hit, with thresholds to tune with the user:
  - **under**: a death, or margin below ~5%
  - **tight**: margin roughly 5–20%
  - **over**: margin roughly 20% or more
- Because personal mitigation is in scope, the margin is per player. The
  view must be able to say "the lowest player was the one who skipped
  their personal", which is a different fix from "the raid needs one more
  party mitigation".

### 5. Droppable mitigation

Estimate the hit's damage **before** mitigation, then recompute survival
with mitigations removed.
- Damage before mitigation is `amount / product(1 − reduction)` over the
  catalog entries active on that target, using the physical or magical
  column for the hit's damage type. Shields add back their absorbed
  amount.
  - FFLogs may expose `unmitigatedAmount` / `multiplier` on damage events.
    The current samples do not contain them. **Verify against a fresh raw
    fetch before relying on them**; if they are present they replace the
    estimate.
  - The damage type (physical / magical) has to come from somewhere:
    a field on the event if FFLogs provides one, otherwise infer it from
    which reduction column makes the numbers consistent across hits,
    otherwise a small per-ability override table.
- Greedy removal: drop the active mitigation whose removal keeps the
  lowest player alive with the most margin, and repeat. Report the set
  that can go: "Feint could be dropped and the lowest player still ends
  at 18%."
- Budget against the **worst observed** damage across loaded pulls
  (damage rolls vary roughly ±5%), not a single pull.

### 6. Across pulls

Aggregate each hit (matched per section 1) across loaded pulls: median
and worst margin, how often each mitigation was used, and deaths. The
plan view should read the aggregate. One pull is too noisy to plan from.

## UI

Replace the Heatmap and Review tabs in `components/MitigationDialog.tsx`.

**Timeline (primary view):**
- **Rows:** hits in fight order, grouped by phase.
- **Cells:** each mitigation source available to the party (job +
  ability), marked used / free / available / on cooldown.
- **Side columns:** damage taken, lowest player's margin, verdict,
  droppable mitigations.
- A single pull selector plus an "all loaded pulls" aggregate mode.
- Hover on a cell: who cast it, when, and when it comes back.

**Later, not in the first build:** a "what-if" sandbox. Move a cast from
one hit to another, check the move against the cooldown, and recompute
both hits' margins. This reuses section 5's calculation, so design that
calculation as a pure function from (hit, active set) to margin.

UI rules from `docs/app-architecture.md` apply: inline `style` objects,
no page scroll, panels clip internally.

## Pitfalls to design around

- **Damage sequences.** A raidwide survived at 50% may need that headroom
  for a DoT or a second hit seconds later. Group hits closer than a few
  seconds (tune it) into one sequence, and judge margin at the end of the
  sequence. Otherwise the tool will tell people to drop mitigation they
  need.
- **Healing vs mitigation.** If health was low **before** the hit, the
  death is a healing / timing problem. If health was full and the damage
  was still lethal, it is a mitigation problem. Show which one, per death.
  It falls out of `healthBefore` directly.
- **Shields.** FFLogs logs shield absorbs as separate `absorbed` events
  (seen in samples: amount plus the shield's status ID, followed by a
  `removebuff`). A hit fully absorbed to 0 shows only as an unpaired
  `calculateddamage` (see `FFLDamageEvent` comments). Model shields as
  extra health, not a percentage.
- **Pets and the LB pseudo-actor.** Resolve actor IDs, including pets,
  before counting targets. `docs/dps-analysis.md` has a case where an
  Earthly Star pet showed up as a debuff victim.
- **Deaths with no damage** are probably disconnects, not mechanics.

## Data changes

- **Keep status IDs on damage-taken events.** Add the raw ID list next to
  `activeBuffNames` in `PlayerEvent`.
- **Check the `enemyDebuffs` stream carries Reprisal/Feint/Addle/
  Dismantle** with the right source and target actors. Its filter
  suggests it does; confirm on a sample.
- **Verify `unmitigatedAmount` / `multiplier`** (section 5) on a fresh
  raw fetch.
- **Shield `absorbed` events:** confirm which stream they arrive in today
  and whether they reach `Pull`. Add them if not.
- Any new fetch must keep the per-fight query cost flat. Use server-side
  `filterExpression` restricted to catalog IDs, as `enemyDebuffs` and
  `headMarkers` already do. Remember the template-literal pitfalls in
  `FIGHT_EVENTS_QUERY` (no `//` comments, no backticks).
- Persisted pulls fetched before the change lack the new fields.
  Re-fetching stays an explicit user action (CLAUDE.md: no hidden costs
  on navigation). The UI should say when a pull needs a re-fetch for
  mitigation data.

## Data check findings (2026-10-06)

Checked on slimmed Dancing Mad samples `ZADQVgGzTm8HNc2W` (fight 12, a
19-minute P5 wipe, late-phase capture) and `2aVkjzJnNAgCw1FL` (fight 4),
plus one fresh
**unslimmed** fetch of `ZADQVgGzTm8HNc2W` fight 2 (283s, P1–P2) through
`fetchFFightData`, and one `masterData.abilities { type }` query on the
same report.

### 1. Status IDs on damage-taken events

- `buffs` is on ~97% of `damageTaken` events (all but a few unpaired or
  0-amount records). It is a dot-separated list of status IDs (`1001193.`
  = Reprisal, `1002618.` = Kerachole, ...), the same IDs the catalog will
  key on. `fflDecodeActiveBuffNames` currently throws the IDs away.
- **It also carries the boss-side debuffs.** Reprisal, Feint and Addle
  appear in the *target's* `buffs` string when they are on the boss that
  dealt the hit. Shields (Eukrasian Prognosis, Divine Veil, Holosakos, ...)
  appear there too, as do tank personals and invulnerabilities.
- **It is a snapshot from when the hit was calculated, not from when it
  landed.** Hits land staggered (about 45ms per target), and the `buffs`
  list still contains Addle on hits landing 0.5–0.85s *after* Addle's
  `removedebuff`. The multiplier on those hits confirms Addle applied.
- Non-mitigation statuses are mixed in (Well Fed, Battle Litany, songs).
  Filter by catalog ID.

### 2. Boss debuffs in `enemyDebuffs`

- Reprisal, Feint and Addle are all present, with the right actors:
  `sourceID` is the player who cast it, and `targetID` is the boss actor
  (Kefka). The apply event also carries `duration` (15000) and
  `extraAbilityGameID`, the casting action (7535 Reprisal, 7549 Feint,
  7560 Addle). That gives the catalog its cast-ID ↔ status-ID pairs from
  the log.
- The boss is several actors across phases: one pull applied Reprisal to
  two different Kefka actor IDs.
- **Reconstructing windows on the hit's source actor does not work.** On
  the raw fight, 107 of the 209 hits whose `buffs` lists Reprisal, Feint or
  Addle had no matching window. Most come from helper actors (for example
  Double-Trouble Trap, Gravity III), which never carry the debuff, but the
  game still applies it (the multiplier shows it). The rest are the
  snapshot lag above.
- **Dismantle is unconfirmed.** No pull in any local sample has a
  Machinist. The Machinists listed in report actors were outside the
  pulls. Reprisal/Feint/Addle behave identically, so Dismantle very likely
  does too, but it needs one pull with a Machinist to confirm.

### 3. Shield `absorbed` events

- They arrive in the **`healing`** stream (`type: "absorbed"`), followed
  later by a `removebuff` in the same stream when the shield breaks or
  expires. `calculatedheal` previews are in that stream too.
- Raw fields: `sourceID` (who cast the shield), `targetID`,
  `abilityGameID` (the shield's status ID), `amount`, `attackerID`,
  `extraAbilityGameID` (the boss ability that was absorbed) and
  `attackerInstance`. Every shield on the target gets an event per hit,
  0-amount for shields that absorbed nothing. Timestamps equal the damage
  event's.
- **They reach `Pull`, but unusably.** `buildFFPlayers` maps the whole
  healing stream into `PlayerInfo.healing` / `healingReceived` without
  `type`, `attackerID` or `extraAbilityGameID`. An absorb is
  indistinguishable from a heal there.
  - Side effect today: the roster's Healing tab counts absorbs and
    `calculatedheal` previews as heals (the latter double counts). Not in
    scope; noted for later.
  - The slim projector drops `attackerID` and `extraAbilityGameID`, so the
    samples can't recover them either.
- The damage event's own `absorbed` field gives the total absorbed on that
  hit, which is all the margin math needs. The `absorbed` events are only
  needed to say *whose* shield took it.

### 4. `unmitigatedAmount`, `multiplier` and damage type

**Present on the raw API; missing from samples only because
`slim-report.js` drops them.** Raw `damageTaken` fields:
- `unmitigatedAmount` (218 of 301 events): the hit before mitigation,
  shields and block.
- `mitigated`: the amount removed by % mitigation plus block.
- `absorbed`: the amount shields took.
- `multiplier` (286 of 301): the product of every % modifier on the hit,
  rounded to 2 decimals. It **includes vulnerability-up** (2.69 seen) and
  **excludes block**.
- `blocked` on tank block hits (`hitType` 4), plus `hitType`.

Checks on the raw fight:
- `amount + absorbed + mitigated = unmitigatedAmount` on 217 of 218 events.
- `(amount + absorbed) / unmitigatedAmount = multiplier` within 0.01 on
  192 of 218; the 26 misses are all blocked hits.
- `unmitigatedAmount` is missing exactly on 0-amount events: full absorbs,
  invulnerable/immune hits (`hitType` 7, 10, 20), and unpaired
  `calculateddamage`.

**Damage type is on the ability, not the event:**
`masterData.abilities { type }`.
- `128` = physical (the boss auto-attack).
- `1024` = magical (every raidwide checked).
- `32` = unaspected: The Path of Light and Ave Maria show multiplier 1
  even with Kerachole up, so % mitigation does not apply.

Catalog values checked against the multiplier, on magical hits:
- Light of Judgment, Addle × Feint × Reprisal × Kerachole:
  0.9 × 0.95 × 0.9 × 0.9 = 0.69, matching the logged 0.69.
- Gravity III, Reprisal × Feint × Dark Missionary × Sun Sign × Kerachole:
  0.9 × 0.95 × 0.9 × 0.9 × 0.9 = 0.62, matching the logged 0.62.

### Design impact

1. **"Active" comes from `buffs` alone,** target-side and boss-side. Drop
   the `enemyDebuffs` window reconstruction from section 3. Use
   `enemyDebuffs` apply events only to say *who* cast a boss debuff (the
   latest apply before the hit, by status ID and boss actor, because the
   hit's source actor is often a helper).
2. **Section 5's estimate becomes arithmetic.** Use `unmitigatedAmount`,
   `multiplier` and `absorbed` from the event. Removing mitigation *r*
   raises the hit to `unmitigatedAmount × multiplier / (1 − r)` before
   shields. Fall back to an estimate only for 0-amount hits, from the same
   ability's other targets in the cluster.
   - The ability's damage type comes from `masterData` `type`, so no
     inference and no override table.
   - Type `32` is unmitigable by %: only shields matter for it.
   - The logged multiplier double-checks the catalog. A hit where the
     catalog product disagrees with it flags a wrong catalog value or a
     missing status.
3. **Vulnerability-up is visible in the multiplier** (above 1 on its own),
   so section 4's vuln exclusion can read it from there.
4. **No new event stream is needed for mitigation.** `buffs` gives the
   active set; casts give cooldowns; `enemyDebuffs` and the
   absorbed events give attribution.
   - The planned buffs-on-players stream is therefore not a mitigation
     dependency.
   - `buffs` on *outgoing* `damageDone` events already lists raid buffs
     (Battle Litany, Technical Finish and others were seen there), which
     may cover the Damage dialog too.
5. **Data changes become:**
   - Request `type` in `REPORT_QUERY`'s abilities (no extra request).
   - Keep the status ID list, `unmitigatedAmount`, `multiplier`,
     `absorbed`, `mitigated`, `blocked` and `hitType` on `PlayerEvent`.
   - Keep `type`, `attackerID` and `extraAbilityGameID` on healing-stream
     events (or split absorbs into their own list).
   - Widen `slim-report.js` to keep the same fields, so samples have
     them; existing samples need `--refetch`.
   - Per-fight query cost stays flat.

## Build status

Built (2026-10-06), no UI yet:
- **Data:** `PlayerEvent` carries `statusIds`, `unmitigatedAmount`,
  `multiplier`, `absorbed`, `mitigated`, `blocked`, `hitType` and
  `damageType`. `PlayerInfo.shieldAbsorbs` lists shield absorbs with their
  caster. The report query requests ability `type`. Pulls fetched before
  this lack all of it; the UI must say so (re-fetch stays a user action).
- **Catalog:** `lib/mitigation/ffxiv-catalog.ts`.
  `node scripts/check-mitigation-catalog.js` checks it against the
  samples: IDs, every hit's multiplier, and cooldowns from cast spacing.
  Warrior, Machinist (including Dismantle), Red Mage, Ninja, Monk and
  Summoner entries are unverified; no sample pull has those jobs.
- **Analysis:** `lib/mitigation/analyze.ts`, `(pull, game) → hits[]`. Its
  header documents each rule. `marginWithout` is the pure function the
  what-if sandbox will reuse.
- **Aggregate:** `lib/mitigation/aggregate.ts`, hits matched across pulls
  by phase + ability name + occurrence within the phase.
- **Check without the UI:**
  `node scripts/validate.js mitigation-analysis sampledata/ff/<code>`
  prints every hit per pull, then the cross-pull aggregate. It is
  print-only and adds nothing to snapshots. Only full captures have
  enough data; `dQ8wmb1VhKt6yBXk` was re-fetched with the new fields.
  The static's own sample folders are all late-phase captures.

Choices made while building, open to tuning with the user:
- **Raidwide:** 4+ targets and 75%+ of the living party. 4-of-8 spreads
  and towers (Wave Cannon, The Path of Light) are not raidwides.
- **Verdict thresholds:** the plan's 5% / 20%, judged on the sequence
  margin. On `dQ8wmb1VhKt6yBXk` (a heavily mitigating group) that gives
  489 over, 48 tight and 17 under across 554 hits.
- **Follow-up damage:** each player's later drop counts all enemy damage
  chained within 5s of the hit, up to 15s. A hit bigger than a whole
  health bar (a failed mechanic) is skipped.
- **Droppable:** only party-wide mitigations with a 30s+ cooldown are
  candidates. The result keeps the lowest player at 5%+ after a 5%
  damage-roll buffer. The UI shows only the count (user, 2026-10-06: a
  list of names read as "drop all of these"); the validate runner prints
  the names for tuning.
- **Sheet columns** (user review, 2026-10-06): grouped per player in
  MT, OT, H1, H2, M1, M2, R1, R2 order with a rule between players.
  Party-wide mitigation shows by default; personal mitigation expands per
  player. Astrologian cards are out of the sheet (`inSheet: false`) but
  still understood on hits.
- **Free** = a full cooldown since the player's last cast AND a full
  cooldown before their next one (multi-charge abilities are simulated).
  In all-pulls mode a ◆ needs it free in at least half the pulls.
- **Aggregate verdict:** median margin across pulls; the worst margin and
  deaths are shown beside it.
- **"Ineffective"** (cast and within its duration but not on the hit) is
  shown only for boss debuffs and fixed-duration party buffs. It catches
  Reprisal and Addle on Wave Cannon, which Graven Image deals.

## What gets removed

- `lib/mechanics/ffxiv/dancingmad/mitigation-plan.ts`,
  `mitigation-detection.ts`, `mitigation-review.ts`,
  `mitigation-heatmap.ts`, `mitigation-plans/ikuya.json`
- `components/MitigationHeatmapTable.tsx`,
  `components/MitigationReviewTable.tsx`
- `scripts/fetch-mitigation-sheet.js`,
  `scripts/inspect-mitigation-anchors.js`
- In `app/page.tsx`: `mitigationPlanId` state, `getMitigationPlan`, and
  the `detectMitigationErrors` call in the cross-pull `displayPulls` memo
- In `scripts/validate.js`: the `mitigation` and `mitigation-review`
  runners
- The `ffxiv-mitigation-missed` rule. `validate.js --check` will show its
  errors disappearing from baselines; that is the intended delta, then
  run `--update`. `expectations/rulings.json` has entries citing the rule:
  show them to the user rather than deleting silently (rulings are
  hand-edited only).
- Before deleting, move what's still useful: duration overrides into the
  catalog, and the dead / freshly-raised check into the new module.
  `lib/mechanics/ffxiv/roles.ts` stays (other modules use it).
- Update `docs/open-items.md` (the Mitigation entry) and any doc that
  describes the old tabs.

**Open question for the user:** `wave-cannon.ts` emits
`ffxiv-phase1-wave-cannon-mitigation-issue`, a player-less error for a
death to a single unavoidable beam. It is a mechanic-module error, not
part of the sheet system. Ask whether it stays under "no mitigation
errors" before touching it.

## Suggested build order

1. **Data check (no app changes).** On one Dancing Mad sample, confirm:
   status IDs on damage events, boss debuffs in `enemyDebuffs`, the
   `absorbed` events, and whether `unmitigatedAmount` / `multiplier` /
   damage type exist. Write findings into this doc.
2. **Catalog** for the jobs present in the sample reports, then the rest.
3. **Analysis module**: a pure function `(pull) → hits[]` with active,
   available, free, margin and droppable per hit. Add a `validate.js`
   runner that prints it for a sample report, so it can be checked
   without the UI.
4. **Aggregate across pulls.**
5. **UI**: replace the dialog's tabs with the timeline.
6. **Remove the old system** (list above) once the new tab works. This
   can go earlier if the user prefers.
7. **Later:** what-if sandbox, tank busters, optional plan reference,
   WoW port.

Verify each step the usual way: `node scripts/validate.js --check` and
`npx tsc --noEmit`. The user reviews the UI.
