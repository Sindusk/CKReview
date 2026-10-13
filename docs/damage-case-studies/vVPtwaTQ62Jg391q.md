# Case study: vVPtwaTQ62Jg391q (FFXIV)

"Prepull Sorry - Week 7 Reclears", 2026-02-17, patch 7.4. AAC Heavyweight
Savage reclear: kills of Vamp Fatale (Pull 1), Red Hot and Deep Blue
(Pull 1), The Tyrant (Pull 4), Lindwurm (Pull 3), Lindwurm II (Pull 4),
plus 8 wipes on the last three. Started 2026-10-13; focus on the Dancer,
Chauzey Solstice, across every fight.

## Data on disk

- `sampledata/ff/vVPtwaTQ62Jg391q/` — all 13 pulls, full captures. No
  mechanic baselines. Damage context: Lindwurm only; Vamp Fatale, Red
  Hot and Deep Blue, The Tyrant and Lindwurm II are MISSING.
- Patch: 7.4 is xivanalysis's last rule layer, and its Dancer has no
  `patch.before/after` rules, so there are no patch differences.

## Done

- Overview of the Dancer's findings in every pull.
- Fixed: a Technical Finish window whose 20s runs past the end of the
  pull is skipped (cut by the kill or a wipe). Vamp Fatale's 8:11 window
  read 5/8 (242k) and Lindwurm II Pull 2's 2:14 read 1/8 (521k); across
  the other FF samples the change only removed wipe-cut windows.
- Checked in the log: Red Hot and Deep Blue 4:53 Double Standard Finish
  hit nothing (124k) while others were hitting a boss from 4:54: an early
  press, the finding stands.

- Tinctures (user, 2026-10-13): a pot takes a weave slot, so the
  placement search now only starts windows at a free one (tincture.ts
  `potSlots`). The Tyrant kill: 23k → 15k, suggestion 0:01, 4:53, 9:57.
  Across the FF samples, 11.3M → 10.4M of tincture findings; Dancer
  suggestions inside Technical Step 16 → 0.

- Healer DoT refreshes (user, 2026-10-13): only what pressing it one or
  more GCDs later would gain counts (shared.ts dotApplicationFindings).
  Sage, The Tyrant kill: 11 refreshes / 14.0s → 1 (the 0:25 re-dot in
  buffs with 8s left, 15k). AST Combust drops ~10-35% per pull.

- DoT refresh snapshots (user, 2026-10-13): the delay comparison also
  values the buffs each moment snapshots, read from the log (ticks carry
  their snapshot multiplier and buff ids). The Sage's 0:25 re-dot is on
  time (every delay loses 2-9k); the AST's Combusts under Damage Down
  (The Tyrant kill 5:02, +29k) and Weakness (9:00, +16k) are found, and
  so are Sage refreshes 2-3 GCDs before the 2-minute buffs on other
  reports (+27k snapshot, −12k Dosis III moved out of buffs).

## Next


- Tincture check, offered and not yet answered: drop moves whose only
  gain is filler in the same off-burst stretch (The Tyrant kill's 5:10 →
  4:53), and say why a move helps (pot ran past the kill, covers the end
  of Technical Finish).

- The user saves Chauzey's xivanalysis page for each kill into
  `sampledata/damage-ff/`; verify each claim per the skill.
- `/build-fight-context` for the four bosses without a context.
