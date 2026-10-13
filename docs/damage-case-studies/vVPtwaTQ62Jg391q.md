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

## Next

- The user saves Chauzey's xivanalysis page for each kill into
  `sampledata/damage-ff/`; verify each claim per the skill.
- `/build-fight-context` for the four bosses without a context.
