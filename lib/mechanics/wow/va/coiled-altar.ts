// lib/mechanics/wow/va/coiled-altar.ts
//
// Mythic The Coiled Altar (The Venomous Abyss) — per-pull error detection.
// Called from transformFightToPull in lib/log-transforms.ts; it self-gates on
// this encounter's debuff IDs, so it is safe on any WoW pull.
//
// The second half of this header is the guide-derived encounter model
// (written 2026-09-26 before any log was available). The first half is what
// the log actually showed; where the two disagree, the log section wins.
//
// ── VERIFIED AGAINST LOGS (offsets fight-relative) ──────────────────────────
//
//   Report wThYvpJkbK6Pjrdc: 30 pulls, the kill in pull 30. Only pulls 1-17
//   (all wipes) were fetched — WCL rate-limited the download — so there is
//   NO clean kill baseline yet. Thresholds below come from wipes only.
//
// The clock is fixed to the tenth of a second in every pull.
//   Stage 1 (Zul'jan): Fangs +0, Toxic Deluge +2/+45/+87/+130, Axegrinder
//   +14/+99, Sever +23/+40/+60/+77/+108/+125/+145/+162, Venomfang every
//   ~35s, Guillotine mark +43/+128 -> impact +48/+133, Widow's Touch +54.
//   Zul'jan's defeat (~+167-170 in every pull that got there) clears the
//   remaining orbs at once: 9-11 Venom Rupture stacks, survived every time.
//   A fifth Deluge at +172 is the stage-1 overrun (see eruptions).
//   Stage 2 (Malacrass) starts +176.4-178.7 with Dreadful Presence
//   (1288624). Per ~37s half-cycle: Dreadmarch cast +8/+45/+93/+130/+178,
//   Spiritcackle +15/+48/+100/+133/+185, Gloombomb +22/+59/.., Soul Sever
//   +40/+71/.., Eternal Nightfall begins +71 and +156.
//   Intermission: Deathguard/Soulbinding at ~+389-394 (Malacrass at 0%),
//   35s, then Soulbound on both bosses = stage 3 (~+424-430): Defilement,
//   Deluge, Grim Guillotine, Blighted Sever, Soulcoilers, Nightfall.
//
// Coalesced Venom orbs are invisible actors (no events). Pickups show as
// player debuffs: Volatile Venom 1282419 (normal orb, 5s) and Mutagenic
// Venom 1310498 (purple orb, 5s); each pulses 1282288 / 1310691 on the
// carrier and anyone near them every second. Tainted Blood (1310013),
// Virulent Cyst and Caustic Secretion never appear in this report. Each
// Sever destroys the orbs it passes through: one Venom Rupture (1299838)
// stack per orb on every player at the Sever millisecond, 1-7 per Sever.
// Normal Rupture ticks (2s) peak ~615k even after the 11-orb transition.
//
// ERUPTIONS: a single Rupture hit of 850k-2M on 3+ players at once, not at a
// Sever. Two triggers seen: (a) a purple orb touching another orb/carrier —
// the carriers' Volatile/Mutagenic debuffs change within 0.4s before it
// (P7 +97.4 two Mutagenic carriers dropped together after 1.5s/3.5s;
// P12 +168.1 a Mutagenic picked up 0.2s earlier; P5 +518.5 the tank picked
// up a purple while carrying a normal orb); (b) Toxic Deluge with Mutations
// still out (P6 +172.2, the stage-1 overrun, 99 stacks; P9 +529.7).
// Every eruption killed 2-12 at once.
//
// Guillotine: mark 1283485 on one player, impact 1283594 split over those
// within range, soakers get Guillotined 1307425 (+500%). The second soak
// (+133) routinely includes two previously-marked players taking 0 damage
// (immunities) — a strategy, not a re-soak. Fewer than 5 hit ->
// Execution 1283606 on the raid (P16 +133.2: nobody soaked, 11 dead).
// Stage 3 Grim Guillotine: mark 1299266, impact 1299296, vulnerability
// 1307652, penalty Grim Execution 1299301 (P4 3 soakers, P9 4, P11 1).
// A real re-soak: P12 +133 a previously-marked DPS took 971k and died.
//
// Dreadmarch (cast 1285643, debuff 1297445 on 4 players, 568k absorb that
// the raid breaks by damaging them in 1.1-4.2s). A fall shows as the debuff
// removed with the absorb unbroken and a death with NO killing blow at that
// instant (P2 +276.5, +310.3, +312.9; P8 +250.3; P17 +497.2). Each broken
// Dreadmarch spawns 2 Manifestations of Dread ~2s later, which fixate
// (Unnerving Fixation 1285911) on random players. A ghost reaching its
// target = an off-cycle Dreadmarch on that player at the same instant the
// fixation ends (13 cases, e.g. P8 +199.4/+227.0/+233.1/+237.0/+244.0).
// Soul Sever (1286620) kills the ghosts it passes through (enemy buff
// 1307959 on each ghost) and puts Gravebound 1286837 (3 stacks = 3 Soul
// Fragments) plus a DoT 1312630 on every player hit; the tank always.
// Collecting a fragment = 1308330 hit + one stack removed; a fragment not
// collected in time kills with 1297906.
// Malevolent Resonance: two ghosts touching put debuff 1310744 on BOTH
// fixated players and hit each ~450k per second (1312132) until separated.
// A victim's ghost refixates on a new player, who is often touching
// another ghost immediately — the P2 +287-302 cascade killed 7.
//
// Spiritcackle: two Spiteful Soulcoilers per cast (instances counting up
// per pull), each with Spirit Shield 1309105 (2 stacks) and Retaliatory
// Malice 1308311 (removed at death). Wail of Terror begincast 1286399 is
// 10s; a kick shows as a 1308011 cast (relocation) followed by a new
// begincast. A COMPLETED Wail (cast 1286399) fears everyone for 5s (debuff
// 1286399): P14 +204.0 the very first Wail was never kicked, the raid was
// feared, and 5 died within 15s (Gravebound expiries, falls).
// Gloombomb: 4 players marked (1310881) for 5s, impact 1310883 at each.
// Each bomb landing on a Soulcoiler strips a Spirit Shield stack; a bomb
// that finds no add leaves its shield up (P13 +238.6: both bombs near #4,
// none near #3, which kept its shield and later completed a Wail).
//
// Eternal Nightfall: 15s cast behind Veil of Twilight (1286912); clean
// pulls broke the Veil in 10.4-15.2s and kicked 0.1-0.9s later. Completed
// (cast 1286918) = the raid dies (P1 +348.6, P3 +484.3; P10, P13 as the
// raid was already dying).
//
// Intermission: ~20 fragment intercepts per pull, each hitting every player
// with Spirit Erasure 1287722 plus a stacking vulnerability. The log does
// NOT show who intercepted. Deaths when intercepts bunch up: P4 +414.5
// (2 healers), P15 +413.3-416.7 (11). No Reclaim Essence (1287718) cast
// ever completed. Deathguard 1304028 appears at Malacrass's defeat.
//
// Deaths without a killing blow are also called wipes: 4+ within 10s that
// aren't Dreadmarch falls (P10 +251.7, P2 +306.9, P14 +219.7). Every pull
// ended within 45s of its 6th death.
//
// Wipe survey (the earliest Raid error of each wipe):
//   Venom eruption      P5 +518.5, P6 +172.2 (Deluge), P7 +97.4
//   Guillotine          P16 +133.0; Grim: P4 +449.6, P9 +512.3, P17 +518.3
//   Nightfall completed P1 +348.6, P3 +484.1
//   Wail completed      P14 +204.0
//   Spirit Erasure      P15 +413.3
//   6 dead              P2 +297.9, P13 +246.0 (both Malevolent Resonance
//                       cascades after a ghost collision)
//   Tank died           P8 +232.1 (no killing blow), P11 +509.7 (Gravebound),
//                       P12 +157.7 (axes; Sever then hit a healer and an
//                       orb collision killed 15 at +168.1)
//   Wipe called         P10 +251.7
//
// Not flagged (volume, no evidence of error yet): Axegrinder's roaming axes
// hit 150-370 times per pull at ~80-120k; Noxious Ground 90-160 hits;
// carrier-proximity Volatile/Mutagenic ticks on bystanders; Widow's Touch
// (the far ring, everyone); Twinfang Toxin and Dread Bolt (tanks). Only
// deaths to axes/ground are flagged. Soulbound's berserk was never reached.
//
// ── RULES IMPLEMENTED ────────────────────────────────────────────────────────
//
//   wow-ca-venom-eruption      Minor/Major/Raid  orb collision or Deluge
//                                                eruption; names carriers
//   wow-ca-guillotine-execution Minor/Raid  under-soaked (Grim) Guillotine
//   wow-ca-guillotine-resoak   Minor/Major  soaked again while Guillotined
//   wow-ca-frontal             Minor/Major  non-tank hit by Sever / Soul
//                                          Sever / Blighted Sever
//   wow-ca-gravebound-expired  Major        died to uncollected fragments
//   wow-ca-ghost-caught        Minor/Major  own ghost reached the player
//   wow-ca-dreadmarch-fall     Minor        absorb not broken, player fell
//                                          (player-less: the raid's job)
//   wow-ca-malevolent-resonance Minor/Major ghosts collided (not inherited)
//   wow-ca-wail                Minor/Raid   a Soulcoiler completed Wail
//   wow-ca-soulcoiler-shield   Minor        a Gloombomb wave left an add's
//                                          Spirit Shield up
//   wow-ca-gloombomb-bystander Minor/Major  hit by someone else's bomb
//   wow-ca-nightfall           Raid         Eternal Nightfall completed
//   wow-ca-spirit-erasure      Minor/Raid   intermission intercept deaths
//   wow-ca-avoidable           Minor/Major  Widow's Kiss, Death's Embrace,
//                                          Deluge impact; deaths to axes /
//                                          Noxious Ground
//   wow-ca-pull-over           Raid         6 dead / tank death / called wipe
//
// ── GUIDE-DERIVED MODEL (pre-log) ────────────────────────────────────────────
//
// Guide- and journal-derived encounter model. Linked spell IDs are
// CANDIDATES — the verified section above takes precedence.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { suppressDuplicateRaidErrors } from "../../../error-detection";
import {
  kFmt, sec, joinNames, playerError, lastPlayerEventMs, clusterByGap, debuffIntervals,
  landed, total, died, deathsBy, applied, removed, raidMarker, pullOverMarker, calledWipe,
} from "../common";
import type { WowPullContext } from "../common";

