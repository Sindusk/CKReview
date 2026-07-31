# VoD Coding

Raid log analysis app (Next.js) that imports WCL/FFLogs reports and flags
per-pull player errors for VOD review. FFXIV (Dancing Mad ultimate) and WoW
(Midnight Falls) are the active encounters.

**Before doing ANY mechanic-detection work, read `lib/mechanics/README.md`.**
It contains the attribution philosophy (which is mandatory, learned through
user corrections), the working method for building new detections, FFLogs/WCL
data-shape semantics (especially player-position rules), and known pitfalls.
Each mechanic module's own header comment is the authoritative model for that
specific mechanic — read it before editing the module. When starting
detection for a NEW mechanic, offer the user `lib/mechanics/SPEC-TEMPLATE.md`
to fill in before diving into log analysis.

Quick facts:
- Sample data: `sampledata/` (gitignored), fetched via
  `node scripts/fetch-{ff,wow}-report.js <code-or-URL>`.
- Validation: `node scripts/validate.js --check` (compares every mechanic's
  output against local `expectations/` baselines + rulings; args narrow by
  mechanic name and/or report folder), plus `npx tsc --noEmit`, before
  considering any mechanic change done. Intended behavior changes: verify
  the `--check` diff is exactly the intended delta, then `--update`.
  `expectations/rulings.json` is hand-edited only — never regenerated.
  `expectations/` and `sampledata/` are both gitignored local dev tools
  (log-derived data stays off GitHub); `--prune` drops snapshots for
  deleted reports.

Git workflow: once a change is working (validate.js + tsc pass, or for
non-mechanic UI work it's been reviewed), commit and push to `main` on
GitHub without stopping to ask first — this is standing authorization, not
a one-off. Deploying is a separate, deliberately manual step: never SSH
into the production server or run `./deploy.sh` — the user runs that
themselves for oversight after pulling your pushed commits.
