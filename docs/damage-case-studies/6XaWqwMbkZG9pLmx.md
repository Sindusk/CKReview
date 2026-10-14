# Case study: 6XaWqwMbkZG9pLmx (FFXIV)

AAC Heavyweight, Vamp Fatale kill (fight 1, the app's Pull 1, 8:36), report
started 2026-03-19, patch 7.4. Started 2026-10-13 from the Bard's
perspective (Apollo Tomyris); no xivanalysis page yet.

## Data on disk

- `sampledata/ff/6XaWqwMbkZG9pLmx/` — the kill only, full capture;
  mechanic baseline created 2026-10-13.

## Done

- **Bard, Stormbite after Caustic Bite at 1:58 (user).** Both DoTs came off
  with Coffinmaker's death (1:58.4); the boss was hittable from 1:59.2.
  Caustic Bite landed 2.9s later, Stormbite a GCD after it (5.0s), read as
  a 6k "Stormbite wasn't on the boss" finding. One of the two always has to
  wait a GCD. Fixed in the engine: `DotSpec.pairedIds` (shared.ts) adds a
  GCD of grace per paired DoT freshly applied first in the gap.
- **Damage context built** (`vamp-fatale-damage-context.ts`): one phase,
  110.59M fixed pool deciding the enrage (Finale Fatale ~10:05), boss at
  1 HP forced. Coffinmaker and the adds count (Coffinmaker died by damage
  at 1:58 on both kills; the boss returns then). Bard 427k → 413k lost.

## Bard findings still standing (not yet checked against xivanalysis)

- Iron Jaws on Coffinmaker at 1:51 (died 1:58, 18k) and DoTs on the
  Doornails / Charnel Cell that die within ~12s (5-12k each).
- 0:56 Iron Jaws refresh just before the boss went untargetable (8k).
- Hawk's Eye overwrites ×6, Barrage expired at 8:28, burst windows 7/8.

## Next

- If the user saves the Bard's xivanalysis page into
  `sampledata/damage-ff/`, verify its claims per the skill.
