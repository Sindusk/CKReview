# Mechanic Error Detection — How This Directory Works

This directory contains encounter-specific error detection for raid mechanics,
organized per game and per raid:

```
lib/mechanics/
  MODEL-RESEARCH-GUIDE.md     — how to write a boss's encounter model (research stage)
  player-position.ts          — THE shared "where was player X at time T" lookup
  geometry.ts                 — distances/angles (two angle conventions — read its header)
  ffxiv/
    roles.ts                  — MT/OT/H1/H2/M1/M2/R1/R2 party-role detector (MT = the
                                boss's first auto-attack target)
    dancingmad/               — Dancing Mad (Kefka's Return) ultimate
      phase1.ts               — Phase 1 rules (Blizzard III, Tele-Trouncing, Confetti, ...)
      wave-cannon.ts          — Phase 1 Wave Cannon beams + towers
      kefka-says.ts           — Kefka Says / Mystery Magic rules
      graven-image.ts         — cross-pull Graven Image spread analysis
      graven2-strategy.ts     — Graven Image 2 strategy declaration
      forsaken.ts             — tower-soak mechanic (Phase 2)
      limitcut.ts             — gaze + numbered dash mechanic
      blackhole.ts            — tether/Earthquake mechanic
      stompies.ts             — post-Black-Hole Earthquake baits/towers
      exdeath.ts              — Phase 3 Thunder III / Shockwave
      ultimate-kefka.ts       — Phase 5 per-pull rules (Flood, Fell Forces stacks,
                                Maddening Orchestra, Celestriad towers, Stray
                                Apocalypse, Forsaken ground, Null enrage, collapse)
      blackhole-strategy.ts   — cross-pull strategy auto-detect (DSA/SDA/Double Tether)
      mitigation-*.ts         — mitigation sheet import / detection / review / heatmap
  wow/
    common.ts                 — shared WoW helpers (debuff windows, playerError,
                                battle-rez detection, dead-at-time, clustering,
                                Raid-marker sort offset)
    vs-dr-mqd/                — Voidspire, Dreamrift, March on Quel'Danas
      midnightfalls.ts        — Midnight Falls per-pull rules
      terminate-kicks.ts      — cross-pull Terminate kick-order detection
      crystal-assignments.ts  — declared crystal assignments
    va/                       — The Venomous Abyss
      entombed-sentinels.ts   — Entombed Sentinels per-pull rules (orbs, Living Venom,
                                Helical Toxins, Protovenom, Miasma soak, pools)
      vashnik.ts              — Vashnik per-pull rules (Malignant Totems, Exploding
                                Infection, Plague Froth/Wave, Bile, venoms, Fangs)
      sszorak.ts              — Sszorak per-pull rules (Serpent's Fury/Virulence,
                                Mutilate groups, Ravage, Tempest, Crosswinds,
                                Viscous Cysts, Howling Maelstrom)
      nekzali.ts              — Nek'zali per-pull rules (Vessel revivals, Ritual/
                                Uncoiled Rage, Pyre soaks, Barrage, pools, Mythic
                                well Curse/Soul Exhaustion, Invoke silence)
      lost-explorers.ts       — The Lost Explorers per-pull rules (fish clock /
                                Final Ascension, Relic Rupture, Blast Wave
                                bounces, Elemental Explosion, Mighty Thud soaks,
                                Shredding Shards swaps, avoidables, called wipes)
      twin-fangs.ts           — The Twin Fangs per-pull rules (Eternal Venom cap
                                and soft enrage, globule bursts/pickups, Feast
                                bites, Visceral Burst kicks, Stone Breaker soaks,
                                Tainted Burst, avoidables)
      coiled-altar.ts         — The Coiled Altar per-pull rules (Venom orb
                                eruptions, Guillotine soaks, Dreadmarch / ghosts /
                                Malevolent Resonance, Soulcoiler Wails and shields,
                                Nightfall, Spirit Erasure, frontals, avoidables)
      ulatek.ts               — Ula'tek per-pull rules (egg hatches and their
                                carrier, Caustic Waves, Spectral Coil soaks,
                                Serpent's Bite / Calcified Corpse, Volatile Purge,
                                Mother's Wrath, Blight Vein, add casts, enrage)
```

**Read the header comment of a module before touching it.** Each module's
header is the authoritative model of how that mechanic works. In newer
modules the header has three parts, top to bottom:

1. **VERIFIED AGAINST LOGS** — what real reports showed, with report codes
   and pull numbers. This part wins any disagreement.
2. **RULES IMPLEMENTED** — rule IDs and their severities.
3. **GUIDE-DERIVED MODEL** — the researcher's pre-log model (see
   [MODEL-RESEARCH-GUIDE.md](MODEL-RESEARCH-GUIDE.md)).

Older modules (FFXIV, Midnight Falls) predate the research step, so their
headers are log-derived only. This README covers what is *common* across all
modules.

---

## Architecture: the three kinds of detection

**1. Declarative single-ability rules** live in `lib/error-rules.ts` and are
evaluated by `lib/error-detection.ts`. Use these when a rule is expressible as
"this ability/debuff hit this player (maybe gated by one condition)". Modules
can also hold their own declarative rule tables and run them through
`evaluateRuleSet()` (midnightfalls.ts does this).

