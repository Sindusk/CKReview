# tools/

Read-only scripts agents run to answer a recurring log question. Scripts that
agents run live in the repository, not the scratchpad.

**Before writing a probe:** `python -I tools/docs.py tools <area>` (e.g.
`ffxiv`, `ffxiv/top`) prints every tool's purpose and usage. A probe you
would reuse goes here, not in the scratchpad. Extend an existing tool before
adding a near-duplicate.

## Layout

tools/ mirrors lib/mechanics. A fight's probes sit in `tools/<game>/<area>/`
beside the module path they serve (`lib/mechanics/ffxiv/top/` ->
`tools/ffxiv/top/`), one file per module served, named after it
(`omega-mf-probes.js`), with subcommands for the questions. Cross-fight tools
for a game sit in `tools/<game>/`. Skill-generic tools (`pull-errors.js`,
`job-labels.js`, `probe-pulls.js`, build-fight-context) stay in
`.claude/skills/*/tools/`.

## Rules for a tool

- Starts with a comment block: line 1 the purpose, then the exact usage
  lines (`docs.py tools` prints the first 8 lines), then what each
  subcommand prints.
- Report code and pulls (`15,18,30-33`) are arguments. No hard-coded codes,
  no scratchpad paths.
- Prints jobs, never character names (`job-labels.js`). Times MM:SS, "Pull N".
- Compact: one line per pull or player, a `--limit` or summary mode, a
  typical call under ~3000 chars.
- Read-only; runs from the repo root on fetched `sampledata/`.

## Now in it

- `docs.py`: code and docs query tool (`python -I tools/docs.py help`).
- `ffxiv/kit.js`: shared loader/arg helpers (not a command).
- `ffxiv/raise-timing.js`: Weakness / Brink debuff vs the first action after a death.
- `ffxiv/top/top-probes.js`: P2 Fire spots (`fire-spots`), P1 Program Loop Blaster trace (`blaster-trace`).
- `ffxiv/top/omega-probes.js`: P1 tower priority and Same Tower verdicts (`tower-prio`).
- `ffxiv/top/omega-mf-probes.js`: P2 vuln at the Fire cast (`fire-vuln`), movement before it (`movers`).
- `ffxiv/top/omega-reconfigured-probes.js`: P3 rot hand-offs, clips, stray receivers (`handoffs`, `clips`, `stray`).
