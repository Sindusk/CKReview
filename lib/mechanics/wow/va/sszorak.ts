// lib/mechanics/wow/va/sszorak.ts
//
// Mythic Sszorak (The Venomous Abyss): guide-derived model for later
// combat-log detection. This file intentionally has no detector yet. Spell
// IDs are encounter-journal / Wowhead link IDs, NOT validated Warcraft Logs
// cast, aura, or damage IDs. As in entombed-sentinels.ts, add a distinct
// log-verified section once a Mythic report is available. In that section,
// record observed event types, timing, source/target, and exceptions; logs
// take precedence over guide assumptions.
//
// Sources checked 2026-09-26:
//   Encounter journal with explicit Mythic rules and spell links:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-sszorak-boss-strategy-abilities
//   Mythic changes and full-fight explanation:
//   https://www.icy-veins.com/wow/sszorak-raid-guide
//   Mythic preparation notes:
//   https://raidstrats.gg/guides/sszorak/mythic
// The model covers ONLY the Mythic encounter, including mechanics inherited
// into Mythic. No Heroic/Normal detection path is intended. The timing and
// assignment claims below are provisional until checked against a real log.
//
// -- ENCOUNTER SHAPE ---------------------------------------------------------
//
// Sszorak is a single-target fight with a repeating main-phase/intermission
// loop. The boss executes rapid Apex Predator tank combos, marks players to
// drop Viscous Cysts, and the Altar of Six Winds gives Raging Crosswinds.
// Later, Howling Maelstrom pushes the whole raid across the arena in a
// telegraphed three-gale order. Players use their PREPLACED Cysts as bumpers
// to knock themselves back toward the middle. During the wind sequence,
// Sszorak's Dig In increases damage taken for a roughly 25-second burn.
//
// The additional Mythic clock is Serpent's Fury: a marked player and rising
// boss rage force the raid to form a 14-player stack within 8 yards of that
// mark. This triggers To the Slaughter, consumes rage, and charges the stack.
// Charge victims then receive Virulence and must spread before its delayed
// bursts can re-infect other players. If rage reaches 100 first, Unbound
// Ferocity is effectively a wipe. Main-phase mechanics continue around this
// sequence, so a successful stack must leave time and space for the spread.
//
// -- ROUGH CHRONOLOGY / PLAYER SOLUTION -------------------------------------
//
// 0. Before pull, identify the wind tunnels showing one, two, and three
//    motes. Those predict the order of Maelstrom gales. Assign two Mutilate
//    soak groups of at least five and cyst drop positions opposite the
//    corresponding tunnels. The exact compass positions vary by pull.
// 1. During the main phase, tank Sszorak so Ravage faces away from the raid
//    and Mutilate faces a fresh assigned soak group. The Apex Predator combo
//    contains two Ravages, two Mutilates, and one Tempest in varying order;
//    tanks exchange threat during the combo so one tank does not repeat the
//    same vulnerable hit. Dodge Tempest tornadoes. Continue controlling
//    Corroding Venom stacks from boss melees.
// 2. Venomous Surge targets move to planned positions and let their debuffs
//    expire, creating one Cyst at each required location. The detonation is
//    raid-wide but diminishes with distance. Keep the raid away from cysts
//    until the intended wind, and keep the boss and Caustic Residue pools
//    away from those paths. The cysts must remain available for Maelstrom.
// 3. Raging Crosswinds gives several players directional arrows. On Mythic
//    there are four cardinal knockback directions. Players with compatible
//    opposite directions meet in the air to remove Turbulent Gusts and land
//    safely. Spread before each wind expires to avoid its nearby blast.
// 4. Mythic Serpent's Fury marks a player and starts/continues the rage
//    timer. Bring at least 14 players within 8 yards of the marked player
//    BEFORE 100 rage. To the Slaughter then charges through those players
//    and resets the rage. Everyone struck spreads out for the five-second
//    Virulence expiry; its burst can pass the debuff to anyone hit.
// 5. At Howling Maelstrom, regroup near the middle. The tunnel with one
//    mote blows first, then two, then three. Each gale pushes the raid away
//    from its tunnel into the corresponding Cyst; the cyst explosion sends
//    players back toward the middle. Repeat for all gales. During Dig In,
//    Sszorak takes roughly 30% increased damage for about 25 seconds.
//    Regroup, reassess wind indicators, replace cysts, and repeat the loop.
//
// Guides put Maelstrom at roughly two-minute intervals and describe about
// two main-phase mechanic rounds before it. Treat that as raid-leading
// orientation, not an exact timer for detection. The Mythic Fury/charge may
// interrupt or overlap the ordering above; associate by actual log events.
//
// -- MYTHIC SERPENT'S FURY / CHARGE / VIRULENCE ------------------------------
//
// Serpent's Fury (1297367) marks one player and accumulates boss rage. Icy
// Veins reports that the marked player appeared to be the FURTHEST from the
// boss in testing. This is a hypothesis, not a guaranteed targeting rule;
// do not accuse a player of baiting incorrectly based on distance alone.
// The journal's firm condition is >=14 players within 8 yards of the mark.
// Upon reaching it, Sszorak consumes rage and casts To the Slaughter
// (1297414), charging toward the marked player. The marked player can move
// into a prepared stack; the charge path and exact strike radius need logs.
// With fewer than 14, the raid can still recover while rage remains below
// 100. At 100, Unbound Ferocity (1296898) increases damage by 500% and
// attack speed by 50%, so a verified application is a strong failure/wipe
// signal. Do not conflate a normal To the Slaughter hit with this failure.
//
// Players hit by To the Slaughter get Virulence (1297707). The journal says
// Virulence lasts five seconds with periodic damage and bursts ON REMOVAL,
// hitting nearby players and infecting those struck with Virulence again.
// Thus the required call is "stack to trigger, then spread". A charge hit
// and the first Virulence application are expected. Secondary applications
// and burst damage to another player are strong spread-failure candidates.
// A detector should pair the first aura application with the charge, then
// inspect each removal and secondary application in timestamp order; do not
// label an original charge victim as a spread failure for merely receiving
// Virulence. Check whether death removal also triggers a burst in the log.
// A multi-player burst can chain, so deduplicate raid-wide/cascade errors
// while retaining identifiable spreaders and victims where possible.
//
// -- APEX PREDATOR AND TANKS -------------------------------------------------
//
// Apex Predator (1277025) is a quick five-attack combo with two Ravages
// (1277002), two Mutilates (1277027), and one Tempest (1287072), in variable
// order. Taunts can change the victim even during casts. Icy Veins says
// Tempest is not first or last, but verify this before using a sequence
// validator. Match each completed attack to its actual targets rather than
// assuming a fixed Ravage/Mutilate order.
//
// Ravage is a frontal physical hit that should strike the tank alone and
// face AWAY from the raid. It applies a stacking 600% increase to further
// Ravage damage for about 25 seconds. A non-tank Ravage hit is a plausible
// avoidable frontal error. A second Ravage on a still-vulnerable tank can
// be fatal and may indicate a failed handoff, but check mitigations and
// whether the first hit's aura was present before blaming either tank.
//
// Mutilate is a frontal Nature hit SPLIT among the players it strikes. If
// fewer than five are hit, the journal says it deals deadly damage. A
// proper soak includes a tank plus enough assigned players. Mutilated Gash
// (1277051) continues damaging the group for about 22 seconds and increases
// subsequent Mutilate damage taken by 500%. Mythic groups therefore use two
// fresh, alternating soak groups; the first should not eat the next
// Mutilate. Identify the soak by damage/auras, not world markers. A thin
// soak or repeat soaker is a possible error; the routine initial Mutilate
// and Gash ticks are intentional damage.
//
// Tempest sends poisonous vortices around the arena. Players dodge their
// paths; the damage, movement slow, and DoT can stack. Corroding Venom
// (1282869) increases a tank's Physical damage taken by about 3% per boss
// melee for 12 seconds. Both tanks coordinate ordinary swaps with the
// combo and those stacks. A tank death, a high stack, or a tornado hit near
// a forced movement overlap needs evidence before causal attribution.
//
// -- VENOMOUS SURGE, CYSTS, AND CAUSTIC RESIDUE ------------------------------
//
// Venomous Surge (1305959) applies to several players for roughly ten
// seconds, ticking Nature damage. On expiry, each holder detonates for
// distance-falloff raid damage and spawns a Viscous Cyst (1287008) at their
// position. Assign separate drops opposite the one-, two-, and three-mote
// tunnels so each Maelstrom gale has a bumper. Do not insist on exact marker
// coordinates; the wind directions can vary, and more than one valid cyst
// arrangement may work. A cyst lasts about two minutes unless contacted
// or expired. Contact/expiry knocks players away and applies short damage
// and slow; the knockback is DELIBERATE in the Maelstrom. An early trigger
// can waste a required cyst and endanger the later wind sequence.
//
// In Mythic, Caustic Claws (1305998) also lands around this part of the
// cycle. Its impact hurts players within about six yards and creates
// Caustic Residue (1296602). The ground pool ticks and increases damage
// taken by 30%. Keep pools away from cyst approach lanes; the Maelstrom
// winds can clear pools pushed off the platform. Distinguish a deliberate
// cyst detonation from someone standing in Residue or being hit by a claw
// impact. A single unavoidable tick when a pool forms under its target
// may need an exemption if Mythic logs show it, as with the Sentinels pools.
//
// -- RAGING CROSSWINDS AND HOWLING MAELSTROM --------------------------------
//
// Raging Crosswinds (1285419) gives a short DoT, then an explosion within
// about six yards and a knockback in the target's indicated direction.
// Turbulent Gusts (1285447) slows falling for around ten seconds. Touching
// another player also carrying Gusts dissipates it, so players aim
// compatible knockbacks toward each other. Mythic permits four cardinal
// directions, complicating pair selection. A correct player may still take
// initial wind damage; look for missed midair collisions, fall deaths, or
// nearby expiry damage after verifying direction events/positions. If the
// log omits arrows, do not invent pair assignments from resulting movement.
// Knockback immunities can be a valid alternate solution but can disrupt a
// partner; classify them only after the actual pairing and outcome are known.
//
// Howling Maelstrom (1285732) uses the preannounced wind-tunnel order.
// Between gales, the raid recenters and lets each push send it into the
// matching Viscous Cyst. The cyst burst sends players back against the wind
// and applies a brief slowing/grounding effect. Dig In (1286033) increases
// damage taken by the boss by 30% for about 25 seconds. This is a normal
// damage window, not a reason to flag ordinary wind/cyst damage. A fall
// from the platform can stem from a missing cyst, an early cyst pop, poor
// alignment, or a player failing to re-center. Map cyst spawn/expiration/
// contact and player positions before blaming the dropper or popper.
//
// Ula'tek's Presence (1285961) is the altar's ambient raid tick, about
// every two seconds. It and the normal Venomous Surge detonation are
// context for survivability, not standalone player mistakes.
//
// -- FUTURE LOG VALIDATION / ERROR CANDIDATES -------------------------------
//
// Gate to Mythic Sszorak. Map Sszorak, the altar/wind sources, cysts, and
// players from report-specific actors, not stable actor IDs. Verify the
// actual spell ID and event type for: Serpent's Fury target and boss rage;
// To the Slaughter cast/charge hits; initial versus propagated Virulence;
// all five Apex Predator subcasts and Gash; Surge aura/detonation/cyst
// spawn; Caustic Claws/Residue; each Crosswinds arrow/knockback/Gusts;
// Maelstrom gale order, cyst burst, Dig In, and fall/death events. A spell
// link above may describe a cast while the combat-log damage uses another
// ID. Do not use a fixed phase timestamp or infer a wind direction merely
// from the room marker.
//
// Strong candidate failures after verification: Unbound Ferocity from a
// missed Fury stack; Virulence reapplication to someone outside the charge;
// a non-tank Ravage hit; fewer than five Mutilate targets; a repeat Gash
// soaker on the next Mutilate; tornado/Residue hits; and a Maelstrom fall
// tied to a missing or prematurely burst cyst. The first To the Slaughter,
// initial Virulence, correct Mutilate soak/Gash ticks, Surge drops, planned
// cyst detonations, and ambient Presence are expected mechanics.
//
// Severity and blame require the real pull: cluster raid-wide events, mark
// direct player mistakes separately from the point a pull becomes lost,
// suppress post-wipe noise, and allow unknown when position, arrow, aura,
// or target data is unavailable. A first-death cutoff would be too crude
// here; the Sentinels detector's first actual wipe-marker approach is the
// relevant precedent. Do not hard-code one set of markers, a static cyst
// popper assignment, an exact tank taunt plan, or an unverified rage timer.
