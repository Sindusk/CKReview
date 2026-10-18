# Handoff: xivanalysis audit, phase 3 continued

For the next session working the FFXIV audit. Written 2026-10-18. The plan
is [../xiva-audit-plan.md](../xiva-audit-plan.md); each job's ledger is in
this folder, and [../open-items.md](../open-items.md) ("Plans in progress
or not started") has one line per job.

## Read first

1. CLAUDE.md: commit and push to `main` without asking once tsc and the
   scoped `validate.js --check` pass; the co-author trailer; one game at a
   time (`--game ff`); never deploy.
2. [../xiva-audit-plan.md](../xiva-audit-plan.md), phase 3: premise check,
   value every candidate as damage lost, the timeline cost, and the
   approval rule for `wrong` / `no-damage`.
3. [../dps-analysis.md](../dps-analysis.md), "Checking xivanalysis
   claims" and "Rule for adopting them".
4. The ledger of the job you're working on, and the header of its file in
   `lib/damage/ffxiv/jobs/` (the header is the authority for what the app
   checks; the ledger is the working list).

## Where it stands

- Phases 1 and 2 done for all 21 jobs (2026-10-15). Phase 3 is ongoing.
- 2026-10-18 built from weak parses (ff-rankings.js / ff-probe.js) four
  rules no sample had shown: Bard lone burst buff (`bardBuffMisaligned`),
  Dancer no partner and partner swaps (`dancePartnerLost`, with
  partnercalc's value model in `dnc-partner.ts`), Black Mage Manafont
  before Despair (in `despairSkipped`), Viper skipped coils
  (`viperCoils`). Samurai Ready overwrite proposed `wrong` (can't happen
  in 7.x).
- Crit and direct-hit rates now come from FFLogs DoT ticks
  (`tickHitRates` in `lib/damage/crit-rates.ts`) for samples fetched since
  2026-10-18; older ones need `fetch-ff-report.js <code> --fight N
  --refetch`.

## Candidates available now (build these)

Ordered by what needs only you. For each: premise check, value it as
damage lost (against what the player would have done instead), build it
in the job's file, sweep for false positives with
`node scripts/ff-findings.js <Job> "<label regex>"`, then update the ledger
row, its Open list, the job header and the open-items line together.

1. **ast/Macrocosmos/underuse** ([ast.md](ast.md)). Back to `candidate`
   on 2026-10-18: the user said it's an AoE, so on multi-target pulls it
   out-damages Fall Malefic and can't be `no-damage`. Value it per target
   count: what an unused Macrocosmos would have dealt (its hits by
   enemies hit, from the player's own casts on disk) minus the Fall
   Malefic it replaces. xivanalysis's own rule has a sign bug (its maximum
   adds invulnerable time; see the row). Decide with the numbers whether
   one target is a loss at all; if it isn't, judge only pulls with adds.
   App file: `lib/damage/ffxiv/jobs/healer.ts`.
2. **blm/RotationWatchdog/FirestarterUsage/suggestion-pre72**
   ([blm.md](blm.md)): before 7.2, Paradox then a hardcast Fire III
   instead of the Firestarter one. Minor. Needs pre-7.2 Black Mage pulls
   (7.0/7.1 ultimates and savage on disk: check `DamageGame.patchOf`).
   App file: `lib/damage/ffxiv/jobs/caster.ts` (the gauge simulation).
3. **core/ActionWindow/raid-buff-overwrite** ([core.md](core.md)): the
   same raid buff from two players of one job overlapping. A note column
   in xivanalysis, no suggestion; rare in a fixed static. The cost is the
   second buff's value lost to the overlap (party buffs of the same
   status don't stack). Check how often it happens on disk before
   building; if never, leave it a candidate with the count.
4. **core/BuffGroupWindow/failed-overlap** ([core.md](core.md)): only Bard
   uses it, and `bardBuffMisaligned` now covers it (brd.md). Mark it
   `covered` with that mapping; no build.

## Waiting on the user (don't start without them)

- **The approval review** of `wrong` / `no-damage` rows: 33 `wrong` and 62
  `no-damage` across the ledgers, plus the Samurai Ready overwrite
  (proposed 2026-10-18), and a proposal to mark
  `blm/Gauge/dropped-enochian` (pre-7.2) `unverifiable` rather than
  `wrong`. The user wants to go through them one by one in a later
  session: bring them one job at a time with the evidence (pull, MM:SS,
  numbers), per the plan.
- **xivanalysis pages** for the checks built 2026-10-18, so they can be
  matched: KzamJYNWgqx3TLdw fight 27 (Bard), J2xNa9WqfQKgrMFw fight 9
  (Dancer), ymbRNcMgaKqB86Zj fight 6 (Black Mage), cZ42C1y3JRNGXWLH (Viper,
  the Red Hot and Deep Blue kill). Pages go in `sampledata/damage-ff/`;
  read them with `.claude/skills/damage-analysis/tools/xiva-html.js`.
- **Dancer thresholds**, builder's choices not yet confirmed: the 5s
  swap grace after Closed Position is ready (`PARTNER_SWAP_GRACE_MS`) and
  the weaker-partner bar (20k and 20%, `PARTNER_CHOICE_*`), in
  `lib/damage/ffxiv/jobs/ranged.ts`.

## Tools

- `node scripts/ff-rankings.js "<encounter>" <Job>`: the weakest ranked
  parses, where mistakes happen.
- `node scripts/ff-probe.js <code> <fight> <Job> --buff X --casts Y`: a
  cheap look at one player (buff removals, cast times) before fetching.
- `node scripts/fetch-ff-report.js <code> --fight <id>`: fetch one pull;
  then `node scripts/validate.js --update sampledata/ff/<code>` gives the
  new report a baseline (`--check` reports "no baseline" otherwise).
- `node scripts/dump-player-events.js <code> "<boss>" <pull> "<player>"
  --from M:SS --to M:SS`: the event stream for verifying a finding.
- `node scripts/ff-findings.js <Job> "<regex>"`: the false-positive sweep.
- Damage findings have no `--check` baselines; `--check --game ff` guards
  mechanic detection only. The sweep is the damage check.
