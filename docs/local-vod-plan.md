# Local VOD Files Plan

Let a user load a video file from their own disk as a VOD source,
alongside YouTube VODs. The file is played in the browser and **never
leaves the user's machine**: no upload, nothing stored on the server, gone
when the tab closes. Agreed with the user on 2026-10-06; this doc is the
build brief. **Status:** all six items built 2026-10-06; the user
confirmed item 6 (remembered sync, `lib/local-vod-sync.ts`).

## Why

Some players don't put their recordings on YouTube. Today the only VOD
source is a YouTube URL, so their recordings can't be reviewed alongside
the log.

## Requirements (settled with the user)

1. **Session-only.** A local VOD exists only in the current tab. After a
   refresh the user picks the file again.
2. **Nothing reaches the server.** Not the file, and not a placeholder
   entry. Local VODs are left out of saved sessions entirely.
3. **YouTube VODs keep working exactly as today.**

**Recommended defaults the user hasn't confirmed yet. Ask them before
building these:**
- **Remember sync in the browser:** store a local VOD's calibration
  offset in `localStorage`, keyed on file name + size + `lastModified`
  (plus the report code). Re-picking the same file restores its sync. This
  stays on the user's machine, so it doesn't break requirement 2.

## How it works

`<input type="file" accept="video/*">` → `URL.createObjectURL(file)` → a
`<video>` element's `src`. The browser streams from disk as it plays, so
multi-GB recordings are fine and nothing is copied into memory or sent
anywhere. Call `URL.revokeObjectURL` when the VOD is removed or the page
unmounts.

## Changes

### 1. Player interface (`components/VideoPanel.tsx`)

The component is written against YouTube's iframe API (`YTPlayer`:
`seekTo`, `playVideo`, `getCurrentTime`, `getDuration`, `loadVideoById`,
`destroy`). The rest of the panel only needs to seek, play, read the
current time and switch videos.
- Introduce a small player interface covering those operations, with two
  implementations: the existing YouTube one, and an HTML5 `<video>` one
  (`video.currentTime = t`, `video.play()`, `video.currentTime`,
  `video.duration`; switching = changing `src`).
- Keep the existing behaviour intact:
  - the one-shot seek on `seekRequest` (its header explains the
    "play, backtrack, play again" stutter it avoids)
  - the 200ms `onCurrentTimeChange` polling loop
  - the Unsync button
- **The browser's own controls** (`<video controls>`) are fine for local
  files.
- **Unplayable files:** listen for the `<video>` `error` event and show a
  plain message in the panel: the browser can't play this file; in OBS,
  record as MP4 (or Hybrid MP4) or use File → Remux Recordings.
  - MP4 with H.264, and WebM, play in every browser.
  - MKV (OBS's old default) plays in Chrome and Edge, not Firefox or
    Safari.
  - HEVC and AV1 depend on the user's hardware and OS.

### 2. The VOD type (`types/Vod.ts`)

`videoId` and `embedUrl` assume YouTube. Add a source kind:
- `source: "youtube" | "local"` (default `youtube` where absent, so
  restored sessions are unaffected)
- for local: the object URL and the file's name, size and `lastModified`,
  held in memory only
- `url`, `videoId` and `embedUrl` are empty or unused for local VODs. Check
  every reader of these fields (`app/page.tsx` builds them from
  `lib/url-parsers.ts`).

### 3. Adding a VOD (`components/AddVodDialog.tsx`)

Add a "Local file" choice next to the YouTube URL field, with a file
picker. The player name field stays the same for both. On add,
`app/page.tsx` creates the VOD with `source: "local"` and its object URL.

### 4. The sidebar (`components/VODSidebar.tsx`)

- Show the file name where YouTube VODs show their oEmbed title, and skip
  the oEmbed fetch for local VODs.
- **Hide the transcript button** for local VODs: transcripts come from
  YouTube (`app/api/transcript/[videoId]`).
- Mark local VODs visibly (for example a "Local" badge, with a tooltip
  saying it's only on this device and needs re-picking after a refresh).

### 5. Keeping local VODs off the server (`app/page.tsx`)

`persistSession` (around line 333) maps `vodsRef.current` into the
payload sent to `app/api/sessions`. **Filter out every `source: "local"`
VOD there.** That's the single point where a local VOD could reach the
server, so put the filter in one clearly named place and comment why.
- If the only VODs are local, the existing "nothing worth saving" check
  should still hold (`!payload.reportUrl && payload.vods.length === 0`).
- Search for any other code that sends VODs anywhere (statics import,
  share links) and apply the same filter.
- Session restore (`app/page.tsx` around lines 418 and 900) never sees
  local VODs, so it needs no change beyond defaulting `source`.

### 6. Remembered sync (if the user confirms the default above)

On calibrate or unsync of a local VOD, write or clear its offset in
`localStorage` under a key built from file name + size + `lastModified`
(and the report code). When a local file is added, look the key up and
restore `offset` / `isCalibrated`. Wrap every storage access in
try/catch: storage can be unavailable (private windows), and the feature
must work without it.

## Out of scope

- **Re-opening the file after a refresh without picking it again.**
  Chrome and Edge allow this through the File System Access API (a file
  handle kept in IndexedDB, one permission click). Firefox and Safari
  don't support it. Possible later convenience.
- Sharing a local VOD with other viewers. It's on one person's machine by
  design; anyone else opening the session sees only the YouTube VODs.

## Verify

- `npx tsc --noEmit`.
- **Manual checks**, since this is UI:
  - Add an MP4 and confirm seeking from a pull or an error works and the
    current-time sync drives the timeline.
  - Calibrate, refresh, re-pick the same file: the sync is restored (if
    item 6 is built).
  - Confirm the saved session contains no local VOD: inspect the
    `app/api/sessions` request payload in the browser's network tab.
  - Try an MKV in Firefox and confirm the error message shows.
  - YouTube VODs behave as before.
- The user reviews the UI. Per CLAUDE.md, don't run a visual verification
  loop for small tweaks.
