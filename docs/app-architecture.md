# App Architecture Notes

This file holds cross-cutting knowledge about the Next.js app that doesn't
belong to any single file. Details that do belong to one file live in that
file's header comment. Mechanic detection has its own guide:
[lib/mechanics/README.md](../lib/mechanics/README.md).

## Data flow

1. **Import.** `app/page.tsx` fetches a report through `lib/wcl-client.ts`
   (WoW) or `lib/ffl-client.ts` (FFXIV). The alternative is loading it from
   local sample data (below).
2. **Transform.** `lib/log-transforms.ts` turns each fight into a `Pull`
   (`types/Pull.ts`): players, deaths, enemy casts, and the per-pull errors
   from every mechanic module.
3. **Cross-pull layer.** Some detection needs report-wide context or user
   configuration: Black Hole strategy, Terminate kick chains, crystal
   assignments, Graven Image and Wave Cannon. `page.tsx` recomputes it into
   a separate **`displayPulls`** memo.
   - **`pulls` never contains those cross-pull errors.** Anything that
     counts or persists errors must read `displayPulls`. Wiring the wrong
     one once silently zeroed out Minor counts in statics.

## Layout

- **The page never scrolls.** The root is `height: 100vh`, a flex column,
  and `overflow: hidden`. Every panel clips internally (`minHeight: 0`), so
  a page-level scrollbar is always a bug.
- **No CSS reset is active.** There is no `postcss.config.*` or
  `tailwind.config.*`, so the `@import "tailwindcss"` in `app/globals.css`
  is inert. Browser default styles still apply.
  - Example: the default 8px `body` margin once produced a permanent
    scrollbar that looked like an over-tall header. It is now zeroed
    explicitly.
  - Assume nothing is reset. Layout is styled with inline `style={{}}`
    objects.
- **Visual theme** (`app/theme.css`, `components/ui/Panel.tsx`). Inline
  styles can't do hover/focus or pseudo-element ornaments, so a small
  shared class layer holds those: tokens (`--ck-*`), the gilt `Panel`
  frame with SVG corner/diamond ornaments (`components/ui/ornaments/`,
  bundled through relative CSS `url()`s — `public/` is gitignored), and
  `.ck-btn`/`.ck-tab`/`.ck-card`/`.ck-tile`/`.ck-entry`/`.ck-stat`/
  `.ck-badge`.
  - Gold framing is for top-level panels only. Cards inside use neutral
    borders; selection and active tabs are arcane blue, never gold.
  - Every modal uses `components/ui/Dialog.tsx` (frame, title bar,
    footer, `Field` rows). Form dialogs omit `onBackdropClick` so a stray
    click can't discard input. Dropdown menus use `.ck-menu`/
    `.ck-menu-item`; data tables use `.ck-table`.
  - Per-instance colours (class, severity) go in through the inline
    `color` or the `--ck-accent` custom property.
  - The panel ornaments hang ~5px outside the frame, so a `Panel`'s parent
    must not clip. The `Panel` body does the clipping.
  - Fonts: Cinzel (`--font-cinzel`) for titles only; Inter
    (`--font-inter`) for everything else. Use `.ck-num` (tabular numbers)
    for timestamps and counts rather than `monospace`.
- **Header branding.** `components/BrandBanner.tsx` is a component, not an
  image. It lays out at 1500x150 and scales to fit.
  - The band stretches full width; only the artwork is scaled.
  - To make the artwork bigger, raise `ART_H`, not the header height
    (`HEADER_H` stays 80px).
  - `app/icon.svg` is the favicon.
  - `public/ckreviewv8.png` and `ckreviewv9.png` are dead assets.
- **The build needs network access to Google Fonts.** Cinzel is loaded via
  `next/font/google` in `app/layout.tsx`, and the font is fetched at build
  time. If the network is ever unavailable, self-host a woff2 under
  `public/`.
- **Severity colors.** `components/SeverityIcon.tsx` is the single source of
  the Death/Raid/Major/Minor icons and `SEVERITY_COLOR`. Import the
  constant; never hardcode a severity hex.