**2. Per-pull correlation modules** (forsaken.ts, blackhole.ts, limitcut.ts,
stompies.ts, exdeath.ts, phase1.ts, ultimate-kefka.ts, midnightfalls.ts, entombed-sentinels.ts,
vashnik.ts, sszorak.ts, nekzali.ts, lost-explorers.ts, twin-fangs.ts, coiled-altar.ts, ulatek.ts) exist because they
correlate *multiple* event streams — e.g. a stack-counter debuff against a
specific damage tick, or positions against an assignment schedule. Each
exports a `detectXErrors(players, deathEvents[, enemyCasts, enemyBuffs, ...])`
function called from the transform layer in `lib/log-transforms.ts`
(`transformFFightToPull` for FFXIV, `transformFightToPull` for WoW).

- **Self-gate on the mechanic's signature debuffs/abilities** so the module
  can run safely on every pull, including pulls that never reach the
  mechanic. No caller-side gating.
- Duplicate raid-level errors are suppressed by `suppressDuplicateRaidErrors`
  (2s per-ruleId window, keeps the first).
- `PullError` severity `"Raid"` is usually player-less and marks the pull's
  cutoff (see `types/PullError.ts` and philosophy point 4).
- Encounter modules (the WoW `va/*.ts` ones) are one module per boss, with
  a single `detect<Boss>Errors` entry point running every rule for that
  fight plus the pull-over markers.

**3. Cross-pull / strategy-driven detection** (terminate-kicks.ts,
blackhole-strategy.ts, graven-image.ts, crystal-assignments.ts, the
mitigation trio) runs over ALL of a report's pulls and is NOT called from the
transform layer — `app/page.tsx` recomputes it (typically into a separate
`displayPulls` layer or the Strategy dialog) because it depends on
report-wide context or user-selectable configuration.

**The declared-strategy pattern** (worth reusing): when ground truth is NOT
derivable from logs (e.g. per-matrix kick assignments — the log carries no
instance data and timing/position/order were all proven non-discriminating),
the user's strategy gets DECLARED in the module as data, then VALIDATED
against what detection *can* see. Display the declared strategy when
consistent; fail closed to raw detection when not. Declared config may power
attribution elsewhere, but only in provably-unambiguous cases.

---

## Attribution philosophy (follow strictly)

These rules were established through explicit user corrections. They apply to
every mechanic, in every game. When in doubt, come back here.

1. **Flag only the ROOT-CAUSE player.** Never auto-blame whoever took a stray
   hit. Decide by who was out of their *assigned* position / failed their
   *assigned* job, not by where the damage landed.
2. **Deaths are sometimes nobody's fault, and death fallout is never
   flagged.** When a player dies, every downstream consequence of that death
   (re-targeted dashes, tethers, cones, redistributed soaks) stays UNFLAGGED.
   The death's own cause is flagged where it happened — once.
3. **When attribution is ambiguous, flag all candidates rather than guess.**
   When fallout vs. genuine error can't be distinguished at all, stay silent.
   A false accusation is worse than a miss.
4. **Severity means consequence, not the kind of mistake.**
   - **Minor** = avoidable damage that didn't kill anyone or cause the wipe.
   - **Major** = caused the death of the player or another player, or led to
     the wipe.
   - **Raid** = leads to an inevitable wipe. A Raid error is the pull's
     cutoff point; errors after it don't count toward Report/PullList/statics
     totals.

   A Major must name a player (`report-data.ts` asserts `e.player!` on
   Majors). A failure nobody can be blamed for from the log (assigned by
   callout, dispel duty, ...) is therefore Minor or Raid, never a forced
   name. When a player-attributable failure also dooms the pull, emit the
   Major(s) on the players **and** a separate Raid marker. Put the marker
   `RAID_MARKER_SORT_OFFSET_MS` (1ms) after them, so the Analysis panel
   lists the causes first.
5. **Put distances/specifics in descriptions.** "~5.6 yalms off their spot"
   is the desired style — the number goes in the error *description*, even
   when the attribution decision itself didn't need geometry.
6. **The user's review is ground truth.** The first version of a rule will
   not be perfect. The user reviews pulls on VOD and reports precise
   corrections, e.g. "only X should flag" or "overload is always Major".
   Tune to that (code change plus a ruling) instead of defending the first
   guess. The research model and the logs are evidence; the user's call
   overrides both.
7. **Narrow overrides over wholesale replacement.** When a working check
   fails for one specific case, add a narrow override for that case — do not
   swap the whole mechanism for a new one that handles the exception.
8. **A ruling's `mechanic` is the HARNESS key, not the ruleId's prefix.**
   Several rules are namespaced `ffxiv-phase1-*` but are emitted by a
   different runner (every `ffxiv-phase1-wave-cannon-*` error comes from the
   `wave-cannon` mechanic, not `phase1`). A ruling scoped to the wrong
   mechanic silently matches nothing and fails as a phantom violation —
   check `--list` and the actual run output, not the ruleId.
9. **Pin a `mustNotFlag` tightly enough that it can't swallow a real error.**
   A player-only matcher forbids EVERY firing of that rule for that player in
   that pull. When the same rule legitimately fires again later (Dancing
   Mad's Damage Down does this constantly — a blameless raid-wide one
   followed seconds later by a real personal one), add `t` so the ruling
   pins the specific occurrence the user adjudicated.