// ─── Ability IDs (log-verified, report wThYvpJkbK6Pjrdc) ────────────────────

const VOLATILE_VENOM      = 1282419; // normal-orb carrier debuff (5s)
const MUTAGENIC_VENOM     = 1310498; // purple-orb carrier debuff (5s)
const VENOM_RUPTURE       = 1299838; // debuff + damage, one stack per destroyed orb
const TOXIC_DELUGE        = 1299960; // Zul'jan cast
const DELUGE_IMPACT       = 1300137;
const SEVER_CASTS         = new Set([1299684, 1307292]); // Sever / Blighted Sever
const GUILLOTINE          = { mark: 1283485, hit: 1283594, vuln: 1307425, penalty: 1283606, name: "Guillotine", penaltyName: "Execution" };
const GRIM_GUILLOTINE     = { mark: 1299266, hit: 1299296, vuln: 1307652, penalty: 1299301, name: "Grim Guillotine", penaltyName: "Grim Execution" };
const FRONTALS            = new Map([[1299684, "Sever"], [1307292, "Blighted Sever"], [1286620, "Soul Sever"]]);
const SOUL_SEVER_DOT      = 1312630;
const GRAVEBOUND          = 1286837; // player debuff, one stack per uncollected fragment
const GRAVEBOUND_EXPIRED  = 1297906; // killing blow of an uncollected fragment
const GRAVEBOUND_COLLECT  = 1308330;
const DREADMARCH_CAST     = 1285643;
const DREADMARCH          = 1297445; // player debuff with the absorb
const UNNERVING_FIXATION  = 1285911; // a ghost's fixate debuff on its player
const RESONANCE           = 1310744; // player debuff while two ghosts touch
const RESONANCE_HIT       = 1312132;
const WAIL_OF_TERROR      = 1286399; // completed cast, and the fear debuff
const SPIRIT_SHIELD       = 1309105; // Soulcoiler buff (2 stacks)
const RETALIATORY_MALICE  = 1308311; // Soulcoiler buff, removed at its death
const GLOOMBOMB_MARK      = 1310881;
const GLOOMBOMB_HIT       = 1310883;
const ETERNAL_NIGHTFALL   = 1286918; // completed cast = the raid dies
const VEIL_OF_TWILIGHT    = 1286912;
const SPIRIT_ERASURE      = 1287722;
const WIDOWS_KISS         = 1283623;
const DEATHS_EMBRACE      = 1299396;
const AXEGRINDER          = 1285017;
const NOXIOUS_GROUND      = 1283290;

