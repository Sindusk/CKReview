# VoD Coding (CKReview)

Instructions for **any** agent working in this repo. The file name is
historical; [AGENTS.md](AGENTS.md) points here.

Raid log analysis app (Next.js + Prisma/Postgres) that imports Warcraft Logs
(WoW) and FFLogs (FFXIV) reports and flags per-pull player errors for VOD
review. Active encounters:
- FFXIV: Dancing Mad ultimate
- WoW: The Venomous Abyss

Midnight Falls is **deprecated** (user, 2026-10-06): its detection stays
in place for old statics, but spend no time extending, reviewing or
sampling it.

## Docs map — read the one that matches your task

| Task | Read |
|---|---|
| Researching a boss/mechanic model | [lib/mechanics/MODEL-RESEARCH-GUIDE.md](lib/mechanics/MODEL-RESEARCH-GUIDE.md) |
| Building or changing mechanic detection | [lib/mechanics/README.md](lib/mechanics/README.md) (the working method) and [lib/mechanics/PITFALLS.md](lib/mechanics/PITFALLS.md) (per-boss lessons as a checklist), then the module's own header comment |
| Building a boss module from its research model and logs | the `/build-module` skill ([.claude/skills/build-module/](.claude/skills/build-module/SKILL.md)) |
| Refining a module with a reviewed log / VOD answers | the `/refine-module` skill ([.claude/skills/refine-module/](.claude/skills/refine-module/SKILL.md)) |
| App features, UI, data flow | [docs/app-architecture.md](docs/app-architecture.md) |
| Sample data, auth tokens, scripts, browser checks, deploy pipeline | [docs/dev-tooling.md](docs/dev-tooling.md) |
| Damage output / rotation analysis, or tooling for it | [docs/dps-analysis.md](docs/dps-analysis.md) (method and pitfalls) |
| A damage case study of a kill against xivanalysis (FFXIV) or WoWAnalyzer (WoW) feedback | the `/damage-analysis` skill ([.claude/skills/damage-analysis/](.claude/skills/damage-analysis/SKILL.md)); unfinished studies resume from [docs/damage-case-studies/](docs/damage-case-studies/) |
| A boss's damage context (pools, checks, holds) | the `/build-fight-context` skill ([.claude/skills/build-fight-context/](.claude/skills/build-fight-context/SKILL.md)) |
| Changing the Damage, Mitigation or Statics analysis | The module headers (`lib/damage/`, `lib/mitigation/`, `lib/static-analysis.ts`). Design records and log-semantics findings are in [docs/archive/](docs/archive/) |
| Mitigation Analysis optimizer, its findings view, and boss-debuff reach | Headers of `lib/mitigation/plan.ts` (party rules), `findings.ts` (the view's categories and timeline), `optimize.ts` (generic engine), `debuff-reach.ts`; test: `node scripts/check-optimizer-example.js`. Design record: [docs/archive/mitigation-optimizer-plan.md](docs/archive/mitigation-optimizer-plan.md) |
| Tanking panel (tank streams, busters, tank optimizer, Tanking view) | Headers of `lib/mitigation/tanking.ts`, `tanking-plan.ts`, `buster-kinds.ts`, `components/MitigationTanking.tsx`; test: `node scripts/check-tanking-example.js`. Design record: [docs/archive/tanking-panel-plan.md](docs/archive/tanking-panel-plan.md) |
| Per-player exposure, assigned duties, the Adjusted / pull headline | Headers of `lib/mechanics/rule-meta.ts`, `occurrences.ts`, `assignments.ts` and `lib/static-analysis.ts`; the working method in lib/mechanics/README.md. Design record: [docs/archive/exposure-plan.md](docs/archive/exposure-plan.md) |
| Local video files as VOD sources (build plan) | [docs/local-vod-plan.md](docs/local-vod-plan.md) |
| What's unfinished or waiting on a user decision | [docs/open-items.md](docs/open-items.md) |
| Which ports are taken locally and in production | [PORTS.md](PORTS.md) |

**Mechanic detection is mandatory-reading territory.** `lib/mechanics/README.md`
holds:
- the severity definitions and the attribution philosophy (learned through
  user corrections)
- the four-stage workflow for a new boss
- log data semantics and known pitfalls

Each mechanic module's own header comment is the authoritative model for
that mechanic — read it before editing the module.

## Roles in the detection workflow

1. **Research** — an agent writes the boss's encounter model into the module
   header. Follow the research guide.
2. **Verification and detection** — an agent checks that model against a real
   report the user supplies, then builds the rules.
3. **Review** — the user watches the pulls on VOD. **Their feedback is ground
   truth.** It becomes code changes plus hand-written entries in
   `expectations/rulings.json`.

Any agent may take roles 1 or 2. The user has used Codex for research and
Claude for detection so far, but nothing in the repo depends on that split.

## Working with the user

These are standing preferences, each learned from a real correction:
- **Git: commit and push to `main` without asking**, once a change works:
  validate.js and tsc pass. This includes UI changes: commit them as soon
  as tsc passes rather than holding them for review (user, 2026-10-08).
  This is standing authorization. The local remote is named **`CKReview`**,
  not `origin` (`git push CKReview main`).
- **Credit the authoring AI model as co-author.** Since 2026-10-08, every
  commit an agent makes ends with a blank line and a `Co-Authored-By`
  trailer naming the AI model that authored the work. For GPT-6.1 Sol:
  `Co-Authored-By: GPT-6.1 Sol <noreply@openai.com>`
  That trailer alone is sufficient for GPT-6.1 Sol commits; Claude credit
  is only appropriate when Claude also authored the work. Other models
  should use their own model name and the appropriate provider address.
- **Never deploy.** Don't SSH into the production server or run
  `./deploy.sh`. The user deploys themselves for oversight after pulling
  your commits. When done, say the change is ready to deploy.
- **The GitHub repo is public.** Before committing anything that documents
  infrastructure, credentials, hostnames, logins, internal URLs or personal
  data, look at what it contains and offer the user three options: redact,
  push as-is, or gitignore. Prefer redacting the sensitive lines over
  dropping the file. `sampledata/`, `expectations/`, `.credentials/` and
  `.env` are gitignored on purpose.
- **VOD review arrives in batches.** The user writes up a whole night's
  pulls in one message, so take the whole batch.
  - Verify each fix independently with `validate.js --check`.
  - Group related mechanics rather than going strictly pull by pull.
  - Write rulings at the end, once detection has settled.
  - When the user's account and the log disagree, pin only the confirmed
    part and ask about the rest.
  - **Never edit an existing ruling** (user, 2026-10-14), even when a
    later call seems to contradict it. A ruling for a report not on disk
    stays as written. Only when it's on disk and a change makes it fail,
    report the failure and let the user decide whether to update it.
  - **Rulings only from a VOD review** (user, 2026-10-14). An answer about
    the strat or the fight, with no VOD behind it, shapes the code and the
    header but never becomes a ruling.
- **Asking for VOD checks: one numbered list per loaded VOD** (user,
  2026-10-09). When the user has a VOD loaded, ask only about the pulls in
  that VOD. Number every question sequentially (1, 2, 3 …, no sub-letters)
  so the user can answer by number. Each item gives:
  - the pull and its MM:SS time
  - what detection currently says, with the players it names
  - the exact thing to look at

  Order the items by pull, not by mechanic. When the same question
  applies to several pulls, ask it once, at the first pull. If the user's
  answer doesn't settle the later pulls, raise those in the next turn.
- **Read the boss's full module header before asking about the fight**
  (user, 2026-10-11). Any question about a mechanic (who takes a buster,
  shared or not, why an invuln is used, MT/OT) is usually answered by the
  research model and VERIFIED section at the top of the boss's detection
  module, even for mitigation work. Grepping it isn't reading it. Ask
  only what it doesn't answer, and write the answer back into it.
- **Show, don't describe** (user, 2026-10-11). Text descriptions of a
  layout, or tables of numbers with no reference point, don't land:
  - for a UI or layout choice, render a visual mockup built from real
    data and let the user pick
  - for a data checkpoint, tie each question to a pull and MM:SS the
    user can open in the app, and say what the log shows there
- **Sanity-check generated advice before showing it.** Read each proposed
  change the way a raid lead would (would a player actually do this?).
  The optimizer once moved a 60s Reprisal four minutes later when it was
  free three times over in between (user, 2026-10-11).
- **Narrow overrides, not wholesale replacement.** When a working mechanism
  fails for one specific case, add a scoped override for that case. Don't
  swap the whole mechanism.
- **After ~2 failed fixes with the same symptom, stop guessing.** Add
  labeled diagnostic logging (plain strings, not objects) at the decision
  points, or measure in a headless browser (docs/dev-tooling.md). Then get
  one real trace. Remove the logging once the bug is fixed.
- **Name pulls as "Pull X" when talking to the user** (user, 2026-10-12).
  You and the user discuss one report at a time, so report letters
  ("D7", "B29") mean nothing to them. Module headers may still cite
  multi-report evidence with letters.
- **Give pull times as MM:SS** (e.g. 6:57), not +SSS seconds, when talking
  to the user: they match them against VOD timestamps (user, 2026-10-08).
  Code comments and headers may keep +seconds.
- **Small UI tweaks: don't run a visual verification loop.** The user is
  usually driving the running app and checks visually themselves. Make the
  edit, typecheck, and stop. Measure only when a symptom survives repeated
  fixes, or when asked.
- **Research before planning non-trivial features.** Get exact signatures,
  types and existing idioms before designing.
- **Ask for raid assignments before building a boss module.** Assignments
  (soak groups, kick orders, carriers, helpers) are what let detection name
  a player where the log alone can't. First check the boss's module header:
  the research model often already records the plan and assignments. Ask
  only if neither the request nor the model includes them, once, before
  fetching or analyzing, with two options:
  - **Yes** — pause and wait for the user to supply them.
  - **No** — continue without them, and keep log-unattributable failures
    player-less.

  Context: every Venomous Abyss module so far (Entombed Sentinels through
  Ula'tek) was built from public logs of groups the user doesn't know, with
  no VODs or raid plans. That is why so many of their failures are
  player-less.
- **No hidden costs on navigation.** A Back link or route change must never
  silently trigger a fetch. WCL/FFLogs are rate-limited, so re-fetching is
  an explicit button the user clicks.
- **"Check if X exists" should be metadata-only.** Never fetch a full
  payload just to decide whether to prompt; a 277MB report once stalled the
  UI for 10s that way.
- **Fetch only the pulls the task uses, and don't block on fetches.**
  Sample reports often hold many unrelated fights (dungeons, other
  bosses). Name pulls with `--fight` rather than refetching whole reports,
  and keep working from the data on hand rather than waiting for a long
  download (user, 2026-10-06).

## Quick facts

- **Sample data:** `sampledata/` is gitignored. Fetch it with
  `node scripts/fetch-{ff,wow}-report.js <code-or-URL>`; setup is in
  docs/dev-tooling.md.
- **Validation:** before considering any mechanic change done, run:
  - `node scripts/validate.js --check`, which compares every mechanic's
    output against local `expectations/` baselines and rulings. Args narrow
    it by mechanic name and/or report folder.
  - `npx tsc --noEmit`

  **Scope `--check` to the changed module's reports** (user, 2026-10-12).
  A full run walks every report on disk and takes minutes. After changing
  a boss module, pass:
  - that module's mechanic name(s);
  - the `sampledata/<game>/<code>` folders that hold that boss.

  Find the folders by the boss name in each folder's `meta.json`.
  Widen to every report that boss's sibling modules cover when you touch a
  shared helper (e.g. `ffxiv/fru/common.ts` means all FRU reports). Widen
  to the whole game (`--game ff` or `--game wow`) after editing cross-boss
  code within it: `error-rules.ts`, `player-position.ts`, `wow/common.ts`,
  rule-meta.

  **One game at a time** (user, 2026-10-13). Baseline recaptures,
  validation, sample fetches and any other checking run only for the game
  being worked on (`--game ff` / `--game wow`), never both. The two games
  barely overlap. Run both games only after a change to code they share:
  the data streams, log fetching and transforms (`lib/log-transforms.ts`,
  `lib/log-auth.ts`, `scripts/lib/`), the damage engine's shared layer (`lib/damage/*.ts`
  outside `ffxiv/` and `wow/`), or `validate.js` itself.

  For an intended behavior change, verify the `--check` diff is exactly the
  intended delta, then run `--update`. `expectations/rulings.json` is
  hand-edited only and never regenerated. `--prune` drops snapshots for
  deleted reports.
- **No Tailwind reset is active.** The app is styled with inline `style`
  objects, and browser default styles apply (see docs/app-architecture.md).