10. **Raid-severity descriptions shouldn't assert a definitive outcome like
   "the raid wiped."** A raid can rez and keep pushing prog past a mistake
   this severe even though detection treats it as a cutoff point for further
   per-player analysis (confirmed 2026-07-30, Dancing Mad report
   Q3GzJNZg64k1hLRm pull 26: a death to the raid's SECOND Graven Image/
   Mystery Magic did not end the pull, unlike the first — see phase1.ts's
   GRAVEN_1_DEATH_WIPE_RULE_ID). Phrase these as "unresolvable from here" /
   "treated as a cutoff point," not "the raid wiped."

---

## The working method for building a new detection

Since the Venomous Abyss raid (Entombed Sentinels, Vashnik), a new boss goes
through four stages:

1. **Research model.** A researcher (Codex) writes the encounter model as
   the module's header comment, following
   [MODEL-RESEARCH-GUIDE.md](MODEL-RESEARCH-GUIDE.md), and commits it with no
   detector code. The model supplies how the fight works, correct play,
   failure modes with their expected log signal, fault, and consequence,
   strategy variance, and what is NOT an error. It is a strong starting
   point, but its spell IDs are journal links and usually wrong for the log.
2. **Verify against a real report.** The user supplies a log, ideally with
   many wipes and a kill. Fetch it
   (`node scripts/fetch-wow-report.js <URL> --boss "<name>"`) and check the
   model claim by claim. Write what the log showed as a
   `VERIFIED AGAINST LOGS` section above the model; the log wins every
   disagreement. In particular:
   - **Map every candidate spell to its real log IDs by event type** (cast
     vs begincast vs player aura vs boss aura vs damage vs tick vs penalty).
     Sweep ability names per stream across all pulls first; the name is
     more reliable than the journal ID.
   - **Use the kill as the clean baseline.** A rule that fires a lot in the
     kill is either measuring normal play or needs a threshold. Derive
     invariants from clean resolutions first, then look for what uniquely
     separates the failure.
   - **Confirm or refute each failure mode's log signal.** Record counts,
     cadences and thresholds with the evidence behind them (the worst clean
     value and the best failure value, with pull numbers).
   - **Check attribution feasibility.** When the model's "who is at fault"
     isn't recoverable from the log (e.g. Vashnik's missed totems: the
     nearest Froth lane missed each one by 3-10yd), fall back to a Raid or
     player-less Minor error and say why in the header.
3. **Survey every wipe for what ended it.** Every wipe should get one Raid
   error marking "the pull was basically over", in one of two forms:
   - a mechanic-specific Raid error (e.g. a missed-totem Malignance, a
     Helical overload), or
   - a generic pull-over marker when no mechanic caused it: 5+ players dead
     net of battle-rezzes, a tank death not recovered by a quick rez, a
     boss left untanked, or Berserk.

   Emit only the earliest generic marker, and only when no mechanic Raid
   came first. List any wipe the log can't explain in the header, since the
   user can Call Wipe those.
4. **Implement, validate, ship, report.** Build the rules (Architecture
   above; shared WoW helpers are in `wow/common.ts`). Wire the module into
   `lib/log-transforms.ts` and add a `scripts/validate.js` manifest entry,
   then pass the regression bar (below). Commit and push. Then tell the user
   what each wipe's cutoff was, and list the attribution calls you were
   unsure of as explicit questions. Their VOD review answers them (principle
   6 above).

Useful event-level recipes during verification:
- Cluster `applydebuff` events by second to find mechanic-start bursts.
- Sweep damage by ability ID within the mechanic's window.
- Group enemy events by `sourceInstance` to separate concurrent copies of
  one NPC.
- Trace deaths via `killingAbilityGameID`.
- For a debuff whose removal triggers something, check whether the removal
  was a death: a death within ~300ms of it.
- Recover positions per the position-semantics table below.

The same principles apply when refining any module:

1. **Geometry often fully overlaps between clean and failed pulls** (proven
   repeatedly: Forsaken flare plants, Forsaken cone-bait distances). When it
   does, gate on OUTCOME — who the follow-up actually hit, who died to what —
   instead of position. Reserve exact distance math for the error
   *description*.
2. **Process of elimination beats precise position matching** for
   attribution: if there are exactly N interchangeable candidates and N−1
   are already accounted for in the same resolution, the remaining candidate
   is decisive with zero geometry.
3. **Encode every threshold with both extremes in a comment** — the worst
   clean value observed and the best failure value observed, with report
   codes (e.g. `// clean max observed 1.06%, failure observed 2.69%`). This
   is what lets future logs retune a threshold instead of guessing.
4. **Sometimes there is no clean/failure gap.** Some deviations form an
   unbroken continuum (Tele-Trouncing arrows, Wave Cannon positions). Then
   an absolute threshold is a judgment call. Either switch to relative
   attribution (Wave Cannon flags only the worst member of an overlap
   cluster), or ask the user where to draw the line. Don't silently pick
   one.
5. **Before hardcoding a cross-report threshold from one pull, run
   `--check` with no arguments.** A "confirmed good" reading from another
   report, possibly cited only in a header comment, can contradict the new
   ground truth. Resolve that with the user instead of choosing a threshold
   that quietly satisfies neither.
