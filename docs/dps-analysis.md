# DPS Analysis

How to answer "why does this group hit enrage, and what should each player
change?" from FFLogs data, and what the first study taught. Read this
before building rotation or damage-output tooling for the app.

The first study (2026-10) compared one static's six Dancing Mad enrages
(0.17%–2.7% boss HP left) against five clears from other groups with similar
compositions. The user's friend, the static's BRD, and their raid team then
reviewed the findings. **Their feedback overturned two of the three BRD
rotation claims.** Treat player feedback the way mechanic work treats VOD
review: as ground truth that the log analysis must survive.

## Scripts

| Script | Does |
|---|---|
| `node scripts/fetch-ff-dps.js <code-or-URL> [--pull n]... [--fight id]... [--hits Job:ids]` | Downloads aggregated tables and the player cast stream into `sampledata/ff/<code>/dps/`. It costs about 15 API points per fight and fetches one fight at a time. A pasted `?fight=` URL selects that fight. |
| `node scripts/analyze-dps.js <command> <ours>... --vs <theirs>...` | Read-only comparisons. Commands: `phases`, `players`, `window`, `casts`, `buffs`, `rdps`, `taken`, `debuffs`, `stacks`, `songs`. Run it with no arguments for the reference. |
| `node scripts/dump-player-events.js <code> "<boss>" <pull> "<player>" [--from M:SS] [--to M:SS] [--all-buffs \| --hits [name...]]` | One player's casts and own buffs (or damage hits with `bonusPercent` and `multiplier`) from a fetched sample, through the app's own transform. Use it to check a Damage-dialog finding, or a claim from xivanalysis, against the log. |

**Checking xivanalysis claims.** When the user pastes xivanalysis output,
check each claim in the log before building anything:
- Some claims hold: the DNC proc overwrite, the dropped proc and the
  dropped combo on jN3XDrf2z8PmLgRJ Vamp pull 8.
- Some hold but cost nothing: a Devilment woven 0.67s late still covered
  every GCD of the window.
- Some can't be seen in the log at all: feathers are gauge, so xivanalysis
  only says one "may have been lost".

**Rule for adopting them (user, 2026-10-12):** verify every xivanalysis
claim against the log first. A claim that holds and costs damage the app
doesn't count gets built into the app. A claim that is false or
inaccurate is reported to the user as such and not adopted. Don't adopt
claims that hold but cost no damage (healing efficiency, mitigation); say
so instead.

**Fetch options worth knowing:**
- `--phase` / `--window` / `--bin` set the comparison window: which phase,
  how many seconds from its start, and the bin size.
- `--hits Bard:7404` adds per-hit damage events for one job's abilities.
  The `stacks` command needs these.

**Pull numbers:** `--pull` uses the app's per-boss numbering, which can
differ from the FFLogs fight id. In one report, "pull 11" was fight 12.

## Method, in order