const COILED_ALTAR_SIGNATURE = new Set([VOLATILE_VENOM, MUTAGENIC_VENOM, VENOM_RUPTURE, DREADMARCH, UNNERVING_FIXATION]);

// ─── Thresholds (evidence in the header; P = pull of wThYvpJkbK6Pjrdc) ──────

// A Rupture hit this big is an eruption: normal ticks peak ~615k (P5 +179.9,
// after the 11-orb transition); eruptions hit 848k+ median (P7 +97.4).
const ERUPTION_HIT = 700_000;
const ERUPTION_MIN_PLAYERS = 3;
const ERUPTION_MERGE_MS = 5000;      // follow-up ticks of the same eruption
const ERUPTION_CAUSE_MS = 400;       // carrier debuff change before it
const CARRY_FULL_MS = 4800;          // a 5s carry that ran out naturally
const RAID_DEATHS = 3;               // deaths from one failure that end the pull
const HIT_DEATH_MS = 1500;
const EPISODE_MS = 3000;
const RESONANCE_INHERIT_MS = 1500;   // fixation this fresh = a dead player's ghost
const WAIL_RAID_DEATHS = 5;          // P14 +204: 5 died within 15s of the fear
const WAIL_RAID_WINDOW_MS = 15000;
const WAIL_PULL_END_MS = 35000;      // P14 ended 30.9s after its Wail; P15 fought on 57s
const DREADMARCH_CAST_MS = 1500;     // cast -> debuff is ~0.5s
const FALL_MS = 1500;
const SHIELD_CHECK_MS = 500;
const COLLAPSE_DEAD = 6;             // every pull ended within 45s of its 6th death
const TANK_REZ_GRACE_MS = 15000;
const TANK_DEATH_END_MS = 30000;
const CALLED_WIPE_DEATHS = 4;
const CALLED_WIPE_WINDOW_MS = 10000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const feared = (p: PlayerInfo, from: number, to: number) =>
  debuffIntervals(p, WAIL_OF_TERROR).some((w) => w.start <= to && w.end >= from);

/** Clusters of one ability's hits across the raid (each cluster = one resolution). */
function raidHits(players: PlayerInfo[], id: number, gapMs: number, keep: (e: PlayerEvent) => boolean = () => true) {
  const all = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === id && keep(e)).map((e) => ({ p, e })));
  return clusterByGap(all, (x) => x.e.timestamp, gapMs);
}

// ─── Venom eruptions ─────────────────────────────────────────────────────────
//
// A Mutation touching another orb (or a carrier touching a purple orb), or a
// Toxic Deluge with Mutations still out, detonates them: one huge Venom
// Rupture on everyone. The carriers involved show as Volatile/Mutagenic
// debuffs picked up, or dropped early, just before the hit.

export const CA_ERUPTION_RULE_ID = "wow-ca-venom-eruption";