6. **Validate before calling it done:** run `node scripts/validate.js` (no
   args = every mechanic against every report folder under `sampledata/` —
   run it all, one pull's log usually exercises several mechanics; pass a
   mechanic name and/or report folder to narrow), and `npx tsc --noEmit`.

### Lessons from building new bosses (Sszorak, Nek'zali)

- **Fetch one boss, not the whole report:** pass `--boss "<name>"` to
  the fetch script. Without it every fight in the report is downloaded.
- **Throwaway analysis scripts go in the session scratchpad,** written
  with the file-write tool; the user's shell hook blocks heredoc/redirect
  writes. A small shared loader (meta.json actor/ability maps + a
  `load(pullN)` returning the report and fight start) keeps each probe
  to a few lines.
- **Sweep first, then read.** One pass printing `stream | event type |
  abilityId | name | count | pulls | sources` over every pull maps nearly
  all IDs at once. Then print a per-pull timeline of the boss's casts,
  boss buffs and deaths; the fight's fixed timings usually fall out of it.
- **Split scripted from failed occurrences before blaming.** The same
  spell can be expected in one context and a mistake in another (Soulcoil
  Rite from Ignition/Invoke vs. from an add leak). Classify every
  occurrence by its scripted window first; only the remainder is a rule.
- **Check the kill before calling a guide's "dangerous" state an error.**
  Nek'zali's well team re-entered with Soul Exhaustion every phase 2
  window of the kill, and the tank ran 17-18 Hollowing stacks. When the
  kill does it routinely, gate on the outcome (a death), not the state.
- **Measure enrages from the phase start across pulls.** An identical
  offset in every pull (183.4s) means a timer-driven check, not a
  resource the raid can influence; phrase the Raid error accordingly.
- **After an enrage buff, drop per-player errors.** Once the boss
  one-shots everything, pools and hits are enrage fallout. The Raid
  marker still counts as the cutoff, even on a kill.