- **Layout decisions the user signed off on:**
  - **RosterPanel:** FFXIV uses a 2x4 grid paired by slot (MT/OT, H1/H2,
    M1/M2, R1/R2) with larger text, in a fixed 300px height. Don't shrink
    it: the player-detail drilldown reuses the same container.
  - **AnalysisPanel:** the Deaths/Raid/Major/Minor stat pills double as tab
    buttons. Duration is a plain `MM:SS` pill.

## Error counting and the raid cutoff

- **What the cutoff is.** `getPullRaidCutoff(pull)` (`lib/report-data.ts`)
  returns the pull's earliest Raid-severity error, whether detected or a
  manual Call Wipe.
- **Where it applies:**
  - The Report dialog, PullList and the statics dashboard drop Major/Minor
    errors after the cutoff.
  - The AnalysisPanel does **not**, so it can show more than the other
    views. That is by design: once the raid is wiping, players scramble to
    end the pull, and counting that would be unfair.
  - When a count looks wrong, check the cutoff and the denominator before
    hunting for an arithmetic bug.
- **The Report dialog is unreachable** since 2026-10-09: "View Report" was
  removed from the menu so player comparison lives only in Statics (user's
  constructive-use decision). `components/ReportDialog.tsx` is kept but
  not rendered; the notes below describe it.
- **Report dialog rates** (`computePlayerReportStats`) divide by the pulls
  that player actually played, not by every pull in the report. This keeps
  substitutes comparable with full-attendance raiders.
- **Known gap:** the MVP pedestal (`computePedestal`) still ranks by raw
  counts, so partial attendance still looks better there. The user hasn't
  asked for this to change yet.

## Statics (cross-report history for a raid group)

- **Schema** (`prisma/schema.prisma`):
  - `Static`, `StaticMember` (OWNER/MEMBER) and `StaticReview`.
  - `StaticReviewPull`, one row per pull.
  - `StaticReviewPullPlayerError`, one row per roster player per pull,
    **including 0/0 rows**, so the "pulls played" rates work for subs.
  - **Detail rows** (sessions with `StaticReview.detailVersion` set, i.e.
    imported or resynced after 2026-10-06): `StaticReviewPullError` (every
    error, cutoff errors flagged), `StaticReviewPullPhase` (phase
    segments), `StaticReviewPullMechanic`, the wipe cause on
    `StaticReviewPull`, and the `StaticRule` / `StaticPhase` lookups. They
    feed the mechanic and phase analysis
    ([static-player-analysis-plan.md](archive/static-player-analysis-plan.md)). The
    count rows above stay the source for the existing chart and Players
    panel.
- **Player identity.** A player's name can change between logs, so
  `StaticPlayerIdentity` and `StaticPlayerAlias` hold a canonical player per
  static. Aliases are auto-created at import time
  (`lib/static-player-identity.ts`), and a reviewer merges them by hand in
  the Players panel.
- **Import is client-side.** `computeStaticReviewPullData`
  (`lib/static-review-data.ts`) runs in the browser against `displayPulls`
  when the user clicks "Add Review To Static" / "Resync". The server has no
  WCL/FFLogs credentials, so:
  - **Detection changes do not reach existing statics until the user
    Resyncs.**
  - Hand-written pull summaries are preserved by `fightId`.
- **WoW statics hold Mythic raid pulls only.** `staticEligiblePulls`
  drops WoW pulls whose WCL `difficulty` isn't 5 (Mythic): Normal/Heroic
  raids and Mythic+ dungeons logged the same night never reach a static.
  The dialog says how many pulls it left out. Pulls from sessions saved
  before `Pull.difficulty` existed have no difficulty and are kept, so an
  old mixed log needs a fresh import before its Resync filters correctly.
  FFXIV pulls are not filtered.
- **Review sessions:**
  - **The review-session id is the identity of "one night's log".**
    `StaticReview` is unique on `(staticId, sessionId)`.
  - Re-pointing a session at a different report corrupts the static: it
    once wiped another night's pulls.
  - `startNewSessionIfDifferentLog()` in `page.tsx` drops the session when
    the report code changes, and the reviews POST returns 409 on a
    report-code mismatch. Session-adopting paths must set
    `sessionReportUrlRef.current` eagerly.