function detectEruptions(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const big = (e: PlayerEvent) => (e.amount ?? 0) + (e.overkill ?? 0) >= ERUPTION_HIT;
  const instants = raidHits(players, VENOM_RUPTURE, 300, big).filter((g) => new Set(g.map((x) => x.p.name)).size >= ERUPTION_MIN_PLAYERS);
  const seversAt = enemyCasts.filter((c) => SEVER_CASTS.has(c.abilityId)).map((c) => c.timestamp);
  const delugesAt = enemyCasts.filter((c) => c.abilityId === TOXIC_DELUGE).map((c) => c.timestamp);

  const errors: PullError[] = [];
  let lastEnd = -Infinity;
  for (const g of instants) {
    const t = g[0].e.timestamp;
    if (t - lastEnd < ERUPTION_MERGE_MS) { lastEnd = g[g.length - 1].e.timestamp; continue; }
    lastEnd = g[g.length - 1].e.timestamp;
    if (seversAt.some((s) => Math.abs(s - t) < 300)) continue; // a planned Sever clear

    const killed = deathsBy(deaths, [VENOM_RUPTURE], t, t + ERUPTION_MERGE_MS);
    const hit = new Set(g.map((x) => x.p.name)).size;
    const deathText = killed.length ? `, killing ${killed.length} (${joinNames(killed.map((d) => d.player))})` : "";

    // Carriers: picked up an orb, or dropped one early, just before the eruption.
    const carriers = players.flatMap((p) => [VOLATILE_VENOM, MUTAGENIC_VENOM].flatMap((id) => {
      const orb = id === MUTAGENIC_VENOM ? "a purple orb" : "an orb";
      const pick = applied(p, id).find((e) => e.timestamp <= t + 100 && e.timestamp >= t - ERUPTION_CAUSE_MS);
      if (pick) return [{ p, what: `picked up ${orb} ${sec(t - pick.timestamp)}s before` }];
      const drop = removed(p, id).find((e) => e.timestamp <= t + 100 && e.timestamp >= t - ERUPTION_CAUSE_MS);
      const start = drop && applied(p, id).filter((e) => e.timestamp <= drop.timestamp).pop();
      if (drop && start && drop.timestamp - start.timestamp < CARRY_FULL_MS) return [{ p, what: `was carrying ${orb} (${sec(drop.timestamp - start.timestamp)}s into the carry)` }];
      return [];
    }));
    const byName = new Map(carriers.map((c) => [c.p.name, c]));

    const deluge = delugesAt.find((d) => Math.abs(d - t) < ERUPTION_CAUSE_MS);
    if (deluge !== undefined || byName.size === 0) {
      const why = deluge !== undefined
        ? "Toxic Deluge detonated a Virulent Mutation that was still out"
        : "Venom orbs erupted with no carrier change logged (a Mutation touching a grounded orb)";
      const desc = `${why}: Venom Rupture hit ${hit} players for ${kFmt(g[0].e.amount ?? 0)}+${deathText}.`;
      errors.push(killed.length >= RAID_DEATHS
        ? raidMarker(CA_ERUPTION_RULE_ID, "Venom Eruption", `${desc} Treated as the point the pull was over.`, t, VENOM_RUPTURE, "Venom Rupture")
        : { ruleId: CA_ERUPTION_RULE_ID, severity: "Minor", name: "Venom Eruption", description: desc, timestamp: t, abilityId: VENOM_RUPTURE, abilityName: "Venom Rupture" });
      continue;
    }

    const names = [...byName.keys()];
    for (const c of byName.values()) {
      const others = names.filter((n) => n !== c.p.name);
      errors.push(playerError(c.p, {
        ruleId: CA_ERUPTION_RULE_ID,
        severity: killed.length ? "Major" : "Minor",
        name: "Venom Orb Collision",
        description: `${c.p.name} ${c.what} when a Mutation touched another orb` +
          `${others.length ? ` (also involved: ${joinNames(others)})` : ""}; Venom Rupture hit ${hit} players${deathText}.`,
        timestamp: t,
        abilityId: VENOM_RUPTURE,
        abilityName: "Venom Rupture",
      }));
    }
    if (killed.length >= RAID_DEATHS) {
      errors.push(raidMarker(CA_ERUPTION_RULE_ID, "Venom Eruption",
        `A Venom orb collision (${joinNames(names)}) killed ${killed.length}. Treated as the point the pull was over.`, t, VENOM_RUPTURE, "Venom Rupture"));
    }
  }
  return errors;
}

// ─── Guillotine / Grim Guillotine ────────────────────────────────────────────

export const CA_EXECUTION_RULE_ID = "wow-ca-guillotine-execution";
export const CA_RESOAK_RULE_ID = "wow-ca-guillotine-resoak";

