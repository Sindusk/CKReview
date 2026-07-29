# Mechanic Error Detection — How This Directory Works

This directory contains encounter-specific error detection for raid mechanics,
organized per game and per raid:

```
lib/mechanics/
  ffxiv/
    roles.ts                  — MT/OT/H1/H2/M1/M2/R1/R2 party-role detector
    dancingmad/               — Dancing Mad (Kefka's Return) ultimate
      phase1.ts               — Phase 1 rules (Blizzard III, Wave Cannon, Tele-Trouncing, ...)
      forsaken.ts             — tower-soak mechanic (Phase 2)
      limitcut.ts             — gaze + numbered dash mechanic
      blackhole.ts            — tether/Earthquake mechanic
      stompies.ts             — post-Black-Hole Earthquake baits/towers
      exdeath.ts              — Phase 3 Thunder III / Shockwave
      graven-image.ts         — cross-pull Graven Image spread analysis
      blackhole-strategy.ts   — cross-pull strategy auto-detect (DSA/SDA/Double Tether)
      mitigation-*.ts         — mitigation sheet import / detection / review / heatmap
  wow/
    vs-dr-mqd/                — Voidspire, Dreamrift, March on Quel'Danas
      midnightfalls.ts        — Midnight Falls per-pull rules
      terminate-kicks.ts      — cross-pull Terminate kick-order detection
      crystal-assignments.ts  — declared crystal assignments
```

**Read the header comment of a module before touching it.** Each module's
header is the authoritative, reverse-engineered model of how that mechanic
actually works — confirmed against real logs, with the specific report codes
and pull numbers that proved each claim. This README covers what is *common*
across all of them.

---

## Architecture: the three kinds of detection

**1. Declarative single-ability rules** live in `lib/error-rules.ts` and are
evaluated by `lib/error-detection.ts`. Use these when a rule is expressible as
"this ability/debuff hit this player (maybe gated by one condition)". Modules
can also hold their own declarative rule tables and run them through
`evaluateRuleSet()` (midnightfalls.ts does this).

**2. Per-pull correlation modules** (forsaken.ts, blackhole.ts, limitcut.ts,
stompies.ts, exdeath.ts, phase1.ts, midnightfalls.ts) exist because they
correlate *multiple* event streams — e.g. a stack-counter debuff against a
specific damage tick, or positions against an assignment schedule. Each
exports a `detectXErrors(players, deathEvents[, enemyCasts, enemyBuffs, ...])`
function called from the transform layer in `lib/log-transforms.ts`
(`transformFFightToPull` for FFXIV, `transformFightToPull` for WoW).

- **Self-gate on the mechanic's signature debuffs/abilities** so the module
  can run safely on every pull, including pulls that never reach the
  mechanic. No caller-side gating.
- Duplicate raid-level errors are suppressed by `suppressDuplicateRaidErrors`
  (2s per-ruleId window, keeps the first).
- `PullError` severity `"Raid"` means no player attribution
  (see `types/PullError.ts`).

**3. Cross-pull / strategy-driven detection** (terminate-kicks.ts,
blackhole-strategy.ts, graven-image.ts, crystal-assignments.ts, the
mitigation trio) runs over ALL of a report's pulls and is NOT called from the
transform layer — `app/page.tsx` recomputes it (typically into a separate
`displayPulls` layer or the Strategy dialog) because it depends on
report-wide context or user-selectable configuration.

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
3. **When attribution is ambiguous, flag all candidates rather than guess.**
   When fallout vs. genuine error can't be distinguished at all, stay silent.
   A false accusation is worse than a miss.
4. **Raid severity for raid-level consequences** — errors with no meaningful
   single-player attribution get severity `"Raid"` instead of a forced name.
5. **Put distances/specifics in descriptions.** "~5.6 yalms off their spot"
   is the desired style — the number goes in the error *description*, even
   when the attribution decision itself didn't need geometry.