- **Data semantics:**
  - `errorRatePct` from `/api/statics/[staticId]/players` is **Majors per
    pull** (shown as "Errors / pull"). The panel's headline and default
    sort is `adjustedPerPull` ("Adjusted / pull",
    `computeAdjustedErrorRates` in `lib/static-analysis.ts`): Majors per
    pull adjusted for which mechanics the player was tested on, over
    detailed sessions only.
  - **Per-player exposure** (`lib/mechanics/rule-meta.ts` exposure,
    [archive/exposure-plan.md](archive/exposure-plan.md)): targeted and
    assigned mechanic instances store their responsible players
    (`StaticReviewPullMechanicPlayer`, detailVersion 2), so a player's
    chances are their own.
- **Assigned duties** (`lib/mechanics/assignments.ts`): detected across
  the loaded report and applied in `displayPulls` (a duty nobody did
  lands on its assignee or the absent group members). The Strategy
  dialog shows them first, with a picker whose override is saved in the
  session (`SavedSession.dutyOverrides`, per report).
  - `reportStartedAt` (the date the log was recorded) can only be captured
    client-side, so older reviews show "—" until they are resynced.
  - Sessions are ordered by `addedAt`.
- **Auth** (`lib/auth.ts`, `lib/usersDb.ts`): a username plus a 4-digit PIN.
  It shares an `app_user`/`session` users database and the `ck_session`
  cookie with a sibling app. Every statics route checks the logged-in user
  (401) and static membership (403).

## Import conveniences

- **Local sample data.** When a pasted report exists under `sampledata/`,
  `SampleDataFoundDialog` offers to load it instead of fetching live.
  - The existence check hits a **metadata-only** endpoint
    (`/api/sample-report/[source]/[code]/meta`). The full payload is fetched
    only on confirmation.
  - Loaded reports carry a "Local sample data" badge.
- **Live log polling.** An opt-in checkbox polls the report every 30s
  (`LIVE_POLL_INTERVAL_MS`) and appends new fights by `fightId`.
  - Pull numbers are recomputed with `renumberPullsByBoss`.
  - Polling pauses when the API's hourly quota is exhausted.
- **Bring-your-own API client** (`lib/log-auth.ts`,
  `components/LogApiSetupDialog.tsx`). There is no built-in client ID: API
  points are charged to the client's owner, so each user registers a public
  (PKCE) client on WarcraftLogs/FFLogs and pastes its ID in. The ID and
  tokens stay in the browser's localStorage. Redirect URIs are
  origin-relative (`/ckreview/callback`, `/ckreview/ffcallback`).
- **Auth token refresh.** Both GraphQL runners retry once on a 401 after
  refreshing the access token. If that fails, they clear the session so the
  menu offers "Connect" again.

## VOD playback (`components/VideoPanel.tsx`, `hooks/useTimelineController.ts`)

- **Two sources behind one `PlayerAdapter`** (seek, play, current time,
  duration): the YouTube iframe player, and an HTML5 `<video>` for local
  files (`Vod.source === "local"`).
- **Local VODs never reach the server.** The file plays from an object URL
  held only in the tab, and `serverSavableVods()` in `app/page.tsx` drops
  them from the session payload. Route any new code that sends VODs
  anywhere through that function. Their calibration is remembered in
  `localStorage` instead (`lib/local-vod-sync.ts`), keyed on file name,
  size, `lastModified` and report, so re-picking the file restores sync.
- **One YouTube player while YouTube VODs are showing.** VOD switches reuse
  it via `loadVideoById()`; destroy-and-recreate was the multi-second
  delay. Selecting a local VOD destroys it.
- **YouTube API quirk:** a `seekTo()` right after `loadVideoById()` is
  silently dropped until metadata loads, and `onStateChange` fires too
  early to rely on. `seekOnceReady()` polls `getDuration() > 0` first.
  **Check this before debugging React ordering** when a seek "doesn't take".
- **Auto-seek target.** It is computed during render, not in an effect,
  because VideoPanel's effects run before the hook's.
- **Switching VOD vs switching pull.** Switching VOD mid-pull keeps the
  position; changing pull resets it.
- **Auto pull-detection.** It ignores readings until the player lands
  within 2s of a manual seek (or 4s pass), which prevents seek ping-pong.
