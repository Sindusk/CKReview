# xivanalysis audit: status

Per-job/spec progress for [xiva-audit-plan.md](../xiva-audit-plan.md), moved out of
open-items.md on 2026-10-18 so that file stays a short index. Each ledger
in this folder holds the detail; this file is the running summary.

- [xiva-audit-plan.md](../xiva-audit-plan.md): audit every xivanalysis
  module job by job against the FFXIV damage checks. Phases 1 and 2 done
  for all 21 jobs (2026-10-15). Phase 3 (premise and firing checks,
  building candidates) is ongoing: each ledger's "Open" list is its work.
  Next session starts from [xiva-audit/HANDOFF-phase3.md](HANDOFF-phase3.md).
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
  - [core.md](core.md): core modules, 1 candidate (raid
    buffs of one job overlapping: 0 on the 822 pulls on disk, no pull
    has two of a raid-buff job; Bard's BuffGroupWindow covered by
    `bardBuffMisaligned` 2026-10-18); procs on an invulnerable target are
    `noDamageCasts`'s (2026-10-16).
  - [brd.md](brd.md): Bard, 0 candidates, 5 covered (a
    burst buff that never met the other two built 2026-10-18 from weak
    Lindwurm II / The Tyrant parses, matched on two xivanalysis pages).
  - [dnc.md](dnc.md): Dancer, 0 candidates, 9 covered (dance
    checks, Devilment outside Technical Finish; no dance partner built
    and matched on a xivanalysis page 2026-10-18). Partner value from partnercalc's
    model (dnc-partner.ts), matched against partnercalc.app on one Enuo
    kill (tanks within 1% without auto-attacks, others within ~10%).
    Crit / direct-hit rates from DoT ticks need samples fetched since
    2026-10-18 (`--refetch` for older ones). Partner swaps judged since
    2026-10-18 (late swap after a death, weaker swap partner); the 5s
    swap grace confirmed by the user and the partner-choice bar (20k,
    20%) settled from the 21 swaps on disk, 2026-10-18.
  - [pct.md](pct.md): Pictomancer, 0 candidates, 7 covered
    (Hyperphantasia covered 2026-10-16, only lost at deaths on disk) (portrait
    overwrites built 2026-10-16; Striking Muse not judged on 7.2).
  - [ast.md](ast.md): Astrologian, 0 candidates, 5 covered
    (Macrocosmos drift built 2026-10-18, valued only from casts that hit
    two or more enemies: level with Fall Malefic on one).
    Early Earthly Star detonations built 2026-10-16 (the user: a mistake
    worth a finding); 99 on disk; matched xivanalysis's Stellar Burst
    count (2) on K6qfMamL7rN8yz2Q (its suggestion can't fire: bug).
  - [sge.md](sge.md): Sage, 0 candidates (Eukrasian
    Dyskrasia on one enemy built 2026-10-16).
  - [sch.md](sch.md): Scholar, 3 covered.
  - [pld.md](pld.md): Paladin, 2 covered (Requiescat run
    out with Blades unpressed valued 2026-10-16).
  - [war.md](war.md): Warrior, 0 candidates, 5 covered
    (Infuriate drift with its refunds built 2026-10-16).
  - [drk.md](drk.md): Dark Knight, 0 candidates, 7 covered
    (Dark Arts overwrite, and MP overcap from the logged MP with an MP
    lane, 2026-10-16). Player MP is kept on casts since then; samples
    fetched earlier have none.
  - [gnb.md](gnb.md): Gunbreaker, 0 candidates, 7 covered.
    Bloodfest drift valued 2026-10-16 (Reign combo + 1.5 cartridges);
    its 120s pre-7.4 recast and Gnashing Fang's single pre-7.4 charge
    are now per patch. Not matched on a page yet. Dropped Continuations
    fire since 2026-10-16 (the next GCD clears them; the check only looked
    at expiries), awaiting a page.
  - [drg.md](drg.md): Dragoon, 3 covered.
  - [vpr.md](vpr.md): Viper, 0 candidates, 6 covered (Serpent
    Offerings overcap and Reawaken left at a kill, Death Rattle / Last
    Lash, the coils' Bites built 2026-10-16; all but the wrong-Bite case
    matched xivanalysis pages; coils skipped after Vicewinder built
    2026-10-18, the coil rule measured on disk, matched on two pages).
  - [rpr.md](rpr.md): Reaper, 0 candidates, 9 covered
    (Soul Reaver / Executioner drops and Enhanced overwrites built
    2026-10-16; the drops matched two pages, overwrites untested on a
    page); Soul overcap unverifiable.
  - [mnk.md](mnk.md): Monk, 0 candidates, 10 covered (Blitz,
    Phantom Rush and form checks verified 2026-10-15; Fury overcap and
    the no-form Opo-opo skill built 2026-10-15, Fury matched 3 pages;
    Brotherhood timing and Formless overwrite not adopted).
  - [nin.md](nin.md): Ninja, 0 candidates, 11 covered
    (ninjutsu, Kassatsu and Raiju checks verified 2026-10-15; Kazematoi
    left at the kill and Armor Crush in Kunai's Bane built 2026-10-16;
    Ninki gains read at the cast, no simulation underflow left on disk).
  - [sam.md](sam.md): Samurai, 0 candidates (Ready proc
    overwrite proposed `wrong` 2026-10-18: 30s procs, 120s Ikishoten), 18 covered
    (Higanbana and Kenki / Meditation / Sen gauges built 2026-10-15 and
    matched on 3 xivanalysis pages).
  - [mch.md](mch.md): Machinist, 0 candidates, 17 covered
    (Double Check / Checkmate charge simulation and lanes 2026-10-15; Heat / Battery
    overcap, Reassemble and the rebuilt Wildfire count verified on 3
    pages 2026-10-15; Queen without Collider not adopted).
  - [blm.md](blm.md): Black Mage, 0 candidates, 18 covered
    (pre-7.2 Firestarter spent in Astral Fire built 2026-10-18 on the one
    7.1 Black Mage on disk, 4 findings; Manafont before Despair built 2026-10-18; full gauge
    simulation and lanes; Polyglot, Paradox, cold Fire III, Ley Lines,
    Fire I, Umbral Soul, lukewarm Fire IV verified on 10 xivanalysis
    pages 2026-10-15; Despair skipped built 2026-10-16 from the logged MP
    on 9 re-fetched pulls, not matched on a page).
  - [smn.md](smn.md): Summoner, 0 candidates, 11 covered
    (demi Enkindle / Deathflare / Sunflare, Mountain Buster, Ruin IV in a
    demi, Aetherflow and Further Ruin with lanes, Physick built
    2026-10-16; Enkindle, Mountain Buster, Ruin IV in a demi and
    Aetherflow at a kill matched three pages; Slipstream ticks and extra
    Ruin III not adopted).
  - [rdm.md](rdm.md): Red Mage, 0 candidates (invuln casts
    are `noDamageCasts`'s), 12 covered (mana simulation with lanes and
    Dualcast running out built 2026-10-15; mana per cast since
    2026-10-16, matching both pages' overcap exactly; wrong finisher
    built 2026-10-16, any difference judged; the pre-7.4 Manafication
    rules not adopted).
  - [whm.md](whm.md): White Mage, 0 candidates, 10 covered
    (Blood Lily overcap and Misery left at a kill with Lily / Blood Lily
    lanes, Assize tracked, Lilies lost at the cap counted where a later
    Cure / Medica needed one, 2026-10-16; matched three pages; Lily
    totals differ from xivanalysis's, unexplained).