1. **Find the phase that decides the enrage (`phases`).**
   - If every log shows the same damage total for a phase, that phase has a
     fixed HP pool.
   - If the totals vary while the next phase's pool stays fixed, extra
     damage in that phase is lost (it doesn't carry over).
   - Dancing Mad: P2 (44.1M), P3 (75.1M) and P5 (56.9M) are fixed. P4
     varies and doesn't carry over, so only P5 DPS decided the enrage.
   - A varying total doesn't mean the phase's damage is free. P1 and P4
     are threshold checks: Kefka must be under 15% when P1 ends and under
     25% by P4's final Ultima Upsurge. The study missed this. Only the
     damage past the line is wasted, and the damage context marks that
     stretch forced. Holding burst past the line for the next phase is
     correct play (a Paladin's Confiteor chain at the end of P1).
   - Groups also hold DPS at the end of P3 (Stompies) to time the
     transition so cooldowns are back for P4. P3's pool is fixed, so that
     stretch is forced too.
   - So resources pooled for the final phase are free, as long as earlier
     damage checks still pass.
2. **Compare equal windows (`window`).** Measure every log over the same
   window from the start of the deciding phase, using a length every kill
   reaches (210s here). Per-phase averages mislead for two reasons:
   - Kills end at different times.
   - Wipes keep logging about 8s after the enrage with everyone dead.

   `players` and `rdps` end a wipe at the first moment 6+ deaths land within
   15s.
3. **Break the gap down by role, then by player.** Here:
   - Healers: −3.6k rDPS each, the biggest gap.
   - Tanks: −1.7k each.
   - DPS: about level with the clears.
4. **Check whether the gap is forced (`taken`, `debuffs`).**
   - Damage taken matched the clears, so the healers' extra heal GCDs were
     a planning choice, not forced by extra incoming damage.
   - Damage Down (1002911) was the single biggest finding. Stray Apocalypse
     exaflare hits in P5 leave it on until the phase ends (about 110s). It
     appeared in 4 of 6 enrages and in 0 of 5 clears.
5. **Split each player's rDPS (`rdps <Job>`).** The parts:
   - **Own damage minus damage received from others' buffs:** the player's
     own play.
   - **Damage given:** how much the player's buffs added to teammates. This
     depends on the teammates.

   The BRD's own damage was level with the clear BRDs. Their "given" was
   1k lower because the party hit softer under the buffs. Party
   composition and other players' losses show up on a buffer's rDPS.
6. **Only then look at the rotation (`casts`, `buffs`, `songs`, `stacks`).**
   - Count GCDs first; uptime is often fine.
   - Compare spender counts over the **whole** phase, not just the window.
   - Check any inference about gauges or stacks against damage events.

## Pitfalls (each one produced a wrong claim in the first study)

- **Window-edge artifacts.**
  - The BRD's second burst came about 5s later than the clear BRDs'. Their
    4th Apex Arrow landed at 209–212s, just past the 210s cutoff, and read
    as "one fewer Apex".
  - Most of an apparent 3.2k rDPS gap had the same cause.
  - Before reporting a count difference, check whether a burst window
    straddles the cutoff.
- **Cast timing doesn't show stacks or gauge.**
  - A long gap between Wanderer's Minuet and the first Pitch Perfect was
    read as Repertoire overcapping. The player said they always fire at 3
    stacks, and damage-event sizes (`stacks`) confirmed it.
  - Normalize each hit for crit (×1.6), direct hit (×1.25) and the event's
    `multiplier`, then compare it with the fight's 80th-percentile hit.
  - Multi-target phases (P3 has two bosses) and zero-damage hits look like
    low stacks; discount them.
- **Buff coverage, not cast gaps.**
  - Wanderer's Minuet was pressed 10–20s before the raid buffs and called
    misaligned. But a 45s song still covered the whole 20s buff window, as
    the player's raid lead pointed out.
  - Judge alignment by whether the buff window is covered.
- **Song cycle offsets start at the pull.**
  - That BRD's first Wanderer's Minuet was at 35s; the clear BRDs' was at
    1–2s.
  - That 35s offset explains every later song-timing difference, so it
    isn't a separate finding.
- **Truncated ability lists.** The DamageDone table returns only each
  player's top 5 abilities. Per-ability totals need events (`--hits`).
- **Pets in debuff events.** The unknown Damage Down target was an AST's
  Earthly Star pet. Resolve actor ids, including pets, before counting
  victims.
- **Deaths with no damage.** A death entry with no damage recorded is
  probably a disconnect, not a mechanic.

## Estimating impact

- Convert each finding into missing damage, then compare it with the HP
  left at the enrage (boss % × the deciding phase's pool).
  - Example: a healer under Damage Down lost about 1M while the pull was
    only 0.1M short, so that one hit decided the pull.
  - Present the findings ranked by that number.
- Per-cast values from tables are rough because of the top-5 truncation, so
  state the basis of each estimate.
- When a finding rests on inference rather than measurement, say so. The
  player will check it against what they actually press.

## Crit luck

The Damage dialog shows where each player's pull sat among the outcomes
the same rotation could have rolled. That's the method of
howbadwasmycritinxiv.com and the `ffxiv_stats` package
(`lib/damage/crit-rates.ts`, `lib/damage/crit-luck.ts`).
- **FFLogs has gear stats only for the player who recorded the log.**
  The `combatantinfo` events carry real crit / direct hit / determination
  only for them (ACT's PlayerStats line).
  - Everyone else gets `simulatedCrit` / `simulatedDirectHit`. These are
    estimates from that fight's own hits, not gear, so they're useless
    for luck.
  - The logger's stats reach `PlayerInfo.stats`, and crit luck uses them
    as exact rates. Samples fetched before 2026-10-08 lack them;
    re-fetch with `--refetch`.
- **Everyone else's rates are estimated from their hits across the loaded
  pulls.** Only unbuffed hits count, with no guaranteed crits and no
  always-crit abilities. On `jN3XDrf2z8PmLgRJ` this recovered the
  logger's real gear within sampling error.
- **How much data each case needs (user, 2026-10-08):**
  - **One loaded pull:** the dialog says "needs more pulls", because the
    estimate would absorb the luck it's meant to measure.
  - **Two or more pulls but under 2,000 unbuffed hits (about 8–10
    pulls):** the percentile shows with a "?" on an amber panel as a rough
    idea. One pull's estimate is ±3% on crit, which moved the kill's
    percentiles 30–60 points.
- **FFXIV DoT ticks never crit in FFLogs.** They're logged at their
  expected value, so they carry no measurable luck and are left out.
- **A dance partner's hits list Devilment twice.** Count each buff once.
- **Check:** `node scripts/validate.js crit-rates <folder> --calibrate`.
  The percentiles over all players and pulls should fall about 10% in
  each tenth; they do on both FF samples. `--luck=<boss>:<pull>` prints
  one pull, and `--stats=Name:crit:dh` compares an estimate with real
  gear.

## Patch-specific analysis (case study in progress)

The FRU kill dDar482XvFKBPJYh fight 3 (2025-02-21, patch 7.1) is being
compared player by player with xivanalysis's feedback on it. The app
applies the vendored 7.4 data to every log; xivanalysis switches by the
log's patch (`parser.patch.before('7.2')`, data layers in
`src/data/*/layers`). What the study has shown so far:
- Checks valued from the log's own damage carry across patches: GCD
  gaps, AoE on one target, tincture placement, Esteem slots (read from
  the pet's hits).
- Checks that encode a rule are the patch-sensitive ones: expected GCDs
  and actions in a burst window, cooldown lengths, proc durations, gauge
  rules, AoE target counts. For this comp, xivanalysis's own rules
  changed for RPR (7.2 AoE breakpoints, 7.3 Enshroud cooldown), PCT (7.2
  only: Starry Muse could drop Hammers), BRD (7.3/7.4 potencies), NIN
  (7.3 frog thresholds) and AST (7.2 Gravity targets).
- The on-disk sample is a partial (P2-P3) capture with baselines. The
  full kill is refetched separately and swapped in only for print-only
  runs (`damage-analysis`), then the partial file is restored.

**Patch detection is built** (`lib/damage/ffxiv/patches.ts`): each pull
carries the report's start time (`Pull.reportStartedAt`, from the FFLogs
report query; sample `meta.json` files carry `startTime` since
2026-10-12), `DamageGame.patchOf` maps it to a patch from xivanalysis's
global release dates, checks read it as `ctx.patch`, and the Damage
dialog says which patch's rules it judged by. Pulls without the date use
the current rules. First rule switched on it: Pictomancer's Starry Muse
(7.2 allowed trading Hammers for Subtractive spells). A new
patch-specific rule goes in the check that encodes it, keyed on
`ctx.patch`, with the patch and its source in the comment.

Built from the eight-player comparison (each job module's header records
what matched and what wasn't adopted): pet damage credited to owners,
tinctures, Living Shadow, Passage of Arms channel as forced time, heal
GCDs out of burst windows, small delays from 0.5s, AST cards and Earthly
Star, cooldown drift that simulates charges and downtime, Addersgall on
the timeline, NIN Kunai's Bane / Ninki / Kazematoi / Bunshin, RPR
double-Enshroud Arcane Circle / Death's Design / Harvest Moon / Shroud,
the BRD three-buff burst window and Army's Muse haste, PCT Palette gauge
and Monochrome Tones.

The second study, the Dancing Mad kill qjCMx4bRfgNKwX9T (patch 7.5,
2026-10-13; DRK, WAR, AST, SCH, RPR, DRG, DNC, PCT), had no patch
differences to account for: xivanalysis has no rule layers past 7.4.
Built from it: DRK Salt and Darkness, WAR Beast Gauge (the first
Warrior sample), the DNC Technical Finish rules (xivanalysis's
Fountainfall allowance; a filler no longer charged twice) and proc
values net of the GCD they replace (`DamageGame.procReplaces`). What
generalizes:
- **A second check on the same window must respect forced time and
  not re-count.** The DNC filler and PCT Additive checks ran beside
  `burstWindowFindings` but ignored forced time and charged the GCD
  the main check had already valued as "the GCD used instead".
- **A GCD proc lost is worth its consumer minus what it upgrades.**
  Against the player's average GCD (burst GCDs in it), a Reverse
  Cascade came out at 0k; against nothing, a Last Dance at its whole
  86k.
- **xivanalysis's DoT clipping is target-blind** (again): P3's two
  bosses inflated AST Combust to 11.8s a minute and SCH Biolysis to
  15.8s; per target, 2.3s and ~2.6s.
- **It can't see pre-pull casts** (the AST's pre-pull Earthly Star read
  as a held one) **or lockouts** (SCH Dissipation while Seraph is out,
  confirmed by the user).
- `cooldown.js` now applies the engine's pre-pull evidence.

The same report's second kill (fight 16, the app's Pull 2; PLD, GNB,
AST, SCH, VPR, BRD, MNK, SMN) turned the comparison around: most fixes
were to the app's own engine, found where xivanalysis was right.
- **The engine can miss what xivanalysis sees.** A status applied before
  the pull shows only its removal (PLD Fight or Flight at −2.2s, now
  opened one duration early); a proc expiry with any cast within 0.2s read
  as consumed (about 60 real expiries across the samples, now only the
  consumer counts); a GCD measured as the most common 10ms bucket split
  2.47s into 2.45/2.49 (GNB's 8-or-9 rule now reads the mean).
- **End of the pull:** gauge left at a kill is lost (GNB cartridges,
  `leftAtKill`); a cooldown pressed too late for its effect isn't a use
  (SCH's last Aetherflow, 0.2s before the kill); a window whose full span
  runs past the kill is skipped (VPR Reawaken ended early by Ouroboros).
- **Input:** the user saves each player's xivanalysis page as HTML;
  `tools/xiva-html.js` cuts a ~500KB page to ~20KB of text with named
  action icons (see the skill).

## Ideas for app tooling

All of these are built in the Damage dialog (`lib/damage/`). The build
record is [damage-analysis-plan.md](archive/damage-analysis-plan.md).

- Phase-pool detection, and the equal-window comparison against
  user-supplied clear logs.
- An rDPS split per player (own, received, given), so buffers aren't blamed
  for their party.
- Counting Damage Down and other penalty debuffs in the deciding phase,
  with each victim and their uptime.
- Healer damage-GCD vs heal-GCD counts, beside raid damage taken.
- Job-specific checks that use damage-event sizes (stacked spenders) rather
  than cast timing.
