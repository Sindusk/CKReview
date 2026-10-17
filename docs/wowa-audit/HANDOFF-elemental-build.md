# Handoff: Elemental approval step, then Windwalker (WoWAnalyzer audit, phase 3)

For the session that continues the WoWAnalyzer audit. Updated 2026-10-17.

## Where it stands

Elemental's phase 3 build is done. Seven checks are in
`lib/damage/wow/specs/elemental.ts`, wired in from ranged.ts's
`"Elemental Shaman"` entry. The six from the measurements were built,
plus Overcharge overwritten, which turned up while checking the tier-set
row's `no-damage` proposal. The file's header holds each model, the
ledger rows ([shaman-elemental.md](shaman-elemental.md)) are `verified`,
and the open-items.md pointer is updated. All of it is committed and
pushed (last commit 4dcda4e).

What's left for Elemental:
- the user's answers on three `no-damage` rows (below);
- `Ascendance/window-spenders`: low value, not measured. Leave it unless
  a page and a log disagree with the cap check.

Then Windwalker.

## 1. Elemental: the open approval questions

These were asked on 2026-10-17 and are still unanswered. Ask again in
this form if the user hasn't replied, and don't re-measure first: the
evidence is below. An approved row gets "Approved by the user
YYYY-MM-DD." in its notes, and a row the user rejects goes back to
`candidate` (docs/wowa-audit-plan.md, phase 3).

1. **CallOfTheAncestors/other-checks** (what summoned each Ancestor,
   damage per Ancestor, a timeline; WoWAnalyzer always grades them
   "perfect"). What drives Ancestor damage is already checked: how many
   get summoned is Stormkeeper's drift check (`stormkeeper` in ranged.ts),
   and what the player does while they're out is `ancestorIdle` and
   `chainLightningOneTarget`. For scale, Elemeta on Vashnik Pull 3 had 23
   summons and the Ancestors did 21.8M. Proposed: `no-damage`.
2. **statistics** (display only): the Master of the Elements table,
   Stormkeeper damage, Aftershock refunds, Offering From Beyond, the
   Maelstrom and cooldown graphs. Its advice "no Flame Shock in
   Ascendance" is now `ascendanceNonOverload`. Its other advice,
   "Stormkeeper before Ascendance", is **not valued**. Every player,
   top seven included, presses Stormkeeper about 2s before Ascendance,
   and its two boosted casts are gone when Ascendance starts. Only
   Kullingen at 4:28 and Unlucky at 4:14 had it up at an Ascendance
   start (`_scratch/skasc.js`). Holding Stormkeeper for Ascendance would
   cost Stormkeeper uses (it comes back in under 60s, Ascendance every
   120s). Asked: approve `no-damage` for the display parts, and should
   that advice be measured separately or dropped?
3. **shaman-shared/utility** (Astral Shift, Earth Shield, Earth
   Elemental, Lightning Shield, Spiritwalker's Grace, …). The user's rule
   is that utility, defensives and movement aren't judged. Spiritwalker's
   Grace only matters for movement, which isn't counted, and none of
   these delays a damage cooldown. Proposed: `no-damage`.

If the user wants the Stormkeeper-before-Ascendance advice measured,
value it the same way as the rest: the boosted casts' extra damage
inside the window, against the Stormkeeper uses lost by holding it
(`spentCooldownDrift`'s model).

## 2. Then: Windwalker phase 3

12 candidates, ledger [monk-windwalker.md](monk-windwalker.md), case
study qpZx3mWaG7gcDdYB pull 3. Its `wrong` and `no-damage` rows from the
fan-out are proposals, so review them with the user as above. Follow
the same method as Elemental:
1. Talent check from CombatantInfo.
2. Value each candidate as damage lost, overloads, procs, pets and DoTs
   included.
3. Ask what it costs on the timeline.
4. Fetch top parses of the spec (ask the user for logs; fetch only the
   fight).
5. Build in order of value, committing after each check.

## Lessons from the Elemental build (apply them to Windwalker)

- **Ask the timeline question while building, not only while
  measuring.** It changed four of seven models:
  - Purging Flames pays back half a Voltaic Blaze in Ascendance;
  - Master of the Elements is taken by any next spell, so it's never
    wasted;
  - the Ancestors copy each player cast, so idle and Chain Lightning
    cost their copies too;
  - Overcharge, a "no-damage" tooltip, is a free spender.
- **Check what consumes a buff before valuing a rule about it.** List
  the casts at each removal, e.g. `_scratch/motewaste.js`.
- **Check what a proc changes:** the hit, the overloads, the resource
  cost, the pet. Overcharge doesn't change the hit at all, it zeroes the
  cost (`_scratch/ocov.js`).
- **Pet copies of a player's casts land at different lags per spell.**
  The Ancestors' Chain Lightning lands with the player's, their Lava
  Burst ~1s later, so a fixed window misses one of them.
- **An instant costs one GCD,** not the gap to the next cast: idle after
  it belongs to the gap check.
- **A fixed span can count overloads twice** when casts come ~1s apart.
  Attribute each overload to the latest cast on its target.
- **Hits taken carry x/y for WoW in the app** (`player.damageTaken`), so
  "standing only" rules can be checked.

## Tools (gitignored, `sampledata/wow/_scratch/`, read-only)

They load pulls through the app's transform, from an absolute path to
`scripts/lib/load-sample-pull.js` (edit the path if the repo moves).
Run them from the repo root.
- `ele-findings.js "<label regex>" code:Name,Name ...`: one check's
  findings with their moments, and a total per player. This is the
  quickest way to test a check change.
- `cota.js`, `mirror.js`: Ancestor damage while busy vs idle, and how
  long after the player's casts it lands.
- `pfcleave.js`: the Purging Flames cleave inside vs outside Ascendance.
- `motewaste.js`, `ocov.js`: which casts consume Master of the Elements,
  and what Overcharge changes on a spender.
- `skasc.js`: Stormkeeper vs Ascendance alignment (approval item 2).
- `ele-rules2.js`, `cl-vs-lb.js`: the original measurements (raw
  streams).

Sample data:
- Cocroach's 12 Elemental pulls in `gVDPhzp61Zm29HMw`;
- top parses `Vr8dLPtFYWA4G1yg` (Malegusxd), `baRCnPv62YQ1dJZN` (Fauni),
  `JvQpZk3CXj78Dx2f` (Kullingen, Spongêbob), `r9CX1kpRGLmKJH4M` (Elemeta,
  Unlucky) and `9w3bK4qhrRC82gVX` (Shaziggla).

The WoWAnalyzer pages are not on disk (`sampledata/damage-wow/` is
empty).

## Validate

- `node scripts/validate.js --check` scoped to the folders above, and
  `npx tsc --noEmit`. Damage findings aren't baselined, so `--check`
  only guards the mechanics.
- `node scripts/validate.js damage-analysis-wow sampledata/wow/<code>
  --all-findings` shows the findings in context.
