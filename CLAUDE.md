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
| Researching a boss/mechanic model | the `/research-boss` skill, which follows [lib/mechanics/MODEL-RESEARCH-GUIDE.md](lib/mechanics/MODEL-RESEARCH-GUIDE.md) |
| Building or changing mechanic detection (**mandatory reading**: severity definitions, attribution philosophy, log semantics) | [lib/mechanics/README.md](lib/mechanics/README.md) and [lib/mechanics/PITFALLS.md](lib/mechanics/PITFALLS.md), then the module's own header comment, which is the authoritative model for that mechanic |
| Building a boss module from its research model and logs | the `/build-module` skill |
| Refining a module with a reviewed log / VOD answers | the `/refine-module` skill |
| A damage case study of a kill against xivanalysis / WoWAnalyzer feedback | the `/damage-analysis` skill; unfinished studies resume from [docs/damage-case-studies/](docs/damage-case-studies/) |
| A boss's damage context (pools, checks, holds) | the `/build-fight-context` skill |
| A fight's top-down replay visuals (one phase or boss at a time) | the `/build-replay` skill; the per-fight contract is the header of `lib/replay/fight-spec.ts` |
| App features, UI, data flow, VOD playback (incl. local files), FFXIV top-down replay | [docs/app-architecture.md](docs/app-architecture.md), then the headers of the files each section names |
| Sample data, auth tokens, scripts, browser checks, deploy pipeline | [docs/dev-tooling.md](docs/dev-tooling.md) |
| Damage output / rotation analysis, or tooling for it | [docs/dps-analysis.md](docs/dps-analysis.md) |
| Analyzer audits, job/spec by job/spec | xivanalysis: [docs/xiva-audit-plan.md](docs/xiva-audit-plan.md) (ledgers in `docs/xiva-audit/`); WoWAnalyzer (reference-only, AGPL): [docs/wowa-audit-plan.md](docs/wowa-audit-plan.md) (ledgers in `docs/wowa-audit/`) |
| WoW simulation pipeline (talent effects, budget model, simc as dev-only oracle; clean-room rule for GPL/AGPL sources) | [docs/wow-sim-plan.md](docs/wow-sim-plan.md) |
| Damage, Mitigation or Statics analysis | Module headers in `lib/damage/`, `lib/mitigation/`, `lib/static-analysis.ts` |
| Mitigation optimizer and findings view | Headers of `lib/mitigation/plan.ts`, `findings.ts`, `optimize.ts`, `debuff-reach.ts`, `ffxiv-deployment.ts`; tests `node scripts/check-optimizer-example.js`, `node scripts/check-deployment-shields.js` |
| Tanking panel | Headers of `lib/mitigation/tanking.ts`, `tanking-plan.ts`, `buster-kinds.ts`, `components/MitigationTanking.tsx`; test `node scripts/check-tanking-example.js` |
| Who holds aggro (FFXIV enmity), tank swaps | Header of `lib/mitigation/enmity.ts`; accuracy `node scripts/check-enmity.js <code> [--list]` |
| Per-player exposure, assigned duties, the Adjusted / pull headline | Headers of `lib/mechanics/rule-meta.ts`, `occurrences.ts`, `assignments.ts`, `lib/static-analysis.ts` |
| WoW replay: what's left | [docs/wow-replay-plan.md](docs/wow-replay-plan.md) |
| What's unfinished or waiting on a user decision | [docs/open-items.md](docs/open-items.md) |
| Which ports are taken locally and in production | [PORTS.md](PORTS.md) |

Design records of built features are in [docs/archive/](docs/archive/);
read one only when a header doesn't explain a choice.

## Roles in the detection workflow

1. **Research** — an agent writes the boss's encounter model into the module
   header, following the research guide.
2. **Verification and detection** — an agent checks that model against a real
   report the user supplies, then builds the rules.
3. **Review** — the user watches the pulls on VOD. **Their feedback is ground
   truth.** It becomes code changes plus hand-written entries in
   `expectations/rulings.json`.

## Working with the user

Standing preferences, each learned from a real correction.

**Git and deploy**
- **Commit and push to `main` without asking** once a change works
  (validate.js and tsc pass; for UI changes, tsc alone). This is standing
  authorization. The remote is **`CKReview`**, not `origin`
  (`git push CKReview main`).
- **Credit the authoring model.** Every agent commit ends with a blank
  line and a `Co-Authored-By` trailer for each model that authored the
  work, e.g. `Co-Authored-By: GPT-6.1 Sol <noreply@openai.com>` or
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Credit only
  models that actually wrote it.
- **Never deploy.** Don't SSH into the production server or run
  `./deploy.sh`; the user deploys after pulling. When done, say the change
  is ready to deploy.
- **The GitHub repo is public.** Before committing anything that documents
  infrastructure, credentials, hostnames, logins, internal URLs or personal
  data, offer the user: redact (preferred), push as-is, or gitignore.
  `sampledata/`, `expectations/`, `.credentials/` and `.env` are gitignored
  on purpose.

