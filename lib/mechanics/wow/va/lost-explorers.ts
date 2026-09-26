// lib/mechanics/wow/va/lost-explorers.ts
//
// Mythic The Lost Explorers (The Venomous Abyss): guide-derived encounter
// model for later combat-log detection. This file intentionally contains no
// detector. Spell IDs below are linked journal IDs, not yet verified as the
// Warcraft Logs cast/aura/damage IDs. Add log-observed facts separately and
// let a real Mythic report override assumptions from guides or PTR testing.
//
// Sources checked 2026-09-26:
//   Mythic Method guide (updated September 22):
//   https://www.method.gg/guides/the-venomous-abyss/the-lost-explorers
//   Mythic PTR guide and full encounter chronology:
//   https://www.project-one.fun/en/guide/the-lost-explorers
//   Wowhead encounter journal, including Mythic-specific spell descriptions:
//   https://www.wowhead.com/ptr/guide/midnight/raids/venomous-abyss-lost-explorers-boss-strategy-abilities
//   Blizzard hotfix history (September 10 Final Ascension escalation reset,
//   August 26 Cauterizing Flame/Splinters interaction):
//   https://worldofwarcraft.blizzard.com/en-us/news/24296142/hotfixes-september-2-2026
//
// -- ENCOUNTER SHAPE AND THE FISH CLOCK ------------------------------------
//
// This is a three-target council with no conventional health-based phase
// transition. First Mate Nama and Scrollsage Iku are tankable; Trader Gebbo
// walks a predictable counterclockwise circuit and throws crates. The three
// have separate health pools. Mor'zahi remains at the center, unattacked;
// his Final Ascension is the fight clock. The raid opens Gebbo's crates,
// finds a Disgusting Fish, and uses the extra action on an explorer near the
// end of that clock. The fish breaks Mor'zahi's concentration and resets his
// energy/cast. He then applies Mor'zahi's Command to the fed explorer,
// causing that explorer's distinct empowered ability set ("ultimate").
// Repeat for the next eligible explorer, then kill all three before the
// available feeds and time run out. Letting Final Ascension finish causes
// overwhelming raid damage.
//
// The journal and current guides say EACH explorer may be fed only once,
// implying three feed windows total. An older Mythic PTR guide instead
// describes a repeatable rotation, with only consecutive repeats forbidden.
// Follow the journal/current one-feed-per-explorer model for planning, but
// confirm fish auras and feed counts in a live Mythic log before encoding a
// hard limit. Method recommends Gebbo -> Iku -> Nama; PTR/other guides
// prefer Gebbo -> Nama -> Iku. Those are raid plans, not correctness rules.
// The choice determines which ultimate overlaps each part of the fight.
//
// United Defense (1297644) reduces damage taken by 99% if ALL THREE
// explorers are within 30 yards of one another. Two together can be cleaved;
// the third stays outside the triangle. Position tanked Nama/Iku around
// Gebbo's route and Iku's Blink relocation. If damage stalls, verify the
// actual United Defense aura/geometry rather than assuming poor DPS.
// Bring all three to similarly low health before kills: any one death
// empowers both surviving explorers, so a long gap between deaths can
// rapidly make the remaining fight dangerous.
//
// -- ROUGH CHRONOLOGY OF A PULL --------------------------------------------
//
// 0. Position Nama and Iku to allow two-target cleave without bringing all
//    three into United Defense. Assign a crate opener/rotation, fish carrier,
//    feed target order, Icebound Flames kicks, and plans for the three
//    ultimates. Bloodlust on pull is a common strategy, not a mechanic.
// 1. While Mor'zahi builds toward Final Ascension, Gebbo throws crates.
//    Avoid their initial impacts; then step on EACH crate deliberately to
//    reveal the fish and prevent later Relic Rupture. On Mythic, every
//    opened crate hits and bleeds the WHOLE raid, so space the openings.
//    Meanwhile handle Shell Spin, Blink Nova, Icebound Flames, and tanks.
// 2. Carry the fish to the chosen explorer and use the extra action shortly
//    before the clock completes. Method suggests about four seconds left;
//    another guide uses 90-95 energy. Those are timing heuristics, not
//    universal fixed thresholds. A successful feed causes Fishy Feedback
//    raid damage, Mor'zahi's Command, and that explorer's ultimate.
// 3. Resolve the chosen ultimate: Gebbo's bombs and mushrooms, Nama's three
//    ordered Mighty Thud soaks, or Iku's Fire/Frost volley and debuff
//    clearing. Keep clearing crates and handling the base abilities during
//    the empowered window. Avoid allowing United Defense to appear.
// 4. Repeat the clock/feed/ultimate sequence for remaining eligible targets.
//    Balance the health pools and finish the three kills close together;
//    the survivors grow more dangerous after each death.
//
// Do not hardcode a precise timer or empowered sequence in the detector.
// Reconstruct each cycle from fish pickup/feed, Mor'zahi energy or cast,
// Command on a specific explorer, and its actual ability events.
//
// -- CRATES, MYTHIC SPLINTERS, AND FISH ------------------------------------
//
// Throw Junk (1291933) first marks small landing locations; standing in an
// impact hurts, then crates remain to open by stepping on them. One crate
// contains the Disgusting Fish. All crates still need removal: an unopened
// crate ruptures after roughly 25 seconds for severe raid-wide damage,
// Relic Rupture (1310027), and Gebbo crossing a crate may detonate it early.
// A missed fish and an uncleared crate are distinct problems; follow crate
// creation, opening/despawn, fish pickup, feed, and Rupture separately.
// The fish's extra action may not appear as an ordinary player cast in logs,
// so the target's Command/Disgusting Fish aura and Mor'zahi's reset may be
// stronger evidence than a guessed action spell ID.
//
// MYTHIC Splinters (1312868) is a raid-wide immediate Physical hit plus a
// stacking six-second bleed after EACH crate stomp. It is not merely a
// debuff on the stomper. Deliberate openings are required, so one stack or
// its damage is expected; overlapping too many openings creates avoidable
// healing pressure. Method uses one assigned opener, usually two stacks,
// then lets the bleed fall before more crates. Other strategies rotate
// mobile openers; because the Mythic bleed is raid-wide, its stack cadence
// matters more than the opener's identity. Opening too slowly risks Rupture
// and a late fish. A player's Splinters aura can also be removed by an
// Evoker's Cauterizing Flame after the August hotfix; verify dispel events
// before inferring natural expiry. Do not use the non-Mythic Splinters ID.
//
// Final Ascension (1292780) is the failure clock. The September 10 hotfix
// made its damage escalation reset when interrupted, so old pulls may show
// different behavior. Fishy Feedback (1313303) is the EXPECTED immediate
// raid hit plus a 12-second DoT after a successful feed. Plan healing and
// distinguish it from failed Final Ascension or Relic Rupture damage.
// Mor'zahi's Command (1297022) marks which explorer is empowered. Its
// journal spell may be hidden from the combat log; corroborate with the
// target's new abilities if the Command event itself is missing.
//
// -- BASE ABILITIES AND POSITIONING ----------------------------------------
//
// Mor'zahi's Malevolent Presence (1295449) ticks unavoidable Shadow damage
// on the raid about every two seconds. Evil Eyes (1292388) are short-range
// statue spirit-flame impacts (about 3 yards); those hits are avoidable.
// Background Presence and planned Fishy Feedback should not be labeled
// player errors just because they appear high on a damage breakdown.
//
// Nama: Shell Spin (1296061) fires three shells in a frontal cone, aimed
// toward melee according to current guides. The contact stun lasts about
// four seconds. Bait toward the edge and step out; repeated stuns can
// disrupt fish/crate duties or ultimates. Steady Strikes (1291930) raises
// physical damage against the current tank by roughly 4% per attack for
// 30 seconds. Swap/defensive plan around the rising stacks. A single
// application is normal, while unchecked growth is the concern.
//
// Iku: Blink Nova (1296025) teleports to a targeted player and damages the
// entire raid, with damage decreasing by distance from that destination.
// The target moves away from melee/raid (Method suggests 20+ yards) and
// avoids blinking Iku into United Defense range of both other explorers.
// Icebound Flames (1286921) is an interruptible, heavy Frostfire hit with
// lingering damage and slow; interrupt it. If it completes, the residual
// effect can be dispelled. Shredding Shards (1295854) repeatedly hits her
// current tank, each shard increasing subsequent Shards damage received;
// tank swaps prevent a dangerous stack buildup. Resolve poor Nova spacing
// with positions/damage falloff, not just the expected raid hit itself.
//
// -- GEBBO'S EMPOWERED WINDOW: BOMBS AND MUSHROOMS -------------------------
//
// Mushroom Toss (1292104) places Bouncy Mushrooms at baited player spots.
// Explosive Surprise (1297625) marks bomb targets; place each bomb at an
// arena edge, away from raid and mushrooms. Its detonation/Concussive Blast
// knocks back and sends a lethal traveling Blast Wave (1305844) outward.
// Time a mushroom Bounce just before that wave reaches the group to jump
// over it. Jumping early perturbs/consumes the mushroom and leads to a
// Fungal Burst around it; doing so can strand the raid when the wave comes.
//
// Method reports ONE useful mushroom for each bomb on current Mythic and
// two bomb/mushroom repetitions in its strategy. Bait the next mushroom
// as the group lands from the previous jump. Spreading Flames (1297650)
// remains around the bomb area, shrinking safe space. Some personal
// movement abilities may bypass a wave, but they do not establish that
// the mushroom assignment was handled for the whole raid. Detect direct
// Blast Wave contact and bomb/Concussive Blast collateral where possible;
// without positional data, an early mushroom activation is a hypothesis.
//
// -- NAMA'S EMPOWERED WINDOW: MIGHTY THUD ----------------------------------
//
// Mighty Thud (1296092) marks three players and has Nama leap to their
// positions in order from closest to farthest. Each impact splits damage
// among players within roughly six yards and knocks them back. An EMPTY
// impact instead deals unsplit damage to the whole raid. Arrange three
// distinct soak spots away from the platform edge and track every impact.
// A planned line can let one group be knocked toward the next soak;
// separate soak groups also work. Overlap/edge positioning can cause
// further deaths despite technically covering an impact.
//
// Each leap creates Aftershock (Mythic linked ID 1313690), a damaging
// ground area. The Mythic journal describes it without the explicit
// "until canceled" text shown on lower difficulties; the linked spell
// lists a duration, so do not assert permanent persistence without a log.
// Preserve space for later mechanics and avoid stepping back into it.
//
// -- IKU'S EMPOWERED WINDOW: FROSTFIRE VOLLEY ------------------------------
//
// Frostfire Volley (1295893) fires multiple Fire/Frost missiles. Each
// impact hurts nearby players within about ten yards, applies Burning
// Flames (1295928) or Piercing Frost (1295954), and leaves a Fire/Frost
// patch. Spread to avoid clipping others and place the patches near the
// edge. Piercing Frost slows strongly, so clearing it is urgent. A player
// with one debuff can meet the opposite elemental effect/player/patch to
// remove the debuff and dissipate opposite patches. Verify exact clearing
// event semantics from the log before assigning individual responsibility.
//
// Elemental Explosion (1295952) is the serious failure: a Volley missile
// striking someone ALREADY afflicted with a Fire/Frost debuff causes very
// large raid damage. Resolve each volley separately: track who received an
// aura, when it was cleared, and whether the next impact struck them while
// still afflicted. A debuff existing for a few seconds during deliberate
// pairing is expected; a leftover aura into the next volley is dangerous.
//
// -- KILL WINDOW AND SURVIVOR EFFECTS --------------------------------------
//
// Each explorer death empowers the remaining bosses. Nama gains Relentless
// Escalation (1296227), rapidly increasing damage. Iku gains Cataclysmic
// Invocation (1291390), a repeating raid explosion that grows with casts.
// Gebbo gains Smashing Shovel (1296252), adding strike damage/knockback.
// These are consequences of a death, not standalone player mistakes.
// Compare the survivors' remaining health and time to their deaths when
// diagnosing whether one explorer was killed too early. Do not impose a
// particular kill order as long as the execute window is controlled.
//
// -- DETECTION NOTES FOR A LATER REAL-LOG IMPLEMENTATION ------------------
//
// * Validate NPC IDs, Mythic spell variants, aura stacks, event types, and
//   whether crate/fish/mushroom objects appear in the log at all. Journal
//   spell IDs are candidates, not a guarantee of cast or damage IDs.
// * Model cycles by Mor'zahi energy/Final Ascension, fish found and fed,
//   Command/empowered target, ultimate, then next energy climb. Verify the
//   one-feed-per-explorer rule and the September hotfix on the log's date.
// * Separate required crate stomps and their expected raid-wide Splinters
//   from excessive overlapping stacks, untouched Relic Rupture, and late
//   fish. Splinters damage alone is not evidence of a bad stomp.
// * United Defense needs its aura or positions. Two bosses together is
//   intentional; only the three-way convergence gives the 99% reduction.
// * For Gebbo, correlate bomb, mushroom spawn/Bounce/Fungal Burst, Blast
//   Wave, and deaths. For Nama, correlate each of three marks/landings with
//   actual soakers and Aftershock. For Iku, pair each debuff's apply/remove
//   with successive volleys and any Elemental Explosion.
// * Distinguish regular background damage (Malevolent Presence), planned
//   Fishy Feedback and crate bleeds, tank stack mechanics, and avoidable
//   hits. Attribute a wipe to a direct trigger when evidence supports it;
//   avoid assigning blame from a downstream death or damage total alone.