function detectGuillotine(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const G of [GUILLOTINE, GRIM_GUILLOTINE]) {
    // Under-soaked: the penalty hits the raid.
    for (const g of raidHits(players, G.penalty, 1000)) {
      const t = g[0].e.timestamp;
      const soakers = players.filter((p) => p.damageTaken.some((e) => e.abilityId === G.hit && Math.abs(e.timestamp - t) < 1000));
      const marked = players.find((p) => applied(p, G.mark).some((e) => e.timestamp <= t && e.timestamp > t - 8000));
      const killed = deathsBy(deaths, [G.penalty, G.hit], t, t + HIT_DEATH_MS);
      const desc = `${G.name}${marked ? ` on ${marked.name}` : ""} was soaked by ${soakers.length} (5 needed)` +
        `${soakers.length ? `: ${joinNames(soakers.map((p) => p.name))}` : ""}; ${G.penaltyName} hit ${g.length} players` +
        `${killed.length ? ` and killed ${killed.length}` : ""}.`;
      errors.push(killed.length >= RAID_DEATHS
        ? raidMarker(CA_EXECUTION_RULE_ID, `${G.name} Under-Soaked`, `${desc} Treated as the point the pull was over.`, t, G.penalty, G.penaltyName)
        : { ruleId: CA_EXECUTION_RULE_ID, severity: "Minor", name: `${G.name} Under-Soaked`, description: desc, timestamp: t, abilityId: G.penalty, abilityName: G.penaltyName });
    }
    // Re-soak: took a (non-immune) impact while still Guillotined from an earlier one.
    for (const p of players) {
      for (const e of p.damageTaken.filter((x) => x.abilityId === G.hit && landed(x))) {
        const prior = debuffIntervals(p, G.vuln).find((w) => w.start < e.timestamp - 2000 && w.end >= e.timestamp - 100);
        if (!prior) continue;
        const death = deathsBy(deaths, [G.hit], e.timestamp, e.timestamp + HIT_DEATH_MS).find((d) => d.player === p.name);
        errors.push(playerError(p, {
          ruleId: CA_RESOAK_RULE_ID,
          severity: death ? "Major" : "Minor",
          name: `Soaked ${G.name} While Guillotined`,
          description: `Soaked ${G.name} again while still carrying the +500% vulnerability from the one at +${sec(prior.start)}s ` +
            `(${kFmt(e.amount ?? 0)})${died(death, e.timestamp)}.`,
          timestamp: e.timestamp, abilityId: e.abilityId, abilityIcon: e.abilityIcon, abilityName: G.name,
        }));
      }
    }
  }
  return errors;
}

// ─── Tank frontals on non-tanks ──────────────────────────────────────────────

export const CA_FRONTAL_RULE_ID = "wow-ca-frontal";

function detectFrontals(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const p of players.filter((x) => x.role !== "Tank")) {
    for (const e of p.damageTaken.filter((x) => FRONTALS.has(x.abilityId))) {
      const name = FRONTALS.get(e.abilityId)!;
      // Soul Sever also leaves a DoT; a death to it counts. A later Gravebound
      // expiry is reported by its own rule.
      const killIds = e.abilityId === 1286620 ? [e.abilityId, SOUL_SEVER_DOT] : [e.abilityId];
      const death = deathsBy(deaths, killIds, e.timestamp, e.timestamp + (e.abilityId === 1286620 ? 12000 : HIT_DEATH_MS)).find((d) => d.player === p.name);
      if (!landed(e) && !death) continue; // an immunity soak
      errors.push(playerError(p, {
        ruleId: CA_FRONTAL_RULE_ID,
        severity: death ? "Major" : "Minor",
        name: `Hit by ${name}`,
        description: `Stood in the tank's ${name} frontal (${kFmt(e.amount ?? 0)})${died(death, e.timestamp)}.`,
        timestamp: e.timestamp, abilityId: e.abilityId, abilityIcon: e.abilityIcon, abilityName: name,
      }));
    }
  }
  return errors;
}

// ─── Gravebound: fragments not collected ─────────────────────────────────────

export const CA_GRAVEBOUND_RULE_ID = "wow-ca-gravebound-expired";

function detectGravebound(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  return deaths.filter((d) => d.killingAbilityGameId === GRAVEBOUND_EXPIRED).flatMap((d) => {
    const p = players.find((x) => x.name === d.player);
    if (!p) return [];
    const start = applied(p, GRAVEBOUND).filter((e) => e.timestamp <= d.timestamp).pop()?.timestamp ?? d.timestamp;
    const collected = p.damageTaken.filter((e) => e.abilityId === GRAVEBOUND_COLLECT && e.timestamp >= start && e.timestamp <= d.timestamp).length;
    const fear = feared(p, start, d.timestamp) ? " They were feared by a Wail of Terror during it." : "";
    // Gravebound comes from a Soul Sever hit or a Gloombomb landing on them.
    const source = p.damageTaken.find((e) => (e.abilityId === 1286620 || e.abilityId === GLOOMBOMB_HIT) && Math.abs(e.timestamp - start) < 300);
    return [playerError(p, {
      ruleId: CA_GRAVEBOUND_RULE_ID,
      severity: "Major",
      name: "Soul Fragment Not Collected",
      description: `A Soul Fragment ran out ${sec(d.timestamp - start)}s after they gained Gravebound` +
        `${source ? ` from ${source.abilityId === GLOOMBOMB_HIT ? "their Gloombomb" : "Soul Sever"}` : ""}; ` +
        `they had collected ${collected} fragment${collected === 1 ? "" : "s"}.${fear}`,
      timestamp: d.timestamp, abilityId: GRAVEBOUND_EXPIRED, abilityName: "Gravebound",
    })];
  });
}

// ─── Dreadmarch: ghosts reaching their player, and falls ─────────────────────

export const CA_GHOST_CAUGHT_RULE_ID = "wow-ca-ghost-caught";
export const CA_DREADMARCH_FALL_RULE_ID = "wow-ca-dreadmarch-fall";

