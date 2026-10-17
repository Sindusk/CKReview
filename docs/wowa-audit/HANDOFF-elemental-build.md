# Handoff: build Elemental's measured checks (WoWAnalyzer audit, phase 3)

**Status 2026-10-17:** all six checks are built (`lib/damage/wow/specs/elemental.ts`),
plus a seventh found in the approval step (Overcharge overwritten). Left:
the user's answers on the three remaining `no-damage` rows (Call of the
Ancestors other checks, statistics, shaman utility), then Windwalker.

For the session that continues the WoWAnalyzer audit. Written 2026-10-16.
Phases 1–2 are done for every spec, and Elemental's phase 3 measurements
are done. None of Elemental's six candidates is built yet. This session
builds them, then brings Elemental's remaining `no-damage` rows to the
user for approval. Windwalker phase 3 comes after.

## Read first

1. [../wowa-audit-plan.md](../wowa-audit-plan.md), phase 3. Three rules
   added on 2026-10-16 that this session must follow:
   - value every candidate as damage lost first;
   - ask what an action costs later on the timeline;
   - `wrong` and `no-damage` need the user's approval, with evidence,
     before a row is marked.
2. [shaman-elemental.md](shaman-elemental.md), **in full**. Each
   candidate row holds its measurement and how to value it. The
   "Candidates left" list orders them by value.
3. The `/damage-analysis` skill: step 4, "Building what's missing", and
   the WoW section. These say where checks live and how they're valued.
   The skill's verifying step now asks the timeline question.
4. The headers of `lib/damage/wow/specs/ranged.ts` (the Elemental entry:
   Ascendance window, Maelstrom cap, Flame Shock uptime, `stormkeeper`)
   and `lib/damage/wow/specs/shared.ts` (`burstGcdFindings`,
   `spentCooldownDrift`, `dotUptimeFindings`), plus `lib/damage/checks.ts`.
5. [../dev-tooling.md](../dev-tooling.md), "Damage analysis (WoW)": the
   no-UI runner and reference compare.

## What to build, in order

All numbers come from the pulls on disk (list below). Spell ids come
from r9CX1kpRGLmKJH4M's `masterData` (WCL), not WoWAnalyzer. Confirm
each id in the log before using it, and comment its source log.

1. **Non-overload casts in Ascendance** (largest). These are casts
   inside the Ascendance buff (1219480; the log also names 114050 and
   114052) of spells with no "… Overload" ability: Flame Shock, Frost
   Shock, Voltaic Blaze. Leave out Stormkeeper (it's the drift check's).
   - Such a cast is moved, not lost. Value it as (the window's rate for
     overloading casts − the player's Lightning Bolt rate outside the
     window) × the cast's GCD. Measured: 246–477k/s vs 62–107k/s, so
     130–590k a cast.
   - Timeline: Voltaic Blaze recharges in ~7.5s (shortest interval;
     medians 9–17s). When the player casts it on recharge, holding it
     through the window costs a use: subtract a Voltaic Blaze's value
     less a Lightning Bolt.
   - Decide with evidence whether a 2+ target Voltaic Blaze is excused,
     as WoWAnalyzer excuses it. Two-target casts still measured as
     losses before netting.
2. **Lava Burst without Flame Shock.** A non-crit Lava Burst (51505,
   285452, 447419) on a target without the player's own Flame Shock
   (188389, 470411). Read the debuff from enemy debuff events, by target
   and instance.
   - Every shocked Lava Burst crit (1,487 of 1,487).
   - Value: the player's shocked Lava Burst average, overloads included
     (77451, 285466), less the hit. About 120k each.
   - Excuse an add that dies within a few seconds: a Flame Shock first
     would cost a GCD it can't pay back.
3. **Idle in a Call of the Ancestors window.** The window is the Call of
   the Ancestors buff on the player (445624, 447244); the pet is named
   "Ancestor". Ancestors did 58.4k/s while the player cast and 25.7k/s
   while idle (top seven, 85s of idle).
   - Measure per player before building, and exclude forced time (the
     boss out of reach stops the Ancestors too).
   - Build it as a premium on idle inside the window, the way
     `burstGcdFindings` handles Ascendance, not as WoWAnalyzer's
     active-time grade.
