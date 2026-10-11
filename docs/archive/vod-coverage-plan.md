# VOD coverage and re-sync points (build plan)

Status: **built 2026-10-11.** Archived as the design record; the live
description is [app-architecture.md](../app-architecture.md), "VOD
playback", and the header of `lib/vod-sync.ts`.

Decided during the build (user, 2026-10-11), beyond the plan below:
- **An unsynced VOD on screen is never swapped away from.** Picking a pull
  is how the user starts syncing it.
- **No coverage pauses and holds.** The player pauses and ignores seeks,
  and the timeline skips its auto-seek and pull detection, so the paused
  video can't select its own pull again and hide the card. Picking
  another pull or VOD lifts the hold.
- **A VOD picked by hand that doesn't cover the pull gets the same card**,
  naming the synced VODs that do, with buttons to switch. Nothing swaps,
  since the user chose that VOD.

Read first:
- [docs/app-architecture.md](../app-architecture.md), "VOD playback"
- the comments in `hooks/useTimelineController.ts` (the seek target is
  computed during render, and there's seek ping-pong protection)
- `components/VideoPanel.tsx` (the `seekOnceReady` YouTube quirk)

## Why

Each VOD stores **one** sync offset (`Vod.offset`). The app never knows
where a VOD's footage ends. Two problems follow (user, 2026-10-11):

1. **Split VODs.** A log can run 10+ hours while streams are split into
   about 5-hour parts, and players' POVs are jagged (one covers pulls
   1–10, another 5–15). Selecting a pull past a VOD's end seeks beyond
   it: the player clamps or jumps back to the start, and nothing tells
   the user the footage isn't there.
2. **Stream dropouts.** A connection cut can make a VOD skip about 20s,
   twice in a 3-hour VOD has been seen. Every pull after the skip then
   starts about 20s into the fight. FFXIV makes it obvious: a synced
   pull opens on the countdown's "Start"/"Engage" text. The only fix
   today is re-syncing, which breaks every pull before the skip.

## Decisions (user, 2026-10-11)

1. **Auto-swap on pull selection.** When the user picks a pull from the
   list that the current VOD doesn't cover, switch to a synced VOD that
   does, from any player.
2. **Every VOD is synced by hand, once,** as today. Never infer a sync.
3. **Unsynced VODs are never auto-swap candidates.**
4. **No coverage shows a clear error.**
5. **Playing past a VOD's end just stops.** No swap during natural
   playback; auto-swap happens only on a pull selection.
6. **Dropouts get a workaround:** re-sync from a later pull onward
   without breaking earlier pulls. The skip is never detected
   automatically.
7. **One pull per dropout may be off,** the one the skip happens in.
   That's accepted. Nothing works within a pull: no mid-pull sync, no
   gap-length entry. The goal is only that each pull starts when it
   starts in the video.

## The model

### 1. Sync points instead of one offset

A VOD gets an ordered list of **sync points** `{ fromTime, offset }`.
`fromTime` is in report seconds, the synced pull's `startTime`. Use
report time rather than a pull id, because live polling renumbers pulls.
- **The offset for a pull** is the last sync point with `fromTime ≤
  pull.startTime`, and the first point when none qualifies. One sync
  point behaves exactly like today's single offset.
