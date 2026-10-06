# Dev Tooling

Scripts, local data, verification and deployment. For the mechanic
validation harness (`scripts/validate.js`, `expectations/`), see
[lib/mechanics/README.md](../lib/mechanics/README.md#sample-data--validation).

## Fetching sample data

- **Fetch command:** `node scripts/fetch-wow-report.js <code-or-URL> [--boss "<name>"] [--fight <id>]... [--refetch]`
  (or `fetch-ff-report.js`).
- **Output:** writes `sampledata/{wow,ff}/<code>/meta.json` plus one
  `<Boss>_Pull<N>.json` per fight. Pull numbers match the app's per-boss
  numbering. A pasted full URL works.
- **Kills first, resumable, rate-limit tolerant** (`scripts/lib/fetch-plan.js`):
  - Kills download before wipes, so a rate limit never costs the clean
    baseline. Only the order changes; file names still use the real
    per-boss pull number (a last-pull kill is still `<Boss>_Pull25.json`).
  - Pulls already on disk are skipped, so re-running the same command
    resumes it. Files are written to `.tmp` and renamed, so an existing
    file is complete. `--refetch` downloads them again.
  - On a WCL/FFLogs rate limit (including the ~1h IP-level block big
    reports hit after ~850MB) the script prints the reset time, sleeps
    until then plus a minute, and retries the same pull. It gives up after
    four waits. Run long fetches in the background.
- **Late phases only (FFXIV).** `--min-minutes <n>` fetches only fights
  lasting at least n minutes; `--from-minutes <n>` starts every stream
  except deaths and combatantInfo n minutes into each fight. Ultimate
  Kefka used `--min-minutes 15 --from-minutes 14` (~1MB per pull instead
  of 5-7MB). `validate.js` detects these captures and runs only
  `lateCapture` mechanics on them.
  - **Re-running a fetch on such a folder must repeat its flags.** A
    plain re-run downloads every pull the capture skipped, at full size.
    The folder then mixes full and late captures, so validate stops
    treating it as late and `--check` fails with additions on every pull.
    There is no meta-only mode; to refresh `meta.json` alone (for example
    to pick up the phase fields), re-run with the original flags.
- **Same queries as the app.** The scripts reuse `lib/wcl-client.ts` /
  `lib/ffl-client.ts` unchanged, loaded under Node by
  `scripts/lib/require-ts.js`, so their queries can't drift from the app's.
- **Slimming.** `scripts/lib/slim-report.js` strips unused fields (~92%
  smaller) and keeps positions, HP, `overkill` and `buffs`.
  - If a field you need is missing, work out whether it was dropped by the
    projector (widen it and re-fetch), is on disk but unread (add the read),
    or is never sent by the API.
  - The README's "missing field triage" covers these three cases in detail.
- **Pull numbers in old notes may not match.** Sample tooling has gone
  through three numbering generations, so cross-reference old findings by
  content (names + timestamps + ability), not by pull number.
- **Backfill.** `scripts/backfill-enemy-damage-taken.js` adds FFXIV's
  `enemyDamageTaken` position stream to captures fetched before it existed.
- **Storage policy.** Reports are disposable, since re-fetching is cheap.
  Before deleting one, make sure anything it uniquely proved is already
  written into code comments or rulings.

## Damage output analysis (FFXIV)

`scripts/fetch-ff-dps.js` downloads aggregated damage tables and player
casts, about 15 API points per fight. `scripts/analyze-dps.js` then compares
one group's pulls against other groups' clears. The method and its pitfalls
are in [dps-analysis.md](dps-analysis.md).

## Analyzing a report (`scripts/analyze-report.js`)

The standard investigation recipes for verifying a model or debugging a
rule, on any fetched report (WoW or FFXIV), read-only:
`node scripts/analyze-report.js <code> <command> [args] [--pulls 1,3-5] [--kill] [--boss name]`.
`--help` prints the full reference. Ability arguments take IDs or a name
regex (`"Caustic Waves"`), and times are seconds from the pull start.

| Command | Answers |
|---|---|
| `pulls` | Which pulls exist, which is the kill, how long, how many deaths |
| `sweep [nameRe]` | Every boss ability ID by stream and event type, with pull and source counts |
| `timeline <pull>` | The boss clock: casts, casts that never finished (kicks), key enemy buffs, deaths |
| `deaths [--mark abilities]` | Every pull's deaths with killing blow and tank/healer tag, beside marker casts |
| `hits <abilities>` | Each resolution of a damage ability: time, hits, players, amounts, deaths |
| `window <pull> <from> <to> <abilities>` | Everything those abilities did in a time window |
| `adds <npcRe>` | Each NPC instance's lifecycle: buffs, casts, hits on players |
| `bursts <debuffs>` | A debuff landing on many players at once (raid penalties, hatches) |
| `soakers <casts> <debuffs>` | How many players got a debuff at each cast (soak counts via lockout debuffs) |
| `collapse` | Seconds from the Nth concurrent death to the pull end (the "N dead" threshold) |
| `players [pull]` | Roster with spec and role |

It loads pulls lazily and keeps three in memory, so narrowing with
`--pulls` keeps big WoW reports (50MB+ per pull) quick.

## Script auth (`.credentials/`, gitignored)

- **Refresh-token grant only.** The scripts get no browser flow.
- **Seeding once:**
  1. Log into the app.
  2. In devtools, run `console.log(localStorage.getItem("wcl_refresh_token"))`.
     Use `console.log`, not `copy()`, which fails silently depending on focus.
  3. Paste the printed value into `.credentials/wcl-token.json` as
     `{"refresh_token": "..."}`. For FFLogs, use `ffl-token.json` and the
     `ffl_refresh_token` key.

  The token rotates itself afterwards.
- **Token lineage gotcha.** Seeding puts the browser and Node on **one**
  grant lineage. Whichever side refreshes next revokes the other, and the
  browser then gets a 401.
  - **Fix:** log in again in the app, which mints an independent grant.
    **Do not** re-seed the file, since that re-creates the shared lineage.

## Mitigation sheet (FFXIV)

- **Fetching.** `node scripts/fetch-mitigation-sheet.js` pulls the public
  Google Sheet as CSV per tab. It regenerates both the local copy
  (`sampledata/ff/mitigation/`) and the committed
  `lib/mechanics/ffxiv/dancingmad/mitigation-plans/ikuya.json`.
- **Anchor debugging.** `node scripts/inspect-mitigation-anchors.js` shows
  which sheet mechanics failed to match a boss cast (`UNMATCHED`). Those
  need an entry in `MECHANIC_NAME_ALIASES`.

## Verifying UI in a real browser

This is for when a layout bug needs real numbers. It is not a routine step
after every tweak.
- **Reuse the user's dev server.** It is usually already running on
  **:3000**, and a second `npm run dev` exits with "Another next dev server
  is already running".
- **Driver.** `npm i puppeteer-core` in a scratch directory, not the repo,
  and point it at the installed Chrome or Edge. Don't install Playwright
  browsers.
- **Timing.** Wait ~2.5s after `networkidle2` before measuring.
- **Localizing an overflow:**
  1. Compare `documentElement.scrollHeight` with `clientHeight`.
  2. Walk every element and list the ones that really scroll (overflow
     plus `overflowY: auto/scroll`) and the ones past `innerHeight`.
  3. Print each element's `top`. A nonzero `top` on `<body>` means a
     browser-default margin.
- **Viewports.** Check 1920x1080 and 1366x768.

## Gotchas

- **GraphQL comments.** Inside a `gql\`...\`` template literal, use `#` for
  comments. A `//` is sent to the API as query text and fails with
  "Cannot parse the unexpected character".
- **Pseudo-actors.** FFLogs' "Limit Break" pseudo-actor is filtered in
  `buildFFPlayers`. If a phantom player appears, check for pseudo-actors
  first.

## Deployment (for context — agents never deploy)

The user deploys by running `./deploy.sh` on the production server after
pulling your pushed commits. **Agents never run it and never SSH in.**

**What the script does,** in order:
1. `git fetch` (with a timeout), then `git reset --hard origin/main`
2. `npm install`
3. `npx prisma generate` — this must run **before** the build, because
   `next build` type-checks against the generated client
4. `npm run build`
5. `npx prisma migrate deploy`, with bounded auto-resolution of failed
   migrations
6. a pm2 restart

**Details that matter if you edit `deploy.sh`:**
- The body is wrapped in `main() { ... }; main "$@"`, so bash parses the
  whole script before `git reset` rewrites it mid-run.
- The file's executable bit is committed (`git update-index --chmod=+x`).
  Otherwise every reset makes it non-executable.
- The server pulls over an authenticated SSH deploy key. Anonymous HTTPS
  fetches from that host are throttled into 40-60s stalls that look like
  hangs.
- `.env` and `data/sessions/*.json` are server-only state and are
  gitignored.
