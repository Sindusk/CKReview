# WoWAnalyzer audit: status

Per-job/spec progress for [wowa-audit-plan.md](../wowa-audit-plan.md), moved out of
open-items.md on 2026-10-18 so that file stays a short index. Each ledger
in this folder holds the detail; this file is the running summary.

- [wowa-audit-plan.md](../wowa-audit-plan.md): the same for WoWAnalyzer
  (reference only, AGPL). Pilot started 2026-10-16 at WoWAnalyzer
  `0ffe845` (12.1.0): phase 0 marked 20 specs current, 17 lagging (12.0.x),
  3 stale (Marksmanship declares 11.0.5, Protection Paladin unmaintained,
  Assassination untouched since 2025). Phases 1–2 done for all 40 specs
  (fan-out 2026-10-16). Phase 3 done for every spec 2026-10-17; next is
  the user's review of the `wrong` / `no-damage` rows and the held
  questions (wowa-audit/PHASE3-SEQUENCE.md). Phase 3 values each candidate as
  damage lost in the log first: top players doing the same thing is
  evidence about the premise, not proof it costs nothing (Elemental's
  re-measure turned four `wrong` calls back into candidates). Below,
  each ledger gives its candidate count and the first candidate it
  lists; none is measured yet.
  Open question for the user: should consumables and gear at the pull
  stay out of scope (core.md marks them `no-damage`)?
  - [core.md](core.md): shared core, 3 candidates (melee swing
    uptime, pandemic refreshes, AoE hits per cast); every percentage
    there divides by the whole fight.
  - [shaman-elemental.md](shaman-elemental.md): Elemental,
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
    [HANDOFF-elemental-build.md](HANDOFF-elemental-build.md)),
    Ascendance spenders (low value). Windwalker is next.
  - [monk-windwalker.md](monk-windwalker.md): Windwalker,
    phase 3 done 2026-10-17 against nine top parses and the user's
    Blkphnx (14 pulls). Built and verified: Fists of Fury held (cooldown
    rebuilt from the log; holds into Zenith / Xuen excused to their
    break-even) and Zenith Stomp unused
    (lib/damage/wow/specs/windwalker.ts). Left unbuilt with numbers: Rising
    Sun Kick and chi waste (`unverifiable`), Whirling Dragon Punch, Combo
    Strikes, Touch of Death, Fists clips, Zenith charges. Proposed `wrong`
    for the user's review: the filler order, Conduit targets.
  - [demonhunter-havoc.md](demonhunter-havoc.md): phase 3
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
  - [mage-arcane.md](mage-arcane.md): phase 3 done
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
  - [warlock-demonology.md](warlock-demonology.md): phase 3
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
  - [warlock-affliction.md](warlock-affliction.md): phase 3
    done 2026-10-17. Built Haunt dropped (lib/damage/wow/specs/
    affliction.ts), the Nightfall expiry (procs.ts) and Drain Soul as a
    channel (game.ts; its channels had read as idle). Left unbuilt with
    numbers: Dark Harvest held, its DoT coverage, Cull the Weak (all
    negligible); Grimoire of Sacrifice (nobody takes it). The two `wrong`
    rows stay `wrong` (Haunt cast efficiency, Dark Harvest empty cast).
    Open: one-target DoT uptime during Seed of Corruption AoE stretches
    (the 100th-percentile Soul Harvester's Unstable Affliction gaps).
  - [warrior-arms.md](warrior-arms.md): phase 3 done
    2026-10-17. Built Bladestorm outside Colossus Smash and revalued
    Colossus Smash drift by its armor window (lib/damage/wow/specs/
    arms.ts). Left unbuilt with numbers: Bladestorm's cooldown and the
    Mortal Strike readiness rows (`unverifiable`), Rend and Deep Wounds
    uptime, the priority list; Demolish, Ravager and Champion's Spear fire
    on nothing (every sample player is Slayer). Two `wrong` rows kept
    (Deep Wounds refresh, Cleave efficiency), Rend early refresh proposed
    `wrong`. A player account (2026-10-17) reopened Sweeping Strikes in
    the Colossus Smash window as a candidate (Smash grants 6 stacks
    itself) and added a Rend-through-Bladestorm lead.
  - [evoker-preservation.md](evoker-preservation.md): healer,
    phase 3 done 2026-10-17: nothing built. `checkGcdGaps` fires; the
    survey covers every press (empowers time from their begin-casts);
    Essence Burst never runs out on the sample players. Open for the
    user: `healGcds` flags Echo by Echo's own small heal (0.8–2.0M a
    pull on top players), though its value is the echoed copy.
  - [monk-mistweaver.md](monk-mistweaver.md): healer,
    phase 3 done 2026-10-17: Celestial Conduit drift built
    (tracked-cooldowns.ts). The 740ms "GCD" was Rushing Wind Kick's and
    Soothing Mist's own short GCD; with Sheilun's Gift, Detox, Revival
    and the Mana Tea / Soothing Mist channels added (game.ts, haste.ts,
    timeline.ts) GCD uptime moved 48–82% → 65–89%. Kick drift is
    `unverifiable` (resets not in the log). Open: Touch of Death unbuilt
    (287–450k a press; 2 of 5 top players skip it); Windwalker's tracked
    Celestial Conduit is valued by its cast id 443028, but its hits log
    as 443038, so it never fires (not changed: Windwalker's pass).
  - [druid-restoration.md](druid-restoration.md): healer,
    phase 3 done 2026-10-17: nothing built. Convoke the Spirits (3.0s)
    and Soulcoiler Ritual Vessel (2.0s) now lock the GCD (game.ts), which
    read as idle: GCD uptime +3–4 points. `checkGcdGaps` and `healGcds`
    (Regrowth, Wild Growth) fire. Open for the user: `healGcds` prices
    overhealed Rejuvenations at 1.4–3.0M a pull on top players.
  - [shaman-restoration.md](shaman-restoration.md): healer,
    phase 3 done 2026-10-17: nothing built. `checkGcdGaps` and
    `healGcds` (Chain Heal) fire; the survey covers every press (the
    vessel lock above adds about a point of uptime).
  - [hunter-beastmastery.md](hunter-beastmastery.md): phase 3
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
  - [druid-balance.md](druid-balance.md): phase 3 done
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
  - [paladin-retribution.md](paladin-retribution.md): phase 3
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
  - [deathknight-frost.md](deathknight-frost.md): phase 3
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
  - [demonhunter-vengeance.md](demonhunter-vengeance.md): phase
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
  - [druid-guardian.md](druid-guardian.md): phase 3 done
    2026-10-17. Engine fix: Guardian's bear presses weren't in the spell
    survey, so every press read as idle (game.ts). Lunar Beam tracked,
    Gore expiry (procs.ts); no spec check (Incarnation drift and window,
    Red Moon drift and Rage at the cap measured, not built). Kept
    `wrong`: Mangle / Thrash efficiency, Swipe discipline, Berserk
    per-use. Galactic Guardian now `unverifiable` (never runs out). Open
    for the user: Guardian GCD gaps are priced at the average GCD
    (86–113k) though the free press is a ~20k Swipe.
  - [rogue-assassination.md](rogue-assassination.md): stale
    (12.0.0). Phase 3 done 2026-10-17: Rupture / Garrote off every enemy
    and Rupture refreshed early (specs/assassination.ts); Vanish drift
    priced for a player who never Vanishes. Proposed `wrong`: combo-point
    waste (four rows) and low-point finishers (fire on the top players as
    much). Kept `wrong`: Crimson Tempest spread, Mutilate after Vanish,
    the two Deathmark / Kingsbane alignment rows. Not built: Improved
    Garrote overwritten (priced by Deathmark), Fan of Knives on one enemy.
    For the user: Kingsbane drift reads 777k on the 99.8th Ireath, who
    opened his whole burst at 0:19.
  - [hunter-marksmanship.md](hunter-marksmanship.md): stale
    (declares 11.0.5, active 2026). Phase 3 done 2026-10-17: Precise
    Shots lost (specs/marksmanship.ts), the Moonlight Chakram expiry
    (procs.ts), Trueshot valued for its drift (worth 0 before). For the
    user: the Focus cap check was removed for the spec (0.15–2.0M on top
    players; Focus never limits it). Proposed `wrong`: Kill Shot
    efficiency (top players hold it as much), Volley efficiency (held for
    Trueshot by top players), Focus at the cap. Black Arrow, Wailing
    Arrow and Sentinel's Mark `unverifiable` (no sample player has them).
  - [druid-feral.md](druid-feral.md): phase 3 done
    2026-10-17 (14 player-pulls fetched; no case study): Rip off every
    enemy and Ferocious Bite below 5 points (specs/feral.ts); the five
    tracked cooldowns valued per use (all were worth 0; Convoke 120s,
    Incarnation tracked); Clearcasting and Apex Predator's Craving expire
    (procs.ts); Lunar Inspiration's Moonfire a GCD press (game.ts).
    Proposed `wrong`: Rip refreshed early (the top players clip as much),
    Tiger's Fury Energy waste (TF grants no Energy now). Kept `wrong`:
    Chomp efficiency (nobody takes it), Sudden Ambush on Rake. Sudden
    Ambush expiry `unverifiable` (no duration).
  - [evoker-augmentation.md](evoker-augmentation.md): phase 3
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
  - [evoker-devastation.md](evoker-devastation.md): phase 3
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
  - [monk-brewmaster.md](monk-brewmaster.md): phase 3 done
    2026-10-17 (9 player-pulls, 4 fetched). Built (specs/brewmaster.ts):
    Breath of Fire reset lost (a Keg Smash pressed while the last one's
    Breath of Fire was unpressed). Exploding Keg valued by its later hits
    and Fuel on the Fire, `burstHold` for Vashnik's Venoms; Invoke Niuzao
    tracked at 120s (talent not in the log), valued with its Flurry
    Strikes. Proposed `wrong`: Breath of Fire count per Niuzao, Blackout
    Combo on Keg Smash (top players as weak). Touch of Death, Chi Burst,
    Stomp count left unbuilt; Keg Smash charges unverifiable.
  - [priest-shadow.md](priest-shadow.md): phase 3 done
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
  - [rogue-subtlety.md](rogue-subtlety.md): phase 3 done
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
  - [shaman-enhancement.md](shaman-enhancement.md): phase 3
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
  - [warlock-destruction.md](warlock-destruction.md): phase 3
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
  - [warrior-fury.md](warrior-fury.md): phase 3 done
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
  - [deathknight-blood.md](deathknight-blood.md): phase 3 done
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
  - [deathknight-unholy.md](deathknight-unholy.md): phase 3
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
  - [demonhunter-devourer.md](demonhunter-devourer.md): phase 3
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
  - [hunter-survival.md](hunter-survival.md): phase 3 done
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
  - [mage-fire.md](mage-fire.md): phase 3 done 2026-10-17 on
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
  - [mage-frost.md](mage-frost.md): phase 3 done 2026-10-17 on
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
  - [paladin-holy.md](paladin-holy.md): phase 3 done
    2026-10-17 (18 player-pulls, top 三系精通骑, Stillw, Clarius). No
    check built: every damage press has a cooldown, so the heal-GCD
    check's Judgment filler is gone (heal GCDs price at 0, or at a Shield
    of the Righteous near the paladin's own; top 0.25–2.27M → 0–20k).
    Proposed `no-damage`: Holy Power waste, Holy Shock efficiency,
    Avenging Wrath / Divine Toll drift, Imbued Infusions; `wrong`:
    Crusader's Might.
  - [priest-discipline.md](priest-discipline.md): phase 3 done
    2026-10-17 (10 player-pulls, top Jennerpriest, Busiekk, Pigie). Built:
    Power Infusion drift (tracked-cooldowns.ts, Twins pairs merged; fires
    on Busiekk 1.58M). Radiance and Flash Heal no longer judged by their
    own heal (Atonement applicators). Proposed `no-damage`: Ultimate
    Penitence; Penance bolts `unverifiable`; Shadow Word: Pain uptime is
    full on everyone.
  - [priest-holy.md](priest-holy.md): phase 3 done 2026-10-17
    (20 player-pulls, top Jakbcastin, Chai, Tobii). **The heal-GCD check
    is off for Holy Priest, for the user to approve or reject** (top
    players 1.3–4.3M at Smite, ~9× their damage). Power Infusion drift
    added.
  - [rogue-outlaw.md](rogue-outlaw.md): phase 3 done
    2026-10-17 (17 player-pulls, top Nøwyouseemee, Scoreboard, Âv,
    Decapre, 저는싸이코입니다, 云梦默). Built: finisher below 6 combo points
    (outlaw.ts), Opportunity expiry (procs.ts), Preparation a GCD press
    (game.ts). **The Energy cap check is off for Outlaw, for the user to
    approve or reject** (Energy never limits it; top players read
    0.07–1.32M). Proposed `wrong`: the two Energy waste rows, Sinister
    Strike with Opportunity up. Adrenaline Rush recharge left unbuilt: no
    Restless Blades rule fits the log.
  - [warrior-protection.md](warrior-protection.md): phase 3
    done 2026-10-17 (23 player-pulls, top Boost, Graf, Enàver, Sense).
    Built (protwarrior.ts): Avatar held (90s less 1s per 20 Rage, fires
    on none), Shield Slam held (the "Shield Slam!" ready buff run out;
    top none, weak 23–97k), Rage at the cap (the shared check, wired:
    top 0–27k, weak up to 637k). Thunder Blast and Burst of Power
    expiries (procs.ts), Demolish a GCD press with a lock (game.ts).
    Proposed `wrong`: Ravager ticks (never pressed). Thunderlord
    `unverifiable`.
  - [paladin-protection.md](paladin-protection.md): stale
    (unmaintained), tank. Phase 3 done 2026-10-17 (42 player-pulls).
    Built (protpaladin.ts): Avenger's Shield held (Grand Crusader run
    out; top 0–38k, weak up to 508k); Sentinel and Divine Toll drift
    valued per use (were worth 0) with `burstHold`; Divine Purpose
    expiry (procs.ts). Proposed `wrong`: Holy Power waste, Hammer of
    Wrath window; proposed `no-damage`: Shield of the Righteous with no
    hit. Hammer of Light left unbuilt (two Templar players, no top one).