- **Sync points, not one offset** (`lib/vod-sync.ts`; design record in
  [archive/vod-coverage-plan.md](archive/vod-coverage-plan.md)). A VOD
  holds `{ fromTime, offset }` points, with `fromTime` in report seconds,
  because live polling renumbers pulls.
  - A pull uses the last point at or before its start, or the first point
    when none qualifies.
  - "Re-sync from this pull" (beside Unsync) adds a point. It exists for
    stream dropouts that skip ~20s of video. The pull the skip happens in
    may stay off.
  - Every report↔video conversion must go through the helpers there.
    `Vod.offset` and `isCalibrated` are derived (first point / any point)
    and kept in step by `withSyncPoints()`.
  - Persistence: sessions save `syncPoints` and `durationSec`, and still
    write `offset` for older clients. Local files keep the same as JSON in
    their localStorage entry, which still reads the old plain-number
    format.
- **Coverage.** A synced VOD covers a pull when the pull's start maps into
  `0..durationSec`. The length is recorded from VideoPanel's playback loop
  the first time the player reports it; until then only the start is
  checked.
  - **Picking a pull from the list** (`handleSelectPullFromList`, never
    auto-detection) swaps to a covering synced VOD: the same player
    first, then sidebar order. A brief note on the video says why. An
    unsynced VOD on screen is never swapped away from.
  - **No coverage, or a hand-picked VOD that doesn't cover the pull,**
    shows a card instead of the video. The timeline gets `hold`: no
    auto-seek and no detection. VideoPanel pauses, ignores seeks, and
    never starts playback in its async ready paths. Without the hold, the
    paused video's own pull would be auto-detected and hide the card.
  - Natural playback past a VOD's end just stops.
  - The sidebar's VOD cards show each synced VOD's covered pulls.
- **VOD card titles.** They come from YouTube's keyless `oembed` endpoint
  and are cached in memory. Local VODs show the file name and have no
  transcript button.
- **Transcripts** (`app/api/transcript/[videoId]/route.ts`) use the keyless
  youtube-transcript.ai service, because official and scraped YouTube
  caption routes need owner OAuth or a PoToken.
  - **Live-stream auto-captions repeat themselves.** Collapse immediately
    repeated word runs.
  - **Decode HTML entities** in the returned text.

## Top-down replay (`components/ReplayPanel.tsx`, `lib/replay/ffxiv-replay.ts`)

- **FFXIV only,** behind a Video | Replay toggle in the center panel:
  player and boss dots on the fight's in-game map, yalm rings, a cast bar
  for enemy casts in progress, a ring on each player an enemy hit, and AoE
  overlays (`lib/replay/dancing-mad-overlays.ts`). No WoW yet.
- **AoE overlays draw only verified geometry.** The Dancing Mad modules
  pin origins (tower spawns, Limit Cut clones, black holes, Flood edge),
  almost never sizes, because detection counts who was hit. A shape whose
  size nobody measured is dashed. Add a mechanic there with its source
  module cited, the same way.
- **Facing:** players get a wedge, bosses a wedge and a front arc, from
  geometry.ts's `facingToCompassBearing`. The replay's auto-attack check
  is what showed that helper returned the back until 2026-10-17.
- **Play/pause with a synced VOD** drives the hidden video through
  VideoPanel's `playRequest` / `pauseRequest` tokens.
- **Map art** comes from FFLogs' `fights.maps` + `gameData.map` (filename,
  sizeFactor, offsets). The browser loads the texture from XIVAPI v2
  (`v2.xivapi.com/api/asset/map/<id>/<index>`), not from FFLogs' CDN. The
  pixel formula is in `ffxiv-replay.ts`.
- **Its own fetch, on click only.** The pull's normal streams keep too few
  positions, so Load replay pages `dataType: All, includeResources: true`
  for that one fight (`fetchFFReplayData`). Tracks are cached per pull for
  the session. Positions arrive about 1 to 2 per player per second and stop
  for 25 to 35s at phase transitions; the module header explains the
  interpolation.
- **Clock.** With a synced VOD the replay follows the video, and its
  scrubber seeks the video. The video stays mounted (hidden) under the
  replay so its clock keeps running. Without a VOD the panel has its own
  play/pause and speed.

## Design sources

The severity icons and the banner/favicon were designed in Claude Design
projects owned by the user. Alternatives that were drawn but not used —
the "Claw Tally" icon set, other banner directions, and 400x400 avatar tiles
— live there. Ask the user for access before redrawing any of them.