4. **Spender without Master of the Elements while Lava Surge is up.**
   The buffs are Master of the Elements (260734) and Lava Surge (77762),
   checked outside Ascendance. Spenders: Elemental Blast (117014, 465717)
   and Earthquake (61882, 77478, 77505, 462620); Earthquake consumes the
   buff too.
   - The bonus measured ×1.065 on non-crit Elemental Blast hits, pooled.
   - Exception to measure: a Lava Burst first would have capped
     Maelstrom (Maelstrom is on cast events).
   - Low value; top players lose more here than Cocroach.
5. **One-target Chain Lightning** (188443, 195897, 447425; overloads
   45297, 218558). Value each cast against the player's own Lightning
   Bolt (188196, 214815; overloads 45284, 214816), overloads included.
   About 35k each.
6. **Early Flame Shock refresh** (lowest). Duration 18s, 30% pandemic
   carry. Charge the clipped share of a GCD (clipped seconds ÷ 18 × (a
   Lightning Bolt − the Flame Shock hit)), standing only. Charge the
   whole GCD for a refresh that was never needed (the target died or the
   fight ended before the old DoT ran out). Refreshes from Voltaic Blaze
   are free.

Before building, check that every aura above reaches the app. The WoW
fetch filters auras (`lib/damage/wow/buff-stream.ts` follows
`spell-data.ts`), so a check can be blind to a buff that the raw sample
file has. The measuring scripts read the raw streams.

## Data on disk

`sampledata/wow/`:
- Cocroach's 12 Elemental pulls of gVDPhzp61Zm29HMw (he played
  Enhancement on the other pulls);
- top parses: Vr8dLPtFYWA4G1yg (Malegusxd), baRCnPv62YQ1dJZN (Fauni),
  JvQpZk3CXj78Dx2f (Kullingen, Spongêbob), r9CX1kpRGLmKJH4M (Elemeta,
  Unlucky), 9w3bK4qhrRC82gVX (Shaziggla).

The measuring scripts are kept locally, gitignored, in
`sampledata/wow/_scratch/`. Run them from `sampledata/wow`; read-only:

```
node _scratch/ele-rules2.js . "Vr8dLPtFYWA4G1yg:Malegusxd" "baRCnPv62YQ1dJZN:Fauni" "JvQpZk3CXj78Dx2f:Kullingen,Spongêbob" "r9CX1kpRGLmKJH4M:Elemeta,Unlucky" "9w3bK4qhrRC82gVX:Shaziggla" "gVDPhzp61Zm29HMw:Cocroach"
node _scratch/cl-vs-lb.js r9CX1kpRGLmKJH4M/meta.json "r9CX1kpRGLmKJH4M/Vashnik the Malignant_Pull3.json" 25 20
```

Each built check should reproduce its script's numbers on these pulls.

## Validate and commit

- `node scripts/validate.js damage-analysis-wow sampledata/wow/<code>
  --all-findings` on each folder above: the new findings, with their
  basis.
- `node scripts/validate.js damage-compare-wow` against the top-parse
  folders: a check that fires on a top player must be a real loss there
  too (it often is, see the ledger).
- `node scripts/validate.js --check --game wow`, scoped to these folders
  where possible, and `npx tsc --noEmit`. For an intended change,
  confirm the diff is exactly the new findings, then `--update`.
- Commit and push after each check works, per CLAUDE.md. Update the
  Elemental row (status `verified` once a check matches its measurement
  on disk), the ranged.ts header and the open-items.md pointer together.

## Then: the approval step

Elemental has no `wrong` rows left. Its `no-damage` rows need the user's
approval before they stand:
- Call of the Ancestors other checks;
- the season 2 tier set (Overcharge);
- statistics;
- shaman utility.

Check each one first, including the timeline question. Then bring the
user one numbered item per row with the evidence, and add "Approved by
the user YYYY-MM-DD." only after they agree.

## After Elemental

Windwalker phase 3 (12 candidates, case study qpZx3mWaG7gcDdYB pull 3),
with the same method. Its `wrong` and `no-damage` rows from the fan-out
are proposals; review them with the user as above.