**VOD review and rulings**
- **Reviews arrive in batches** (a whole night's pulls in one message).
  Take the whole batch, group related mechanics, verify each fix with
  `validate.js --check`, and write rulings at the end once detection has
  settled. When the user's account and the log disagree, pin only the
  confirmed part and ask about the rest.
- **Never edit an existing ruling** (user, 2026-10-14), even when a later
  call seems to contradict it. If one on disk starts failing, report it and
  let the user decide.
- **Rulings only from a VOD review** (user, 2026-10-14). A strat or fight
  answer with no VOD behind it shapes the code and header, never a ruling.
- **Asking for VOD checks: one numbered list per loaded VOD** (user,
  2026-10-09). Ask only about that VOD's pulls, numbered 1, 2, 3 … (no
  sub-letters), ordered by pull. Each item gives the pull and MM:SS, what
  detection says (with the players it names), and the exact thing to look
  at. A question that applies to several pulls is asked once, at the first;
  raise any it didn't settle next turn.
- **Talk in "Pull X" and MM:SS** (user, 2026-10-08/12). Report letters
  ("D7") and +SSS seconds mean nothing to the user; headers and code
  comments may keep them.
- **Read the boss's full module header before asking about the fight**
  (user, 2026-10-11) — even for mitigation work. Grepping it isn't reading
  it. Ask only what it doesn't answer, and write the answer back into it.
- **Ask for raid assignments before building a boss module** (soak groups,
  kick orders, carriers) unless the request or the module header already
  has them. Ask once, before fetching: **Yes** (wait for them) or **No**
  (continue, keep log-unattributable failures player-less).

**Presenting work**
- **Show, don't describe** (user, 2026-10-11). For a UI or layout choice,
  render a mockup from real data and let the user pick. For a data
  checkpoint, tie each question to a pull and MM:SS and say what the log
  shows there.
- **Measure; don't adopt placeholder numbers** (user, 2026-10-19). When
  the user gives a window length, size or timing, check it against the
  logs and use the measured value, saying where it differs and why. Their
  numbers are a starting guess, not a spec.
- **Sanity-check generated advice** the way a raid lead would. The
  optimizer once moved a 60s Reprisal four minutes later when it was free
  three times over in between (user, 2026-10-11).
- **Dropping an analyzer rule needs the user's approval** (user,
  2026-10-16): `wrong` / `no-damage` only after checking the log and
  showing the user the evidence. `covered` / `superseded` need no approval.
  See phase 3 of the audit plans.
- **Small UI tweaks: no visual verification loop.** The user checks
  visually. Edit, typecheck, stop; measure only when a symptom survives
  repeated fixes, or when asked.

**Engineering**
- **Narrow overrides, not wholesale replacement**, when a working mechanism
  fails for one case.
- **After ~2 failed fixes with the same symptom, stop guessing.** Add
  labeled diagnostic logging (plain strings) at the decision points, or
  measure in a headless browser (docs/dev-tooling.md), get one real trace,
  then remove the logging.
- **WCL/FFLogs are rate-limited.** Navigation never silently triggers a
  fetch (re-fetching is an explicit button). "Does X exist" checks are
  metadata-only (a 277MB report once stalled the UI for 10s). Fetch only
  the pulls the task uses (`--fight`), and keep working from data on hand
  instead of waiting on a long download (user, 2026-10-06).

## Quick facts

- **Sample data:** `sampledata/` is gitignored. Fetch it with
  `node scripts/fetch-{ff,wow}-report.js <code-or-URL>`; setup is in
  docs/dev-tooling.md.
- **Validation:** before considering any mechanic change done, run
  `node scripts/validate.js --check` (compares mechanic output against
  local `expectations/` baselines and rulings) and `npx tsc --noEmit`.
  Shortcuts: `npm run check:ff` / `npm run check:wow` (append scoping
  args after `--`) and `npm run typecheck`.
  - **Scope `--check`** (user, 2026-10-12); a full run takes minutes. After
    a boss module change, pass its mechanic name(s) and the
    `sampledata/<game>/<code>` folders whose `meta.json` names that boss.
    Touching a shared boss helper (e.g. `ffxiv/fru/common.ts`) widens to
    all that boss's reports. Cross-boss code within a game
    (`lib/error-rules.ts`, `player-position.ts`, `wow/common.ts`,
    rule-meta) widens to `--game ff` / `--game wow`.
  - **One game at a time** (user, 2026-10-13) for validation, baseline
    recaptures and sample fetches. Both games only after changing shared
    code: log fetching and transforms (`lib/log-transforms.ts`,
    `lib/log-auth.ts`, `scripts/lib/`), the shared damage layer
    (`lib/damage/*.ts` outside `ffxiv/` and `wow/`), or `validate.js`.
  - For an intended behavior change, confirm the `--check` diff is exactly
    the intended delta, then `--update`. `--prune` drops snapshots for
    deleted reports. `expectations/rulings.json` is hand-edited only.
- **No Tailwind reset is active.** Inline `style` objects, browser default
  styles apply (docs/app-architecture.md).