function detectDreadmarch(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const casts = enemyCasts.filter((c) => c.abilityId === DREADMARCH_CAST).map((c) => c.timestamp);
  const errors: PullError[] = [];
  for (const p of players) {
    for (const w of debuffIntervals(p, DREADMARCH)) {
      const fall = deaths.find((d) => d.player === p.name && !d.killingAbilityGameId && Math.abs(d.timestamp - w.end) <= FALL_MS);
      const fromCast = casts.some((c) => w.start - c >= 0 && w.start - c < DREADMARCH_CAST_MS);
      const ghost = !fromCast && removed(p, UNNERVING_FIXATION).some((e) => Math.abs(e.timestamp - w.start) < 300);
      if (ghost) {
        const fear = feared(p, w.start - 5000, w.start) ? " They had just been feared by a Wail of Terror." : "";
        errors.push(playerError(p, {
          ruleId: CA_GHOST_CAUGHT_RULE_ID,
          severity: fall ? "Major" : "Minor",
          name: "Caught by Own Manifestation",
          description: `Their Manifestation of Dread reached them and put a new Dreadmarch on them` +
            `${fall ? `; it wasn't broken and they fell ${sec(w.end - w.start)}s later` : ""}.${fear}`,
          timestamp: w.start, abilityId: DREADMARCH, abilityName: "Dreadmarch",
        }));
      } else if (fall) {
        errors.push({
          ruleId: CA_DREADMARCH_FALL_RULE_ID,
          severity: "Minor",
          name: "Dreadmarch Not Broken",
          description: `The raid didn't break ${p.name}'s Dreadmarch absorb in time; they walked off the platform ${sec(w.end - w.start)}s after it began.`,
          timestamp: w.end, abilityId: DREADMARCH, abilityName: "Dreadmarch",
        });
      }
    }
  }
  return errors;
}

// ─── Malevolent Resonance: two ghosts touching ───────────────────────────────

export const CA_RESONANCE_RULE_ID = "wow-ca-malevolent-resonance";

function detectResonance(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  // One contact episode per player: the debuff drops and re-applies while two
  // ghosts keep brushing against each other.
  const episodes = players.flatMap((p) => clusterByGap(debuffIntervals(p, RESONANCE), (w) => w.start, 2000).map((ws) => {
    const start = ws[0].start;
    const lastEnd = ws[ws.length - 1].end;
    const end = Number.isFinite(lastEnd) ? Math.max(lastEnd, ws[ws.length - 1].start) : ws[ws.length - 1].start + EPISODE_MS;
    // A ghost inherited from a player who just died, already touching another, is fallout.
    const fix = applied(p, UNNERVING_FIXATION).filter((e) => e.timestamp <= start).pop();
    const inherited = !!fix && start - fix.timestamp < RESONANCE_INHERIT_MS &&
      deaths.some((d) => d.player !== p.name && Math.abs(d.timestamp - fix.timestamp) < 300);
    const death = deathsBy(deaths, [RESONANCE_HIT], start, end + 500).find((d) => d.player === p.name);
    return { p, start, end, inherited, death };
  }));

  return episodes.filter((ep) => !ep.inherited).map((ep) => {
    const { p, start, end, death } = ep;
    // Partners: other players in contact when this episode began.
    const partners = episodes.filter((o) => o.p !== p && o.start <= start + 300 && o.end >= start - 300);
    const partnerDied = partners.filter((o) => o.death && o.death.timestamp <= end + 1000).map((o) => o.p.name);
    const hits = p.damageTaken.filter((e) => e.abilityId === RESONANCE_HIT && e.timestamp >= start - 200 && e.timestamp <= end + 200);
    const dur = end - start >= 1000 ? ` for ${sec(end - start)}s` : "";
    return playerError(p, {
      ruleId: CA_RESONANCE_RULE_ID,
      severity: death || partnerDied.length ? "Major" : "Minor",
      name: "Malevolent Resonance",
      description: `Their Manifestation of Dread touched another${partners.length ? ` (${joinNames(partners.map((o) => o.p.name))}'s)` : ""}${dur}: ` +
        `${hits.length} Malevolent Resonance hit${hits.length === 1 ? "" : "s"} (${total(hits)})${died(death, start)}` +
        `${partnerDied.length ? `; ${joinNames(partnerDied)} died to it` : ""}.`,
      timestamp: start, abilityId: RESONANCE_HIT, abilityName: "Malevolent Resonance",
    });
  });
}

// ─── Spiteful Soulcoilers: Wail of Terror and Spirit Shield ──────────────────

export const CA_WAIL_RULE_ID = "wow-ca-wail";
export const CA_SHIELD_RULE_ID = "wow-ca-soulcoiler-shield";

/**
 * A completed Wail is the cutoff only when the fear's own aftermath ends the
 * pull: 5+ deaths before any other mechanic failure (P5 +507's deaths were
 * mostly a later orb collision) and the pull over within 35s (P15 +384.3 lost
 * 5 but fought on 57s into the intermission).
 */
function detectWail(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[], otherRaids: number[], pullEnd: number): PullError[] {
  return enemyCasts.filter((c) => c.abilityId === WAIL_OF_TERROR).map((c) => {
    const fearedN = players.filter((p) => applied(p, WAIL_OF_TERROR).some((e) => Math.abs(e.timestamp - c.timestamp) < 300)).length;
    const until = Math.min(c.timestamp + WAIL_RAID_WINDOW_MS, ...otherRaids.filter((t) => t > c.timestamp));
    const after = deaths.filter((d) => d.timestamp > c.timestamp && d.timestamp < until);
    const add = `Spiteful Soulcoiler${c.sourceInstance ? ` #${c.sourceInstance}` : ""}`;
    const desc = `${add} finished Wail of Terror without being interrupted, fearing ${fearedN} players` +
      `${after.length ? `; ${after.length} died in the next ${sec(until - c.timestamp)}s` : ""}.`;
    return after.length >= WAIL_RAID_DEATHS && pullEnd - c.timestamp <= WAIL_PULL_END_MS
      ? raidMarker(CA_WAIL_RULE_ID, "Wail of Terror Completed", `${desc} Treated as the point the pull was over.`, c.timestamp, WAIL_OF_TERROR, "Wail of Terror")
      : { ruleId: CA_WAIL_RULE_ID, severity: "Minor" as const, name: "Wail of Terror Completed", description: desc, timestamp: c.timestamp, abilityId: WAIL_OF_TERROR, abilityName: "Wail of Terror" };
  });
}

function detectShields(players: PlayerInfo[], enemyBuffs: EnemyEvent[], enemyBuffRemovals: EnemyEvent[]): PullError[] {
  const isAdd = (e: EnemyEvent) => e.actorName === "Spiteful Soulcoiler" && e.sourceInstance !== undefined;
  // WCL logs each add's applybuff twice; keep one per instance.
  const spawns = [...new Map(enemyBuffs.filter((e) => isAdd(e) && e.abilityId === SPIRIT_SHIELD).reverse()
    .map((e) => [e.sourceInstance, e] as const)).values()];
  const firstBy = (id: number, inst: number) => enemyBuffRemovals.find((e) => isAdd(e) && e.abilityId === id && e.sourceInstance === inst)?.timestamp ?? Infinity;
  // One wave per Gloombomb cast (deaths can drop some marks up to ~2s early).
  const landings = clusterByGap(players.flatMap((p) => removed(p, GLOOMBOMB_MARK)), (e) => e.timestamp, 5000);

  const errors: PullError[] = [];
  for (const g of landings) {
    const t = g[g.length - 1].timestamp;
    for (const s of spawns) {
      if (s.timestamp > t) continue;
      const inst = s.sourceInstance!;
      if (firstBy(RETALIATORY_MALICE, inst) <= t + SHIELD_CHECK_MS) continue; // already dead
      if (firstBy(SPIRIT_SHIELD, inst) <= t + SHIELD_CHECK_MS) continue;      // shield broken
      errors.push({
        ruleId: CA_SHIELD_RULE_ID,
        severity: "Minor",
        name: "Soulcoiler Shield Not Broken",
        description: `No Gloombomb landed on Spiteful Soulcoiler #${inst}; its Spirit Shield (99% damage reduction) stayed up.`,
        timestamp: t, abilityId: SPIRIT_SHIELD, abilityName: "Spirit Shield",
      });
    }
  }
  return errors;
}

// ─── Gloombomb on bystanders ─────────────────────────────────────────────────

export const CA_GLOOMBOMB_RULE_ID = "wow-ca-gloombomb-bystander";

function detectGloombomb(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const e of p.damageTaken.filter((x) => x.abilityId === GLOOMBOMB_HIT && landed(x))) {
      if (removed(p, GLOOMBOMB_MARK).some((m) => Math.abs(m.timestamp - e.timestamp) < 300)) continue; // their own bomb
      const carriers = players.filter((o) => o !== p && removed(o, GLOOMBOMB_MARK).some((m) => Math.abs(m.timestamp - e.timestamp) < 300)).map((o) => o.name);
      const death = deathsBy(deaths, [GLOOMBOMB_HIT], e.timestamp, e.timestamp + HIT_DEATH_MS).find((d) => d.player === p.name);
      errors.push(playerError(p, {
        ruleId: CA_GLOOMBOMB_RULE_ID,
        severity: death ? "Major" : "Minor",
        name: "Hit by Gloombomb",
        description: `Stood within range of someone else's Gloombomb (${kFmt(e.amount ?? 0)})` +
          `${carriers.length ? `; bombs landed on ${joinNames(carriers)}` : ""}${died(death, e.timestamp)}.`,
        timestamp: e.timestamp, abilityId: e.abilityId, abilityIcon: e.abilityIcon, abilityName: "Gloombomb",
      }));
    }
  }
  return errors;
}