- **The first sync** creates the first point (today's Sync button).
- **Re-sync from this pull** (new; shown while the VOD is synced) adds a
  point at the current pull's start. A point already at that `fromTime`
  is replaced. Pulls before it are untouched.
- **Unsync** clears every point, as today.
- **Video → report mapping** (auto pull-detection in `updateFromVideo`):
  sync point k covers video times from `fromTime_k + offset_k` up to
  the next point's start. Map a raw video time with the point whose
  video range contains it. The 2s/4s pending-seek guard stays as is.
- Keep `Vod.offset` / `isCalibrated` readable (offset = the first point's
  offset) so existing callers keep working. Callers that seek
  (`currentVideoTime`, `seekWithinPull`, `seekToPullStart`, the
  during-render auto-seek) switch to the per-pull offset via one helper,
  e.g. `offsetForPull(vod, pull)` in a new `lib/vod-sync.ts`.

### 2. Coverage

A VOD **covers a pull** when it's synced, its length is known, and the
pull's start maps inside the video: `0 ≤ pull.startTime +
offsetForPull ≤ durationSec`. A pull whose end runs past the video still
counts as covered; the user sees where it cuts off.
- **Length:** store `durationSec` on the VOD when the player first
  reports it (`getDuration() > 0`, already polled by `seekOnceReady`).
  Syncing requires playing the VOD, so every synced VOD has it.
- **Older sessions** whose synced VODs lack a length have unknown
  coverage. Treat "start maps at or after 0" as covered, and record the
  length the first time the VOD loads.

### 3. Auto-swap on pull selection

On a pull picked from the list (not auto-detected during playback, which
already follows the current VOD):
1. If the current VOD covers it, stay. That's today's behavior.
2. Otherwise pick a covering synced VOD: the same player first (their
   next part), then the order the VODs appear in the sidebar.
3. Swap through the existing VOD-switch path (one YouTube player,
   `loadVideoById`, `seekOnceReady`). It's a pull change, so the
   position resets to the pull start.
4. Show a brief, unobtrusive note on the video panel, e.g.
   "Switched to <player> part 2: <current VOD> doesn't reach pull 50",
   so the change isn't silent.

### 4. No coverage

When no synced VOD covers the selected pull, the video area shows a
clear card instead of a wrong frame:
- "No synced VOD covers pull 50 (2:41:10 into the log)."
- Each synced VOD's covered range, e.g. "Alice: pulls 1–40 · Bob: pulls
  5–15".
- Unsynced VODs that might cover it: "Carol's VOD isn't synced yet. Sync
  it to use it here."

The timeline, errors and analysis keep working without video.

**Sidebar:** each synced VOD card shows its covered pull range, e.g.
"Pulls 1–40". It's cheap, and it explains the swap before it happens.

### 5. Natural end

When a VOD plays to its end, it stops, as today. Make sure the
auto-detector can't push the selection to a pull past the VOD's end and
set off a swap. Selections from auto-detection never swap (section 3).

## Persistence

- **Server sessions** (`types/Session.ts` `SavedSessionVod`, `persistSession`
  and the restore path in `app/page.tsx`, around lines 379, 469 and
  1011): add `syncPoints?: { fromTime: number; offset: number }[]` and
  `durationSec?: number`. Keep writing `offset`, set to the first point's
  offset, so an older client still reads a session. On restore, use
  `syncPoints` when present, else build one point from `offset`.
- **Local files** (`lib/local-vod-sync.ts`): store the sync points and
  length in the same localStorage key. Still read the old plain-number
  format.
- Local VODs still never reach the server (`serverSavableVods`).

## UI changes

- The Sync button's area in `VideoPanel.tsx`:
  - unsynced: **Sync to pull** (unchanged)
  - synced: **Re-sync from this pull** beside **Unsync**. Its tooltip:
    "Fixes a skip in the video: this pull and later ones use the new
    sync; earlier pulls keep theirs."
- When a VOD has more than one sync point, the title bar shows a small
  marker listing them, e.g. "synced at pulls 1, 23, 51".
- The swap note and the no-coverage card (sections 3–4), plus the
  sidebar ranges.
- Inline styles; typecheck and stop. No visual verification loop unless
  the user asks (CLAUDE.md). A failed seek after a swap is the known
  YouTube quirk in app-architecture.md; check that before debugging
  React ordering.

## Build order

Commit after each step once `tsc` passes (no detection changes, so
`validate.js` is unaffected).

1. `lib/vod-sync.ts`: sync points, `offsetForPull`, video→report mapping,
   coverage. Switch the timeline controller to it. With one point,
   behavior is identical.
2. Persistence (server sessions and localStorage) with backward
   compatibility, plus recording `durationSec`.
3. Re-sync from this pull.
4. Auto-swap on pull selection, and the swap note.
5. The no-coverage card and sidebar ranges.
6. Docs: the app-architecture "VOD playback" section; archive this file.

## Not doing

- Detecting skips or desyncs automatically.
- Syncing within a pull, or entering a gap's length.
- Swapping VODs during natural playback.
- Inferring a part's sync from another part.
