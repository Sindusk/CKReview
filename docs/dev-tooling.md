# Dev Tooling

Scripts, local data, verification and deployment. For the mechanic
validation harness (`scripts/validate.js`, `expectations/`), see
[lib/mechanics/README.md](../lib/mechanics/README.md#sample-data--validation).

## Fetching sample data

- **Fetch command:** `node scripts/fetch-wow-report.js <code-or-URL> [--boss "<name>"] [--fight <id>]... [--refetch]`
  (or `fetch-ff-report.js`). `--boss` matches any fight name containing the
  text; `fetch-ff-report.js --boss-exact "<name>"` matches the whole name
  (`Lindwurm` without `Lindwurm II`).
- **Which boss is in a report:** `--meta-only` (both fetch scripts) writes
  `meta.json` and prints the title and the fights by name, fetching no
  pulls. Go by the fight names; a report's title is free text.
- **Refine-module tools** (read-only, `.claude/skills/refine-module/tools/`):
  `pull-errors.js` (a boss's pulls as the app shows them, cross-pull passes
  included; `--jobs` prints jobs instead of names; `--roster` prints only
  name -> job for the report, from disk, to map names in the user's VOD
  answers) and, for The Omega
  Protocol, the probes in `tools/ffxiv/top/` (`python -I tools/docs.py tools ffxiv`). Usage in each header; layout in tools/README.md.
- **Validation output:** `validate.js --check --diff-only` prints only the
  CHECK lines, diffs, ruling violations and the summary.
- **Replay tools** (read-only, any saved replay): `replay-inventory.js`
  (every ability, tether, marker, status and actor in a time range),
  `replay-fitcheck.js` (drawn shapes against who was really hit) and
  `render-replay.js` (the real panel at chosen moments, as one PNG, via
  headless Chrome or Edge; run with `ALLOW_SHELL_EDITS=1`, the shell
  gate's override, since it writes the PNG). Usage in each header; the
  `/build-replay` skill uses all three.
- **Replay tracks:** `node scripts/fetch-ff-replay.js <code-or-URL> --fight <N>`
  (FFXIV) or `fetch-wow-replay.js` (WoW) saves one pull's top-down replay
  positions to `sampledata/{ff,wow}/<code>/replay/fight<N>.json` (FFXIV
  ~1MB, a few requests; a 6:24 WoW kill is 3.9MB, ~30 pages at about a point each).
  WoW AoE radii: `node scripts/fetch-wow-spell-geometry.js` adds every
  new spell id from saved WoW replays and the `lib/mechanics/wow/va/`
  headers to `lib/replay/wow-spell-geometry.json` (one wago.tools request
  per spell; run it after fetching a new boss's replay).
  A sample-data load's Load replay reads it instead of fetching live.
  It sits in a subfolder because every report-folder loader reads each
  top-level `*.json` except `meta.json` as a fight file.
- **Output:** writes `sampledata/{wow,ff}/<code>/meta.json` plus one
  `<Boss>_Pull<N>.json` per fight. Pull numbers match the app's per-boss
  numbering. A pasted full URL works.
- **Kills first, resumable, rate-limit tolerant** (`scripts/lib/fetch-plan.js`):
  - Kills download before wipes, so a rate limit never costs the clean
    baseline. Only the order changes; file names still use the real
    per-boss pull number (a last-pull kill is still `<Boss>_Pull25.json`).
  - Pulls already on disk are skipped, so re-running the same command
    resumes it. Files are written to `.tmp` and renamed, so an existing
    file is complete. `--refetch` downloads them again, and only them:
    fights not already on disk are skipped unless named with `--fight`.
    A report can hold dozens of other fights (dungeons, other bosses), and
    an earlier `--refetch` that fetched them all burned points and added
    pulls with no baselines.
  - On a WCL/FFLogs rate limit (including the ~1h IP-level block big
    reports hit after ~850MB) the script prints the reset time, sleeps
    until then plus a minute, and retries the same pull. It gives up after
    four waits. Run long fetches in the background.
- **Late phases only (FFXIV).** `--min-minutes <n>` fetches only fights
  lasting at least n minutes; `--from-minutes <n>` starts every stream
  except deaths and combatantInfo n minutes into each fight. Ultimate
  Kefka used `--min-minutes 15 --from-minutes 14` (~1MB per pull instead
  of 5-7MB). `--to-minutes <n>` also stops those streams n minutes in
  (deaths still run to the end), so a middle phase costs only its own
  span: FRU Phase 2 used `--from-minutes 2.4 --to-minutes 7.75`, Phase 3
  `--min-minutes 7.3 --from-minutes 6.9 --to-minutes 10.75` (P3 starts
  7:20-7:27 and ends by 10:35). The P2 folders' P3 pulls were refetched
  with `--refetch --fight <id>... --from-minutes 2.4 --to-minutes 10.75`,
  which keeps their P2 data (and baselines) unchanged. Phase 4 used
  `--min-minutes 10.15 --from-minutes 6.9 --to-minutes 14` (P4 starts
  ~10:08 and its transition or enrage comes by ~13:00), ~2.8MB per pull;
  the P3 folders' P4 pulls were refetched the same way with `--refetch
  --fight <id>...`. Phase 5 used `--min-minutes 14.1 --from-minutes 13.5`
  (P5 starts 14:07-14:20; 0.5-2.3MB per pull); the P4 folder's P5 pulls
  were refetched with its P4 flags minus `--to-minutes`.
  `--min-phase <n>` keeps only fights whose FFLogs `lastPhase` reached n,
  for when phase start times vary: The Omega Protocol P4 used
  `--min-phase 4 --from-minutes 6.8 --to-minutes 9.5` (P4 starts
  7:18-7:36; Blue Screen resolves by ~8:40); its P5 pulls were refetched
  with `--refetch --fight <id>... --min-phase 4 --from-minutes 6.8
  --to-minutes 14.2` (P5 starts 8:28-8:45, Blind Faith resolves by ~13:41).
  `validate.js` detects captures whose damage starts 2+ minutes in and runs
  only `lateCapture` mechanics on them.
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

**Finding a pull where a mistake happens** (xiva-audit phase 3), read-only,
nothing written:
- `node scripts/ff-rankings.js "<encounter>" <Job> [--from-pct n] [--pages n]`
  lists a job's ranked parses from the bottom up (code, fight id, player).
  About 10 points to find the last page, then 1 a page; it stops at half
  the hour's budget (`--stop-at`).
- `node scripts/ff-probe.js <code> <fightId> <Job|name> [--buff text] [--casts text]`
  reads that player's casts and self-buffs (about 5 points) and prints,
  per buff, which casts removed it and which removals had no cast beside
  them (expiries), marked near a death or the end. A proc cleared by the
  wrong cast shows up there too (Gunbreaker's Continuation).
- Then fetch only the pull you'll use, into its own report folder:
  `node scripts/fetch-ff-report.js <code> --fight <id>`.
- `node scripts/ff-findings.js <Job> "<regex>" [code ...]` runs the
  damage analysis over every sample with that job (or the named reports)
  and prints each finding whose label or detail matches: the
  false-positive sweep after building or changing a job check. A full
  run takes a few minutes.

**The same for WoW** (wowa-audit phase 3), read-only, nothing written:
- `node scripts/wow-rankings.js "<encounter>" <spec> [--from-pct n] [--pages n] [--difficulty 5]`
  lists a spec's ranked kills from the given percentile up (code, fight
  id, ilvl, player). The encounter is a name or part of one, or its WCL
  id; the spec is "Windwalker" or, where two classes share the name,
  "Frost Mage". Mythic by default. About 80 points the first time on an
  encounter, then a few a page.
- `node scripts/wow-probe.js <code> <fightId> <name|spec> [--buff text] [--casts text] [--gaps text] [--hits text]`
  is ff-probe.js for WoW (about 6 points), plus `--gaps`: the intervals
  between a cast's uses, with the longest five and their times (a held
  cooldown).
- Then `node scripts/fetch-wow-report.js <code> --fight <id>`.

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
| `profile <abilities>` | Per ability: how many players each resolution hit, how often one player took 2+ copies (an overlap), how often it killed, and the kill's resolutions as the clean baseline |
| `resolutions <abilities> [--auras debuffs]` | Each resolution in full: who each copy targeted (from the casts), who it hit, HP after, auras they held, deaths |
| `nokb` | Deaths with no killing blow and what preceded them: called wipe, wall knockback, or a walk-off |
| `after <casts> <debuffs> [--from s --to s]` | Who gained a debuff in a window after each cast (ground fire left by a cast, delayed penalties) |

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

## Damage analysis (FFXIV)

- **Analysis without the UI.**
  `node scripts/validate.js damage-analysis sampledata/ff/<code>` prints
  each pull's phase summary and every player's estimated loss with their
  top findings. Add `--all-findings` for every finding and its basis.
  Print-only, so it runs only when named: `--check` and `--update` skip
  it. It needs a capture fetched after 2026-10-06 (player buffs,
  begin-cast durations, damage detail); `dQ8wmb1VhKt6yBXk` has them.
- **Reference clears.** `node scripts/validate.js damage-compare
  sampledata/ff/<own> --refs=<code>,<code>` compares the folder's pulls
  with clear folders over equal windows. Fetch a clear's one kill with
  `node scripts/fetch-ff-report.js <code> --fight <id>`.
- **xivanalysis data.** `lib/damage/ffxiv/xiva-data.ts` is generated.
  Refresh it with
  `git clone --depth 1 https://github.com/xivanalysis/xivanalysis.git <new-empty-dir>`
  and then `node scripts/sync-xiva-data.js <that-dir>`. The script parses
  their files and never runs them. Clone outside the repo, and don't run
  anything inside the clone. Then refresh the learn levels with
  `node scripts/sync-action-levels.js` (XIVAPI, writes
  `lib/damage/ffxiv/action-levels.ts`; the shell edit gate needs
  `ALLOW_SHELL_EDITS=1` for it).
- Model and choices: [damage-analysis-plan.md](archive/damage-analysis-plan.md).

## Damage analysis (WoW)

- **Analysis without the UI.**
  `node scripts/validate.js damage-analysis-wow sampledata/wow/<code> --pulls=19`
  prints the same report as the FFXIV runner through the live WoW
  transform. `--boss=<name>` narrows by boss and `--all-findings` adds
  every finding with its basis. It runs only when named: plain `--check`
  skips it.
- **Reference clears.** `node scripts/validate.js damage-compare-wow
  sampledata/wow/<own> --refs=<code>,<code> [--pulls=30,36]` compares the
  folder's pulls with the clears' kills over equal windows. Fetch a clear's
  kill with `node scripts/fetch-wow-report.js <code> --fight <id>`, then
  give the new folder a baseline (`validate.js --update
  sampledata/wow/<code>`), or `--check` reports it as missing one.

- **Spell tables are measured, not copied.** WoWAnalyzer is AGPL, so
  `lib/damage/wow/spell-data.ts` is generated from our own logs:
  1. `node scripts/survey-wow-spells.js <code> --kills` (or
     `--fight <id>...`) fetches four unfiltered streams for each fight and
     keeps only per-spec statistics, in
     `sampledata/wow/<code>/survey/<fightId>.json`. A long kill costs
     about 25 points.
  2. `node scripts/build-wow-spell-data.js` rebuilds `spell-data.ts` from
     every survey on disk. The edit gate blocks it as a script that writes
     source; run it with `ALLOW_SHELL_EDITS=1`.

  Survey more fights (new specs, a new tier) and rebuild. The fetch
  filters (`lib/damage/wow/buff-stream.ts`) follow the table, so samples
  fetched before a rebuild may lack newly tracked auras.
- **WoW samples need a capture fetched after 2026-10-06** for the damage
  fields (aura snapshot, hit type, resources, pets, player buffs, enemy
  debuffs). Older captures load with those fields undefined.
- **The harness ignores the two damage streams for timing.**
  `build-wow-players.js` (pull start) and `validate.js`
  (`fightDurationMs`) leave out `playerBuffs` and `enemyDebuffs` on WoW.
  Counting them moved Ula'tek's "pull ended N s later" by 0.1s.

## Mitigation analysis (FFXIV)

- **Catalog check.** `node scripts/check-mitigation-catalog.js` checks
  `lib/mitigation/ffxiv-catalog.ts` against the samples: action and status
  IDs, every hit's FFLogs multiplier, and cooldowns from real cast spacing.
- **Analysis without the UI.**
  `node scripts/validate.js mitigation-analysis sampledata/ff/<code>`
  prints every hit per pull (raw/taken damage, HP before/after, verdict,
  note), then the all-pulls aggregate per boss and roster, the way the
  dialog groups it; `pulls=1/8 RARE` marks a hidden rare hit. A group
  with enough pulls also gets its `PLAN` (`lib/mitigation/plan.ts`):
  each listed hit with its change or the reason it has none, then the
  spare hits.
  Print-only, so it runs only when named (`--check` skips it; after a
  mitigation change, name it, or run the optimizer/tanking example
  scripts). It needs a full capture fetched after 2026-10-06.
- **Inspecting one hit:** load pulls the way the runner does
  (`lib/sample-report-store.ts` `loadSampleReport` →
  `lib/log-transforms.ts` `transformFFReportToPulls`), call
  `analyzePullMitigation`, and print each target's `parts`. Keep such
  scripts in your scratch space, not `scripts/`.
- Design and tuning choices: [mitigation-redesign.md](archive/mitigation-redesign.md).

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

## Measuring an agent session's cost

The user's cost scripts live outside the repo, in
`~/Documents/CCT/cost-analysis/` (its README lists them). For one
session, from Git Bash:
`python -I ~/Documents/CCT/cost-analysis/session_costs.py --session <session id prefix>`.
It finds the session under `~/.claude/projects/`, counts each API
response once (by `message.id`), and prints one row per agent (main
thread, then each subagent with its type and description): requests,
input / output / cache-write / cache-read tokens, first and average
context, cost, and the total. It works on a session still running, and
adds Splitrail's deduplicated figure once Splitrail has scanned it.
- **Don't sum usage per transcript line.** Claude Code writes one line
  per content block (thinking, text, each tool call), and each repeats
  the response's full usage, so raw line sums (including raw rows in
  Splitrail's database) run 2.2-2.8x high. Splitrail's own UI dedupes.
- **Prices** (fitted exactly from Splitrail, 2026-10-28): Opus 5.5 $4/M
  input, $20 output, $5 cache write, $0.20 cache read; Sonnet 5.5 $2 /
  $10 / $2.5 / $0.20. Cache reads dominate an agentic session and cost the
  same on both, so a session costs roughly requests x context.
- `/refine-module` logs each session's total and per-answer cost in
  `.claude/skills/refine-module/cost-log.md`.

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
