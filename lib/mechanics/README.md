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

---

## The working method for building a new detection

This process has produced every module here. In order:

1. **Get ground truth first.** A fail log plus a plain-language description
   of what actually happened and who should be flagged ("X was assigned #8
   and was out of position; only X should flag").
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
7. **Validate before calling it done:** run the module's
   `node scripts/validate-<mechanic>.js` (no arg = every report folder under
   `sampledata/`), run the *other* harnesses too (one pull's log usually
   exercises several mechanics), and `npx tsc --noEmit`.

---

## Data-shape knowledge (read before designing any new check)

### Player position semantics (FFLogs)

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
  accepted under either orientation. `limitcut.ts`'s `findOwnPositionNear`
  established the pattern; reuse it.
- **The one source-side exception:** querying `dataType: DamageTaken,
  hostilityType: Enemies` ("damage the boss took") returns the *attacking
  player's* own position. Wired end-to-end as
  `fflBuildPlayerPositionSamples` / `buildFFPlayerPositionSamples`. Density
  is ~GCD-frequency for active attackers but can be very sparse for healers
  (17 samples in a 13-min pull, observed) — always gate downstream use with
  a staleness/distance ceiling.

### Coordinates and timestamps

- Positions are **centi-yalms**; Dancing Mad arena center is (10000, 10000).
  Known radii: Forsaken tower ring r=800, Limit Cut bait slots r≈1880,
  Limit Cut clone spawns r=2000.
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
- Every `scripts/validate-<mechanic>.js` harness auto-discovers all report
  folders (any subdirectory containing `meta.json`) and rebuilds
  `PlayerInfo[]`/`DeathEvent[]`/etc. the same way the live pipeline does,
  via `scripts/lib/{load-report-folder,build-ff-players,require-ts}.js`.
- **Regression bar for any mechanic change:** all harnesses run with zero
  crashes/warnings across every sample report, `npx tsc --noEmit` clean, and
  manually sanity-check the printed errors for anything touched. (A verified
  expected-output baseline per report is planned but does not exist yet —
  until it does, the harness output IS the review surface.)
