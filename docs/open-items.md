# Open Items

Decisions waiting on the user, concrete todos, and pointers to plans not yet
started. Ask the user before picking an item up, and delete it here once
it's resolved.

What doesn't go here (trimmed 2026-10-15):
- **VOD questions** about a boss live in that module's header, in an
  `OPEN QUESTIONS (VOD needed …)` block (table below). `/refine-module`
  reads the header when a VOD of that boss comes in.
- **Builder's choices not yet confirmed** (thresholds, constants) and
  **review history** (what a case study matched, built, rejected) live in
  the module headers, next to the code they describe.

## Decisions waiting on the user


- **Dancing Mad: hide Raid errors after the pull's cutoff too?** Player
  errors after the cutoff are already hidden. The user's expected readings
  suggest yes; not decided.
- **Mitigation "tight" (2026-10-14).** "Tight" follows the optimizer (good
  on the median, worst pull under 15%), so a hit over 30% typical with a
  bad worst pull (Red Hot's Plunging Snap, 37% / 5%) isn't flagged or
  planned. Counting it would change the optimizer's tier 2.
- **WoW same-spec pace: gear-haste conversion (proposed 2026-10-13).**
  `lib/damage/pace.ts` scales a peer's base GCD by rating haste from the
  pull's own calibration (~33 rating per 1%), which also absorbs talent
  haste. Same-spec players share talent haste, so only gear haste should
  separate them: 44 rating per 1% with the diminishing-returns bands
  (docs/dps-analysis.md, "WoW secondary stats"). Hervous vs Cocomber:
  ×1.022 by gear against ×1.034 from the calibration, so the expectation
  is a little too fast. Proposal: the published conversion in the pace
  check; the calibration stays as the GCD fallback. Stage 0 of
  [wow-sim-plan.md](wow-sim-plan.md) (talent haste known) would settle it
  properly.
- **WoW crit luck: talent library vs measured rates.** Gear crit
  undershoots what players crit by +2.6 to +26.4 points on
  qpZx3mWaG7gcDdYB (table in docs/dps-analysis.md). Recommendation:
  measured, per ability from the player's own hits across the other loaded
  pulls (leave-one-out, the FFXIV fallback in `lib/damage/crit-rates.ts`);
  needs several pulls of the player. Nothing built; the dialog shows no
  crit luck for WoW. A talent library is now part of the sim plan, but
  only for budget effects; crit is a damage modifier (its stage 3).
- **WoW patch dates.** No WoW patch/hotfix table (FFXIV has
  `lib/damage/ffxiv/patches.ts`), so every WoW check uses current rules.
  The source of dates is still to be agreed.
- **WoW cooldowns with no direct damage** (Combustion, Bestial Wrath,
  Breath of Eons): the old note said their drift is "found, marked
  inference, not valued", but `checks.ts` skips any cooldown whose
  per-use value is 0, so no finding is shown at all. Show them as
  unvalued findings, or keep skipping?
- **Statics values never tuned with the user:** death-chain gap 10s and
  end window 15s, `MIN_CHANCES` 5, `COMPARE_SESSIONS` 3
  (`lib/static-review-data.ts` header).
- **WoW healers judged on healing, not damage (user decision 2026-10-15,
  deferred: "in due time", no plan doc yet).** In the Damage tab, WoW
  healers should be judged on healing, their version of DPS. FFXIV
  healers stay damage-first. Today `lib/damage/wow/specs/healer.ts` only
  prices mostly-overheal heal GCDs as lost filler damage. Raw HPS alone
  misleads (healing is capped by incoming damage, healers snipe each
  other's heals, overheal inflates it), so the discussed shape is:
  - effective healing in the seconds after each raid hit, reusing the
    mitigation analysis's hit timeline;
  - healing cooldowns lined up with damage events (cooldown drift for
    healing);
  - mana: running out before the kill, or ending it with a lot unspent;
  - a same-spec top parse on the same boss as the reference, as damage
    uses;
  - damage and wasted heal GCDs kept as a secondary line.

  It depends on talent effects from [wow-sim-plan.md](wow-sim-plan.md)
  stage 0. QuestionablyEpic (the healers' gear and stat tool) has **no
  licence** (checked 2026-10-15: no LICENSE file, none in package.json),
  so it's all rights reserved. It can be read as a reference only, through
  that plan's clean-room process; reusing any of its code needs the
  author's permission.

## Todos

**Data to fetch** (neither report has a folder under `sampledata/wow/`):
- **The Coiled Altar:** pulls 18-30 of wThYvpJkbK6Pjrdc, especially the
  kill (no kill baseline yet), then re-check every threshold and Minor
  volume (`node scripts/fetch-wow-report.js wThYvpJkbK6Pjrdc --fight 23
  ... --fight 35`).
- **Ula'tek:** pulls 21-24 of JZp82Rm7TzycM94a (`--fight 25 --fight 26
  --fight 27 --fight 28`), then `--check` and `--update`.

**Damage:**
- **Viper (and likely Ninja) GCD tier.** The skill-speed-420 Viper on
  qjCMx4bRfgNKwX9T fight 16 (2.12s with Swiftscaled) reads 2.10; its
  intervals cluster at 2.087 and 2.131. Needs a look at which VPR GCDs the
  intervals pair up (`lib/damage/timeline.ts` header).
- **Dancing Mad per-player busy windows** (tower soaks, debuff carriers,
  baits) aren't in its damage context, so gaps during a mechanic are
  labelled but counted. Candidate: the DRK's 4.6–4.9s idle after LB3 in
  Limit Cut, every pull.
- **Unverified, waiting for a sample:** FFXIV WHM and MCH damage checks;
  mitigation catalog entries for Warrior, Machinist (Dismantle), Red Mage,
  Ninja, Monk, Summoner; the WoW specs listed as unverified in their spec
  headers (`lib/damage/wow/specs/`). Fetch a sample when a static or
  reference clear includes one and check its findings before anyone relies
  on them.
- **Stale "unverified" labels** in `lib/damage/ffxiv/jobs/melee.ts`
  (Monk, Dragoon, Ninja, Reaper), `ranged.ts` (Bard) and `caster.ts`
  (BLM, SMN): those jobs have since been checked against xivanalysis.
  Update the labels.
- **Oath Gauge start disagrees:** `lib/mitigation/tanking.ts` simulates it
  from 0 at pull start, `lib/damage/ffxiv/jobs/gauges.ts` from full. Pick
  one.
- **Confirm with players** (no VOD needed, just ask): the Paladin's 1.3s
  gap holding Passage of Arms on jN3XDrf2z8PmLgRJ (Passage of Arms is now
  out of GCD downtime, so rerun the kill first; probably moot); the PCT
  holding only one Hammer in every Starry Muse on dQ8wmb1VhKt6yBXk.
- **Nothing reviewed with players yet.** The user will refine each job or
  spec with the people who play it; snapshots and rulings come once
  findings survive player feedback.

**Detection:**
- **Exdeath: non-tank Thunder III recheck.** Two non-tanks marked was an
  unexplained failure; `exdeath.ts` now keeps only marks caused by
  Thunder III (47884). Rerun over the FFXIV samples to see whether the
  observation survives, then fix or delete the header note (~152-159).
- **Fallback model for WoW.** Enabled for FFXIV only; turn it on when a
  WoW boss without a module is tested (Nymrissa Wavecaller).
- **Statics group duties that look loose:** Hungering Pyre's detected
  group is 11 players, Guillotine's 7 for a 5-player soak. Check against
  a real raid plan before trusting those names (`assignments.ts`).
- **Statics, Lost Explorers report B (8PQFgdDh3R9BW71t), needs WoW VODs:**
  pull 1 3:07 late fish, pull 2 1:05 unfed cycle now on the carrier,
  pulls 4 2:33 / 9 2:37 shard sets on non-tanks, pulls 11 7:17 / 15 7:12
  enrage cycles treated as no fish chance.

## Open VOD questions, by module header

Each file below ends its header with an `OPEN QUESTIONS (VOD needed;
moved from docs/open-items.md 2026-10-15)` block. Items marked
**[STALE?]** look answered by later rulings or code: confirm with the user
and delete them from the header.

| Boss | Header | Notes |
|---|---|---|
| Entombed Sentinels | `lib/mechanics/wow/va/entombed-sentinels.ts` | groups the user doesn't know; no VODs |
| Vashnik | `lib/mechanics/wow/va/vashnik.ts` | same |
| Sszorak | `lib/mechanics/wow/va/sszorak.ts` | ask once the user's group reaches it |
| Nek'zali | `lib/mechanics/wow/va/nekzali.ts` | 6 pulls only |
| The Lost Explorers | `lib/mechanics/wow/va/lost-explorers.ts` | |
| The Twin Fangs | `lib/mechanics/wow/va/twin-fangs.ts` | |
| The Coiled Altar | `lib/mechanics/wow/va/coiled-altar.ts` | |
| Ula'tek | `lib/mechanics/wow/va/ulatek.ts` | |
| Midnight Falls (deprecated) | `lib/mechanics/wow/vs-dr-mqd/midnightfalls.ts` | record only |
| Fallback model | `lib/mechanics/fallback.ts` | |
| Vamp Fatale | `lib/mechanics/ffxiv/arcadion/vamp-fatale.ts` | |
| Red Hot and Deep Blue | `lib/mechanics/ffxiv/arcadion/red-hot-deep-blue.ts` | 2 [STALE?] |
| The Tyrant | `lib/mechanics/ffxiv/arcadion/tyrant.ts` | 3 [STALE?]; A1-A29, N1-N9 reviewed since |
| FRU P2 Usurper of Frost | `lib/mechanics/ffxiv/fru/usurper-of-frost.ts` | 3 [STALE?] |
| FRU P3 Oracle of Darkness | `lib/mechanics/ffxiv/fru/oracle-of-darkness.ts` | 2 [STALE?] |
| FRU P4 Enter the Dragon | `lib/mechanics/ffxiv/fru/enter-the-dragon.ts` | |
| FRU P5 Pandora | `lib/mechanics/ffxiv/fru/pandora.ts` | 1 [STALE?] |
| TOP P1 Pantokrator | `lib/mechanics/ffxiv/top/pantokrator-conga.ts` | |
| Dancing Mad P1 | `lib/mechanics/ffxiv/dancingmad/phase1.ts` | 1 [STALE?] |
| Dancing Mad Forsaken | `lib/mechanics/ffxiv/dancingmad/forsaken.ts` | 1 [STALE?] |
| Dancing Mad Limit Cut | `lib/mechanics/ffxiv/dancingmad/limitcut.ts` | |
| Dancing Mad Black Hole | `lib/mechanics/ffxiv/dancingmad/blackhole.ts` | |
| Dancing Mad Exdeath | `lib/mechanics/ffxiv/dancingmad/exdeath.ts` | see the todo above |
| Dancing Mad Stompies | `lib/mechanics/ffxiv/dancingmad/stompies.ts` | |
| Dancing Mad P5 Ultimate Kefka | `lib/mechanics/ffxiv/dancingmad/ultimate-kefka.ts` | |
| FFXIV roles | `lib/mechanics/ffxiv/roles.ts` | 1 [STALE?] |

## Plans not started

- [xiva-audit-plan.md](xiva-audit-plan.md): audit every xivanalysis
  module job by job against the FFXIV damage checks. Phases 1 and 2 done
  for all 21 jobs (2026-10-15). Phase 3 (premise and firing checks,
  building candidates) is ongoing: each ledger's "Open" list is its work.
  Every job now has samples on disk. The AoE-on-too-few-targets candidates
  were built 2026-10-15 for all eleven jobs (DNC, DRK, WAR, GNB, MNK,
  NIN, SAM, MCH, RPR, BLM, SMN), checked on 19 Red Hot and Deep Blue
  kills the user picked, and matched against 16 xivanalysis pages
  (2026-10-15). The check is buff-neutral since then (user: accuracy
  first): crit, direct hit and damage multipliers are divided out of both
  sides, so bursts, crits and damage-reduced targets no longer decide it.
  Still open: no finding when the single-target alternative was never
  pressed in the pull (Grim Swathe with no Blood Stalk; no potency table
  for most jobs to fall back on). The same gap for procs was closed
  2026-10-16 for the four seen (Primal Wrath, Primal Rend, Ogi Namikiri, Eye Gouge):
  a never-pressed consumer is priced from a sibling by a ratio measured on
  disk (`PROC_CONSUMER_FALLBACK` in jobs/ranged.ts); others still show
  nothing until a ratio is measured for them.
  Cooldown drift valued 2026-10-16 for Perfect Balance, Meikyo Shisui,
  Serpent's Ire, Manafication and Ley Lines (tracked-cooldowns.ts); each
  matched one xivanalysis page on uses lost. Manafont and Triplecast stay unvalued (no
  single action to price). Amplifier skipped below level 86 (TEA).
  Party buffs held too long go unreported (2026-10-16): a cooldown
  that deals no damage has no value in the drift check. The five self
  damage buffs are valued now (`selfBuffValue` in tracked-cooldowns.ts:
  No Mercy, Fight or Flight, Riddle of Fire, Raging Strikes, Lance
  Charge; matched No Mercy 7/10 and Lance Charge 7/10 on pages), and so
  are Inner Release (`innerReleaseValue`) and the party buffs: a lost use
  is what an average cast of the buff added to the party's hits, the
  caster's own included (`BuffLedger.addedBy`; full value, user
  2026-10-16, though a static may hold them to stay in sync). Technical
  Step still isn't: its party buff comes from the finish, not the step.
  15 pages compared 2026-10-16 (GNB, RDM, BLM, DNC ×2, DRK ×2, PCT, NIN,
  RPR, SGE, WAR, VPR, BRD): most checks built that day matched; fixes from
  them: declared proc consumers (Primal Rend drops went unjudged), a GCD
  ending Viper's Poised, Kunai's Bane on an add, Infuriate's wasted
  refunds. Each ledger row says what matched and what wasn't adopted.
  - [core.md](xiva-audit/core.md): core modules, 2 candidates (raid
    buffs of one job overlapping, rare in a fixed static; Bard's
    BuffGroupWindow); procs on an invulnerable target are
    `noDamageCasts`'s (2026-10-16).
  - [brd.md](xiva-audit/brd.md): Bard, 1 candidate (failed buff
    overlap, never seen on 322 applications), 4 covered.
  - [dnc.md](xiva-audit/dnc.md): Dancer, 1 candidate (Closed Position,
    never seen), 8 covered (dance checks and Devilment outside Technical
    Finish built, awaiting xivanalysis pages).
  - [pct.md](xiva-audit/pct.md): Pictomancer, 1 candidate
    (Hyperphantasia, only lost at deaths on disk), 6 covered (portrait
    overwrites built 2026-10-16; Striking Muse not judged on 7.2).
  - [ast.md](xiva-audit/ast.md): Astrologian, 0 candidates, 4 covered.
    Early Earthly Star detonations built 2026-10-16 (the user: a mistake
    worth a finding); 99 on disk; matched xivanalysis's Stellar Burst
    count (2) on K6qfMamL7rN8yz2Q (its suggestion can't fire: bug).
  - [sge.md](xiva-audit/sge.md): Sage, 0 candidates (Eukrasian
    Dyskrasia on one enemy built 2026-10-16).
  - [sch.md](xiva-audit/sch.md): Scholar, 3 covered.
  - [pld.md](xiva-audit/pld.md): Paladin, 2 covered (Requiescat run
    out with Blades unpressed valued 2026-10-16).
  - [war.md](xiva-audit/war.md): Warrior, 0 candidates, 5 covered
    (Infuriate drift with its refunds built 2026-10-16).
  - [drk.md](xiva-audit/drk.md): Dark Knight, 0 candidates, 7 covered
    (Dark Arts overwrite, and MP overcap from the logged MP with an MP
    lane, 2026-10-16). Player MP is kept on casts since then; samples
    fetched earlier have none.
  - [gnb.md](xiva-audit/gnb.md): Gunbreaker, 0 candidates, 7 covered.
    Bloodfest drift valued 2026-10-16 (Reign combo + 1.5 cartridges);
    its 120s pre-7.4 recast and Gnashing Fang's single pre-7.4 charge
    are now per patch. Not matched on a page yet. Dropped Continuations
    fire since 2026-10-16 (the next GCD clears them; the check only looked
    at expiries), awaiting a page.
  - [drg.md](xiva-audit/drg.md): Dragoon, 3 covered.
  - [vpr.md](xiva-audit/vpr.md): Viper, 1 candidate (Vices, rare), 5
    covered (Serpent Offerings overcap and Reawaken left at a kill, Death
    Rattle / Last Lash, the coils' Bites built 2026-10-16; all but the
    wrong-Bite case matched xivanalysis pages).
  - [rpr.md](xiva-audit/rpr.md): Reaper, 0 candidates, 9 covered
    (Soul Reaver / Executioner drops and Enhanced overwrites built
    2026-10-16; the drops matched two pages, overwrites untested on a
    page); Soul overcap unverifiable.
  - [mnk.md](xiva-audit/mnk.md): Monk, 0 candidates, 10 covered (Blitz,
    Phantom Rush and form checks verified 2026-10-15; Fury overcap and
    the no-form Opo-opo skill built 2026-10-15, Fury matched 3 pages;
    Brotherhood timing and Formless overwrite not adopted).
  - [nin.md](xiva-audit/nin.md): Ninja, 0 candidates, 11 covered
    (ninjutsu, Kassatsu and Raiju checks verified 2026-10-15; Kazematoi
    left at the kill and Armor Crush in Kunai's Bane built 2026-10-16;
    Ninki gains read at the cast, no simulation underflow left on disk).
  - [sam.md](xiva-audit/sam.md): Samurai, 2 candidates, 18 covered
    (Higanbana and Kenki / Meditation / Sen gauges built 2026-10-15 and
    matched on 3 xivanalysis pages).
  - [mch.md](xiva-audit/mch.md): Machinist, 0 candidates, 17 covered
    (Double Check / Checkmate charge simulation and lanes 2026-10-15; Heat / Battery
    overcap, Reassemble and the rebuilt Wildfire count verified on 3
    pages 2026-10-15; Queen without Collider not adopted).
  - [blm.md](xiva-audit/blm.md): Black Mage, 2 candidates (pre-7.2
    Firestarter; Manafont timing, never seen), 16 covered (full gauge
    simulation and lanes; Polyglot, Paradox, cold Fire III, Ley Lines,
    Fire I, Umbral Soul, lukewarm Fire IV verified on 10 xivanalysis
    pages 2026-10-15; Despair skipped built 2026-10-16 from the logged MP
    on 9 re-fetched pulls, not matched on a page).
  - [smn.md](xiva-audit/smn.md): Summoner, 0 candidates, 11 covered
    (demi Enkindle / Deathflare / Sunflare, Mountain Buster, Ruin IV in a
    demi, Aetherflow and Further Ruin with lanes, Physick built
    2026-10-16; Enkindle, Mountain Buster, Ruin IV in a demi and
    Aetherflow at a kill matched three pages; Slipstream ticks and extra
    Ruin III not adopted).
  - [rdm.md](xiva-audit/rdm.md): Red Mage, 0 candidates (invuln casts
    are `noDamageCasts`'s), 12 covered (mana simulation with lanes and
    Dualcast running out built 2026-10-15; mana per cast since
    2026-10-16, matching both pages' overcap exactly; wrong finisher
    built 2026-10-16, any difference judged; the pre-7.4 Manafication
    rules not adopted).
  - [whm.md](xiva-audit/whm.md): White Mage, 0 candidates, 10 covered
    (Blood Lily overcap and Misery left at a kill with Lily / Blood Lily
    lanes, Assize tracked, Lilies lost at the cap counted where a later
    Cure / Medica needed one, 2026-10-16; matched three pages; Lily
    totals differ from xivanalysis's, unexplained).
- [wowa-audit-plan.md](wowa-audit-plan.md): the same for WoWAnalyzer
  (reference only, AGPL). Pilot started 2026-10-16 at WoWAnalyzer
  `0ffe845` (12.1.0): phase 0 marked 20 specs current, 17 lagging (12.0.x),
  3 stale (Marksmanship declares 11.0.5, Protection Paladin unmaintained,
  Assassination untouched since 2025). Phases 1–2 done for all 40 specs
  (fan-out 2026-10-16). Phase 3 (top-parse checks, building) is next, one
  spec at a time in the plan's order. Phase 3 values each candidate as
  damage lost in the log first: top players doing the same thing is
  evidence about the premise, not proof it costs nothing (Elemental's
  re-measure turned four `wrong` calls back into candidates). Below,
  each ledger gives its candidate count and the first candidate it
  lists; none is measured yet.
  Open question for the user: should consumables and gear at the pull
  stay out of scope (core.md marks them `no-damage`)?
  - [core.md](wowa-audit/core.md): shared core, 3 candidates (melee swing
    uptime, pandemic refreshes, AoE hits per cast); every percentage
    there divides by the whole fight.
  - [shaman-elemental.md](wowa-audit/shaman-elemental.md): Elemental,
    phase 3 done 2026-10-16 against seven top parses, re-measured as
    damage lost the same day. Built and verified: non-overload casts in
    Ascendance, Lava Burst without Flame Shock, idle with the Ancestors
    out, spenders before an instant Lava Burst, one-target Chain
    Lightning, early Flame Shock refreshes
    (lib/damage/wow/specs/elemental.ts). Stormkeeper drift built (60s
    less 3s per Ancestor summoned; Vashnik holds for the Venoms after
    Imbibe allowed). Overcharge overwritten built too (found in the
    approval step). Open: the user's approval of three `no-damage` rows
    (asked 2026-10-17; questions in
    [HANDOFF-elemental-build.md](wowa-audit/HANDOFF-elemental-build.md)),
    Ascendance spenders (low value). Windwalker is next.
  - [monk-windwalker.md](wowa-audit/monk-windwalker.md): Windwalker,
    phase 3 done 2026-10-17 against nine top parses and the user's
    Blkphnx (14 pulls). Built and verified: Fists of Fury held (cooldown
    rebuilt from the log; holds into Zenith / Xuen excused to their
    break-even) and Zenith Stomp unused
    (lib/damage/wow/specs/windwalker.ts). Left unbuilt with numbers: Rising
    Sun Kick and chi waste (`unverifiable`), Whirling Dragon Punch, Combo
    Strikes, Touch of Death, Fists clips, Zenith charges. Proposed `wrong`
    for the user's review: the filler order, Conduit targets.
  - [demonhunter-havoc.md](wowa-audit/demonhunter-havoc.md): phase 3
    done 2026-10-17 against five top parses (plus nine more Havoc players
    on disk) and Mythnarra's 16 pulls. Built: Eye Beam held (cooldown
    rebuilt from Cycle of Hatred stacks, not WoWAnalyzer's per-spender
    cut) and Death Sweep reset unused (lib/damage/wow/specs/havoc.ts);
    engine fix: Reaver's Glaive is an on-GCD press (game.ts). Left
    unbuilt with numbers: Blade Dance efficiency (a real gap, no cooldown
    model yet), the Essence Break window (top players do the same), and
    the Inertia / Unbound Chaos / Demonsurge rows (no top player takes
    them). Kept `wrong` for the user's review: Blade Dance targets, the
    two Inertia window rows.
  - [mage-arcane.md](wowa-audit/mage-arcane.md): phase 3 done
    2026-10-17 on 31 Arcane Mages already on disk (all Sunfury; 17 top
    parses, Acegoblain's 14 pulls). Built: Touch of the Magi window
    (lib/damage/wow/specs/arcane.ts; small, 0 on every top Entombed
    Sentinels player). Proposed `wrong` for the user's review: the Barrage
    / Missiles Salvo ladder (Barrage damage is proportional to its stacks,
    top players fire it as often), Orb efficiency (a pressed Orb hits for
    47–63k; top players press it 0–15 times). Left unbuilt with numbers:
    Prismatic Bolt munched, Cumulative Power, Orb no-targets, Missiles
    clips; Presence of Mind and Spellslinger rows (nobody takes them).
    Found: `checkProcs` never sees a WoW expiry (WoW buff events carry no
    duration), so "covered by checkProcs (expiries)" rows need a second
    look in every WoW ledger.
  - [warlock-demonology.md](wowa-audit/warlock-demonology.md): phase 3
    done 2026-10-17 on 35 Demonology player-pulls (all Diabolist, To Hell
    and Back; four 99.7–100th parses, Embed at the 20th, Fwîî's 16 pulls).
    Built: Implosion held (the phase-2 `wrong` overturned: each press
    brings back ~0.5M of imps; the largest Demonology loss, Fwîî 15M over
    16 pulls) and Call Dreadstalkers held (small; it costs no Soul Shards)
    in lib/damage/wow/specs/demonology.ts. Left unbuilt with numbers: the
    Tyrant-window rows (Dreadstalkers timing, shards at the cast and the
    end, Grimoire, cores: negligible or the top players do the same).
    `unverifiable`: Vilefiend, Power Siphon, Doomguard, Demonic Calling
    (nobody takes them). Open: on Vashnik the 99.9th Lydd also holds
    Implosion (2.24M).
  - [warlock-affliction.md](wowa-audit/warlock-affliction.md): phase 3
    done 2026-10-17. Built Haunt dropped (lib/damage/wow/specs/
    affliction.ts), the Nightfall expiry (procs.ts) and Drain Soul as a
    channel (game.ts; its channels had read as idle). Left unbuilt with
    numbers: Dark Harvest held, its DoT coverage, Cull the Weak (all
    negligible); Grimoire of Sacrifice (nobody takes it). The two `wrong`
    rows stay `wrong` (Haunt cast efficiency, Dark Harvest empty cast).
    Open: one-target DoT uptime during Seed of Corruption AoE stretches
    (the 100th-percentile Soul Harvester's Unstable Affliction gaps).
  - [warrior-arms.md](wowa-audit/warrior-arms.md): phase 3 done
    2026-10-17. Built Bladestorm outside Colossus Smash and revalued
    Colossus Smash drift by its armor window (lib/damage/wow/specs/
    arms.ts). Left unbuilt with numbers: Bladestorm's cooldown and the
    Mortal Strike readiness rows (`unverifiable`), Rend and Deep Wounds
    uptime, the priority list; Demolish, Ravager and Champion's Spear fire
    on nothing (every sample player is Slayer). Three `wrong` rows kept
    (Sweeping Strikes, Deep Wounds refresh, Cleave efficiency), Rend early
    refresh proposed `wrong`.
  - [evoker-preservation.md](wowa-audit/evoker-preservation.md): healer,
    phase 3 done 2026-10-17: nothing built. `checkGcdGaps` fires; the
    survey covers every press (empowers time from their begin-casts);
    Essence Burst never runs out on the sample players. Open for the
    user: `healGcds` flags Echo by Echo's own small heal (0.8–2.0M a
    pull on top players), though its value is the echoed copy.
  - [monk-mistweaver.md](wowa-audit/monk-mistweaver.md): healer,
    phase 3 done 2026-10-17: Celestial Conduit drift built
    (tracked-cooldowns.ts). The 740ms "GCD" was Rushing Wind Kick's and
    Soothing Mist's own short GCD; with Sheilun's Gift, Detox, Revival
    and the Mana Tea / Soothing Mist channels added (game.ts, haste.ts,
    timeline.ts) GCD uptime moved 48–82% → 65–89%. Kick drift is
    `unverifiable` (resets not in the log). Open: Touch of Death unbuilt
    (287–450k a press; 2 of 5 top players skip it); Windwalker's tracked
    Celestial Conduit is valued by its cast id 443028, but its hits log
    as 443038, so it never fires (not changed: Windwalker's pass).
  - [druid-restoration.md](wowa-audit/druid-restoration.md): healer,
    phase 3 done 2026-10-17: nothing built. Convoke the Spirits (3.0s)
    and Soulcoiler Ritual Vessel (2.0s) now lock the GCD (game.ts), which
    read as idle: GCD uptime +3–4 points. `checkGcdGaps` and `healGcds`
    (Regrowth, Wild Growth) fire. Open for the user: `healGcds` prices
    overhealed Rejuvenations at 1.4–3.0M a pull on top players.
  - [shaman-restoration.md](wowa-audit/shaman-restoration.md): healer,
    phase 3 done 2026-10-17: nothing built. `checkGcdGaps` and
    `healGcds` (Chain Heal) fire; the survey covers every press (the
    vessel lock above adds about a point of uptime).
  - [hunter-beastmastery.md](wowa-audit/hunter-beastmastery.md): phase 3
    done 2026-10-17 on 40 BM player-pulls (all Pack Leader; Luumu, Yaji
    and the 100th-percentile 爹丶爹 on top, Koralie at the 20th,
    Deathstriker's 16 static pulls). Built in lib/damage/wow/specs/
    beastmastery.ts: Bestial Wrath held (valued by the pet: the tracked
    drift was worth 0 a use and never fired), Kill Command without
    Nature's Ally, and Wild Thrash on one enemy (the phase-2 `wrong` Beast
    Cleave row overturned; Deathstriker 0.64–0.78M a pull on single-target
    bosses). Engine (game.ts): a BM GCD now counts the press's pet hits
    (it read half its worth), and Font of Venomous Rage is a 2s channel
    (every spec). `unverifiable`: Kill Command and Barbed Shot efficiency
    (their recharges can't be rebuilt). Macro'd pet basic attacks
    negligible. `wrong` kept: Cobra Shot at low Focus.
  - [druid-balance.md](wowa-audit/druid-balance.md): phase 3 done
    2026-10-17 on the 50 Balance player-pulls on disk (Elune's Chosen and
    Keeper of the Grove; top Entombed Sentinels and Vashnik parses,
    Sylmigron's 17 pulls), nothing fetched. Built in
    lib/damage/wow/specs/balance.ts: Eclipse charges capped (Eclipse is a
    press now: two charges, 30s; the case study's 1.06M), Fury of Elune
    held (cooldown fitted: 45s less 1.5s per Starfire / Starsurge /
    Starfall / Moonfire), Starfall on one enemy (the phase-2 `wrong`
    overturned at one enemy), and spenders outside Eclipse reworked (it
    read 1.2–2.3M on the top players: free procs, Incarnation and
    Starfall's enemy count in its price). Left unbuilt with numbers:
    Incarnation drift (never at two charges past the opener), Force of
    Nature (holds end at Incarnation), Starfire in Solar, Umbral Embrace
    (runs out on top and weak alike, ≤60k a proc). `unverifiable`:
    Moonfire / Sunfire early refresh (their extensions aren't logged),
    New Moon, Convoke (nobody takes them).
  - [paladin-retribution.md](wowa-audit/paladin-retribution.md): phase 3
    done 2026-10-17 on the 58 Retribution player-pulls on disk (two top
    Vashnik kills fetched: Pipala 7pFPAqzc2NHLXjwZ, Pçpaladin
    1NL29tyvbzGhZgPK). Built in lib/damage/wow/specs/retribution.ts: the
    tracked cooldowns valued (Avenging Wrath and Execution Sentence were
    worth 0 a use, so their drift never showed), Divine Toll tracked (a
    clean 60s on Retribution), all four honoring the fight's hold windows
    (new `burstHold` in checks.ts; Ula'tek's context got Heart windows),
    and Divine Arbiter expired unused. Hammer of Light (Templar) is now a
    GCD press (game.ts; Yenvenger's gaps 942k → 0). Left unbuilt with
    numbers: Expurgation uptime, Hammer of Light after Wake (never
    missed), Execution Sentence before Wake (≤0.18M), melee swings missed
    (1.12M on the 100th-percentile Pipala). `unverifiable`: Art of War
    (its removals don't sit at a duration). No `wrong` rows.
  - [deathknight-frost.md](wowa-audit/deathknight-frost.md): phase 3
    done 2026-10-17 on the 31 Frost DK player-pulls on disk (one top
    Vashnik kill fetched: 眼口补偿器 78hvzrVRXKn6NYMa). Built in
    lib/damage/wow/specs/frostdk.ts: Killing Machine lost (expiries and
    Empower Rune Weapon at two stacks, valued as an Obliterate with it
    less one without; moved from procs.ts), Rime overwritten, Frostscythe
    on one enemy, and Breath of Sindragosa / Frostwyrm's Fury held with
    the wait for a Pillar excused (out of tracked-cooldowns.ts). Pillar of
    Frost and Reaper's Mark drift now have a value per use. The shared
    Runic Power cap check is off for Frost: a 10–27% floor on every
    player, and it read casts that generate nothing (row proposed
    `wrong`). Left unbuilt with numbers: rune overcap, Arcane Torrent.
    Kept `wrong`: Breath average duration, Empower Rune Weapon efficiency.
  - [demonhunter-vengeance.md](wowa-audit/demonhunter-vengeance.md): phase
    3 done 2026-10-17 against six top parses and three weaker players (24
    player-pulls, all Annihilator). No spec check built; the tracked
    sigils now have a value per use (they hit under other ids, so their
    drift never showed) and measured cooldowns (vengeance.ts,
    tracked-cooldowns.ts); engine fix: Sigil of Chains is an on-GCD press
    (game.ts). Proposed `wrong` for the user's review: Fury at the cap
    (Fury isn't what limits the spenders), Spirit Bomb fragments,
    Felblade efficiency. Left unbuilt with numbers: fragments at a
    Fracture, Fel Devastation rows, Fiery Brand and Immolation Aura
    efficiency, zero-hit casts. Lead: Metamorphosis (×1.8–3.2 damage
    rate) and its Untethered Rage proc.
  - [druid-guardian.md](wowa-audit/druid-guardian.md): phase 3 done
    2026-10-17. Engine fix: Guardian's bear presses weren't in the spell
    survey, so every press read as idle (game.ts). Lunar Beam tracked,
    Gore expiry (procs.ts); no spec check (Incarnation drift and window,
    Red Moon drift and Rage at the cap measured, not built). Kept
    `wrong`: Mangle / Thrash efficiency, Swipe discipline, Berserk
    per-use. Galactic Guardian now `unverifiable` (never runs out). Open
    for the user: Guardian GCD gaps are priced at the average GCD
    (86–113k) though the free press is a ~20k Swipe.
  - [rogue-assassination.md](wowa-audit/rogue-assassination.md): stale
    (12.0.0). Phase 3 done 2026-10-17: Rupture / Garrote off every enemy
    and Rupture refreshed early (specs/assassination.ts); Vanish drift
    priced for a player who never Vanishes. Proposed `wrong`: combo-point
    waste (four rows) and low-point finishers (fire on the top players as
    much). Kept `wrong`: Crimson Tempest spread, Mutilate after Vanish,
    the two Deathmark / Kingsbane alignment rows. Not built: Improved
    Garrote overwritten (priced by Deathmark), Fan of Knives on one enemy.
    For the user: Kingsbane drift reads 777k on the 99.8th Ireath, who
    opened his whole burst at 0:19.
  - [hunter-marksmanship.md](wowa-audit/hunter-marksmanship.md): stale
    (declares 11.0.5, active 2026). Phase 3 done 2026-10-17: Precise
    Shots lost (specs/marksmanship.ts), the Moonlight Chakram expiry
    (procs.ts), Trueshot valued for its drift (worth 0 before). For the
    user: the Focus cap check was removed for the spec (0.15–2.0M on top
    players; Focus never limits it). Proposed `wrong`: Kill Shot
    efficiency (top players hold it as much), Volley efficiency (held for
    Trueshot by top players), Focus at the cap. Black Arrow, Wailing
    Arrow and Sentinel's Mark `unverifiable` (no sample player has them).
  - [druid-feral.md](wowa-audit/druid-feral.md): phase 3 done
    2026-10-17 (14 player-pulls fetched; no case study): Rip off every
    enemy and Ferocious Bite below 5 points (specs/feral.ts); the five
    tracked cooldowns valued per use (all were worth 0; Convoke 120s,
    Incarnation tracked); Clearcasting and Apex Predator's Craving expire
    (procs.ts); Lunar Inspiration's Moonfire a GCD press (game.ts).
    Proposed `wrong`: Rip refreshed early (the top players clip as much),
    Tiger's Fury Energy waste (TF grants no Energy now). Kept `wrong`:
    Chomp efficiency (nobody takes it), Sudden Ambush on Rake. Sudden
    Ambush expiry `unverifiable` (no duration).
  - [evoker-augmentation.md](wowa-audit/evoker-augmentation.md): phase 3
    done 2026-10-17 (31 player-pulls, 3 fetched; no case study): the
    support damage is in the Evoker's own hits, so it was priced as GCD
    damage (gaps ~3× high; game.ts). Built (specs/augmentation.ts, on a
    fitted Time Skip / Temporal Burst recovery model): Ebon Might down
    while ready, Prescience charges capped, Breath of Eons and Time Skip
    held (replacing tracked cooldowns worth 0 a use), Breath of Eons that
    never exploded. Proposed `wrong`: empowers inside the Breath window,
    Essence at the cap. Overturned `wrong`: Fire Breath held (top players
    cast more; left unbuilt, no cooldown model fits), potion in the Breath
    window (negligible).
  - [evoker-devastation.md](wowa-audit/evoker-devastation.md): phase 3
    done 2026-10-17 (19 player-pulls, 3 fetched): a clipped Disintegrate
    read as idle (timeline.ts channel lock fixed). Built
    (specs/devastation.ts): Disintegrate ticks clipped, Fire Breath and
    Eternity Surge held (fitted Causality recharge), Dragonrage drift
    valued (it was worth 0 a use; pre-pull uses seen by their status);
    Essence Burst expiry (procs.ts). Proposed `wrong`: Essence at the cap
    (rebuilt from spends: 9–17% waste on top players, 4–24% on weak).
    Kept `wrong`: per-empower count, Mass Disintegrate ticks, channel
    cancels, fight-end procs. Tip the Scales left unvalued (half a GCD a
    use).
  - [monk-brewmaster.md](wowa-audit/monk-brewmaster.md): phase 3 done
    2026-10-17 (9 player-pulls, 4 fetched). Built (specs/brewmaster.ts):
    Breath of Fire reset lost (a Keg Smash pressed while the last one's
    Breath of Fire was unpressed). Exploding Keg valued by its later hits
    and Fuel on the Fire, `burstHold` for Vashnik's Venoms; Invoke Niuzao
    tracked at 120s (talent not in the log), valued with its Flurry
    Strikes. Proposed `wrong`: Breath of Fire count per Niuzao, Blackout
    Combo on Keg Smash (top players as weak). Touch of Death, Chi Burst,
    Stomp count left unbuilt; Keg Smash charges unverifiable.
  - [priest-shadow.md](wowa-audit/priest-shadow.md): phase 3 done
    2026-10-17 on the 45 Shadow player-pulls on disk (none fetched; all
    Archon, so the Voidweaver rows can't be measured). Engine fix:
    clipped Mind Flay / Mind Flay: Insanity read as idle (game.ts tick
    counts; Kleenonean's delays 2.22M → 0.91M). Halo and Voidform were
    worth 0 a use: Halo now has its hit id, Voidform a value from the
    presses its window adds (specs/shadow.ts); both `burstHold`. No spec
    check built: Insidious Ire coverage and Madness uptime fire on the
    top players as much; Voidform extension, Void Volley charges,
    Tentacle Slam misses negligible. Lead: Mind Blast presses (weak 3.6
    a minute, top 4.7–7.8), no cooldown model fits. No `wrong` rows.
  - [rogue-subtlety.md](wowa-audit/rogue-subtlety.md): phase 3 done
    2026-10-17 on 41 player-pulls (four top kills fetched). Built
    (specs/subtlety.ts): "Big finisher without Ancient Arts" (Secret
    Technique, Coup de Grace or a Darkest Night Eviscerate without the
    buff that echoes it, net of a builder first and a GCD's delay: top
    0–0.87M but Zikli 2.58M, weak 0.27–4.37M), "Secret Technique just before Shadow Dance", the
    Shadow Dance window; Shadow Dance tracked (two charges, 20s);
    Shadow Blades and Goremaw's Bite valued by their hits (were 0); the
    Energy cap without the clones' Secret Technique casts (top players
    1.1M → 0–0.25M); Shuriken Toss a GCD press. Nobody presses Rupture.
    Proposed `wrong`: Secret Technique efficiency, dance entry Energy,
    Vanish for Find Weakness; kept `wrong`: cooldown alignment,
    Shadowstrike outside stealth, generator after Vanish.
  - [shaman-enhancement.md](wowa-audit/shaman-enhancement.md): phase 3
    done 2026-10-17 on 23 player-pulls (four top kills fetched; every
    player the same Stormbringer / Ascendance build, nobody presses Doom
    Winds or takes Hot Hand, Surging Totem or Primordial Storm). Built
    (specs/enhancement.ts): Ascendance tracked (120s, valued by its window:
    top none, Macroos 5.96M), Voltaic Blaze tracked (10s: top 42–147k, weak
    up to 774k), "Maelstrom Weapon capped" (a non-spending press at 10
    stacks: top 118–291k, weak up to 1.01M), "Idle in Ascendance", Flame
    Shock uptime; Stormsurge expiry (procs.ts). Engine: a Stormstrike's
    Thorim's spender and Storm Unleashed's Crash Lightning are twins of
    their press (game.ts). No generic window or resource cap check for the
    spec (neither could read it). Proposed `wrong`: Tempest overwritten,
    Tempest below 10 stacks, Chain Lightning on one target, Flame Shock
    early refresh. Left: the Doom Winds / Hot Hand / Surging Totem /
    Primordial Storm rows, for want of a log of those builds.
  - [warlock-destruction.md](wowa-audit/warlock-destruction.md): phase 3
    done 2026-10-17 on 34 player-pulls already on disk (four 99.4–99.8th
    Entombed Sentinels kills, 20 others, the static's Wyrmtongues; every
    player Hellcaller with Shadowburn, Soul Fire and Crashing Chaos; nobody
    casts Immolate, Channel Demonfire or takes Grimoire of Sacrifice).
    Built (specs/destruction.ts): Havoc held (top 0–245k, Neerthus 1.09M,
    Wyrmtongues 89–449k on four of six pulls); Summon Infernal and
    Malevolence valued per use (were worth 0, so their drift never
    reported); Havoc on the main target no longer counts casts after the
    other enemies died (Phycookie 1.36M → 0). Backdraft and Havoc on the
    main target moved there from ranged.ts. Not built: Conflagrate capped
    (recharge not pinnable, near the top players' floor). Proposed
    `wrong`: Shadowburn efficiency and kill reset (no cooldown). Kept
    `wrong`: Havoc window grades, Soul Fire shard cut. Left: Immolate,
    Channel Demonfire and Grimoire of Sacrifice rows, for want of a log.
  - [warrior-fury.md](wowa-audit/warrior-fury.md): phase 3 done
    2026-10-17 on 18 player-pulls (eight fights fetched; 16 Slayer, 2
    Thane). Built (specs/fury.ts): Rampage held while unenraged (top
    0–116k, weak up to 575k), Recklessness drift (72s less 1s per 40 Rage,
    valued by its window; the tracked 41s was worth 0), Fury's own Rage
    cap check outside Recklessness and Bladestorm (the shared one read
    0.47–1.01M on top players); Odyn's Fury drift valued with burstHold;
    Bladestorm's own Bloodthirsts aren't presses (game.ts). Not built:
    Thunder Blast stacks (negligible), Whirlwind stacks (fires on top
    players as much), Bladestorm's cooldown (no model fits). Proposed
    `wrong`: Slayer Execute overuse.
  - [deathknight-blood.md](wowa-audit/deathknight-blood.md): phase 3 done
    2026-10-17 on the 97 Blood player-pulls on disk (no fetch; 82
    San'layn, 15 Deathbringer). Built (specs/blood.ts): Dancing Rune Weapon
    drift valued by the Rune Weapon's hits (was worth 0; 0.6–2.5M a use,
    fires on 15 weaker player-pulls, no top one), Reaper's Mark tracked
    for Deathbringer, "Free Death and Decay held" (Crimson Scourge held
    with none down: top 1–36k, weak up to 346k). **Removed for the user's
    review:** the Runic Power cap check for Blood (0.34–1.56M on top
    players, pricing Blood Boil and Death Grip, which generate none; a
    rebuild doesn't separate). Proposed `wrong`: Runic Power waste,
    Marrowrend overuse (Bone Shield stacks to 12; top players refresh at
    9–12), Exterminate stacks. Open lead: Blood Boil presses (no recharge
    model).
  - [deathknight-unholy.md](wowa-audit/deathknight-unholy.md): phase 3
    done 2026-10-17 on 31 player-pulls (three fights fetched; 30
    San'layn, one Rider). Built (specs/unholy.ts): Dread / Virulent Plague
    off every enemy (Blightfall with no Putrefy after it; top 0–160k, weak
    up to 1.85M), strike without a Lesser Ghoul (top 0–4 a pull, weak
    17–37), Sudden Doom lost (expired or gained at two stacks), Dark
    Transformation and Army of the Dead valued (both were worth 0); an
    Unholy GCD counts its plague Erupts and ghoul Orders (game.ts).
    **Removed for the user's review:** the Runic Power cap check for
    Unholy (it read only casts that generate none). Kept `wrong`: Soul
    Reaper outside the window, Sudden Doom speed. Not built: Putrefy
    charges (no model fits), Reaping run out (~0), Festering Scythe buff
    (no visible effect). Lead: Lesser Ghoul charges lost to the cap.
  - [demonhunter-devourer.md](wowa-audit/demonhunter-devourer.md): phase 3
    done 2026-10-17 on 47 player-pulls (four fights fetched, 99.9–100th).
    The ~1s after each Void Ray was an Eradicate press the log never
    writes; Void Metamorphosis isn't logged either (both added as presses,
    game.ts), and The Hunt, Hungering Slash and Voidblade's 0.5s GCD were
    survey misses: top players 82% → 91–94% GCD uptime. Built
    (specs/devourer.ts): Void Metamorphosis window (top 0–374k, weak up to
    1.70M), Eradicate overwritten (Xaêro 1.01M). Not built: Void Ray cut
    short, Voidstep (negligible), Reap / Cull counts (no model), The Hunt's
    value (fires on every top player). Proposed `wrong`: smuggled Reaper's
    Toll, Fury at the cap.
  - [hunter-survival.md](wowa-audit/hunter-survival.md): phase 3 done
    2026-10-17 on 13 Survival player-pulls (top Joeexotíc, Дэсака,
    Calemba, Glemon; 20th-percentile Fugginmoo, Imjustpika, Huntâbow).
    Built in lib/damage/wow/specs/survival.ts: Tip of the Spear wasted,
    spender without Tip, Takedown held (60/75/90s by talent, replacing the
    tracked Takedown worth 0 a use), Moonlight Chakram expired (15s on
    Survival). Engine (game.ts): the Kill Command's pet hit is its press's
    damage. **An existing check removed, for the user to approve:** the
    Focus cap check for Survival (read 0.61–1.30M on the top players;
    Focus never limits the spec). Unbuilt with numbers: Boomstick ticks
    (no clip found), Swipe misses, Takedown stacks at cast; unverifiable:
    Sentinel's Mark (not fetched), bomb recharge.
  - [mage-fire.md](wowa-audit/mage-fire.md): phase 3 done 2026-10-17 on
    12 Fire player-pulls (top Émptinêss, Tinghao, 小鸟游小埋 ×2, Broadum,
    Экседо, Reinyy; weak Katbelle, Splean, Wardaalsahra, Sikeyzlol,
    Portalscroll), 11 Sunfury, 1 Frostfire. Built in
    lib/damage/wow/specs/fire.ts: Fire Blast under Hot Streak (top 0–304k,
    weak up to 1.60M), Combustion window repriced by its own premium per
    press (top none, weak up to 2.25M), a value for the tracked Combustion
    (worth 0 a use before; fires on none of the 12). Unbuilt with numbers:
    Hot Streak expiry (never happens), hardcast Fireball in Combustion,
    Heating Up conversions, Fire Blast charges (no recharge model), Heat
    Shimmer, precast delay, Meteor held. Kept `wrong` (four rows) for the
    user's review.
  - [mage-frost.md](wowa-audit/mage-frost.md): phase 3 done 2026-10-17 on
    21 Frost player-pulls (top Zhenglanxin, Choechoi ×2, 악용유저,
    夏夜椿湫, Serasín; weak Purer, Mabho, Raisedxfist), Spellslinger on
    Entombed Sentinels, Frostfire on three Vashnik players, no Icy Veins.
    Built: Fingers of Frost wasted (frostmage.ts; top 0–199k, others up to
    2.94M), Fingers of Frost expiry (procs.ts, 15s), the tracked Frozen Orb
    valued (worth 0 a use before) with burstHold, Ray of Frost burstHold.
    Unbuilt with numbers: Brain Freeze overwritten (≤0.4M; whether it
    grants a Flurry isn't in the log), Thermal Void Flurries, Brain Freeze
    expiry (never), Comet Storm drift (Ray of Frost resets it; valued it
    fired on all three Frostfire players). Unverifiable: Freezing stacks
    shattered (Freezing 1221389 isn't fetched; Shatter is ~40% of the
    damage). Kept `wrong` (Ray of Frost ticks, Comet Storm targets) for
    the user's review.
  - [paladin-holy.md](wowa-audit/paladin-holy.md): healer, 5; Avenging
    Wrath and Divine Toll drift.
  - [priest-discipline.md](wowa-audit/priest-discipline.md): healer, 3;
    Shadow Word: Pain uptime (a question first).
  - [priest-holy.md](wowa-audit/priest-holy.md): healer, 0 candidates.
  - [rogue-outlaw.md](wowa-audit/rogue-outlaw.md): 9; Adrenaline Rush
    recharge with Restless Blades.
  - [warrior-protection.md](wowa-audit/warrior-protection.md): tank, 5;
    survey its cooldowns first.
  - [paladin-protection.md](wowa-audit/paladin-protection.md): stale
    (unmaintained), tank, 8; Avenger's Shield after a Grand Crusader
    reset.
- [wow-sim-plan.md](wow-sim-plan.md): WoW simulation pipeline (talent
  effects, budget model, simc as a dev-only oracle). Four questions for
  the user before stage 0.
- Mitigation: what-if sandbox, a published plan to compare against, a WoW
  port (`lib/mitigation/plan.ts` header).
- Damage: automatic search for comparable clears
  (`lib/damage/reference-clears.ts` header).

## App

- **VOD coverage built 2026-10-11, awaiting the user's check in the app**
  ([archive/vod-coverage-plan.md](archive/vod-coverage-plan.md)). It adds
  auto-swap to a synced VOD that covers the picked pull, the no-coverage
  card, sidebar ranges, and "Re-sync from this pull" for stream dropouts.
  Open points:
  - Not exercised against real split VODs or a real dropout yet.
  - A VOD's length is recorded from the playback loop the first time
    `getDuration() > 0`. If YouTube briefly reports the previous video's
    length right after a `loadVideoById` swap, the wrong length would
    stick. The readiness poll relies on the same signal and works, so
    this is unlikely. If a sidebar range looks wrong, check this first.
- **Analysis views waiting on the user's review in the running app:**
  Mitigation Analysis findings layout (2026-10-14), the optimizer
  (2026-10-11), the Tanking panel (2026-10-11/12). Their unconfirmed
  choices are listed in the headers of `lib/mitigation/findings.ts`,
  `optimize.ts`, `plan.ts`, `tanking.ts` and `tanking-plan.ts`.
- **Statics:**
  - Importing a different log keeps the previous report's VOD list on
    screen, and it gets saved into the new session.
  - Sessions are ordered by `addedAt`, so out-of-order imports show dates
    that don't ascend.
  - The MVP pedestal ranks by raw counts rather than per-pull rates.
- **Severity picker.** `AddErrorDialog`'s picker is a native `<select>`, so
  it shows text only, with no icons.
- **Stale reference.** The `lib/spec-data.ts` comment near line 165
  references the dead `ckreviewv9.png`.

## Workflow backlog (deferred ideas, in recommended order)

1. ~~A `/build-boss-detection` skill~~ and ~~a "review pull" skill~~: done
   2026-10-12 as `/build-module` and `/refine-module`
   (`.claude/skills/`), with the per-boss lessons distilled into
   `lib/mechanics/PITFALLS.md`. Try them on the next boss and fix whatever
   step the session stumbles on. Still open: a `/research-boss` skill for
   the model-writing stage.
2. **A shared FFXIV "jumped off to call the wipe" helper** (user idea,
   2026-10-12). Jumping off the arena is a common way to call a wipe, but
   whether it is one depends on the fight. A general helper could live in
   an FFXIV common module, for modules to opt into per fight. Background:
   until 2026-10-12, Dancing Mad's phase1.ts applied its jump rule to every
   FFXIV fight. It is now gated to Dancing Mad (user: a fight's module must
   not affect other fights).
3. **Fixture curation.** Keep the smallest set of reports that exercises
   every rule's known failure modes.
4. **Baselines for cross-pull strategy output** (Black Hole lanes, kick
   chains) in `expectations/`. Do this only if a regression slips through.
5. **npm script aliases** (`npm run check`).

CI was explicitly rejected: sample data and expectations are local by
design.
