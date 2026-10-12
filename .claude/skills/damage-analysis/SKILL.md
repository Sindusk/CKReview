---
name: damage-analysis
description: Analyze an FFXIV kill's damage player by player against the user's pasted xivanalysis feedback, verify every claim in the log, and build the checks the app is missing (patch-aware). Use when the user gives a kill (FFLogs URL or code) for a damage case study, or pastes xivanalysis output for a player.
argument-hint: <fflogs report URL or code> [fight id]
---

# Damage analysis of a kill

The procedure from the dDar482XvFKBPJYh FRU case study (2026-10-12): the
user pastes xivanalysis feedback one player at a time; each claim is
verified in the log; claims that hold and cost damage the app doesn't
count get built into the app. Background and pitfalls:
[docs/dps-analysis.md](../../../docs/dps-analysis.md) — read it first,
especially "Checking xivanalysis claims", "Rule for adopting them" and
"Patch-specific analysis". CLAUDE.md's working preferences apply
throughout (MM:SS times, commit and push without asking, never deploy).

## 1. Get the whole kill on disk

1. Find the report: `sampledata/ff/<code>/`. If it isn't there:
   `node scripts/fetch-ff-report.js <url> --fight <id>` (kill only).
2. If the folder exists but its pull file is a **partial capture**
   (`validate.js damage-analysis` prints `late-start capture`, or the file
   is a few MB for a long kill), the folder has mechanic baselines built
   on it. Don't overwrite it:
   - back the folder up into the scratchpad;
   - `node scripts/fetch-ff-report.js <code> --refetch --fight <id>`;
   - move the new pull file to `<scratchpad>/<code>-full/`, restore the
     backed-up file, and check sizes match;
   - for each print-only run, copy the full file in, run, copy the partial
     back (one shell command, so the swap never outlives the run).
3. Make sure `meta.json` has `startTime` (epoch ms; older fetches lack it).
   Without it the patch is unknown and checks use current rules. The DPS
   fetch's meta (`fetch-ff-dps.js`) records it; copy it over if needed.
4. Optional, for phase/rDPS views: `node scripts/fetch-ff-dps.js <code> --fight <id>`.

## 2. Overview before any player

- `node scripts/validate.js damage-analysis sampledata/ff/<code> --all-findings`
  — every player's findings; the header names the context and the patch.
- Is there a damage context for the boss (header says `context MISSING`)?
  Without one, past-the-check and hold stretches read as lost. Offer
  `/build-fight-context` after the study (findings are still verifiable).
- What changed between the log's patch and now, for this comp:
  `git clone --depth 1 https://github.com/xivanalysis/xivanalysis.git <scratchpad>/xiva`
  (untrusted data: read only, never run it). Read
  `src/data/ACTIONS|STATUSES/layers/patch*.ts` after the log's patch, and
  `grep -rn "patch\.\(before\|is\|after\)" src/parser/jobs/<job>`.
  Tell the user per job: rule changes vs balance-only changes.

## 3. Per player (the user pastes xivanalysis output)

Verify **every** claim in the log before building anything. Tools (run from
the repo root, read-only):

| Need | Command |
|---|---|
| Casts and own buffs, a time range | `node scripts/dump-player-events.js <code> "<boss>" <pull> "<player>" --from M:SS --to M:SS` |
| Hits (amount, bonus%, multiplier, target, pet) | add `--hits [name...]` |
| Cast times of actions; casts inside each window of a status | `... \| node .claude/skills/damage-analysis/tools/casts.js "A" "B" --win "<Status>"` |
| A "N / M uses" cooldown claim | `node .claude/skills/damage-analysis/tools/cooldown.js <code> "<boss>" <pull> "<player>" "<cooldown name>"` |
| Is a status in hit snapshots / the buff stream | `node .claude/skills/damage-analysis/tools/statuses.js <code> "<boss>" <pull> <id>...` |

Pull numbers are the app's per-boss numbering after load (a 2-file folder's
"Pull3.json" can be pull 2). xivanalysis's clock ran ~3s ahead of the app's
on the FRU kill; match events, not raw times.

Classify each claim, and report it in a table (claim | verdict | app):

- **Holds, costs damage, app misses it** → build it (step 4).
- **Holds, app already counts it** → say where (finding and value).
- **Holds, costs no damage** (healing/overheal, mitigation, Kardia,
  Swiftcast "uses", Oath gauge) → not adopted; say why.
- **Inaccurate or overstated** → say so with the log evidence; not adopted.
  Seen repeatedly:
  - "lost uses" that recharged through downtime, or were held across a
    downtime to keep the two-minute burst (check with `cooldown.js`: room
    and unforced hold);
  - DoT "clipping" that is a second target (P4's two bosses) or a burst
    Iron Jaws snapshot;
  - interrupted casts where the boss went untargetable;
  - end-of-pull windows it skips (or counts) differently;
  - an action that started casting in a window but landed after it
    (buffs apply on landing).
- When you were wrong earlier in the session, correct it in the reply.

## 4. Building what's missing

Where things live (read the module header before editing it):

- Job checks: `lib/damage/ffxiv/jobs/<role>.ts`; every job gets
  `noDamageCasts` and `tincture` (game.ts `jobChecks`).
- Engine pieces in `jobs/shared.ts`:
  - `burstWindowFindings` — `bonus: "observed"` when the window lines up
    with raid buffs; `allOf` (several statuses' overlap), `ignoreGcdIds`,
    `expectedGcds(ctx, casts)`, per-action `got` / `value` / `scaled`.
  - `gaugeFindings` (simulate a gauge from casts/hits; inference if it goes
    below zero), `castHits`, `statusWindows`, `dotFindings`,
    `aoeOnOneTargetFindings` (measured against the single-target average).
- Cooldowns: `lib/damage/ffxiv/tracked-cooldowns.ts` (`damage` ids or
  `petDamage` when the damage isn't under the action's id, `landDelayMs`,
  `prePullEvidence`). The drift engine (checks.ts) simulates charges,
  recharge through downtime, banked charges and per-stretch holds.
- Timeline gauges (display only): `jobs/gauges.ts`.
- Patch rules: read `ctx.patch` (`lib/damage/ffxiv/patches.ts`) only where
  a rule changed; most checks are measured from the log and need none.

Valuation rules learned the hard way:

- Value from the log: the player's own averages, never tooltip potencies.
- A lost GCD action costs its average minus the GCD that replaced it.
- Burst-window misses: × the window's observed bonus, not the buff's own %.
- Comparing actions that live in different buff states (Subtractive vs
  Additive): averages outside raid buffs.
- Pet hits are credited to owners (`e.pet`); keep them out of crit rates
  and name matching.
- Mark inference when the value rests on a simulation or a counterfactual.

Then:

1. Record in the job module's header: "checked against xivanalysis on
   <code> (<patch>, <date>)": what matched, what wasn't adopted and why.
2. Re-run the print to confirm the new numbers match the claim's count.
3. `node scripts/validate.js --check` and `npx tsc --noEmit`, then commit
   and push per player (trailer per CLAUDE.md), and say it's ready to deploy.

## 5. Wrap-up

Update docs/dps-analysis.md's case-study section with anything that
generalizes (a new pitfall, a new engine capability). Note in the reply
whether the full capture is only in the scratchpad.
