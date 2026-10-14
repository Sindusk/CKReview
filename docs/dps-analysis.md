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
- **FFLogs previews that never landed (FFXIV).** An unpaired
  `calculateddamage` on a player's outgoing hit is a hit the target turned
  immune to before it applied (invulnerable, untargetable, Dancing Mad
  P3's Epic / Fated Hero). It isn't damage: FFLogs' table leaves it out,
  and counting it hid AoEs on one target and casts that hit nothing
  (yBKPqGwHparm7Tk4, 2026-10-13). The app keeps them apart as
  `unlandedHits`. Players' damage taken still keeps them (a fully
  absorbed hit leaves only the preview).
- **Truncated ability lists.** The DamageDone table returns only each
  player's top 5 abilities. Per-ability totals need events (`--hits`).
- **Pets in debuff events.** The unknown Damage Down target was an AST's
  Earthly Star pet. Resolve actor ids, including pets, before counting
  victims.
- **Deaths with no damage.** A death entry with no damage recorded is
  probably a disconnect, not a mechanic.
- **A GCD estimate from logged gaps (FFXIV).** Logged intervals sit in
  ~44ms steps around the real GCD: some GCDs log one step late, the next
  sometimes pays it back. The mean (xivanalysis's "Estimated GCD") and
  the 10ms mode both misread the tier: a 2.45s Gunbreaker read 2.47,
  a 2.50s one 2.49. The app reads the tier with `timeline.ts gcdTierMs`
  (calibrated on recorders whose skill speed is in the log; the method
  is in its comment). The recorder's skill / spell speed is the exact
  check when a report has it (`combatantInfo` in the pull file).

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
- **First Monk and Summoner samples.** Monk Blitzes in Riddle of Fire
  are built (one per Perfect Balance charge with time, xivanalysis's
  rule); Riddle of Fire's +15% is confirmed from the multiplier. The
  Summoner had nothing to build: its short attunements were all forced.
- **oGCD AoEs** are checked for too few targets now (Bard Rain of
  Death); their hits are matched by the action's measured delay, since a
  stacked second press comes before the first one's hits.
- **Open:** drift's room-for-uses skips forced time while casts include
  presses made in it, which can hide drift (Bard Empyreal Arrow 67/69);
  the simple fixes flip verified counts elsewhere (docs/open-items.md).
- **xivanalysis's GCD Downtime undercounts hard casters by method**
  (K6qfMamL7rN8yz2Q Vamp Fatale, Sage, 2026-10-14): it measures from a
  hard cast's end and needs a full GCD + 150ms in every window, so ~1.6s
  after a Dosis and ~1s after a Eukrasian GCD go unseen. A count gap
  against it isn't by itself a sign the app is wrong. What was noise:
  delays under 0.35s past tolerance (a late weave's animation lock and
  latency), now dropped for FFXIV (`DamageGame.smallDelayMinMs`).
- **Input:** the user saves each player's xivanalysis page as HTML;
  `tools/xiva-html.js` cuts a ~500KB page to ~20KB of text with named
  action icons (see the skill).

## WoW case study (qpZx3mWaG7gcDdYB, 2026-10-13)

The first WoW study: Mythic Entombed Sentinels, against WoWAnalyzer pages
and, with no VOD, the top players' logs of the same boss
(NK1hBtW9rckdjq36). Progress and open items:
docs/damage-case-studies/qpZx3mWaG7gcDdYB.md. What generalizes:
- **The engine's estimated loss has a floor.** The best Destruction
  Warlock read 8% of their damage lost, the 57th-percentile one 15%; the
  comparable part is the excess (the reference comparison now prints both).
  Most of a top player's idle (~13%) belongs to no mechanic.
- **WoW queues casts into the same millisecond.** A hard cast lands and the
  next begins at the same timestamp; pairing the cast with that begin
  orphaned the next cast and read its cast time as idle (Wyrmtongues
  16.4M → 13.5M after the fix). FFLogs never does this.
- **The GCD changes with haste all pull** (procs, gear, lust; haste
  multiplies). `lib/damage/wow/haste.ts` fits it per player from hard-cast
  times (exact) and fast back-to-back instants; it reproduced Bloodlust's
  ×0.77 and Power Infusion's ×0.83. Haste rating converts at ~33 per 1% on
  that kill but varies with passive talent haste.
- **Movement** is a separate category: idle inside a mechanic's window
  beyond the player's own baseline. Measured excess was small (+4–8
  points); the context lists only windows that showed it.
