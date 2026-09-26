// lib/mechanics/wow/va/vashnik.ts
//
// Mythic Vashnik the Malignant (The Venomous Abyss): guide-derived encounter
// model for later combat-log detection. There is intentionally no detector in
// this file yet. The spell IDs below come from linked encounter-journal spells;
// they are CANDIDATES, not verified Warcraft Logs cast, aura, or damage IDs.
// The Sentinels implementation in this directory demonstrates why the three
// often differ. Keep a separate log-verified section when a real Mythic report
// is available; the report should take precedence over any guide claim here.
//
// Sources checked 2026-09-26:
//   Mythic strategy (including the static Fire + Shadow solution):
//   https://www.method.gg/guides/the-venomous-abyss/vashnik-the-malignant
//   Encounter journal, spell links, and Mythic tags:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-vashnik-the-malignant-boss-strategy-abilities
//   Supplementary Mythic notes:
//   https://www.icy-veins.com/wow/vashnik-raid-guide/
// The aim is to model the fight actually played on MYTHIC, including mechanics
// that persist into that difficulty. Do not implement a Normal/Heroic variant
// from these notes. No timings or failure thresholds below are log-calibrated.
//
// -- ENCOUNTER SHAPE AND CENTRAL CHOICE -------------------------------------
//
// Single boss, one repeating phase, with adds. The arena has three fountains:
// Blood (red), Shadow (purple), and Flame/Fire (orange). At 100 energy Vashnik
// uses Imbibe (1283164), drawing from the TWO closest fountains. Position at
// the instant of that cast determines the pair; a floor-sector boundary alone
// does not necessarily predict which fountains are closer. Each selected
// fountain deals an expulsion hit to the raid, grants Vashnik its Infusion,
// and summons that fountain's living venoms. The Infusions last about 90s
// and stack: each stack adds 100% to that fountain's expulsion damage and
// 50% to the matching venoms' maximum health. Imbibe also adds a stack of
// Toxic Vapor, the encounter's increasing ambient raid damage. Living
// venoms path toward the central Malignant Cavity; one reaching it causes
// Malignant Burst, a severe raid hit and stacking DoT.
//
// On Mythic, Imbibe ALSO creates Malignant Totems/Tumors around the played
// area. The sources and journal use both nouns for these objects. Their
// Malignance cast is the defining Mythic wipe pressure. Plague Froth targets
// must aim the waves they emit at the objects before the next Imbibe. This
// changes Plague Froth from a pure dodge into the raid's clearing tool.
//
// Fountain choice is a STRATEGY, not a correctness rule. The rotating plan
// alternates pairs (e.g. Flame+Shadow, Flame+Blood, Blood+Shadow) so no
// Infusion becomes too high. A current Mythic plan instead holds Vashnik by
// the Shadow fountain in the Flame+Shadow section for the whole fight and
// heals through the growing stacks, simplifying movement and add control.
// Both are valid if the raid survives. Never flag a repeated fountain pair,
// high Infusion count, or a static boss position by itself.
//
// -- ROUGH CHRONOLOGY OF A CYCLE --------------------------------------------
//
// 0. Pull: tank Vashnik at the position chosen for the first fountain pair;
//    loosely arrange the raid for Plague Froth lanes and Catalytic Bile
//    coverage. There can be a Plague Froth before the regular Imbibe cadence;
//    confirm that in the Mythic log rather than anchoring on a fixed offset.
// 1. At 100 energy, Imbibe selects two fountains. Expect their expulsion
//    damage, their Infusions, new living venoms, another Toxic Vapor stack,
//    and the Mythic totem/tumor objects. Heal for the expulsion overlap.
// 2. Control and kill living venoms before they enter the central cavity.
//    Kill Flame adds with separation in time; finish Blood's split chain;
//    break Shadow add absorbs and dodge their death effects. These run
//    alongside the boss's tank and player-targeted abilities.
// 3. Plague Froth goes on several players. Spread for its short aura, aim
//    their outgoing cardinal Plague Waves through the Mythic objects, and
//    keep the wave paths clear of other players. Method reports two Froth
//    sets to clean up a totem set before the next Imbibe. The first can be
//    preplanned; the second adapts to remaining objects.
// 4. Malignant Catalyst launches Catalytic Bile soak circles. Every impact
//    needs at least one player. Adaptive Infection variants depend on the
//    active Infusions and overlap the add/soak/wave jobs. Dripping Fangs
//    continues to force tank swaps.
// 5. Before the next Imbibe, clear surviving totems and stabilize the raid.
//    Any uncleared one can fire Malignance, a raid hit plus long stacking
//    DoT. Then Imbibe and the same cycle repeat until Vashnik dies.
//
// This is an ordering model, not a second-by-second timeline. In particular,
// correlate each mechanic with its actual cast/application/expiration window
// before assigning a failed soak, missed wave, or late add kill.
//
// -- MYTHIC TOTEMS/TUMORS AND PLAGUE FROTH ----------------------------------
//
// Imbibe's Mythic objects are called "Malignant Totem" under the journal's
// Imbibe entry, but "Malignant Tumor" under Plague Wave. Method describes
// them as not directly attackable and removed by a wave. Icy Veins describes
// a 99% damage-reduction Hardened Tumor shield that a wave removes before
// the tumor can be killed. This discrepancy requires direct log validation:
// identify spawn actor(s), shield auras, wave hits, removals/deaths, and any
// follow-up damage to determine whether the wave kills or only exposes.
// Do not assume a miss because no DPS hit appears if the wave itself clears.
//
// Plague Froth (1281907) ticks on players within roughly 4.5 yards of each
// target for six seconds. At expiry it sends Plague Waves in four cardinal
// directions from each target. Plague Wave (candidate 1295798; the journal
// also links a separate damage spell) hits players in the paths and, on
// Mythic, interacts with the objects. Marked players spread out, choose a
// location so at least one lane crosses a remaining object, and avoid aiming
// a lane through the raid. The raid may use fixed markers for the first wave
// set and live adjustment for the second; those positions are not universal
// correctness conditions. Method notes that a totem glows white when a wave
// is aligned with it, but that visual cue may have no log event.
//
// An uncleared totem can emit Malignance (1304459): heavy Nature damage to
// all players and a one-minute stacking DoT. Method says it happens by the
// next Imbibe; one application can be survived, two often wipe. A Malignance
// damage/debuff application is a strong missed-object signal, but determine
// from logs whether several totems pulse at the same instant and deduplicate
// the resulting per-player events into the right number of raid errors. Do
// not label the Froth carrier automatically without a position/path match:
// multiple carriers and wave directions may have been able to cover one
// object, and an unobservable shield state may be involved.
//
// -- SHARED MECHANICS PRESENT ON MYTHIC -------------------------------------
//
// Malignant Catalyst (1282525) detonates an orb above the central cavity,
// dealing a normal raid hit and launching Catalytic Bile (1282601/1282602
// candidate spell links). Each Bile impact has a roughly six-yard soak area.
// At least one player must catch EACH impact; an empty circle instead deals
// a raid-wide penalty. Spread coverage around the boss. Correct soakers
// take intentional damage, so a Bile hit on its own is not an error. A
// future check needs the number/locations of projectiles and a distinct
// unsoaked penalty event; do not infer a miss solely from raid damage.
//
// Dripping Fangs (1280935) is Vashnik's tank hit and a roughly 32-second
// Nature DoT with a large, stacking Physical vulnerability. Swap after each
// hit so the next one lands on the other tank. A tank death alone does not
// prove a failed swap; examine stacks, targeting, defensives, and any other
// simultaneous raid damage first.
//
// Toxic Vapor (1284561) is ambient damage that stacks with Imbibes. The
// fountain expulsions are Hemo (1298582), Gloom (1298583), and Conflagrating
// (1298587). Their increased damage is an expected cost of fountain choice,
// especially the static Mythic plan. Avoid marking those hits, the normal
// Catalyst blast, or routine infection ticks as player mistakes in isolation.
//
// Adaptive Infection (1282117) chooses an infection matching each current
// fountain affinity. Check the actual aura and player targets in logs; one
// cast can produce different debuffs, and debuff removals may be dispels,
// healing clears, expiry, or death.
//
// BLOOD: Siphoning Infection (1299941/1295224 candidate links) gives its
// holder a large healing absorb and prevents ordinary healing while active.
// Siphon Blood (1295229) drains nearby allies to heal the holder and clear
// the absorb. Players deliberately enter the holder's circle; their Siphon
// Blood hits are normal assistance, not friendly-fire errors. On Mythic,
// Thinned Blood (1314273) increases damage from repeated Siphon hits, so
// rotate/help without killing helpers. An uncleared absorb or Siphon death
// needs context before assigning blame to the holder or nearby players.
//
// SHADOW: Stygian Infection (1294994) is a DoT and healing absorb. Until
// healed through it periodically makes the holder cast Stygian Burst
// (1302489), a damaging ground impact near their position. Healers clear
// the absorb promptly; holders keep moving and avoid laying impacts under
// other players while remaining healable. A Stygian Burst hit on someone
// other than the holder is a possible avoidable hit, but its exact impact
// radius/timing and normal overlap need a Mythic log check.
//
// FLAME: Exploding Infection (1295173) is a fire DoT that gains another
// stack roughly every 1.5 seconds on Mythic until dispelled. Its removal
// causes Caustic Explosion (1295209), a raid-wide hit. The infected player
// moves away from the raid; healers stagger dispels when raid health is
// stable. Do not treat EVERY Caustic Explosion as an error: an explosion
// is unavoidable when clearing the debuff. Assess delayed dispels, stacked
// simultaneous explosions, and blast damage only after the log reveals the
// exact falloff and removal reason. A death-stripped aura is not a dispel.
//
// -- THE THREE FOUNTAIN ADD FAMILIES ----------------------------------------
//
// All living venoms move toward the Malignant Cavity. Malignant Burst
// (1280189) means at least one reached it, causing a large raid hit and a
// stacking 30-second DoT. This is a strong add-control failure candidate;
// correlate each Burst with add positions/despawns, and do not misidentify
// it as Malignance (which comes from a Mythic totem/tumor).
//
// FLAME: Mythic summons THREE Burning Venoms when Flame is selected (the
// count is from Method). Burning Presence (1305902) pulses raid damage while
// each is alive. Killing one triggers Caustic Surge (1285979), a raid hit
// plus a short stacking DoT. Keep the deaths separated rather than killing
// multiple at once. Control and reposition adds with grips/banish if the
// composition permits; Hardened Venom (1314837) makes an add immune to CC
// and faster after about 60 seconds. The static strategy banishes one and
// brings the others to Vashnik one at a time. Caustic Surge is expected on
// each kill; overlapping Surges or prolonged Burning Presence may be a
// failure, but require log-calibrated windows and survival context.
//
// BLOOD: One large Clotting Venom initially appears, protected by
// Sanguineous Fortitude (1291530) against crowd control. It moves slowly;
// its death causes Splitting Clot (1286631/1286630), creating smaller
// versions which can split again. Kill the whole family before any child
// reaches the cavity. A parent death is NOT completion of this add set.
// Count child spawns/deaths or Malignant Bursts before declaring it handled.
//
// SHADOW: Several Shrouded Venoms spawn (guides describe five) with Miasmic
// Coating (1312366), a large damage absorb. They can be slowed/controlled
// while higher-priority adds die. On death, Umbral Ejection
// (1286737/1286736) creates damaging impact locations; players dodge them.
// Their shield extends time-to-kill, so compare add lifetime against an
// appropriate Shadow-set baseline instead of a blanket deadline.
//
// -- STRATEGY VARIANCE AND WHAT A DETECTOR SHOULD MEASURE -------------------
//
// A rotating-fountain raid may see all three infection types and add sets.
// A static Flame+Shadow raid may NEVER see Blood mechanics; their absence is
// normal. Under the static plan, repeated Flame/Shadow Infusions and Toxic
// Vapor stacks are deliberate. In either plan, prioritize consequences that
// expose actual mistakes: Malignance from uncleared Mythic objects, a living
// venom's Malignant Burst, an unsoaked Bile penalty, a Froth wave hitting a
// player, Shadow add death impact hits, or a tank taking consecutive Fangs
// while still vulnerable. Distinguish these from intentional soak/dispels,
// add-death explosions, normal ambient damage, and chosen fountain effects.
//
// For log work, first map Vashnik, fountain, totem/tumor, and each venom add
// by report-specific actor ID/name and verify every candidate ability ID by
// event type. Segment cycles by Imbibe cast time and track fountain Infusion
// auras, not just estimated boss coordinates. Resolve pairs of Froth aura
// expirations and wave casts to the active Mythic objects; determine if a
// wave hit removes a shield or kills the object. Track individual add spawn,
// split, death, and cavity arrival. Track Bile projectile impacts and their
// soakers separately from the initial Catalyst blast. Correlate a damage
// cluster into one mechanic failure where the entire raid is hit, but retain
// multiple missed totems/orbs when the log supports multiple sources. Use
// missing-data/partial-pull guards, first-wipe cutoff, and established
// Minor/Major/Raid semantics from the Sentinels detector. Return unknown
// when attribution needs positions, aura stacks, or events that the report
// does not expose. Do not hard-code Method's markers, grip assignments,
// fountain order, healer count, or a precise timing before a real Mythic log
// confirms the raid's strategy and this encounter's event sequence.
