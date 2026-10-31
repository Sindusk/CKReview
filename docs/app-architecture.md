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
- **Opening screen.** With no report loaded and no VOD added, page.tsx
  renders `components/OnboardingView.tsx` instead of the import toolbar
  and the panel grid: the one import field, Live log, and a Connect to
  Logs → Import Report → Review strip (step 1 checked when either
  provider's token is in localStorage). Import progress is the same
  `WCLImportBar`, passed in. Plan and remaining steps:
  [opening-screen-plan.md](opening-screen-plan.md).
- **Toolbar** (under the header, once the workspace shows): a three-track
  grid — report title and encounter (`ReportInfo`) | Damage / Mitigation
  / Strategy, centred | the log URL (`ReportLink`), whose hover tip holds
  API points, quota, live-log state and the sample-data flag. Before a
  report is loaded (a VOD added first) the left track is the import field.
  New Session is how you change reports.
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
- **Auth** (`lib/auth.ts`, `lib/usersDb.ts`): one account across every
  consistencykings.com app. The full design, security properties and how
  another app joins are in [shared-auth.md](shared-auth.md). They share the `app_user`/`session` users
  database and the parent-domain `ck_session` cookie, so data keyed by
  `app_user.id` (statics here, the portfolio in Stonks) follows the account.
  Every statics route checks the logged-in user (401) and static membership
  (403). Two ways in:
  - **Username + 4-digit PIN.** Signup (`/api/auth/signup`) is separate
    from login, and PIN attempts are throttled (`lib/login-throttle.ts`).
    Both are ported from Stonks.
  - **Google** (`lib/google-auth.ts`). This app hosts Google sign-in for
    every app on the domain: the others link to
    `/api/auth/google?return_to=<their page>`. While logged in, the same
    route *links* Google to the account, which is how a PIN account moves
    to Google and keeps its data. Account → Sign-in methods
    (`components/AccountDialog.tsx`) links or unlinks Google and turns the
    PIN off (only with Google linked) or back on.
  - Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
    (registered on the Google client). Behind nginx, add
    `proxy_set_header X-Real-IP $remote_addr;` so the throttle can count
    per address.

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

- **Three sources behind one `PlayerAdapter`** (seek, play, current time,
  duration): the YouTube iframe player, Twitch's embed player
  (`Vod.source === "twitch"`), and an HTML5 `<video>` for local files
  (`Vod.source === "local"`). The Add VOD dialog takes a YouTube or Twitch
  link in one field; `parseVodUrl()` in `lib/url-parsers.ts` tells them
  apart, and restoring a session does the same from the saved URL.
- **Twitch specifics.**
  - The embed only plays when the page's host is in its `parent` list
    (passed as `window.location.hostname`), and it needs HTTPS outside
    localhost.
  - **Swap quirk:** after `setVideo()`, `getVideo()` switches at once but
    `getDuration()` keeps the previous video's length for ~250ms, and
    setVideo's timestamp is ignored. `twitchSeekOnceReady()` waits for the
    length to change, `twitchSeekAndPlay()` re-checks that the seek
    landed, and the adapter reports duration 0 while a swap is pending so
    the wrong length isn't recorded.
  - Card titles show `twitch.tv/videos/ID`, because Twitch has no keyless
    title lookup. There are no transcripts.
  - Past broadcasts expire after 7–60 days, and subscriber-only VODs don't
    play in the embed. The dialog says so.
- **Local VODs never reach the server.** The file plays from an object URL
  held only in the tab, and `serverSavableVods()` in `app/page.tsx` drops
  them from the session payload. Route any new code that sends VODs
  anywhere through that function. Their calibration is remembered in
  `localStorage` instead (`lib/local-vod-sync.ts`), keyed on file name,
  size, `lastModified` and report, so re-picking the file restores sync.
- **One YouTube player while YouTube VODs are showing.** VOD switches reuse
  it via `loadVideoById()`; destroy-and-recreate was the multi-second
  delay. Selecting a local or Twitch VOD destroys it. Twitch VODs likewise
  share one Twitch player (`setVideo()`).
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

- **FFXIV and WoW,** behind a Video | Replay switch centred in the video
  panel's header (the header reads "Replay" while it shows; the replay is
  VideoPanel's `overlay`, drawn over the still-running player),
  styled after strategy-guide diagrams: the in-game map, job icons in
  role-coloured rings, FFLogs' Boss icon (`assets.rpglogs.com/img/ff/
  icons/Boss.png`, the CDN `lib/ability-icons.ts` already uses) with its
  hitbox ring and front notch, enemy AoEs as red shapes with light rims,
  and a cast bar. Hover shows name, strategy slot (`detectFFRoles`),
  coordinates and HP; click pins a hitbox ring. WoW is below.
- **WoW** (`lib/replay/wow-replay.ts`, `fetchWowReplayData` in
  `lib/wcl-client.ts`) builds the same `ReplayData`, so the panel, clock
  and roster bars are shared. Differences, all from what WCL provides:
  - one actor per event (`resourceActor`), 7 to 12 samples a second per
    player; enemy tracks are thinned to 5 a second
  - WCL's +y is north; the builder negates it so the panel stays
    north-up, and the hover card shows WCL's own numbers in yards. The
    axes were checked against Blizzard's UiMap bounds, the facing formula
    (same as FFLogs') against player casts and boss auto-attacks; the
    header has the numbers. A VOD check is still open.
  - map art: WCL's API names the fight's UiMap but has no art. The app's
    server builds it from Blizzard's tiles (`lib/wow-map-art.ts`, served
    by `/api/wow-map/<id>` and `/api/wow-map/<id>/image`). The first
    request per map downloads ~15 files from wago.tools; after that the
    map is read from `data/wow-maps/` (gitignored, since the art is
    Blizzard's). Raid maps are about 1px per yard, so it's soft at replay
    zoom. When it can't be built, the arena is blank. The rings and grid
    centre on the party's median position.
  - spec icons for players and WCL's own icon for enemies (ability icons
    from `assets.rpglogs.com/img/warcraft/abilities/`; there is no WoW
    Boss.png)
  - the roster's second bar is the primary resource, coloured by its
    power type
  - cast bars run from begincast to the matching cast (WCL gives no cast
    duration)
  - AoEs (`lib/replay/wow-shapes.ts`): circle radii from Blizzard's db2
    (`lib/replay/wow-spell-geometry.json`, built by
    `scripts/fetch-wow-spell-geometry.js` from wago.tools, which the
    browser can't call). Caster-centred spells sit on the caster; the
    rest are centred on the players they hit and show 1s before the hit,
    since the log has no telegraph. Per-boss tables cover what the data
    can't link (Vashnik's Plague Froth circle rides on its carrier; its
    expiry draws the four Plague Wave lanes). Room-wide spells (radius
    60y+) get a label top right instead of a circle, unless they land
    every few seconds (ambient damage). No cones, tethers or hitboxes yet:
    see [wow-replay-plan.md](wow-replay-plan.md).
- **One file per fight** (`lib/replay/fight-spec.ts`): everything a fight
  adds to the replay lives in its own spec beside its detection modules
  (`lib/mechanics/ffxiv/fru/replay.ts`, `lib/mechanics/wow/va/<boss>-replay.ts`)
  and its art in `components/replay-art/<fight>.tsx` (one `va.tsx` for the
  raid). Shape overrides, head markers, tethers, boss cues, floor and cage
  statuses, WoW debuff circles. A spec applies to a pull when its abilities
  show up in it (`lib/replay/fights.ts`). Every fight is registered in
  `fights.ts` and `components/replay-art/index.ts` already, so fights can be
  built in parallel without touching shared files. The `/build-replay`
  skill is the workflow.
- **AoE shapes come from game data, not per-boss models**
  (`lib/replay/action-shapes.ts`): XIVAPI's Action sheet gives CastType,
  EffectRange and XAxisModifier for every ability, so every enemy AoE is
  drawn at its real size from its cast, hit or miss. Cone angles and donut
  holes aren't in the data for new rows; they're estimated from who was
  hit. What the data gets wrong is fixed per ability in the fight spec's
  `overrides`, each with its evidence (Revolting Ruin 90° purple tankbuster; Blowout
  47771 deals no damage; towers without a "trap" omen are yellow).
  Targetless stacks cast by a parked helper are centred on the players
  they hit; a beam whose caster has no nearby sample starts where its hit
  says the caster stood.
  Per-ability options cover the rest: towers with their soaker count,
  stacks (orange), knockbacks (pale blue), lines through their caster,
  cones aimed behind or at the players hit, and origins taken from another
  cast's target or a Spell-in-Waiting's holder. Futures Rewritten has the
  most entries (Fall of Faith cones, the towers' Burnt Strike, the twin
  cleaves, Relativity's spells), checked on JZ1KXhDbqkNH3jxR fight 24.
- **Statuses** (FFXIV): the replay fetch also takes debuffs. Every status
  an enemy or the environment put on a player shows above their icon, like
  the game's party list (icon, seconds left, stacks), and is listed in the
  hover card. Up to five, with vulnerabilities and Weakness last. Tracks
  saved before 2026-10-17 have none: refetch them.
- **Boss cues** (the fight spec's `effects`, gathered by
  `lib/replay/ffxiv-effects.ts`; art in `components/replay-art/<fight>.tsx`,
  shared pieces in `components/ReplayEffects.tsx`): effects the game shows on a boss to say
  what's coming, drawn from the cast id. FRU's element dragon circles the
  caster in fire or lightning for the length of the cast bar: Cyclonic
  Break (pairs / spread), Utopian Sky (stacks / spread) and the clone's
  Turn of the Heavens (which halos explode). Turn of the Heavens' eight halos show as
  element rings at their Brightfire size from when they appear. FRU's Thin
  Ice frosts the whole arena while the party carries it, and moving players
  leave a short slide trail. Shown with the AoEs layer.
- **Line stacks:** the game's standard line-stack marker (525) on a
  caster or its target turns that actor's next rectangle within 12s into a
  line stack: orange chevrons along the beam, pointing back at the caster,
  from the marker until it fires, aimed where it hit.
- **Head markers** show as a label over the marked actor. The log gives
  only a number, so `buildHeadMarkers` names the ones the fight spec knows when
  the ability they announce follows. The label stays until that hit; an
  unknown marker reads "Marker <id>" for 5s.
- **Tethers** come from the API's `tether` events (fetched with the
  replay). The log marks only when one forms, so each lasts until its
  source's next cast on that player, capped at 15s. Tether ids with a known
  meaning (the spec's `tethers`: FRU's 249 fire, 287 lightning) draw in their
  element and end at the hit that resolves them. A parked clone at a
  tether's end sits where it logged a position during the tether: FRU's
  clones move from the south (Utopian Sky) to the north wall (Fall of Faith)
  with nothing logged between.
- **Jailed players** (FRU Floating Fetters, the spec's `jailStatuses`):
  the icon lifts off its spot, leaving a shadow, inside a
  cage for the status's 4s.
- **Layers menu:** AoEs, map, 5y rings, 5y grid (0,0 at the arena centre),
  helper actors, statuses and head markers (FFXIV), and an icon-size slider.
- **Roster HP / MP bars.** Once a pull's replay is loaded, each roster
  tile shows thin HP and MP bars for the replay's moment
  (`playerVitalsAt`; the replay reports its clock via `onTimeChange`, the
  VOD's timeline when the video view shows). They are vertical bars in
  their own side gutters, HP on the left edge and MP / power on the right,
  filling upward (user's pick, 2026-10-17). They add width, not height:
  the FFXIV roster is a fixed 300px, and taller tiles clipped its last row.
- **Hitboxes** are the game's: BNpcBase (FFLogs actor `gameID`) gives the
  model and Scale, ModelSkeleton the Radius; radius × scale.
- **Waymarks: not available yet.** FFLogs' API has no marker field or
  event. Tomestone shows them from its own copy of each log.
- **Facing:** players get a wedge, bosses the game's target ring (orange
  arc open at the back, front marker, side chevrons) at hitbox size, from
  geometry.ts's `facingToCompassBearing`. The replay's
  auto-attack check is what showed that helper returned the back until
  2026-10-17.
- **The replay always runs its own clock** (user, 2026-10-17: following
  the VOD made scrubbing lag behind the video's seeks). Opening Replay
  pauses the VOD (`pauseRequest`) and starts the replay at the VOD's time
  (`startTimeMs`); going back to Video seeks the VOD to the replay's time
  and plays it (`playRequest`) if the replay was playing. The page's
  timeline bar is hidden while a loaded replay shows. ReplayPanel still
  has a `syncedTimeMs` mode the page no longer uses.
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
- **Clock.** The panel has its own play/pause, speed and scrubber. The
  video stays mounted (hidden, paused) under the replay.

## Design sources

The severity icons and the banner/favicon were designed in Claude Design
projects owned by the user. Alternatives that were drawn but not used —
the "Claw Tally" icon set, other banner directions, and 400x400 avatar tiles
— live there. Ask the user for access before redrawing any of them.