- **Some logged casts aren't presses** (Bladestorm's Mortal Strikes, a
  Havoc copy logged as a cast) and some channels look off-GCD in the
  survey. Intervals far under a GCD give them away.
- **Cooldowns recharged by spending** (Arms: Avatar 90s, Colossus Smash
  45s, −1s per 20 Rage) can't take a fixed recast; fit interval against
  resource spent between casts.
- **WoWAnalyzer misses pre-pull casts and can model a cooldown wrong**
  (Soul Fire ~41s against ≥45s in three players). Its APL accuracy doesn't
  translate to damage, especially on cleave.
- **A same-spec comparison separates habit from setup**: the ~80ms press
  delay all three Arms Warriors (the 99th percentile too) showed isn't a
  finding; Havoc on the main target, which the top two never did, is.
- **A per-player GCD fit excuses a slow rhythm.** Hervous's base fitted
  1.13s against Cocomber's 0.98s (ratings explain ~3%). The pace check
  (`lib/damage/pace.ts`, inference) expects the fastest same-spec base on
  the pull or a loaded clear, scaled by rating haste, and counts the
  longer lock on instant GCDs: 2.18M for Hervous, not the ~6–7M a raw
  1.2s-vs-0.98s count gives (the gap check already counts idle past his
  own base). Healers are left out. The expectation is the **median** of the
  same-spec players loaded (pull + references), not the fastest: with
  eight reference kills the fastest drifted onto non-top players and
  flagged a 99th-percentile Havoc. Its result depends on which references
  are loaded; say which when quoting it.
- **Movement stays lenient (user, 2026-10-13).** Shadowmeld idled 29–52%
  inside his Murk, Miasma and slime-switch windows; the 100th-percentile
  Marksmanship Hunter (3Vz6Qt2RyTPXwpJn's Imnotanorc) 0–1% in the same
  kinds of window. The user chose not to count that against the player:
  showing it (blue) is enough, and demanding reference-level movement
  would push players to dodge mechanics to parse. Don't propose judging
  movement against a same-spec reference again.
- **Dead time ends at the next cast,** not the next logged event: a dead
  player's DoTs and pets keep logging (3Vz6Qt2RyTPXwpJn's three unraised
  deaths read as 40M+ of idle). Reference medians leave out players who
  died in the window.
- **A GCD's value must match hits by name too.** WoW logs many hits under
  another id than their cast (Havoc's Chaos Strike, Annihilation, Eye
  Beam). Matching by id alone priced Mythnarra's average GCD at 7k of a
  real ~219k and undervalued most players' gaps (Blkphnx 26k of 221k,
  Sylmigron 52k of 223k); every study number before 2026-10-13's fix was
  low. Check: a player's average GCD must sit below damage ÷ GCDs.
- **A resource logged on spenders only can still show waste**
  (spenderSnapshotWaste, wow/specs/shared.ts): each spender logs the amount
  before it; fit gain per builder on intervals that ended under the cap,
  and the shortfall where they ended at it is waste. Holy Power came out
  at ~80% of WoWAnalyzer's figure for both a weak and a 99th-percentile
  Paladin. Soul Shards, Essence and combo points could take the same.
- **Combat potions** (lib/damage/wow/specs/potion.ts): one per 5 minutes,
  not shared with health potions. Light's Potential measured +20–40% on
  hits (same ability, target and other buffs, within 60s); Potion of
  Recklessness valued by its measured haste. Some top players drink none.
- **Evoker exposed four engine assumptions** (Bragontix): empowers log
  their cast at the start beside the empowerstart (read as cancelled);
  a buff extended by removal + re-application in the same instant
  (Dragonrage under Animosity) split its window; a GCD that locks for a
  buff's duration (Deep Breath's flight) read as idle; and burst windows
  counted channel time as missing GCDs. A spec with channels, empowers or
  flights needs its first log checked for each.

## Analyzing a WoW kill: method and lessons (qpZx3mWaG7gcDdYB, 2026-10-13)

