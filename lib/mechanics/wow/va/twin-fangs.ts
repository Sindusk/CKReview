// lib/mechanics/wow/va/twin-fangs.ts
//
// Mythic The Twin Fangs (The Venomous Abyss): guide-derived encounter model
// for later combat-log detection. This file intentionally contains no
// detector. Spell IDs below are linked journal IDs, not verified Warcraft
// Logs cast/debuff/damage IDs. As with entombed-sentinels.ts, prepend a
// separate log-verified section once a Mythic report is available; the
// observed log must win over guide assumptions, especially after hotfixes.
//
// Sources checked 2026-09-26:
//   Encounter journal and spell links:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-twin-fangs-boss-strategy-abilities
//   Mythic encounter model based on PTR testing:
//   https://www.project-one.fun/en/guide/the-twin-fangs
//   September 1 hotfix (see Twin Fangs in the running Blizzard post):
//   https://us.forums.blizzard.com/en/wow/t/world-of-warcraft-midnight-hotfixes-september-24/2336376
//   September 15 Blizzard raid tuning:
//   https://us.forums.blizzard.com/en/wow/t/the-venomous-abyss-raid-tuning-september-15/2349528
// Older guides and parts of the journal still say 9 Eternal Venom stacks
// kill on Mythic and describe 14 Broodlings. The September hotfixes changed
// those to TEN stacks before death, and TEN Broodlings per Rouse the Brood.
// They also raised the minimum Ravenous Feast target count to FOUR and
// lengthened Visceral Burst's cast by 0.5s. Verify these against the
// specific Mythic log/patch before making a threshold-based rule.
//
// -- ENCOUNTER SHAPE AND RESOURCE LOOP -------------------------------------
//
// Vexhul (green) and Ithraz (red) have separate health pools. Fight both in
// one repeating main-phase/submerge cycle. Eternal Venom is the central
// resource: many poison hits give a PERMANENT stacking DoT, and reaching
// 10 applications on current Mythic kills the player. It does not naturally
// decay or dispel. The only intended removal is Ithraz's Ravenous Feast,
// which consumes one stack per player struck by a bite. A player dying with
// Eternal Venom on Mythic also spawns extra Caustic Globules, which can
// spread stacks to the surviving raid. Avoidable damage thus has a lasting
// cost even when it does not immediately kill.
//
// Vexhul makes globules, adds, and waves; Ithraz provides Feast, tank
// impact soaks, Ichor pools, and Mythic broodlings. At 100 energy both
// Submerge and reposition, leaving Noxious Slick that reduces usable space.
// During the transition Vexhul channels Vile Flood while Ithraz bombards
// the platform with Sanguine Storm. After relocation the main loop resumes.
// Space shrinks with repeats. Bring the two bosses to similar health near
// the kill: when one dies, the survivor gains stacking Uncoiled Wrath.
//
// -- ROUGH CHRONOLOGY OF A CYCLE --------------------------------------------
//
// 0. Pull with a globule interception plan, three distinct Feast bite
//    groups, Tainted Blood fount healers/soakers, Stone Breaker coverage,
//    and interrupts for the current ten Broodlings. Keep bosses in melee
//    reach where possible and position for cleave without aiming Vexhul's
//    tank splash or Spawn of Vexhul lines through the raid.
// 1. Main phase: Vexhul channels Caustic Deluge on her tank. Nearby acid
//    impacts generate Caustic Globules; the Mythic Barbed Bulwarks around
//    them must be stopped before players can intercept the globules. Each
//    globule has a short timer; a deliberate player pickup confines the
//    Venom stack to that player, while an unattended burst hits everyone.
// 2. Ithraz executes Ravenous Feast: three quick group bites. A fresh group
//    covers each bite, earning one Eternal Venom stack removal per player
//    and Feasted, which makes a repeat bite dangerous and unproductive.
//    Mythic Tainted Blood founts appear alongside Feast and need healing
//    absorbed within their short lifetime, or Tainted Burst hits the raid.
// 3. Other overlapping main-phase mechanics: Vexhul's Venomous Emergence
//    applies an unavoidable raid stack and calls Spawn of Vexhul; kill them
//    and dodge Corrosive Spit lines. Stir the Depths pulses raid damage and
//    sends avoidable stack-giving waves. Ithraz's Stone Breaker needs its
//    ordered impact circles covered; Coiling Ichor targets place long-lived
//    Congealed Gore at the arena edge. Mythic Blood Torrent/Barbed Bulwark
//    and Rouse the Brood add the interrupt workload. This is a dependency
//    sketch, not a promise of one exact cast order.
// 4. Around 100 energy, both Submerge. Avoid entry impacts and the Noxious
//    Slick left by their previous position. During relocation, stay ahead
//    of Vexhul's rotating Vile Flood and dodge Ithraz's Sanguine Storm
//    impacts and short Gore pools. Re-establish the main-phase position.
// 5. Repeat while tracking Venom, raid space, and both bosses' HP. Kill
//    them near together so Uncoiled Wrath does not ramp for long.
//
// A PTR-based guide estimates a submerge about every two minutes and says
// the platform becomes untenable after about three. Treat those as rough
// raid-planning limits, not fixed log cutoffs or proof of an automatic wipe.
//
// -- ETERNAL VENOM: TRACK THE CAUSE, NOT JUST THE DEATH ----------------------
//
// Eternal Venom (1290336 linked journal spell): one stack per relevant
// poison event; ticks every second and persists until Feast consumes it or
// the player dies. Current Mythic death threshold is 10 applications, per
// Blizzard's September 1 hotfix; the older journal/PTR guides say 9. A
// death at the cap is a consequence, so reconstruct the stack history to
// distinguish unavoidable raid-wide sources, intended globule pickups,
// and avoidable wave, splash, spit, or Flood hits. Do not flag every stack
// as an error. More globules after a venomous death can create a cascade;
// distinguish the initiating avoidable stack from downstream cleanup.
//
// Venomous Emergence (1291404) gives the raid an expected stack. A missed
// Caustic Globule gives the whole raid an avoidable stack. A player who
// intentionally intercepts one takes the stack instead, which may be
// correct if their current count is safe. Feast is the only repeatable
// stack reduction; monitor its actual aura stack change rather than
// assuming every nominal soaker lost a stack (immunity/death/log format
// may differ). If a player already at the cap takes a planned pickup,
// investigate assignment rather than blaming all globule collection.
//
// -- VEXHUL: DELUGE, GLOBULES, ADDS, WAVES ---------------------------------
//
// Caustic Deluge (1289192) channels for about five seconds on Vexhul's
// current tank with frequent Nature hits. It ejects acid near that tank;
// each impact hurts players within roughly four yards, adds Eternal Venom,
// and forms a Caustic Globule (1289993) at the impact location. Keep
// other players away from these splashes and swap/mitigate for Envenomed
// (1310360), the stacking +10% Deluge damage-taken effect. Deluge tank
// ticks are expected; splash hits on other players are failure candidates.
//
// A globule ruptures after about ten seconds if not intercepted: raid
// damage and one Eternal Venom on every player. Touching it beforehand
// redirects that cost to the soaker. On Mythic, Ithraz's Blood Torrent
// (1303230) forms Barbed Bulwark (1303378) around globules. The barrier
// knocks/damages players and must be interrupted to destroy it before
// safe pickup. The journal says interrupting; PTR testing reports that
// stuns worked while grips/knockbacks did not. Verify the actual cast,
// aura, crowd-control event, and removal in live logs; a generic interrupt
// event may not be emitted when an AoE stun is used. Match each globule's
// spawn, barrier clear, pickup, or timeout. A raid-wide globule burst is a
// stronger miss signal than an intentional one-player pickup hit.
//
// Venomous Emergence calls Spawn of Vexhul and applies a normal stack to
// the raid. PTR testing reports three spawns per cast; verify live counts.
// Each Spawn uses Corrosive Spit (1291478), a targeted frontal line that
// damages and applies Eternal Venom to anyone hit. Kill them promptly;
// only the intended target/path may be forced, while extra players hit by
// the line are avoidable. September 15 reduced Spit's Mythic DAMAGE by
// 20%, not its stack or targeting rule. Do not hard-code damage amounts.
//
// Stir the Depths (1290956) causes a short period of unavoidable raid
// pulses and traveling waves. The waves damage and add Venom to players
// struck. Separate the unavoidable pulse ID from the traveling-wave hit
// before flagging a player; the linked cast ID may be neither damage ID.
// During transition, Vile Flood (1294293) is a rotating 14-second toxin
// frontal. Follow its rotation to move the short safe path; every beam
// contact can add Venom. Concentrated Spittle (1295107) is Vexhul's
// out-of-range tank punishment and needs tank-position context.
//
// -- ITHRAZ: FEAST, BLOOD, BROODLINGS, STONE -------------------------------
//
// Ravenous Feast (1290516) strikes three times, splitting physical damage
// among players within about 14 yards, knocking them back, and consuming
// ONE Eternal Venom stack per player hit. Current Mythic requires at least
// FOUR targets for the bite; practical groups can be larger to split its
// damage. Feasted (1310096) lasts roughly eight seconds, increases damage
// from another bite by 800%, and prevents another stack consumption.
// Assign three distinct bite groups or a log-proven immunity strategy. A
// player taking a second bite with Feasted is a strong error candidate;
// a player receiving the first planned hit and stack reduction is not.
// A thin bite is a raid-level candidate only when the actual number hit is
// below the current Mythic minimum and the resulting penalty is observed.
//
// Tainted Blood (1310099) is Mythic-only and appears during Feast as
// several blood founts. For up to about eight seconds each fount absorbs
// healing from players within five yards (journal wording). Fully exhaust
// each before expiry. An unresolved fount emits Tainted Burst (1310105),
// a large raid-wide Shadow hit. This is a strong missed-fount signal, but
// attribute to the fount/raid until log events show which players were
// assigned and who could reach it. Do not confuse intentional healing
// absorption with a failed heal or mark its normal ticks as an error.
//
// Blood Torrent (1303230, Mythic) channels on Ithraz's current target for
// five seconds, adding a healing absorb each second. Its expelled blood
// creates the Barbed Bulwarks at Caustic Globules. Track it as the cause
// of the barriers and as tank/healer pressure, not a player error merely
// because the target carries several absorb applications.
//
// Rouse the Brood (1308356, Mythic) deals an initial raid hit and summons
// Broodlings of Ithraz. CURRENT count is 10 after the September 15 hotfix;
// old PTR guides say 14. Each broodling starts Visceral Burst (1308385),
// a raid hit plus stacking six-second DoT if it completes. Interrupting
// the cast makes that broodling retreat. Assign distributed interrupts
// with backups and cover every active broodling, not an old fixed quota.
// A completed Visceral Burst cast/damage is a strong missed-interrupt
// signal once source actors and cast-success semantics are verified.
// Do not blame a specific interrupter from an unassigned log alone.
//
// Stone Breaker (1288538) pushes the raid out, then marks successive small
// impact circles. Each must strike at least one player or its hit instead
// damages and knocks the whole raid, ignoring armor. Soaks take increased
// subsequent Stone Breaker damage (about +33% per stack for 90 seconds),
// so tanks plan the numbered order and mitigation; the two tanks may
// alternate. A normal, deliberately soaked impact is not a player error.
// A verified no-target raid hit is a strong missed-soak signal. Identify
// each impact separately and do not infer a miss from the opening pushback.
//
// Coiling Ichor (1290809) marks several players for increasing Shadow
// damage and shrinking area; expiry leaves Congealed Gore (1292505), a
// damaging, slowing pool lasting around two minutes. Place pools toward
// safe outer edges without blocking globule or Feast paths. A later pool
// tick may be caused by someone else entering it, not necessarily by the
// original dropper. Ithraz's out-of-range Clotted Bolt (1295115) needs
// tank-position context before it becomes a detected failure.
//
// -- SUBMERGE, SPACE, AND KILL ORDER ----------------------------------------
//
// At 100 energy, Submerge (1308556) moves both serpents. Entry impacts
// hurt near their landing spots and form Noxious Slick (1309471), which
// ticks and increases damage taken by 30%. Avoid those locations and move
// toward the next safe area. Vexhul's Vile Flood beam and Ithraz's
// Sanguine Storm (1306872) run together after relocation. Storm impacts
// hit within about four yards and leave short Congealed Gore (1306922)
// pools on Mythic. Dodge both while staying out of older Slick; the
// long-lived area denial is why the number of cycles matters.
//
// Toxic Fumes (1295049) is the encounter's routine raid pulse about every
// two seconds. Once either serpent dies, the survivor gains Uncoiled Wrath
// (1308583), +30% damage every four seconds. Balance boss health before
// the finish. Uncoiled Wrath application is expected after the first death;
// prolonged stacks can explain a wipe, but do not classify the first
// stack as a player error without an actual bad HP gap and survival limit.
//
// -- FUTURE DETECTION / LOG VALIDATION --------------------------------------
//
// Gate all rules to MYTHIC Twin Fangs. Resolve Vexhul, Ithraz, globules,
// bulwarks, Spawn of Vexhul, broodlings, blood founts, and environmental
// effects by report-specific actor/instance IDs and names, not fixed actor
// IDs. Identify each phase via both bosses' Submerge casts and each Feast
// and Deluge via actual cast/aura windows. Verify the real event ID and
// event type for every spell above; cast, periodic damage, aura, and
// triggered explosion may have different IDs. Check whether globule/fount
// despawn or death corresponds to success, timeout, or a pull ending.
//
// First promising failure signals: unattended globule bursts; Visceral
// Burst completions; Tainted Burst; unsoaked Stone Breaker impacts;
// Feasted repeat bites; avoidable Corrosive Spit, Stir waves, Deluge
// splash, Vile Flood, storm/pool hits; and cap deaths after an avoidable
// Eternal Venom gain. Context/expected: Venomous Emergence stacks, planned
// globule pickups, initial Feast hits, routine Fumes, Deluge tank damage,
// Blood Torrent absorb, and the first Uncoiled Wrath application.
//
// Reconstruct a per-player Venom ledger in timestamp order: apply stack,
// remove at Feast, then classify cap death by its most recent causes. Track
// healer/fount events and globule/bulwark interactions separately; a
// missing fount or shield event should produce unknown, not a fabricated
// assignment error. Deduplicate one raid-wide damage pulse across all its
// victims while preserving multiple missed sources when visible. Distinguish
// a mechanic failure from deaths after the pull was already lost. Use the
// established Minor/Major/Raid severity and wipe-marker behavior in the
// neighboring Sentinels detector, but calibrate any death window, stack
// threshold, soak count, or late-add timing on CURRENT Mythic logs.