- **Tune the generic tank-death marker per boss.** Some fights carry on
  with one tank (Nek'zali pull 5 fought 67s more); gate on whether the
  pull actually ended soon after.
- **With few pulls, annotate instead of exempting.** When a heuristic
  might excuse a player but only one or two pulls support it, add the
  context to the description (e.g. "4 others stepped into pools within
  3s") and list the question in docs/open-items.md.
- **No character names in committed code or docs.** The repo is public;
  refer to players by pull + offset and role/spec in headers and
  comments. Names belong only in the gitignored `expectations/`.

### Lessons from The Lost Explorers (two reports, 34 wipes + a kill)

- **Two reports from different raids beat one big one.** Report A fed
  Iku -> Nama -> Gebbo, report B Gebbo -> Iku -> Nama, so every ultimate was
  seen early and late. Label them A/B with their codes at the top of the
  header and cite pulls as `A6 +188.9`.
- **Tabulate a failure's outcomes before choosing blame.** For Blast Wave, a
  per-detonation table (each hit player's Bounce start/end relative to the
  hit) split deaths into no-bounce, too-late and too-early, and exposed
  five waves where *nobody* bounced. Those became one player-less error
  instead of 5-13 individual Majors.
- **Check the generic "N dead" threshold against how long pulls survived
  it.** For each pull, print the time from reaching 5/6/7/8 dead to the pull
  end. Here 5-6 dead was survived for 50-120s in four pulls, while every
  pull that reached 7 ended within 31s, so the threshold is 7 for this fight.
- **Deaths with no killing blow, in bulk, are a called wipe.** Players at
  full health dying with `killingAbilityGameID` absent, several within
  seconds, shortly before the pull ends. Detect that first and ignore the
  deaths after it; otherwise the first tank among them becomes a false
  "Tank Died" cutoff.
- **Stack counts need an overlap allowance.** Shredding Shards is 7 per
  cast and every clean pull peaked at 7, but a swap can leak one shard (8)
  onto the old tank. The rule starts at 9, and skips when the other tank is
  dead (there was nobody to swap to).
- **When one player's cast starts the chain, blame the cast's timing.** The
  fish is a player cast; its time relative to Final Ascension's completion
  is the whole story (in time, late, or never), so the late case names the
  thrower and the no-fish case stays player-less.

### Lessons from The Twin Fangs (two reports, 38 wipes + a kill)

- **Fetch the reports one at a time.** Both are rate-limited on the same
  token; each Twin Fangs report took a few minutes with `--boss`. Probe the
  first one while the second downloads.
- **A stack resource with a lethal cap needs a ledger, not a threshold.**
  Eternal Venom's 10th application has no debuff event: the player dies to
  a separate "Eternal Venom" killing blow instead. Classify every
  application by the hit at the same millisecond (pickup, burst, Emergence,
  Spit, wave, ...), and find the fatal one as the latest venom-applying hit
  in the 1.2s before the death that did NOT already produce a logged stack.
  Start the ledger at the latest fresh `applied` (a death and rez resets it).
- **Enemy casts with a player target can be the cleanest per-stack record.**
  WCL logs an enemy "Eternal Venom" *cast* (1290336, source Vexhul or a
  Spawn) at each application, targeting the player, including the fatal
  10th. `EnemyEvent` doesn't carry the target yet; add it if a future rule
  needs per-application attribution beyond the damage-coincidence method.
- **Deaths can spawn the failure.** Every venomous death released 3 more
  globules ~2s later, and those bursts killed 13-18 at once. Tag a burst by
  its timing (12-17s after a Deluge = the Deluge's own globules; anything
  else = death-released) and list the deaths before it in the description.
- **A "min targets" penalty shows up as the NEXT hit, not a separate
  spell.** An under-soaked Ravenous Feast bite (<4 targets) was followed
  ~0.4s later by the same bite ID on 15-19 players. Gate on the victim
  count (clean max 9, failure min 15), not a penalty ID.
- **Multi-spawn adds need `sourceInstance`.** WoW `EnemyEvent`s now carry
  it (previously FFXIV only) so a recasting broodling counts once.
- **Check the kill for "avoidable" volume before trusting a hit as a
  mistake.** The kill still took 21 Stir waves, 13 Sanguine Storm hits and
  9 Congealed Gore episodes; they're flagged Minor and listed as volume
  questions rather than silently dropped.

### Lessons from The Coiled Altar (17 of 30 pulls, no kill fetched)

- **Big pulls hit the WCL rate limit.** Coiled Altar pulls are 10-52MB
  each; the fetch was blocked (429, "IP-level", ~19 min) after 17 of 30.
  Fetch the kill FIRST (`--fight <id>` with the kill's WCL fight id from
  meta.json), then the wipes, so a rate limit never costs the baseline.
  `--fight` keeps the per-boss pull numbering in file names.
- **Without a kill, calibrate against the wipes' clean stretches.** Every
  wipe has minutes of correct play before it fails. Normal Venom Rupture
  ticks (worst 615k) vs eruptions (848k+ median) came from comparing the
  same ability inside and outside the failure moments across 17 pulls.
- **Invisible objects leave player-side traces.** The orbs have actor
  entries but no events. Pickups are carrier debuffs; clears are Rupture
  stacks at the Sever millisecond (one stack per orb); a collision is a
  carrier debuff that starts or ends early within 0.4s before a huge hit.
- **"Who caused it" can be the player whose own debuff ended at that
  instant.** A ghost reaching its player shows only as an off-cycle
  Dreadmarch (no Malacrass cast in the last 1.5s) at the same millisecond
  that player's Unnerving Fixation ends.
- **Deaths with no killing blow have several meanings here.** A Dreadmarch
  walk-off (debuff removed with the absorb unbroken, death at that
  instant), a called wipe (4+ within 10s), and feared players falling.
  Classify falls before counting a called wipe.
- **Scope escalations to the failure's own aftermath.** A completed Wail
  preceded later, unrelated mechanic wipes; counting every death in the
  next 15s made it the cutoff wrongly. Count deaths only up to the next
  mechanic Raid, and require the pull to end soon after (35s).
- **Cascades need an "inherited" exemption.** A player who dies to
  Malevolent Resonance passes their ghost to someone new, often already
  touching another ghost. Treat an episode that starts within 1.5s of a
  fixate taken from a dying player as fallout, and merge a player's
  back-to-back contacts into one episode so the exemption covers them.
- **Multi-spawn adds need instance numbers on buffs too.** Enemy buff
  events now carry `sourceInstance` (from WCL's `targetInstance`, the
  buffed NPC's copy), in both the live builders and the harness, so each
  Soulcoiler's Spirit Shield and death can be tracked. WCL logs some add
  applybuffs twice; dedupe by instance.
- **Immunity soaks are strategy.** The second Guillotine always included
  two previously-marked players taking 0 damage. Skip zero-damage hits on
  soak and frontal rules unless the player died.
- **Shared helpers moved to `wow/common.ts`:** `clusterByGap` and `deadAt`
  (from twin-fangs.ts) are now exported for every WoW module.

### Lessons from Ula'tek (20 wipes + the kill of one 25-pull report)

- **Restart a running fetch to get the kill first.** The kill was the last
  pull. Stopping the fetch after pull 1 and re-running `--fight <killId>`,
  then the wipes, cost one pull; the IP-level 429 came after ~850MB (pull
  21), so the kill would otherwise have been lost. Queue the remaining
  pulls as one background command that sleeps out the block.
- **Hidden object state shows up as a raid-wide burst.** An egg hatching
  has no event of its own: Putrid Membrane lands on 16-20 players in the
  same second. Cluster those bursts, then read what happened to a
  carrier's debuff at that millisecond: removed at a Caustic Waves hit,
  removed with a Noxious Splash on two carriers, or removed at the
  carrier's death. Only the first two blame anyone.
- **A lockout debuff counts the soakers.** Spectral Coils damage all 20
  players the same way, so the damage can't tell who mitigated. Soul
  Constrictor (the "you just soaked" lockout) is applied to each mitigator
  at the impact millisecond. Look for the lockout before trying positions.
- **Companion debuffs at the mark turn a soak into arithmetic.** Ingested
  Venom lands on every Serpent's Bite helper at the Bite's own millisecond
  (one application per target they stand by). Counting helpers showed the
  requirement: 4 cleared it at 14s, 5 at 11s, 3 calcified.
- **"Applied" includes refreshes.** `refreshdebuff` maps to
  `debuffStatus: "applied"`. Count distinct players, not events, for
  anything that can refresh (Membrane, Ingested Venom).
- **Countdown buffs change ID at the enrage.** A Rawling's Boiling Venom
  1313758 is removed at death *or* at ~25s, when 1313757 replaces it in the
  same millisecond. A removal is only a death without the successor.
- **Count repeats when the first occurrence is routine.** Both Shriekers
  cast Acidic Expulsion once in every stage-3 pull, the kill included.
  Tracking casts per `sourceInstance` and flagging the second one kept the
  kill clean and still caught the P2 wipe.
- **Count by outcome, not by egg GUID.** Egg actors reuse instance numbers
  across waves and stages. Rawling spawns at each Coil impact (6 + 2 per
  stage-1 pair, 8 per intermission) account for every egg without tracking
  each one.
- **Gate the head-count marker on the pull ending.** 7 dead ended every
  pull within 28s except one, where 13 players fought on for 90s in stage
  3. The collapse marker now also needs the pull to end within 45s.
- **Journal counts can be off by one.** Toxic Incubation logged 5 hits per
  interceptor, not the journal's four shots; Stage 2 had four Doomscale
  Eggs and four Weakened Doomscales, not one per side.

### Lessons from Ultimate Kefka (a late phase, 29 pulls, no kill)

- **Fetch only the late part.** `fetch-ff-report.js --min-minutes 15
  --from-minutes 14` skips short pulls and starts the bulky streams 14
  minutes in, cutting each capture to ~1MB. Deaths and combatantInfo stay
  whole, so offsets hold. `validate.js` detects such a capture and runs
  only mechanics marked `lateCapture` on it; early-phase rules would read
  deaths without their damage and misfire.
- **Status IDs are reused across phases.** Celestriad's Lightning
  Resistance Down II is the same ID (1002998) as Exdeath's Thunder III
  mark, which made exdeath.ts flag both tanks in Phase 5. Sweep a new
  phase's IDs against the older modules; the debuff's cause ID
  (`causeAbilityId`) usually tells the two apart.
- **FFLogs death events land ~2.0s after the fatal hit.** Use the hit, not
  the death event, when deciding who was alive at a mechanic.
- **A later death proves an unseen raise.** With a late-start capture, a
  raise can fall outside the data; don't leave the player dead forever.
- **Gate on "the slots didn't shift" before judging a bait.** One tank
  death moves Flare onto a non-tank; one dead DPS moves Holy onto the
  tanks; a dead role group's Fell Forces retargets onto another group.
  Every such case in the sample was fallout, so the rules check that both
  tanks hold the auras and that enough baiters were alive first.
- **Test a guide's "stack" or "fixed damage" claim against the damage.**
  Fell Forces looked like fixed per-victim damage in the guides but split
  across the group in the log (a lone DPS took 4x the normal hit).

---

## Data-shape knowledge (read before designing any new check)

### Player position semantics (FFLogs)

**Never reimplement position lookup in a module.** The one shared
implementation is `findPlayerPosition` / `interpolatePlayerPosition` in
`lib/mechanics/player-position.ts`.

**It always checks every stream that can carry a player's own position, and
this is not configurable.** Per-call stream toggles were removed on
2026-07-31. A module that had quietly narrowed its streams produced a real
false positive: a stale sample made a stationary player look like they were
still walking.

The remaining per-call options are:
- `windowMs` — the staleness cutoff; always choose it deliberately
- `direction` — nearest vs at-or-before
- `maxSpanMs` — how far apart the two interpolation brackets may be; a 4.9s
  bracket once put a player in the wrong quadrant
- `positionSamples` — the FFXIV boss-hit stream (see below)

If a mechanic genuinely needs to exclude a stream, change the shared
function visibly, as a reviewed change. The semantics below are what it
encodes.

Every friendly-sourced FFLogs event stream carries position only for the
event's TARGET — never the source:

| Stream        | Position belongs to...          | Usable as "this player's own position"? |
|---------------|---------------------------------|------------------------------------------|
| `damageTaken` | the player (they're the target) | yes, always                              |
| `healing`     | the heal recipient              | only self-heals — see dual-check below   |
| `healingReceived` | the player (heals landing on them) | yes, always (FFXIV; often the densest non-damage source) |
| `casts`       | the cast's target               | only self-targeted casts                 |
| `damageDone`  | the enemy being hit             | never                                    |

- **The `healing` dual-check:** `PlayerInfo.healing` in the app is heals
  CAST BY the player, so its x/y is the recipient's. The validation harness
  builds the stream the opposite way, as heals RECEIVED. Position lookups
  therefore check both `target === player.name` and
  `source === player.name`, so a self-heal counts under either orientation.
  Natural HP regen (ability 1302, ~3s) makes self-heals a dependable
  passive source.
- **The one source-side exception:** querying `dataType: DamageTaken,
  hostilityType: Enemies` ("damage the boss took") returns the *attacking
  player's* own position.
  - It is wired end-to-end as `fflBuildPlayerPositionSamples` /
    `buildFFPlayerPositionSamples`.
  - Density varies a lot: roughly one sample per GCD for active attackers,
    but very sparse for healers (17 samples in a 13-min pull) and on some
    fights almost none.
  - Always gate its use with a staleness or distance ceiling, and prefer
    interpolation over trusting any single sample.

### WoW (Warcraft Logs) event semantics

- **`damageTaken` x/y is the victim's (the player's) position.** It is the
  main source of player positions for WoW.
- **Enemy events are filtered in the live pipeline.** `enemyCasts` holds
  completed `cast` events only; a `begincast` that never completes is
  invisible. That is what makes "the cast completed" a failure signal
  (Vashnik's Malignance). `enemyBuffs` is `applybuff` only; removals are a
  separate stream (`wclBuildEnemyBuffRemovalEvents`). Both buff streams
  carry `sourceInstance` = the buffed NPC's instance. Raw enemy cast events
  also carry the caster's x/y, but `EnemyEvent` doesn't expose it yet. Add
  it when a rule needs an object's position.
- **Debuff stack counts** arrive on `applydebuffstack` as
  `PlayerEvent.stack`. Sometimes the stack is the only visible form of a
  mechanic's state (Helical Toxins merge totals, Dripping Fangs double hits).
- **Aura removals don't say why.** Expiry, dispel and death all look alike.
  A death within ~300ms means it was death-stripped. A dispeller shows up
  only as a player cast (Purify, Cleanse, ...) targeting the holder at that
  instant.
- **Journal spell IDs rarely match log IDs.** Map by ability name across all
  streams first (see MODEL-RESEARCH-GUIDE.md for real examples).
- **Shared ability IDs cross encounters.** The arena-edge Deadly Venom
  (1297338) rims more than one Venomous Abyss arena, so every module must
  self-gate on its own encounter's signature before running any rule.
- **Raw enemy casts carry the caster's resources.** Besides x/y, each raw
  enemy `cast` has `classResources` (boss energy/rage, e.g. Nek'zali's
  type 3 energy), `hitPoints`/`maxHitPoints` and `facing`. Sampling them
  across a pull recovers the boss's energy curve and HP% at any cast —
  that is how Nek'zali's "no passive energy in phase 1" and "Uncoiled Rage
  at exactly phase 2 +183.4s" were found. `EnemyEvent` exposes only
  `hitPoints` (FFXIV); add fields when a rule needs them.
- **Instance numbers are reused.** A new spawn takes a freed instance
  number, so an instance casting its spawn ability a second time is NOT
  proof of a revival. Confirm with a companion event at the same instant
  (Nek'zali: Gravebound Advance + Vessel of Awakening, same millisecond).
- **Add deaths without enemy HP.** Sampled `damageDone` has no
  `targetInstance` or target HP, so an add's death time isn't directly
  visible. When the add has an on-death spell (Corpse Blight), its damage
  events' `sourceInstance` + timestamp give each copy's death.

### Coordinates, angles, and timestamps

- **Angle/bearing/distance math lives in `lib/mechanics/geometry.ts`** —
  never reimplement it in a module. Critically, TWO angle conventions
  coexist (its header explains): `polarAngleDeg` (0°=east, math convention —
  limitcut's internal slot fitting) vs `compassBearingOf` /
  `facingToCompassBearing` (0°=north — anything compared against strategy/
  VOD language or an actor's facing). Never compare an angle from one
  convention against the other. FFLogs `sourceResources.facing` is in
  **centi-radians**; convert with `facingToCompassBearing`.
- Positions are **centi-yalms**; Dancing Mad arena center is (10000, 10000)
  (`geometry.ts`'s `ARENA_CENTER`). Known radii: Forsaken tower ring r=800,
  Limit Cut bait slots r≈1880, Limit Cut clone spawns r=2000. The y-axis
  grows SOUTH (screen-style).
- Event timestamps are **absolute report milliseconds**. Fight-relative
  offset = t − min(all event timestamps in the pull).

### Fields that exist but aren't in the TypeScript types

FFLogs events routinely carry more fields than the declared types — check the
raw sampledata JSON before assuming a field needs a fetch change. Examples
already exploited: `extraAbilityGameID` on debuff applies (the attack that
CAUSED the debuff, surfaced as `PlayerEvent.causeAbilityId`/`causeAbilityName`),
`overkill`, `buffs` (dot-separated active-buff ID list on damage events),
`x`/`y` on various streams.

### "Missing field" triage — three different failure modes, three fixes

Before designing around a missing field (or concluding a re-fetch is needed),
identify WHERE it's missing:

1. **Dropped at fetch time** by `scripts/lib/slim-report.js`'s projectors →
   widen the projector and re-fetch (this happened with `overkill`/`buffs`).
2. **On disk but unread** by the transform layer / harness builders → just
   add the read (this happened with `healing` x/y — no re-fetch needed).
3. **Genuinely never sent by the API** (e.g. WCL sends no
   `targetInstance`/`sourceInstance` for Midnight Falls NPCs — concurrent
   copies of one NPC are indistinguishable) → design detection that doesn't
   need it. Verify by re-fetching ONE fight with a widened projector before
   concluding this.

---

## Known pitfalls (each one cost a real debugging session)

- **A dramatic damage/overkill number is not evidence of a problem.** Before
  concluding "X's hit is unusually big," pull the SAME ability's numbers
  across several CLEAN pulls — millions of overkill turned out to be one
  ability's constant, always-present signature (Black Hole Primordial Crust
  investigation). Cheap insurance: grep the ability ID across every pull in
  the sample set first.
- **FFLogs' "Limit Break" pseudo-actor** used to leak into the app's live
  `players` array and silently distort per-player logic. Filtered at the
  source in `buildFFPlayers` (log-transforms.ts) — but if a phantom "player"
  ever appears again, check for pseudo-actors before debugging detection.
- **Damage-event dedup timing:** the event that survives FFLogs' dedup can be
  the "landed" tick instead of the "calculateddamage" preview and may arrive
  slightly AFTER a paired debuff change (~90ms late observed). Correlation
  windows should extend to BOTH sides of the anchor timestamp.
- **A cast's own HP snapshot undercounts the raid's real progress** — hits
  landing a few seconds after a cast completes can still matter (Forsaken
  enrage check scans 6s past the final cast for an exact-0 HP hit; only
  exact 0 means the boss died).
- **`//` inside a `gql\`...\`` template literal breaks FFLogs' parser** — use
  `#` for comments inside GraphQL query strings.
- **Old notes' pull numbers may not match current captures.** Pull numbering
  has gone through three generations of sample tooling; when cross-referencing
  old findings, match by content (player names + timestamps + ability), not
  by pull-number label.

---

## Sample data & validation

- `sampledata/` (gitignored) holds one folder per fetched report:
  `sampledata/{ff,wow}/<reportCode>/` with `meta.json` + one
  `<Boss>_Pull<N>.json` per fight. Produced ONLY by
  `node scripts/fetch-ff-report.js <code-or-URL>` /
  `fetch-wow-report.js` (auth: `.credentials/`, see script headers).
  Re-fetching is cheap; don't hand-edit captures.
- `scripts/validate.js` is THE regression harness — one script, all
  mechanics (plus a `rules` entry that runs the declarative
  `lib/error-rules.ts` table through `detectPullErrors`, so single-ability
  rules get the same snapshot coverage the correlation modules have):
  `node scripts/validate.js [mechanic ...] [reportDir ...]`
  (`--list` prints mechanic names; no args = everything). It auto-discovers
  all report folders (any subdirectory containing `meta.json`) and rebuilds
  `PlayerInfo[]`/`DeathEvent[]`/etc. the same way the live pipeline does,
  via `scripts/lib/{load-report-folder,build-ff-players,build-wow-players,require-ts}.js`.
  A new mechanic needs only a new entry in its `MECHANICS` manifest — no
  new harness file.
- **Regression bar for any mechanic change:**
  `node scripts/validate.js --check` passes (see below) and
  `npx tsc --noEmit` is clean.

### Expected-output baselines (`expectations/`, gitignored)

`expectations/` holds log-derived data (real player names, error text), so
like `sampledata/` it stays out of git — both are local development tools,
not part of the codebase. It records what detection produces for each
report currently on disk. Two tiers with very different rules:

1. **Snapshots** (`expectations/<game>-<reportCode>.json`) — machine-generated
   full error output per report. `node scripts/validate.js --check` re-runs
   detection and reports every added (`+`), removed (`-`), and changed (`~`,
   with per-field before→after) error vs the baseline, exiting nonzero on any
   difference. `--update` regenerates them. Both accept the same
   mechanic/report narrowing args as a normal run.
2. **Rulings** (`expectations/rulings.json`) — small, hand-curated
   adjudications the user made during VOD review ("pull 15: only X should
   flag", "pull 10: Y must NOT flag"). Checked on every `--check`; NEVER
   written by `--update`. Pin the decision (who flags), not incidental detail
   like severity or wording, so rulings survive presentation-level changes.
   Schema and an example live in the file's own `_doc` block.

**Detection philosophy evolves — snapshot changes are the normal case, not a
test failure to fear.** The baseline's contract is "no behavioral change
ships unseen", not "output never changes". When a change is intentional
(e.g. a severity downgrade across a whole rule): make the code change, run
`--check`, and read the diff as the review artifact — it should show exactly
the intended delta (e.g. N lines of `severity: Major -> Minor`) and nothing
else. Then `--update`. An unexpected extra line in that diff is the system
working — investigate it before updating.

A **ruling** violation is different: it means the change contradicts a call
the user personally made. Never regenerate around it — either the change is
wrong, or the user has consciously revised their ruling, in which case edit
`rulings.json` by hand.

When a new report's pulls get reviewed, run
`--update sampledata/<game>/<code>` to snapshot it, and capture any explicit
user adjudications from the session as rulings.

**Sample-data lifecycle — reports are disposable, distilled knowledge is
not.** Old report folders get deleted to free space (re-fetching is cheap;
keep a curated subset whose pulls collectively exercise each mechanic's
known failure modes). A snapshot whose sampledata is gone is unverifiable —
detection can't re-run against it, so it can never fail again — and is
therefore dead weight: `--check`/`--update` warn about such orphans, and
`node scripts/validate.js --prune` deletes them (orphaned *rulings* are only
listed, never auto-deleted — hand-remove them once their lesson is
distilled). The one thing to check **before** deleting a report: anything it
uniquely proved must already be encoded durably — threshold comments with
clean/failure extremes, README rules, rulings whose lesson made it into the
module. The snapshot itself is never the long-term record; the code comments
and this README are.