Sixteen players checked, each against a 99th/100th-percentile player of
the spec on another kill of the same boss (eight reference kills). What
worked, in order:

1. **One reference per spec, from the user.** Ask for a top parse of the
   spec on the same boss; fetch only that fight (`--fight <id>`, ~30–45MB)
   and baseline it (`validate.js --update <folder>`). A reference kill
   usually carries other top parses too: note them in the case study's
   table. The user saves each reference player's WoWAnalyzer page as well;
   the two pages side by side say which of its complaints are habits the
   best players share (WoWAnalyzer flags 99th-percentile players for
   potions, Focus waste, Implosion, Eternal Hunt, Vanish).
2. **Extract both pages**, list the claims where they differ, and verify
   each in the log; claims both players share are floors, not findings.
3. **Compare numbers, not grades:** `damage-compare-wow` (est. loss per
   second, GCDs a minute), casts per unforced minute per spell, damage
   share per spell, damage per cast inside vs outside a buff. Cast rates
   that match mean the rotation is fine and the gap is elsewhere (gear,
   talents, target count).
4. **Run every new check on the reference kills before trusting it.** A
   check that fires on the top player either matches WoWAnalyzer there
   too (a real, common loss) or is wrong (Barbed Shot at full Focus fired
   only on the weaker hunter because his gain happened to measure).
5. **Record per spec** in the spec module's header: matched, overstated,
   not adopted, and why.

WoWAnalyzer, read against the log:
- **Cooldown efficiency counts Stasis as ready time** (Dragonrage,
  Trueshot, Metamorphosis, Touch of the Magi, Implosion, Wake of Ashes):
  most "missed" uses were held through the 99% damage reduction or past it
  to sync with another cooldown. Check with `cooldown.js` (forced time and
  room) before believing a lost use.
- **Its "active time" includes Stasis**, so it reads 5–15 points under the
  app's uptime; compare players, not to 100%.
- **It's right about procs and resource spending** (Holy Power waste,
  spenders outside Eclipse, Eternal Hunt, Vanish): the app's rebuilds
  matched its counts within ~20%.
- **Some sections grade idle twice**: Elemental's Call of the Ancestors is
  active time inside each Ancestor window, the same idle the gap check
  counts.

What the log can't show (stop looking):
- **Cooldown reductions**: server-side, never logged (Windwalker's Fists
  of Fury resets: no buff, no cast pattern explains them).
- **Regen waste** for Energy / Focus / Runic Power passive gains while
  capped; only casts made at the cap are visible.
- **Crit chance**: talents and per-spell crit dwarf gear (section below).

Floors and leniency (user's choices):
- **Movement** idle is shown, never counted against a same-spec reference.
- **Idle during Stasis** is forced: casting through it showed no payoff
  after it (Arcane: Màzz cast through, hit no harder after).
- **Energy specs** (Assassination) read GCD gaps as loss that is really
  pooling: the 99th-percentile Rogues show more than ours.
- **Utility and defensives** (Touch of Karma, Astral Shift, Aspect of the
  Turtle gaps) are survival calls, not judged.

Per spec, what decided it (headers in `lib/damage/wow/specs/` hold the
detail):

| Spec | What separated our player from the top one |
|---|---|
| Destruction | Havoc on the main target; pace; Soul Fire is ~45s, not WoWAnalyzer's ~41s |
| Arms | Avatar / Colossus Smash recharge with Rage spent; pace |
| Devastation | engine fixes (empowers, Animosity, Deep Breath, channels); Strafing Run expiry; Essence income |
| Marksmanship | movement idle (lenient); potion |
| Havoc | Eternal Hunt (Eye Beam pressed before The Hunt); Fury cap and small delays are a floor |
| Arcane | small delays; Touch of the Magi holds are Stasis / Surge sync |
| Retribution | Holy Power at the cap (rebuilt from spender snapshots); pace; potion |
| Blood | idle; Runic Power waste is worth little (Death Strike is a heal) |
| Assassination | the opener Vanish (valued by the empowered Garrote); Energy floor |
| Windwalker | Fists of Fury cadence (resets not logged; open) |
| Demonology | nothing: rates match; the DPS gap is talents |
| Beast Mastery | Barbed Shot at full Focus is not waste; pace |
| Elemental | idle; Call of the Ancestors grades the same idle |
| Balance | spenders outside Eclipse; pace; cancelled Starfires |
| Protection Paladin | idle; potion |

Engine lessons that apply to any spec: GCD value must match hits by name
(many WoW hits log under another id than their cast); a dead player's
DoTs and pets keep logging (dead time ends at the next cast); burst
windows must take channel time out of the GCDs that fit; a buff removed
and re-applied in the same instant is one window; empower casts log at
the start. Data: the fetch keeps every self-applied buff and each
player's whole CombatantInfo, since spec buffs postdate the survey list.

## WoW secondary stats (researched 2026-10-13)

Sources: Maxroll, "Stat Diminishing Returns for World of Warcraft
12.0.1 - Midnight" (maxroll.gg/wow/resources/stat-diminishing-returns,
updated 2026-03-13); Wowhead, "Diminishing Returns on Secondary Stats"
(patch 12.1.5, 2026-03-04; brackets only, no level-90 conversion).

