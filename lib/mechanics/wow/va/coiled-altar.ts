// lib/mechanics/wow/va/coiled-altar.ts
//
// Mythic The Coiled Altar (The Venomous Abyss): guide- and journal-derived
// encounter model for later combat-log detection. This file intentionally
// contains no detector. Linked spell IDs are CANDIDATES, not verified
// Warcraft Logs cast/aura/damage IDs. Add a separate log-verified section
// when a current Mythic report is available; the observed log wins.
//
// Sources checked 2026-09-26, in priority order for recent tuning:
//   Blizzard hotfix history, including Aug 29/31, Sep 1, Sep 17/21/23:
//   https://us.forums.blizzard.com/en/wow/t/world-of-warcraft-midnight-hotfixes-september-24/2336376
//   Blizzard September 15 raid tuning announcement:
//   https://us.forums.blizzard.com/en/wow/t/the-venomous-abyss-raid-tuning-september-15/2349528
//   Blizzard's September 23 correction to the Soulcoiler spawn wording:
//   https://us.forums.blizzard.com/en/wow/t/world-of-warcraft-midnight-hotfixes-september-24/2336376?page=8
//   Wowhead encounter journal, especially Mythic-only branches:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-coiled-altar-boss-strategy-abilities
//   Mythic Trap strategy (some explanations predate September tuning):
//   https://mythic-trap.vercel.app/en/venomous-abyss/the-coiled-altar/mythic
//   Project One PTR chronology (labeled Heroic; use ONLY for the shared
//   phase structure, with Mythic behavior taken from the journal/above):
//   https://www.project-one.fun/en/guide/the-coiled-altar
//
// -- PATCH SENSITIVITY BEFORE BUILDING DETECTION ---------------------------
//
// This fight changed substantially after release. August hotfixes lowered
// the Mythic Defilement healing absorb by 20% and corrected phase/transition
// issues; September 1 reduced Coalesced Venom damage by 15% and Venom
// Rupture damage by 10% on Mythic. September 15 reduced Venom Rupture again
// by 10%, Mutagenic Venom by 15%, lengthened Mythic Wail of Terror to 10s,
// stabilized Soulcoiler spawn/relocation, fixed Dreadmarch target count from
// rising during the phase, deprioritized ghost fixates on already-fixated
// players, lengthened their post-kick visibility by 3s, and reduced Mythic
// intermission Fragment spawns by 25%. September 17 fixed excess tank
// fixations; September 21 fixed rare missing Deluge orbs and missing area
// denial. Do not bake old damage values, rising Dreadmarch counts, or old
// Fragment counts into rules for current logs.
//
// IMPORTANT correction dated September 23: the original tuning note said
// one Spiteful Soulcoiler would ALWAYS spawn near Malacrass. Blizzard
// corrected that to an INCREASED LIKELIHOOD of a nearby spawn. A distant
// add is valid. Reconstruct actual add positions/times instead of assuming
// an add at a fixed nearby marker. Even 10s Wail timing should be verified
// against the actual spell variant and report date.
//
// -- OVERALL SHAPE AND ROUGH CHRONOLOGY ------------------------------------
//
// The encounter has three combat stages separated by one intermission:
// 0. Stage 1, Serpent's Bargain: fight Zul'jan alone. Toxic Deluge creates
//    venom orbs and Mythic mutations/cysts. Carriers move them into a safe
//    Sever frontal; each destroyed orb adds a stacking Venom Rupture raid
//    DoT. Alternate Guillotine soak groups and move away from its eruption.
//    Fangs, Venomfang, Axegrinder, and terrain pressure continue. Zul'jan's
//    first defeat, not an elapsed timer, starts stage 2.
// 1. Stage 2, Usurper's Reprisal: Hex Lord Malacrass takes over. Free
//    Dreadmarch victims before they walk off, manage personal fixating
//    Manifestations and point Soul Sever through them. Shield-break then
//    interrupt Eternal Nightfall. Spiritcackle adds need Gloombomb hits to
//    weaken their Mythic Spirit Shield, Wail interrupts, and a kill before
//    they become interrupt-immune. Recover Soul Fragments from Gravebound.
//    Malacrass's defeat begins the intermission.
// 2. The Claimed Vessel intermission: Malacrass channels Soulbinding and
//    cannot be damaged. Zul'jan regenerates but takes increased damage;
//    focus him while players intercept Fragments of Malacrass. Intercepts
//    prevent boss healing but cause raid damage and a short stacking
//    Spirit Erasure vulnerability. Space them to avoid a lethal burst.
// 3. Stage 3, Coiled Union: both bosses are active, with combined and
//    altered kits. Blighted Sever can clear both orbs and ghosts; Grim
//    Guillotine, Defilement, Gloombomb, Nightfall, Soulcoilers, and
//    Dreadmarch can overlap. Balance their health and kill nearly together,
//    because the survivor of a Soulbound pair gains a huge berserk.
//
// The shared positioning plan often places the raid outside and collects
// orbs toward center in stages 1/3, then places the raid centrally while
// Dreadmarch victims and ghosts are handled outward in stage 2. Markers,
// portals, and exact push timings are strategy choices, not mechanic rules.
// Phase changes follow actor deaths/Soulbinding and actual cast events.
//
// -- STAGE 1: COALESCED VENOM AND MYTHIC MUTATIONS -------------------------
//
// Toxic Deluge (1299960) marks impact locations, hurts players near them,
// and creates Coalesced Venom (1282403). Each stationary orb pulses raid
// damage. A player stepping on a normal orb carries Volatile Venom
// (1282419) for about five seconds, damaging players within five yards,
// then drops a new orb at their position. Carrying REPOSITIONS the orb; it
// does not remove it. Move orbs into a planned cluster, isolate carriers,
// then have the tank aim Sever (linked variants 1299680/1299684) through
// them. A destroyed orb triggers Venom Rupture (1299838), a roughly ten-
// second raid DoT that stacks. Thus clearing orbs is mandatory but clearing
// too many simultaneously is a healing hazard. An orb left alive keeps
// pulsing, and orbs remaining at a stage boundary may be destroyed there;
// do not simply postpone the entire cleanup to the push.
//
// Mythic Volatile Venom applies Tainted Blood (1310013) on expiration:
// +200% damage taken from subsequent Volatile Venom for ten seconds. Rotate
// carriers/avoid immediate re-pickup rather than assuming one player can
// shuttle every orb. Validate whether it is an aura apply, stack, or damage
// modifier in the log. A carrier receiving Volatile Venom once is intended;
// a second exposure under Tainted Blood is the dangerous sequence.
//
// Mythic Deluge variants also create a Virulent Cyst and/or Virulent
// Mutations. The Cyst emits additional Coalesced Venoms via Caustic
// Secretion (1309174), about two every six seconds in the journal; handle
// its extra orbs and verify when/how the cyst is killed in the log.
// Virulent Mutation (1310544) is the PURPLE orb. Its pickup applies
// Mutagenic Venom (1310498): a larger damaging radius (about eight yards)
// and an orb drop on expiry. A Mutation touching other globules violently
// explodes them and triggers a very large chain of Venom Ruptures; the
// journal also says remaining Mutations erupt on the next Toxic Deluge.
// Transport/clear each purple orb on an isolated route; do not merge it
// with the normal-orb cluster or leave it for the next wave. A rapid
// stack surge of Venom Rupture after a Mutation collision is a
// different failure from a merely oversized planned Sever clear. September
// 15 reduced Mutagenic Venom damage but NOT this collision rule.
//
// -- STAGE 1: OTHER ZUL'JAN WORK -------------------------------------------
//
// Sever is a heavy tank frontal with a large vulnerability for those hit.
// Point it through the planned orb area, away from other players. Tank
// swaps and frontals should preserve a safe path for carriers. Fangs of
// the Coiled Altar (1282487) pulses unavoidable raid damage and supplies
// Twinfang Toxin (1300322), making subsequent boss melees spike on the
// tank. The altar also creates expanding Noxious Ground; stay out of it.
// Venomfang (1282287) is a poison axe/debuff on players, dispellable with
// appropriate timing. Axegrinder (linked variants 1283832/1283840) lands
// then leaves roaming axes that persist and crowd space on Mythic; count
// direct contacts/knockbacks as avoidable, not the mere axe spawns.
//
// Guillotine (1283489) marks a player and splits an armor-ignoring impact
// among players within nine yards. At least FIVE must be hit; otherwise
// Execution (1283606) strikes the raid. Soakers gain Guillotined
// (1309944), +500% damage from another Guillotine. The journal states
// Guillotined is PERMANENT on Mythic, so alternate groups and do not reuse
// an already marked player as a routine soak. After the impact, Widow's
// Kiss (1283623) erupts around the axe (about 40 yards); move promptly.
// Its farther-area Widow's Touch is lower damage, not evidence of a failed
// soak. Track the five-person condition, repeated-soaker deaths, and
// distance to the later eruption as separate checks.
//
// -- STAGE 2: DREADMARCH AND PERSONAL MANIFESTATIONS -----------------------
//
// Dreadmarch possesses multiple players and gives each an absorb while
// forcing them toward the platform edge. Break each absorb before that
// player falls. On removal, that player spawns Manifestations of Dread;
// the journal suggests two each, but verify count. September 15 stopped
// the number of Dreadmarch targets from increasing over the phase.
// A fall is downstream of a failed rescue, not necessarily player control.
//
// Mythic Manifestations are visible only to their CURRENT fixated target
// and can refixate about every 15 seconds. Unnerving Fixation (1285911):
// each ghost moves while its target looks away and freezes when watched.
// Its target guides it toward a planned Soul Sever lane, then faces it to
// park it until the tank frontal clears it. Reaching the fixated player
// causes another Dreadmarch. Two ghosts touching causes Malevolent
// Resonance (1310732), damage to their targets; avoid clustering them so
// tightly that they collide. Post-September tuning, fixates deprioritize
// players already fixated, but this is not a hard exclusion. A Wail of
// Terror interrupt temporarily reveals hidden ghosts to everyone, with
// three extra seconds of visibility after the September 15 change.
//
// Soul Sever (1286620) is Malacrass's tank frontal. Aim it across the
// ghost lane to destroy Manifestations, while other players leave its
// cone. A player hit gets a large vulnerability and Gravebound (1286837).
// Gravebound ejects personal Soul Fragments that fade after about ten
// seconds; their owner must collect them or die on expiry. Gloombomb also
// causes Gravebound to those it hits, so a targeted player drops away
// from allies and then collects their own fragments. Verify fragment
// count and exact expiry per spell variant; do not confuse these PERSONAL
// Soul Fragments with intermission Fragments of Malacrass.
//
// Eternal Nightfall (1286918): Malacrass raises Veil of Twilight
// (1286912), which must be damaged through before the cast can be
// interrupted. While the shield stands, Suffocating Darkness applies
// stacking healing absorbs, and impact zones add more stacks. Break
// shield -> interrupt -> clear absorbs/heal. A completed Nightfall is a
// major failure; a slow shield break can also cause substantial pressure
// even if the cast is eventually kicked. Dreadful Presence is expected
// background raid damage during Malacrass stages.
//
// -- MYTHIC SPIRITCACKLE / SPITEFUL SOULCOILERS ----------------------------
//
// Spiritcackle (1286441) brings Spiteful Soulcoilers. Their Wail of Terror
// (1286399) is a raid-wide fear if completed. On current Mythic it has a
// ten-second cast after September 15; interrupt before completion. An
// interrupt causes relocation, so track each add's movement rather than
// assuming a fixed platform spot. At 100 energy, Consumed by Resentment
// (1315202) makes the add interrupt-immune. Retaliatory Malice deals
// background random-target damage while it lives. Kill in time.
//
// Mythic Spirit Shield gives the add 99% damage reduction. Each correctly
// placed Gloombomb (linked 1310882/1310881; verify which is the mark vs
// impact) hitting the add removes/weakens a shield application, making it
// killable. The bomb still hurts players within about 15 yards and can
// afflict them with Gravebound: overlap the ADD, not extra teammates.
// A low-damage add with shield intact is a placement/dependency issue, not
// necessarily poor DPS. A missed Wail kick and a failed Gloombomb placement
// are distinct failures. Add spawn near Malacrass is only more LIKELY
// after tuning, not guaranteed (Blizzard's September 23 correction).
//
// -- INTERMISSION: SOULBINDING AND FRAGMENT CADENCE ------------------------
//
// Malacrass reaches zero and channels Soulbinding (1304032). He is immune
// while Zul'jan returns with Ghastly Regeneration (1304033): Zul'jan heals
// about 2% max HP each second for ~35 seconds but takes 100% more damage.
// Healing Zul'jan receives is duplicated to Malacrass. Burst Zul'jan; a
// raid may use Heroism here, but that is a strategy, not a detection rule.
// The phase ends with the channel, not when Zul'jan has a particular HP.
//
// Fragments of Malacrass move toward Zul'jan. If one arrives, Reclaim
// Essence (1287718) heals him by about 10% max HP and transfers that
// recovery through Soulbinding. Players intercept by stepping on them,
// triggering Spirit Erasure (1287722): required raid damage PLUS, on
// Mythic, +20% damage from further Spirit Erasure for two seconds, stacking.
// Stagger intercepts enough to let the vulnerability fall where possible.
// Too many simultaneous blocks can kill the raid; a missed fragment heals
// the bosses. September 15 reduced Mythic fragment spawns by 25%, so old
// intermission count templates are wrong. Track each block vs arrival and
// its downstream HP/damage, not just raw Erasure hit counts.
//
// Deathguard can reduce Malacrass's damage taken in relation to stunned
// Manifestations at the transition. Confirm its actual events before
// treating low damage to Malacrass during Soulbinding as a failure; the
// raid's intended damage target then is Zul'jan.
//
// -- STAGE 3: COILED UNION --------------------------------------------------
//
// Zul'jan and Malacrass return together. Blighted Sever (linked variants
// 1307279/1307292) is the tank frontal that can destroy BOTH gathered
// Coalesced Venoms/Mutations and Manifestations. This creates a positioning
// dependency: organize the orb and ghost lanes for one safe frontal while
// avoiding purple-orb collisions and ghost Malevolent Resonance. Toxic
// Deluge, the Mythic carrier limits, Soulcoilers, Dreadmarch, Gloombomb,
// and Eternal Nightfall remain relevant. Do not assume all timings from
// stages 1/2 simply repeat at the same offsets; model actual casts.
//
// Zul'jan uses Defilement of the Coiled Altar (1298381): raid-wide healing
// absorbs, Corrupted Toxin (1298795) on tank hits, and Defiled Ground that
// absorbs healing from players standing there. The Mythic healing absorb
// was reduced by 20% in an August hotfix. Grim Guillotine (1299267)
// replaces the earlier version with Shadow damage, a healing absorb, and
// a long vulnerability; five players still cover each soak or Grim
// Execution hits the raid. Its delayed Death's Embrace requires movement.
// Keep the Guillotine and Grim Guillotine soak assignments/debuffs distinct
// and check their actual aura durations in the Mythic log.
//
// Soulbound (1309987) means that once one boss dies, the survivor gains
// roughly +500% damage and attack speed. Bring both health pools close and
// kill in a short window. Do not use the Raid Finder shared-health version
// of Soulbound for Mythic. An early kill is risky because it lengthens
// survivor exposure; the actual berserk duration and consequences are
// stronger evidence than a rigid HP-difference threshold.
//
// -- FUTURE DETECTION CHECKLIST --------------------------------------------
//
// * Validate report date/difficulty, actor IDs, spell variants, event types,
//   and patch-specific counts before implementing any threshold. The
//   journal has several variants with the same visible name.
// * Segment by Zul'jan first defeat, Malacrass defeat, Soulbinding
//   start/end, and both actors active in Coiled Union. Do not mistake
//   scripted return/healing in the intermission for a boss reset.
// * Per Deluge, track normal orbs, cyst, Mutations, pickups, carrier auras,
//   drops, Sever/Blighted Sever destruction, and Venom Rupture stack burst.
//   Deliberate orb destruction has an EXPECTED healing cost; classify
//   unsafe batching or Mutation collisions from the causal sequence.
// * Track Guillotine's five-person soak, each player's permanent Mythic
//   vulnerability, and delayed axe eruption separately.
// * Connect Dreadmarch apply -> absorb broken or player fall -> personal
//   Manifestations -> fixation changes/collision -> frontal clear. Ghost
//   visibility is a game mechanic; don't assume an untargeted player could
//   see or route a ghost outside the Wail-interrupt reveal window.
// * For each Soulcoiler, reconstruct spawn location, Spirit Shield stacks,
//   Gloombomb impacts, Wail cast/interrupt, relocation, energy, and death.
//   Never flag a distant spawn as abnormal under the corrected hotfix.
// * For Gravebound, correlate each player's fragment collection/expiry.
//   For intermission fragments, correlate intercept/Spirit Erasure cadence
//   or Reclaim Essence arrival with health recovery. They are different
//   fragment systems despite similar names.
// * Preserve overlap context in stage 3. A death during a required
//   intercept, orb clear, or Gloombomb may have several contributors;
//   prefer direct failed mechanics over assigning blame from damage alone.