// ─── Eternal Nightfall completed ─────────────────────────────────────────────

export const CA_NIGHTFALL_RULE_ID = "wow-ca-nightfall";

function detectNightfall(enemyCasts: EnemyEvent[], enemyBuffs: EnemyEvent[], enemyBuffRemovals: EnemyEvent[]): PullError[] {
  return enemyCasts.filter((c) => c.abilityId === ETERNAL_NIGHTFALL).map((c) => {
    const veilUp = enemyBuffs.filter((e) => e.abilityId === VEIL_OF_TWILIGHT && e.timestamp <= c.timestamp).pop()?.timestamp;
    const veilOff = enemyBuffRemovals.find((e) => e.abilityId === VEIL_OF_TWILIGHT && veilUp !== undefined && e.timestamp >= veilUp)?.timestamp;
    const veil = veilOff === undefined || veilOff >= c.timestamp - 200
      ? "the Veil of Twilight was never broken"
      : `the Veil broke ${sec(veilOff - (veilUp ?? veilOff))}s in but nobody interrupted`;
    return raidMarker(CA_NIGHTFALL_RULE_ID, "Eternal Nightfall Completed",
      `Hex Lord Malacrass finished Eternal Nightfall: ${veil}. Treated as the point the pull was over.`,
      c.timestamp, ETERNAL_NIGHTFALL, "Eternal Nightfall");
  });
}

// ─── Intermission: Spirit Erasure deaths ─────────────────────────────────────

export const CA_ERASURE_RULE_ID = "wow-ca-spirit-erasure";

