# Case study: pQN92wtfWMqCR3zj fight 2 (FFXIV)

P8S door boss (Hephaistos) kill, 54:19, solo, synced to level 90, patch
7.5 (report 2026-11-10); app Pull 1. One player: Dark Knight Chauzey
Solstice (the recorder). Started 2026-11-11 to tune the Dark Knight's
level-90 analysis; fight context deliberately ignored (user).

## Data on disk

- `sampledata/ff/pQN92wtfWMqCR3zj/` — the kill only (fight 2, full
  capture, 2.3MB). Fight 1 is a 42s wipe, not fetched. No mechanic
  baselines. Damage context for Hephaistos: MISSING (not wanted).
- combatantInfo: crit 1869, det 1237, DH / SkS / SpS 400 (the level-90
  base), so exactly 2.50s.
- xivanalysis page: `sampledata/damage-ff/Chauzey Solstice _ xivanalysis.html`
  (it has no level-90 rules: its Esteem text and Delirium rules are 100's).

## Done (DRK)

The verdicts are in lib/damage/ffxiv/jobs/drk.ts's header ("Level 90").
Built:
- Level detection: Endwalker savage and extreme fight names sync to 90
  (patches.ts); a pull where anyone pressed an action learned above the
  level reads as unsynced. Checked: none of the 576 synced pulls on disk
  trips that guard.
- Below 96 Delirium is three free Bloodspillers under status 1972, which
  the buff stream's filter doesn't fetch: windows from the casts, Blood
  and MP (+200 each) follow them. Before, the Blood simulation charged 50
  for every free one (went below zero) and the Delirium check was silent.
- Delirium drift valued at 90 (three Bloodspillers over the combo GCDs);
  the level-100 value is undefined there.
- Salted Earth drift: its ticks log under the status (1000749), so it was
  never valued at any level. Now 26k, one use (xivanalysis 35/36).
- Shadowbringer judged at 90 (`chargesFromLevel`: two charges from 90).
- Valuing Salted Earth exposed a drift-engine artefact on wipes: time
  lying dead to the end counted as ready time, so a cooldown back ~1s
  before downtime and a death read as a lost use (jN3XDrf2z8PmLgRJ Red
  Hot pull 42). checks.ts now ends such a stretch at the death; it also
  dropped two older sub-recast holds before a death (pull 35 Delirium
  211k, pull 19 Carve and Spit 45k). Compared before/after on four DRK
  folders (qjCMx4bRfgNKwX9T, 2T1HzdPKgbhM43am, 8hnVr24MtBqNvRAb,
  jN3XDrf2z8PmLgRJ): the rest of the delta is two real Salted Earth
  drifts.
- Dark Arts breaks by absorb total (25% of max HP), plus a narrow
  override for an absorb landing as the shield expired. xivanalysis's
  "31 Dark Arts lost" is its own miss (no remaining-shield field in this
  log); the real count is 0, and the app's one 28:33 overwrite was false.

## Next

- Buff stream filter (lib/damage/ffxiv/buff-stream.ts) fetches only the
  cap's statuses: below-cap statuses with other ids (DRK Delirium 1972)
  are never on disk. Cast-derived windows cover DRK; other jobs at
  synced levels may have the same gap (open).
- Other level-90 jobs need their own pass; this one only covers DRK.