- **Rating per 1% at level 90:** crit 46, haste 44, versatility 54
  (1% damage done, 0.5% damage taken), mastery per spec. Tertiary:
  avoidance 37, leech 69, speed 12.
- **Diminishing returns** apply to % from rating only, progressively
  like tax bands: 0–30% none, 30–39% −10%, 39–47% −20%, 47–54% −30%,
  54–66% −40%, 66–126% −50%, nothing past 126%. In rating (Maxroll): haste
  penalties start at 1320, crit and mastery at 1380, versatility at 1620.
  Flat % effects (Bloodlust, talents that grant %) aren't penalised;
  rating procs (trinkets) are.
- **What the log has:** each player's CombatantInfo carries every stat
  (critSpell/critMelee/critRanged, haste*, mastery, versatility*,
  primary stats) and talents as unnamed node ids. The sample fetch keeps
  only haste (scripts/lib/slim-report.js).
- **Gear stats don't predict crit.** qpZx3mWaG7gcDdYB pull 3, own non-pet
  hits that can crit (abilities that never crit, like Rune of Lingering
  0/316 or Caustic Spatter 0/582, and always-crit ones left out),
  against 5% + rating ÷ 46 with the bands:

  | Player | Spec | Crit rating | Gear crit | Observed | Gap |
  |---|---|---|---|---|---|
  | Veinglas | Blood DK | 1171 | 30.5% | 33.0% | +2.6 |
  | Fwîî | Demonology | 1556 | 38.4% | 45.1% | +6.6 |
  | Bragontix | Devastation | 1251 | 32.2% | 39.4% | +7.2 |
  | Thatapaddlin | Protection Paladin | 1241 | 32.0% | 40.5% | +8.5 |
  | Neximage | Arcane | 660 | 19.3% | 29.9% | +10.5 |
  | Cocomber | Arms | 1306 | 33.4% | 50.2% | +16.8 |
  | Wyrmtongues | Destruction | 1146 | 29.9% | 47.1% | +17.2 |
  | Polpo | Retribution | 1387 | 35.1% | 53.1% | +18.0 |
  | Nearby | Assassination | 1522 | 37.8% | 57.1% | +19.3 |
  | Blkphnx | Windwalker | 1058 | 28.0% | 48.1% | +20.1 |
  | Mythnarra | Havoc | 1548 | 38.3% | 61.9% | +23.6 |
  | Shadowmeld | Marksmanship | 1714 | 41.5% | 65.9% | +24.4 |
  | Cocroach | Elemental | 999 | 26.7% | 53.1% | +26.4 |

  The gap is talents, per-spell and conditional crit (execute ranges,
  guaranteed-crit casts, stacking buffs), procs and sets, none of which
  the log names. Predicting crit means a per-spec effect library kept
  current per patch; measuring it per ability from the player's other
  pulls needs no library. The choice is open (docs/open-items.md, "WoW
  crit luck").
- **Haste:** the GCD model's on-pull calibration reads ~33 rating per 1%
  (18–37 per player) because it absorbs talent haste; the published gear
  conversion is 44. Between two players of the same spec only gear haste
  differs (open item on the pace check).

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