6. **Expect iteration.** The first version of a rule will not be perfect. The
   user tests against new logs and reports precise ground truth ("only X
   should flag"); tune to that, don't defend the first guess.
7. **Narrow overrides over wholesale replacement.** When a working check
   fails for one specific case, add a narrow override for that case — do not
   swap the whole mechanism for a new one that handles the exception.
8. **Raid-severity descriptions shouldn't assert a definitive outcome like
   "the raid wiped."** A raid can rez and keep pushing prog past a mistake
   this severe even though detection treats it as a cutoff point for further
   per-player analysis (confirmed 2026-07-30, Dancing Mad report
   Q3GzJNZg64k1hLRm pull 26: a death to the raid's SECOND Graven Image/
   Mystery Magic did not end the pull, unlike the first — see phase1.ts's
   GRAVEN_1_DEATH_WIPE_RULE_ID). Phrase these as "unresolvable from here" /
   "treated as a cutoff point," not "the raid wiped."

---

## The working method for building a new detection

This process has produced every module here. In order:

1. **Get ground truth first.** A fail log plus a plain-language description
   of what actually happened and who should be flagged ("X was assigned #8
   and was out of position; only X should flag"). For a NEW mechanic, ask
   the user to fill in `SPEC-TEMPLATE.md` (same directory) — it collects
   the mechanic model, assignment scheme, error conditions with fault
   attribution, and clean/fail evidence in one pass instead of a
   multi-round conversation; "unknown" fields just mean analysis starts
   there.
2. **Reverse-engineer from the raw events.** Standard recipes:
   - Cluster `applydebuff` events by second to find mechanic-start bursts.
   - Sweep damage by ability ID within the mechanic's window.
   - Group enemy events by `sourceInstance` to separate concurrent copies of
     one NPC.
   - Trace deaths via `killingAbilityGameID`.
   - Recover positions per the position-semantics table below.
3. **Derive the invariant from CLEAN pulls first, across multiple logs.**
   Only then look for what uniquely separates the failure.
4. **Geometry often fully overlaps between clean and failed pulls** (proven
   repeatedly: Forsaken flare plants, Forsaken cone-bait distances). When it
   does, gate on OUTCOME — who the follow-up actually hit, who died to what —
   instead of position. Reserve exact distance math for the error
   *description*.
5. **Process of elimination beats precise position matching** for
   attribution: if there are exactly N interchangeable candidates and N−1
   are already accounted for in the same resolution, the remaining candidate
   is decisive with zero geometry.
6. **Encode every threshold with both extremes in a comment** — the worst
   clean value observed and the best failure value observed, with report
   codes (e.g. `// clean max observed 1.06%, failure observed 2.69%`). This
   is what lets future logs retune a threshold instead of guessing.
7. **Validate before calling it done:** run `node scripts/validate.js` (no
   args = every mechanic against every report folder under `sampledata/` —
   run it all, one pull's log usually exercises several mechanics; pass a
   mechanic name and/or report folder to narrow), and `npx tsc --noEmit`.

---

## Data-shape knowledge (read before designing any new check)

### Player position semantics (FFLogs)

**Never reimplement position lookup in a module.** The one shared
implementation is `findPlayerPosition` in `lib/mechanics/player-position.ts`
(used by forsaken, limitcut, stompies, and midnightfalls via thin wrappers
that document each module's tuned options: streams, nearest-vs-atOrBefore,
staleness window). The semantics below are what it encodes.

Every friendly-sourced FFLogs event stream carries position only for the
event's TARGET — never the source:

| Stream        | Position belongs to...          | Usable as "this player's own position"? |
|---------------|---------------------------------|------------------------------------------|
| `damageTaken` | the player (they're the target) | yes, always                              |
| `healing`     | the heal recipient              | only self-heals — see dual-check below   |
| `casts`       | the enemy being cast at         | never                                    |
| `damageDone`  | the enemy being hit             | never                                    |

- **The `healing` dual-check:** `PlayerInfo.healing` in the app is heals CAST
  BY the player (x/y = recipient), but the validation harness builds the
  stream the opposite way (heals RECEIVED). Position lookups must check both
  `target === player.name` and `source === player.name` so a self-heal is
  accepted under either orientation. This is `findPlayerPosition`'s
  `healing: "self"` default — the only exception is forsaken's grandfathered
  `healing: "all"`, which predates the dual-check and is preserved because
  its validated behavior was tuned with it; never use `"all"` in new code.
- **The one source-side exception:** querying `dataType: DamageTaken,
  hostilityType: Enemies` ("damage the boss took") returns the *attacking
  player's* own position. Wired end-to-end as
  `fflBuildPlayerPositionSamples` / `buildFFPlayerPositionSamples`. Density
  is ~GCD-frequency for active attackers but can be very sparse for healers
  (17 samples in a 13-min pull, observed) — always gate downstream use with
  a staleness/distance ceiling.

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
  mechanics: `node scripts/validate.js [mechanic ...] [reportDir ...]`
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
