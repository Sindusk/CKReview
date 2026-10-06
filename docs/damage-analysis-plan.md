# Damage Analysis Plan (FFXIV)

Plan for in-app damage and rotation analysis: a new **Damage** dialog
that finds rotation and uptime losses per player, scores them in lost
damage, and explains them using what we know about the fight. The
direction was agreed with the user on 2026-10-06; this doc is the build
brief. Nothing in it is implemented yet.

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

- **Begin-cast events.** `lib/log-transforms.ts` (~line 1205) keeps only
  `type === "cast"` and drops `begincast`, though the query returns both.
  Keep begin-casts in a separate field: interruptions and cast-time
  analysis need them.
- **Buffs on players** (raid buffs, self-buffs, procs). **Revised by the
  mitigation build** (see "Data check findings" in
  [mitigation-redesign.md](mitigation-redesign.md)): every FFLogs damage
  event carries `buffs`, a snapshot of status IDs, and on outgoing
  `damageDone` events it already listed raid buffs (Battle Litany,
  Technical Finish). The mitigation work therefore built no player-buff
  stream. First check how far `buffs` on `damageDone` goes:
  - Does it list self-buffs and debuffs on the boss (Chain Stratagem,
    Dokumori), and is it the attacker's or the target's statuses?
  - It can't show a proc that expired unused, or exactly when a buff was
    applied and removed. Proc and buff-window checks may still need
    apply/remove events.
  Add a stream only for what `buffs` can't answer, filtered on the server
  to the needed status IDs (`filterExpression`, as `enemyDebuffs` and
  `headMarkers` already do). Remember the template-literal pitfalls in
  `FIGHT_EVENTS_QUERY` (no `//` comments, no backticks). Note the `buffs`
  snapshot lag found there: it reflects when the hit was calculated, up to
  about 0.85s before it landed.
- **Damage-done detail:** the mitigation build confirmed that raw
  `damageTaken` events carry `hitType`, `multiplier`, `unmitigatedAmount`
  and more, and that ability damage type comes from `masterData.abilities
  { type }` (already requested now). Confirm the same fields on
  `damageDone` (crit and direct hit in `hitType`, the multiplier from
  raid buffs), and keep them on `PlayerEvent` the same way.
  `scripts/lib/slim-report.js` was widened for the damage-taken fields;
  widen it for these too.
- **Truncated tables.** The DamageDone table returns only each player's
  top 5 abilities; per-ability totals need events.
- Pulls stored before these changes lack the new data. Re-fetching is an
  explicit user action; the dialog says when a pull needs a re-fetch.

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

1. **Data check (no app changes):** on one Dancing Mad sample, confirm
   what begin-casts, damage-done fields and a filtered player-buff stream
   return. Write findings into this doc.
2. **Port the data tables** with attribution and the sync script.
3. **Engine** with the generic checks and potency scoring, plus a
   `validate.js` runner that prints findings for a sample report.
4. **Dancing Mad damage context**: phases, pools (P2 44.1M, P3 75.1M and
   P5 56.9M are fixed; P4 varies and doesn't carry over; P5 decides the
   enrage), and forced downtime pulled from the existing modules.
5. **Damage dialog**: the header button, per-player findings and the
   phase summary.
6. **Tank batch**, user review, then Healer, Melee, Ranged, Caster.
7. **Reference-clear comparison.**
8. **Later:** automatic search for comparable clears; the WoW port.

Verify each step the usual way: `node scripts/validate.js --check` and
`npx tsc --noEmit`. The user reviews the UI.