function detectErasure(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const erasureDeaths = deaths.filter((d) => d.killingAbilityGameId === SPIRIT_ERASURE);
  return clusterByGap(erasureDeaths, (d) => d.timestamp, 5000).map((g) => {
    const t = g[0].timestamp;
    const intercepts = raidHits(players, SPIRIT_ERASURE, 300).filter((h) => h[0].e.timestamp >= t - 4000 && h[0].e.timestamp <= t + 100).length;
    const desc = `Fragment intercepts bunched up: ${intercepts} Spirit Erasure pulses in the 4s before, with the stacking vulnerability still up; ` +
      `killed ${g.length} (${joinNames(g.map((d) => d.player))}). The log doesn't show who intercepted.`;
    return g.length >= RAID_DEATHS
      ? raidMarker(CA_ERASURE_RULE_ID, "Spirit Erasure Deaths", `${desc} Treated as the point the pull was over.`, t, SPIRIT_ERASURE, "Spirit Erasure")
      : { ruleId: CA_ERASURE_RULE_ID, severity: "Minor" as const, name: "Spirit Erasure Deaths", description: desc, timestamp: t, abilityId: SPIRIT_ERASURE, abilityName: "Spirit Erasure" };
  });
}

// ─── Avoidable damage ────────────────────────────────────────────────────────

export const CA_AVOIDABLE_RULE_ID = "wow-ca-avoidable";

function detectAvoidable(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const episodes = (id: number, name: string, what: string, deathsOnly: boolean) => {
    for (const p of players) {
      for (const g of clusterByGap(p.damageTaken.filter((e) => e.abilityId === id && landed(e)), (e) => e.timestamp, EPISODE_MS)) {
        const death = deathsBy(deaths, [id], g[0].timestamp, g[g.length - 1].timestamp + HIT_DEATH_MS).find((d) => d.player === p.name);
        if (deathsOnly && !death) continue;
        errors.push(playerError(p, {
          ruleId: CA_AVOIDABLE_RULE_ID,
          severity: death ? "Major" : "Minor",
          name: `Hit by ${name}`,
          description: `${what}${g.length > 1 ? ` ${g.length} times` : ""} (${total(g)})${died(death, g[0].timestamp)}.`,
          timestamp: g[0].timestamp, abilityId: id, abilityIcon: g[0].abilityIcon, abilityName: name,
        }));
      }
    }
  };
  episodes(WIDOWS_KISS, "Widow's Kiss", "Was too close to the Guillotine axe when Widow's Kiss erupted", false);
  episodes(DEATHS_EMBRACE, "Death's Embrace", "Was too close to the Grim Guillotine axe when Death's Embrace erupted", false);
  episodes(DELUGE_IMPACT, "Toxic Deluge", "Stood under a Toxic Deluge impact", false);
  episodes(AXEGRINDER, "Axegrinder", "Was hit by a roaming Axegrinder axe", true);
  episodes(NOXIOUS_GROUND, "Noxious Ground", "Stood in Noxious Ground", true);
  return errors;
}

// ─── Pull over: called wipe / 6 dead / tank death ────────────────────────────

export const CA_PULL_OVER_RULE_ID = "wow-ca-pull-over";

function detectPullOver(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): PullError[] {
  const byName = new Map(players.map((p) => [p.name, p]));
  // Called wipe: bulk deaths with no killing blow that aren't Dreadmarch falls.
  const isFall = (d: DeathEvent) => {
    const p = byName.get(d.player);
    return !!p && debuffIntervals(p, DREADMARCH).some((w) => Math.abs(w.end - d.timestamp) <= FALL_MS);
  };
  return pullOverMarker(players, deaths, pullEnd, {
    ruleId: CA_PULL_OVER_RULE_ID,
    collapseDead: COLLAPSE_DEAD,
    cause: (d) => (d.killingAbilityGameId ? d.cause : "no killing blow logged"),
    tankDeath: { kind: "pullEnded", rezGraceMs: TANK_REZ_GRACE_MS, endMs: TANK_DEATH_END_MS },
    calledWipe: calledWipe(deaths, CA_PULL_OVER_RULE_ID, CALLED_WIPE_DEATHS, CALLED_WIPE_WINDOW_MS, isFall),
  });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function detectCoiledAltarErrors(ctx: WowPullContext): PullError[] {
  const { players, deaths, enemyCasts, enemyBuffs, enemyBuffRemovals, pullDurationMs } = ctx;
  // Self-gate: tank deaths and generic damage exist in every fight.
  const isCoiledAltar = players.some((p) => p.debuffs.some((e) => COILED_ALTAR_SIGNATURE.has(e.abilityId)));
  if (!isCoiledAltar) return [];

  const pullEnd = pullDurationMs ?? lastPlayerEventMs(players);

  const errors = [
    ...detectEruptions(players, deaths, enemyCasts),
    ...detectGuillotine(players, deaths),
    ...detectFrontals(players, deaths),
    ...detectGravebound(players, deaths),
    ...detectDreadmarch(players, deaths, enemyCasts),
    ...detectResonance(players, deaths),
    ...detectShields(players, enemyBuffs, enemyBuffRemovals),
    ...detectGloombomb(players, deaths),
    ...detectNightfall(enemyCasts, enemyBuffs, enemyBuffRemovals),
    ...detectErasure(players, deaths),
    ...detectAvoidable(players, deaths),
  ];
  const mechanicRaids = errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp);
  errors.push(...detectWail(players, deaths, enemyCasts, mechanicRaids, pullEnd));

  const firstRaid = Math.min(Infinity, ...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  errors.push(...detectPullOver(players, deaths, pullEnd).filter((e) => e.timestamp < firstRaid));

  return suppressDuplicateRaidErrors(errors.sort((a, b) => a.timestamp - b.timestamp));
}
