// lib/mechanics/wow/va/lost-explorers.ts
//
// Mythic The Lost Explorers (The Venomous Abyss) — per-pull error detection.
// Called from transformFightToPull in lib/log-transforms.ts; it self-gates on
// this encounter's debuff IDs, so it is safe on any WoW pull.
//
// The second half of this header is the guide-derived encounter model
// (written 2026-09-26 before any log was available). The first half is what
// the logs actually showed; where the two disagree, the log section wins.
//
// ── VERIFIED AGAINST LOGS (offsets fight-relative) ──────────────────────────
//
//   A = report nRGxQ1b8LdMvzC4D, 15 wipes, feed order Iku -> Nama -> Gebbo,
//       two alternating fish carriers.
//   B = report 8PQFgdDh3R9BW71t, 19 wipes and a kill in pull 20, feed order
//       Gebbo -> Iku -> Nama (pull 1: Nama -> Iku), one fish carrier.
//
// The fish clock (identical in every pull):
//   * Mor'zahi gains the Final Ascension charge (enemy buff 1297075, energy
//     50 -> 100) at the pull and at every cycle start. After 60s he casts
//     Final Ascension (5s). When the cast completes he gains the channel
//     buff 1292779 plus a stack of 1292778 per second, and 1292780 hits the
//     whole raid, escalating (~180k median).
//   * The fish is a PLAYER cast, Disgusting Fish 1296535, targeting the
//     explorer. Mor'zahi's Command lands 4.3-5.1s later as an enemy buff on
//     that explorer: 1296975 Nama, 1297022 Iku, 1297024 Gebbo. It ends the
//     cycle (removes the charge or the channel). A fish thrown by the time
//     the cast begins is in time (B11 +184.8, B18 +302.8 landed at the
//     completion instant, no damage). Feeding early just starts the next
//     cycle early (A3's Command landed 7.9s before the cast would begin).
//   * Command lasts 60s; the next charge starts ~0.7s after it ends. Each
//     explorer was fed exactly once; nobody tried a repeat. With all three
//     fed, the fourth Final Ascension (~+425-437) is the hard enrage: A11,
//     B11 and B15 reached it. The kill ended at +409.
//
// Crates: Throw Junk casts at cycle +20, +24, +28 (1306145: the fish crate)
// and +51, +55, landing 3s later (impact 1291935 / 1306127 on anyone under
// it). An unopened crate casts Relic Rupture (1310028, "Useless Junk") ~22.5s
// after landing; stomping it during the 10s cast defuses it (A7 +49.4).
// Otherwise 1310027 hits every player for ~800k — 11 detonations, all at or
// near the end of a pull. Every opening puts Splinters (1312853) on ALL
// players (~120-130k plus a 6s bleed that stacks per crate); the log never
// shows who stomped. The kill routinely had 3-4 stacks, so stacks alone mark
// nothing. B3 +98.7: junk landed on the raid stacked for the mushroom (7
// impact hits), opening five crates at once (Splinters x5) and killing 10.
//
// Blink Nova (mark 1296025 for 7s, raid hit 1294334): 200-600k on everyone
// with no visible distance falloff (players 60-80yd from the target took as
// much as those at 20yd). Among each pull's first five deaths (170), the top
// killing blows were Blast Wave 33, Blink Nova 27 and Splinters 27. Nova
// deaths are the Nova + Splinters bleed + Malevolent Presence healing load,
// not placement, so they aren't flagged.
//
// Gebbo's Command: Mushroom Toss (7s cast from Command +5), a Bouncy
// Mushroom spawns 3s later; Explosive Surprise marks a player (1297625,
// Command +15 and +47) and detonates 10s later (cast 1296249). Blast Wave
// (1305844) reaches the raid 10-17s after the detonation and one-shots
// (500k-1.4M). Players launched by a mushroom carry Bounce (1299854, 1.5s).
// Deaths split three ways: no Bounce at all; hit 0.1-1.4s into the Bounce
// (too late); or landed 0.1-1.1s before the wave (too early; a cluster
// bounced 2.5-2.6s before, likely stepping on the mushroom too soon). The
// kill bounced 14-15 players per wave and lost nobody. In five waves NOBODY
// bounced (A15 +381, B3/B4/B6/B10 second wave); the mushroom existed in the
// log each time, so it was out of reach or unusable. Spreading Flames
// (1314061) ticks ~150k/s around the bomb; Explosive Surprise damage
// (1296245, ~400-500k) hit the bomb carrier 2s after detonation three times;
// Fungal Burst (1305618) once (B4). Mushroom landings deal Falling damage
// (22 hits in the kill) — not flagged.
//
// Iku's Command: Frostfire Volley (cast 1295891 at Command +15 and +42).
// Fire missiles land 2.0s after the cast on 5 players (1295893 -> Burning
// Flames 1295928), Frost ~0.5s later on 5 others (1295985 -> Piercing Frost
// 1295954). Players clear their element by stepping into an opposite patch
// (Fire/Frost Patch "debuffs" 1297649/1297648), routinely within 1-5s in
// the kill; patch ticks are part of clearing, not errors. Elemental
// Explosion (1295952, ~800k raid-wide) happened 4 times, all in report A,
// all wipes: a Frost missile landed 5.8-12.1yd from Burning Flames holders
// (A8: four holders stacked 6-7yd from one Frost target). Icebound Flames
// (1286922) was left uninterrupted 15 times (once in the kill).
//
// Nama's Command: Mighty Thud (10s cast from Command +4) then three leaps
// 2s apart (cast 1296133, target = the marked player) at Command +15 and
// +47. The whole raid stacks on each: clean leaps split 1300237 across 9-18
// soakers (150-350k each). Failures: 1 soaker (B7 +333.4, B11 +327.8 —
// one-shot), 3 (A6 +206.3, two dead), and 7-8 soakers killed one player
// twice (B11 +363.8, B18 +326.7). Aftershock (1310500) pools after leaps
// were stepped in by 4 players in the kill.
//
// Tanks: Shredding Shards (debuff 1295858) is 7 shards per cast, so every
// clean pull peaked at 7 stacks. 12-15 stacks = two casts without a swap
// (A11, A15 x2, B8, B18); A15 +347 died to it. Steady Strikes (Nama, 1291929)
// ran to 54 stacks in the kill and 85 in a wipe — not flagged.
//
// Not flagged: United Defense (1297646) flickers in most pulls and the kill
// had 4.7s windows; Shell Spin stuns (1291918, 14 in the kill); Burning
// Flames / Piercing Frost / patch ticks; Haunting Spirits debuffs (wipes
// only, cause unknown); Falling; Malevolent Presence; Splinters.
//
// Called wipes: 5-15 players dying at full health with NO killing blow
// logged, 6-26s before the pull ends (the raid resets). This is the
// earliest cutoff in 12 pulls; deaths from then on aren't counted.
//
// Wipe survey (the earliest Raid error of each wipe):
//   Late fish         A1 +65.0, A6 +187.2, B7 +311.5
//   No fish           B2 +65.0
//   Enrage            A11 +429.3, B15 +433.0 (B11 reached it at +437.2)
//   Relic Rupture     A7 +56.0, A13 +305.5, B1 +233.4
//   Elemental Expl.   A5 +81.1, A10 +98.8
//   Nobody bounced    A15 +381.8, B4 +129.2
//   7 dead            A9 +85.2 (Nova + bleed), B3 +98.8 (junk on the stack),
//                     B5 +161.1 (6 Blast Wave deaths at +100 first), B8
//                     +214.2, B11 +422.4, B17 +235.5
//   Tank died         A4 +93.0 (Shredding Shards), A12 +397.8, B12 +225.0
//   Wipe called       A2 +121.4, A3 +94.5, A8 +102.5, A14 +8.7 (both tanks
//                     died to melee at +2-3s), B6 +126.1, B9 +155.7, B10
//                     +126.4, B13 +116.5, B14 +114.6, B16 +56.0 (after four
//                     Blink Nova deaths at +48), B18 +410.1, B19 +61.5
//
// ── RULES IMPLEMENTED ────────────────────────────────────────────────────────
//
//   wow-le-final-ascension        Minor/Major/Raid  late fish (on the thrower),
//                                                   no fish, or the enrage
//   wow-le-relic-rupture          Raid/Minor  an unopened crate detonated
//   wow-le-blast-wave             Minor/Major hit by Blast Wave (bounce timing
//                                             in the description)
//   wow-le-no-bounce              Minor/Raid  nobody bounced over a wave
//   wow-le-elemental-explosion    Major+Raid  element holder near an opposite
//                                             missile's target
//   wow-le-mighty-thud-undersoaked Minor      a leap split by <= 8 (player-less)
//   wow-le-icebound-flames        Minor       Icebound Flames completed
//   wow-le-shards-no-swap         Minor/Major tank reached 9+ Shredding Shards
//   wow-le-throw-junk             Minor/Major under a landing crate
//   wow-le-evil-eyes              Minor/Major hit by a Creepy Statue
//   wow-le-bomb-blast             Minor/Major hit by Explosive Surprise damage
//   wow-le-spreading-flames       Minor/Major stood in the bomb's fire
//   wow-le-fungal-burst           Minor/Major hit by a Fungal Burst
//   wow-le-aftershock             Minor/Major stood in an Aftershock
//   wow-le-pull-over              Raid        wipe called / 7+ dead / tank death
//                                             the pull didn't survive
//
// ── GUIDE-DERIVED MODEL (pre-log) ────────────────────────────────────────────
//
// The spell IDs below come from encounter-journal links; they are
// CANDIDATES — the verified section above takes precedence.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { suppressDuplicateRaidErrors } from "../../../error-detection";
import {
  RAID_MARKER_SORT_OFFSET_MS, kFmt, sec, yd, debuffIntervals, joinNames, playerError, lastPlayerEventMs,
  deadAt, landed, total, died, raidMarker, hitEpisodes, annotateGroups as annotateGroupsBy, pullOverMarker,
} from "../common";

// ─── Ability IDs (log-verified, reports nRGxQ1b8LdMvzC4D + 8PQFgdDh3R9BW71t) ─

const FA_CHARGE          = 1297075; // Mor'zahi buff: the 60s clock (and pull start)
const FA_CHANNEL         = 1292779; // Mor'zahi buff: Final Ascension completed, channel begins
const FA_DAMAGE          = 1292780; // escalating raid damage while the channel runs
const DISGUSTING_FISH    = 1296535; // player cast on an explorer
const COMMAND_IDS        = new Set([1296975, 1297022, 1297024]); // Nama / Iku / Gebbo
const RELIC_RUPTURE_HIT  = 1310027; // unopened crate detonates on the raid
const SPLINTERS          = 1312853; // raid-wide bleed per crate opened
const THROW_JUNK_HITS    = new Set([1291935, 1306127]); // landing impact (crate / fish crate)
const EVIL_EYES          = 1292764; // Creepy Statue spirit flame
const STEADY_STRIKES     = 1291929; // Nama tank debuff
const BLINK_NOVA_MARK    = 1296025; // debuff on Iku's Blink Nova target
const SHREDDING_SHARDS   = 1295858; // Iku tank debuff, one stack per shard (7 per cast)
const ICEBOUND_FLAMES    = 1286922; // Iku cast (completed = not kicked) and its hit
// Gebbo's Command
const EXPLOSIVE_SURPRISE = 1296249; // bomb detonation cast (10s after the mark)
const BOUNCE             = 1299854; // player debuff while launched by a mushroom
const BLAST_WAVE         = 1305844;
const BOMB_BLAST         = 1296245; // Explosive Surprise damage on a player
const SPREADING_FLAMES   = 1314061;
const FUNGAL_BURST       = 1305618;
// Iku's Command
const BURNING_FLAMES     = 1295928; // debuff from a Fire missile
const PIERCING_FROST     = 1295954; // debuff from a Frost missile
const FIRE_MISSILE_HIT   = 1295893;
const FROST_MISSILE_HIT  = 1295985;
const ELEMENTAL_EXPLOSION = 1295952;
// Nama's Command
const MIGHTY_THUD_LEAP   = 1296133; // cast per leap, targets the marked player
const MIGHTY_THUD_HIT    = 1300237; // split damage on the soakers
const AFTERSHOCK         = 1310500;

const LOST_EXPLORERS_SIGNATURE = new Set([STEADY_STRIKES, BLINK_NOVA_MARK, SPLINTERS]);

// ─── Thresholds ──────────────────────────────────────────────────────────────

// Final Ascension damage runs until the next Command (at most ~11s observed:
// 11 +430.7 enrage until the pull ended).
const FA_WINDOW_MS = 20000;
// Deaths to Final Ascension that make it a cutoff: late fish killed 5 (A6
// +188.9, pull went on 19.6s then wiped), 8 (B7 +312.7) and 11 (A1 +66.6);
// B1 +191.3 and B12 +189.0 killed nobody.
const FA_RAID_DEATHS = 3;
// The fish lands ~4.3-5.1s after the throw (Command follows).
const FISH_LAG_NOTE = "Mor'zahi's Command lands ~4.5s after the throw";

// Relic Rupture hits everyone for ~800k; fewer hits than this means the raid
// was already dead (B1 +237.3: 1 hit, B7 +335.1: 2 hits).
const RUPTURE_RAID_HITS = 5;
const RUPTURE_CLUSTER_MS = 1000;

// Blast Wave reaches the raid 10-17s after the detonation.
const WAVE_WINDOW_MS = 20000;
const WAVE_NO_BOUNCE_RAID_DEATHS = 3;
const BOUNCE_LOOKBACK_MS = 4000;

// Clean Mighty Thud leaps had 9-18 soakers (kill: 13-16). 8 soakers killed
// one player twice (B11 +363.8, B18 +326.7); 1-3 soakers one-shot the target.
const THUD_MAX_UNDERSOAK = 8;
const THUD_HIT_WINDOW_MS = 400;

// Elemental Explosion: an element holder this close to an opposite missile's
// target set it off (A8: 5.8-7.0yd; A5: 9.8yd; A10: 12.1yd from a
// position sampled up to 1.5s away).
const EXPLOSION_PAIR_YD = 12.5;
const MISSILE_MATCH_MS = 300;
const POSITION_WINDOW_MS = 1500;

// Shredding Shards: 7 shards per cast, so every clean pull (kill included)
// peaked at 7 stacks. 12-15 means the tank ate two casts without a swap. 8
// is one shard of overlap during a swap (5 times, twice after the other
// tank had died), so the rule starts at 9.
const SHARDS_PER_CAST = 7;
const SHARDS_NO_SWAP = 9;

const EPISODE_MS = 3000;
const POOL_EPISODE_MS = 1500;
const HIT_DEATH_WINDOW_MS = 1500;
const GROUP_HIT_MS = 1000;
const GROUP_HIT_MIN = 4;

// 5-6 dead is survivable on this fight (B7 fought 120s on with 5 dead, B18
// 103s, B11 87s, B5 71s); every pull that reached 7 dead ended within 31s.
const COLLAPSE_DEAD = 7;
const TANK_REZ_GRACE_MS = 15000;
// A tank death only ends the pull when the pull ends soon after (A12 +397.8:
// 29s; B8 +116.8 and B15 +216.9 fought on for minutes).
const TANK_DEATH_END_MS = 30000;
const CALLED_WIPE_END_MS = 30000;
const CALLED_WIPE_SPAN_MS = 10000;
const CALLED_WIPE_MIN = 3;

// ─── Small helpers ───────────────────────────────────────────────────────────

/** Split time-sorted items wherever consecutive items are more than `gapMs` apart. */
function clusterByGap<T>(items: T[], at: (x: T) => number, gapMs: number): T[][] {
  const groups: T[][] = [];
  let lastT = -Infinity;
  for (const x of [...items].sort((a, b) => at(a) - at(b))) {
    if (at(x) - lastT > gapMs || groups.length === 0) groups.push([x]);
    else groups[groups.length - 1].push(x);
    lastT = at(x);
  }
  return groups;
}

/** This player's position from their nearest positioned hit within `POSITION_WINDOW_MS` of `t`. */
function positionAt(p: PlayerInfo, t: number): { x: number; y: number } | undefined {
  let best: PlayerEvent | undefined;
  for (const e of p.damageTaken) {
    if (e.x === undefined || e.y === undefined || Math.abs(e.timestamp - t) > POSITION_WINDOW_MS) continue;
    if (!best || Math.abs(e.timestamp - t) < Math.abs(best.timestamp - t)) best = e;
  }
  return best ? { x: best.x!, y: best.y! } : undefined;
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Per-player avoidable-damage rule: group each player's landed hits of `ids`
 * into episodes; the death is the one a hit of `ids` delivered.
 */
function avoidableHits(
  players: PlayerInfo[], deaths: DeathEvent[], ids: Set<number>, gapMs: number,
  make: (p: PlayerInfo, hits: PlayerEvent[], death: DeathEvent | undefined) => PullError,
): PullError[] {
  return hitEpisodes(players, deaths, (p) => p.damageTaken.filter((e) => ids.has(e.abilityId) && landed(e)),
    [...ids], gapMs, make, HIT_DEATH_WINDOW_MS);
}

/** Annotate errors of one rule that happened to 4+ players within a second. */
const annotateGroups = (errors: PullError[], note: (others: number) => string) =>
  annotateGroupsBy(errors, note, GROUP_HIT_MS, GROUP_HIT_MIN);

// ─── Final Ascension: the fish clock ran out ─────────────────────────────────
//
// Each cycle: Mor'zahi gains the Final Ascension charge (60s), then casts
// Final Ascension (5s). A Disgusting Fish fed to an explorer produces
// Mor'zahi's Command ~4.5s later, which ends the cycle. When the cast
// completes first, the channel ticks escalating raid damage until a Command
// lands (a late fish) or forever (no fish, or no explorer left to feed).

export const LE_FINAL_ASCENSION_RULE_ID = "wow-le-final-ascension";

function detectFinalAscension(players: PlayerInfo[], deaths: DeathEvent[], enemyBuffs: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === FA_DAMAGE));
  const commands = enemyBuffs.filter((e) => COMMAND_IDS.has(e.abilityId));
  const fishes = players.flatMap((p) => p.casts.filter((c) => c.abilityId === DISGUSTING_FISH).map((c) => ({ p, c })));
  for (const done of enemyBuffs.filter((e) => e.abilityId === FA_CHANNEL)) {
    const t = done.timestamp;
    const command = commands.find((c) => c.timestamp >= t && c.timestamp <= t + FA_WINDOW_MS);
    const end = command?.timestamp ?? t + FA_WINDOW_MS;
    const ticks = hits.filter((e) => e.timestamp >= t && e.timestamp <= end);
    if (ticks.length === 0) continue; // the Command landed as the cast finished
    const killed = deaths.filter((d) => d.killingAbilityGameId === FA_DAMAGE && d.timestamp >= t && d.timestamp <= end + 1000);
    const charge = enemyBuffs.filter((e) => e.abilityId === FA_CHARGE && e.timestamp < t).pop();
    const fish = fishes.find(({ c }) => c.timestamp > (charge?.timestamp ?? -Infinity) && c.timestamp <= end);
    const fed = new Set(commands.filter((c) => c.timestamp < t).map((c) => c.actorName));
    const raid = killed.length >= FA_RAID_DEATHS;
    const outcome = killed.length ? `It killed ${killed.length}: ${joinNames(killed.map((d) => d.player))}.` : "Nobody died to it.";
    const base = { ruleId: LE_FINAL_ASCENSION_RULE_ID, abilityId: FA_DAMAGE, abilityName: "Final Ascension", abilityIcon: ticks[0].abilityIcon };

    if (!fish && fed.size >= 3) {
      errors.push({
        ...base, severity: "Raid", name: "Final Ascension (Enrage)", timestamp: t,
        description: `Final Ascension completed with all three explorers already fed (${joinNames([...fed])}), so no fish could stop it. ` +
          `${outcome} This is the fight's DPS check — treated as the cutoff point.`,
      });
      continue;
    }
    if (!fish) {
      errors.push({
        ...base, severity: raid ? "Raid" : "Minor", name: "No Fish Fed", timestamp: t,
        description: `Final Ascension completed and no Disgusting Fish was fed this cycle` +
          (command ? `; a Command landed ${sec(command.timestamp - t)}s later` : "") + `. ${outcome}` +
          (raid ? " Treated as the point the pull was over." : ""),
      });
      continue;
    }
    const lead = t - fish.c.timestamp;
    const timing = lead >= 0
      ? `threw the Disgusting Fish at ${fish.c.target ?? "an explorer"} only ${sec(lead)}s before Final Ascension completed`
      : `threw the Disgusting Fish at ${fish.c.target ?? "an explorer"} ${sec(-lead)}s after Final Ascension had already completed`;
    errors.push(playerError(fish.p, {
      ...base, severity: killed.length ? "Major" : "Minor", name: "Fish Fed Late", timestamp: fish.c.timestamp,
      description: `${fish.p.name} ${timing} (${FISH_LAG_NOTE}); the channel hit the raid ${ticks.length} times` +
        (command ? ` for ${sec(command.timestamp - t)}s` : "") + `. ${outcome}`,
    }));
    if (raid) {
      errors.push({
        ...base, severity: "Raid", name: "Final Ascension", timestamp: t + RAID_MARKER_SORT_OFFSET_MS,
        description: `A late fish let Final Ascension complete and kill ${killed.length}. Treated as the point the pull was over.`,
      });
    }
  }
  return errors;
}

// ─── Relic Rupture: an unopened crate detonated ──────────────────────────────

export const LE_RUPTURE_RULE_ID = "wow-le-relic-rupture";

function detectRelicRupture(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === RELIC_RUPTURE_HIT && landed(e)));
  return clusterByGap(hits, (e) => e.timestamp, RUPTURE_CLUSTER_MS).map((g) => {
    const t = g[0].timestamp;
    const killed = deaths.filter((d) => d.killingAbilityGameId === RELIC_RUPTURE_HIT && d.timestamp >= t - 100 && d.timestamp <= t + HIT_DEATH_WINDOW_MS);
    const raid = g.length >= RUPTURE_RAID_HITS;
    return {
      ruleId:      LE_RUPTURE_RULE_ID,
      severity:    raid ? "Raid" as const : "Minor" as const,
      name:        "Relic Rupture",
      description: `A crate was left unopened until it ruptured (~32s after landing; its Relic Rupture cast gives 10s of warning), ` +
        `hitting ${g.length} players for ${kFmt(g.reduce((s, e) => s + (e.amount ?? 0), 0) / g.length)} each` +
        (killed.length ? ` and killing ${killed.length}` : "") + "." + (raid ? " Treated as the point the pull was over." : ""),
      timestamp:   t,
      abilityId:   RELIC_RUPTURE_HIT,
      abilityName: "Relic Rupture",
      abilityIcon: g[0].abilityIcon,
    };
  });
}

// ─── Gebbo's Command: Blast Wave over the mushrooms ──────────────────────────

export const LE_BLAST_WAVE_RULE_ID = "wow-le-blast-wave";
export const LE_NO_BOUNCE_RULE_ID = "wow-le-no-bounce";

function describeBounce(p: PlayerInfo, hitT: number): string {
  const bounce = debuffIntervals(p, BOUNCE).filter((iv) => iv.start <= hitT + 200 && iv.start >= hitT - BOUNCE_LOOKBACK_MS).pop();
  if (!bounce) return "didn't bounce on a mushroom";
  if (bounce.end < hitT - 50) return `bounced ${sec(hitT - bounce.start)}s before the wave and had landed ${sec(hitT - bounce.end)}s before it reached them`;
  return `bounced only ${sec(Math.max(0, hitT - bounce.start))}s before the wave reached them and was hit in the air`;
}

function detectBlastWave(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const det of enemyCasts.filter((e) => e.abilityId === EXPLOSIVE_SURPRISE)) {
    const t = det.timestamp;
    const inWave = (x: number) => x > t && x <= t + WAVE_WINDOW_MS;
    const bouncers = players.filter((p) => debuffIntervals(p, BOUNCE).some((iv) => inWave(iv.start)));
    const hit = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === BLAST_WAVE && landed(e) && inWave(e.timestamp)).slice(0, 1).map((e) => ({ p, e })));
    if (hit.length === 0) continue;
    const deathOf = (p: PlayerInfo, e: PlayerEvent) => deaths.find((d) => d.player === p.name && d.killingAbilityGameId === BLAST_WAVE &&
      d.timestamp >= e.timestamp - 100 && d.timestamp <= e.timestamp + HIT_DEATH_WINDOW_MS);
    if (bouncers.length === 0) {
      const killed = hit.filter(({ p, e }) => deathOf(p, e));
      const raid = killed.length >= WAVE_NO_BOUNCE_RAID_DEATHS;
      errors.push({
        ruleId:      LE_NO_BOUNCE_RULE_ID,
        severity:    raid ? "Raid" : "Minor",
        name:        "Nobody Bounced",
        description: `Nobody used a Bouncy Mushroom for the Blast Wave from the bomb that detonated at +${sec(t)}s; it hit ${hit.length}` + (killed.length ? ` and killed ${killed.length}: ${joinNames(killed.map(({ p }) => p.name))}` : "") +
          `. The mushroom was missing, out of reach or used up.` + (raid ? " Treated as the point the pull was over." : ""),
        timestamp:   hit[0].e.timestamp,
        abilityId:   BLAST_WAVE,
        abilityName: "Blast Wave",
        abilityIcon: hit[0].e.abilityIcon,
      });
      continue;
    }
    for (const { p, e } of hit) {
      const death = deathOf(p, e);
      errors.push(playerError(p, {
        ruleId:      LE_BLAST_WAVE_RULE_ID,
        severity:    death ? "Major" : "Minor",
        name:        "Hit by Blast Wave",
        description: `Hit by Blast Wave (${kFmt(e.amount ?? 0)})${died(death, e.timestamp)}: ${describeBounce(p, e.timestamp)}. ` +
          `${bouncers.length} players bounced over this wave.`,
        timestamp:   e.timestamp,
        abilityId:   BLAST_WAVE,
        abilityName: "Blast Wave",
        abilityIcon: e.abilityIcon,
      }));
    }
  }
  return errors;
}

// ─── Iku's Command: Elemental Explosion ──────────────────────────────────────
//
// A Fire missile applies Burning Flames and a Frost missile Piercing Frost
// (Fire lands 2.0s after the Volley cast, Frost ~0.5s later). A Frost
// missile landing within ~10yd of a Burning Flames holder (or the reverse)
// detonates instead: ~800k to the whole raid. Every one wiped the pull.

export const LE_EXPLOSION_RULE_ID = "wow-le-elemental-explosion";

function detectElementalExplosion(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === ELEMENTAL_EXPLOSION).map((e) => ({ p, e })));
  for (const g of clusterByGap(hits, (h) => h.e.timestamp, RUPTURE_CLUSTER_MS)) {
    const t = g[0].e.timestamp;
    const killed = deaths.filter((d) => d.killingAbilityGameId === ELEMENTAL_EXPLOSION && d.timestamp >= t - 100 && d.timestamp <= t + HIT_DEATH_WINDOW_MS);
    const holdersOf = (id: number) => players.filter((p) => debuffIntervals(p, id).some((iv) => iv.start < t - MISSILE_MATCH_MS && iv.end >= t - 30));
    const targetsOf = (id: number) => players.flatMap((p) => p.damageTaken
      .filter((e) => e.abilityId === id && Math.abs(e.timestamp - t) <= MISSILE_MATCH_MS && e.x !== undefined).slice(0, 1).map((e) => ({ p, e })));
    const pairs: { holder: PlayerInfo; element: string; target: PlayerInfo; d: number }[] = [];
    for (const [holdId, missileId, element] of [[BURNING_FLAMES, FROST_MISSILE_HIT, "Burning Flames"], [PIERCING_FROST, FIRE_MISSILE_HIT, "Piercing Frost"]] as const) {
      const targets = targetsOf(missileId);
      for (const holder of holdersOf(holdId)) {
        const at = positionAt(holder, t);
        if (!at) continue;
        const near = targets.map(({ p, e }) => ({ target: p, d: distance(at, { x: e.x!, y: e.y! }) }))
          .filter((x) => x.target !== holder && x.d <= EXPLOSION_PAIR_YD * 100).sort((a, b) => a.d - b.d)[0];
        if (near) pairs.push({ holder, element, ...near });
      }
    }
    const outcome = `Elemental Explosion hit ${g.length} players` + (killed.length ? ` and killed ${killed.length}` : "");
    for (const { holder, element, target, d } of pairs) {
      errors.push(playerError(holder, {
        ruleId:      LE_EXPLOSION_RULE_ID,
        severity:    "Major",
        name:        "Elemental Explosion",
        description: `Still had ${element} when the next missile hit ${target.name} ~${yd(d)}yd away, setting off Elemental Explosion. ${outcome}.`,
        timestamp:   t,
        abilityId:   ELEMENTAL_EXPLOSION,
        abilityName: "Elemental Explosion",
        abilityIcon: g[0].e.abilityIcon,
      }));
    }
    errors.push({
      ruleId:      LE_EXPLOSION_RULE_ID,
      severity:    "Raid",
      name:        "Elemental Explosion",
      description: `${outcome}. ` + (pairs.length
        ? `An element holder stood within ${EXPLOSION_PAIR_YD}yd of an opposite missile's target.`
        : "The player who set it off couldn't be placed from the log.") + " Treated as the point the pull was over.",
      timestamp:   t + RAID_MARKER_SORT_OFFSET_MS,
      abilityId:   ELEMENTAL_EXPLOSION,
      abilityName: "Elemental Explosion",
      abilityIcon: g[0].e.abilityIcon,
    });
  }
  return errors;
}

// ─── Nama's Command: Mighty Thud under-soaked ────────────────────────────────

export const LE_THUD_RULE_ID = "wow-le-mighty-thud-undersoaked";

function detectMightyThud(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const leap of enemyCasts.filter((e) => e.abilityId === MIGHTY_THUD_LEAP)) {
    const t = leap.timestamp;
    const soakers = players.filter((p) => p.damageTaken.some((e) => e.abilityId === MIGHTY_THUD_HIT && landed(e) && Math.abs(e.timestamp - t) <= THUD_HIT_WINDOW_MS));
    if (soakers.length === 0 || soakers.length > THUD_MAX_UNDERSOAK) continue;
    const killed = deaths.filter((d) => d.killingAbilityGameId === MIGHTY_THUD_HIT && d.timestamp >= t - 100 && d.timestamp <= t + HIT_DEATH_WINDOW_MS);
    errors.push({
      ruleId:      LE_THUD_RULE_ID,
      severity:    "Minor",
      name:        "Mighty Thud Under-soaked",
      description: `Only ${soakers.length} player${soakers.length === 1 ? "" : "s"} soaked the Mighty Thud leap` +
        ` (${joinNames(soakers.map((p) => p.name))})` + (killed.length ? ` — it killed ${joinNames(killed.map((d) => d.player))}.` : ".") +
        " Clean leaps had 9-18 soakers.",
      timestamp:   t,
      abilityId:   MIGHTY_THUD_HIT,
      abilityName: "Mighty Thud",
      abilityIcon: leap.abilityIcon,
    });
  }
  return errors;
}

// ─── Icebound Flames not interrupted ─────────────────────────────────────────

export const LE_ICEBOUND_RULE_ID = "wow-le-icebound-flames";

function detectIcebound(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  return enemyCasts.filter((e) => e.abilityId === ICEBOUND_FLAMES).map((c) => {
    const hit = players.filter((p) => p.damageTaken.some((e) => e.abilityId === ICEBOUND_FLAMES && landed(e) && e.timestamp >= c.timestamp - 200 && e.timestamp <= c.timestamp + 3000));
    const killed = deaths.filter((d) => d.killingAbilityGameId === ICEBOUND_FLAMES && d.timestamp >= c.timestamp - 200 && d.timestamp <= c.timestamp + 10000);
    return {
      ruleId:      LE_ICEBOUND_RULE_ID,
      severity:    "Minor" as const,
      name:        "Icebound Flames Not Interrupted",
      description: "Scrollsage Iku completed Icebound Flames" + (hit.length ? ` on ${joinNames(hit.map((p) => p.name))}` : "") +
        (killed.length ? `; it killed ${joinNames(killed.map((d) => d.player))}` : "") + ".",
      timestamp:   c.timestamp,
      abilityId:   ICEBOUND_FLAMES,
      abilityName: "Icebound Flames",
      abilityIcon: c.abilityIcon,
    };
  });
}

// ─── Shredding Shards: tank took two sets without a swap ─────────────────────

export const LE_SHARDS_RULE_ID = "wow-le-shards-no-swap";

function detectShardsNoSwap(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter((x) => x.role === "Tank");
  for (const p of tanks) {
    const over = p.debuffs.filter((e) => e.abilityId === SHREDDING_SHARDS && (e.stack ?? 0) >= SHARDS_NO_SWAP);
    for (const g of clusterByGap(over, (e) => e.timestamp, 10000)) {
      // With the other tank dead there was nobody to swap to.
      const partnerDead = tanks.some((o) => o !== p && deadAt(players, deaths, g[0].timestamp).some((d) => d.player === o.name));
      if (partnerDead) continue;
      const peak = Math.max(...g.map((e) => e.stack ?? 0));
      const death = deaths.find((d) => d.player === p.name && d.timestamp >= g[0].timestamp && d.timestamp <= g[g.length - 1].timestamp + 5000);
      errors.push(playerError(p, {
        ruleId:      LE_SHARDS_RULE_ID,
        severity:    death ? "Major" : "Minor",
        name:        "Shredding Shards Not Swapped",
        description: `Took a second Shredding Shards set without a tank swap, reaching ${peak} stacks (a single cast is ${SHARDS_PER_CAST})` +
          (death ? ` and died ${sec(death.timestamp - g[0].timestamp)}s later (${death.cause})` : "") + ".",
        timestamp:   g[0].timestamp,
        abilityId:   SHREDDING_SHARDS,
        abilityName: "Shredding Shards",
        abilityIcon: g[0].abilityIcon,
      }));
    }
  }
  return errors;
}

// ─── Avoidable damage ────────────────────────────────────────────────────────

export const LE_THROW_JUNK_RULE_ID = "wow-le-throw-junk";
export const LE_EVIL_EYES_RULE_ID = "wow-le-evil-eyes";
export const LE_BOMB_RULE_ID = "wow-le-bomb-blast";
export const LE_SPREADING_FLAMES_RULE_ID = "wow-le-spreading-flames";
export const LE_FUNGAL_RULE_ID = "wow-le-fungal-burst";
export const LE_AFTERSHOCK_RULE_ID = "wow-le-aftershock";

function detectAvoidable(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const simple = (ids: Set<number>, gapMs: number, ruleId: string, name: string, abilityName: string, what: (g: PlayerEvent[]) => string) =>
    avoidableHits(players, deaths, ids, gapMs, (p, g, death) => playerError(p, {
      ruleId, name, abilityName,
      severity:    death ? "Major" : "Minor",
      description: `${what(g)} (${total(g)})${died(death, g[0].timestamp)}.`,
      timestamp:   g[0].timestamp,
      abilityId:   g[0].abilityId,
      abilityIcon: g[0].abilityIcon,
    }));
  const times = (g: PlayerEvent[]) => (g.length > 1 ? ` ${g.length} times` : "");
  const ticks = (g: PlayerEvent[]) => `${g.length} tick${g.length === 1 ? "" : "s"}`;
  return [
    ...annotateGroups(
      simple(THROW_JUNK_HITS, EPISODE_MS, LE_THROW_JUNK_RULE_ID, "Hit by Throw Junk", "Throw Junk", (g) => `Stood where Gebbo's junk landed${times(g)}`),
      (n) => `${n} others were hit by the same landing — the raid was stacked under it.`,
    ),
    ...simple(new Set([EVIL_EYES]), EPISODE_MS, LE_EVIL_EYES_RULE_ID, "Hit by Evil Eyes", "Evil Eyes", (g) => `Hit by a Creepy Statue's Evil Eyes${times(g)}`),
    ...simple(new Set([BOMB_BLAST]), EPISODE_MS, LE_BOMB_RULE_ID, "Hit by Explosive Surprise", "Explosive Surprise", () => "Caught in the Explosive Surprise bomb blast"),
    ...simple(new Set([SPREADING_FLAMES]), POOL_EPISODE_MS, LE_SPREADING_FLAMES_RULE_ID, "Stood in Spreading Flames", "Spreading Flames", (g) => `Stood in the bomb's Spreading Flames for ${ticks(g)}`),
    ...simple(new Set([FUNGAL_BURST]), EPISODE_MS, LE_FUNGAL_RULE_ID, "Hit by Fungal Burst", "Fungal Burst", () => "Caught in a Fungal Burst from a mushroom that was set off early"),
    ...simple(new Set([AFTERSHOCK]), POOL_EPISODE_MS, LE_AFTERSHOCK_RULE_ID, "Stood in Aftershock", "Aftershock", (g) => `Stood in a Mighty Thud Aftershock for ${ticks(g)}`),
  ];
}

// ─── When was the pull over? ─────────────────────────────────────────────────
//
// Only the EARLIEST generic marker is emitted, and only when no mechanic
// Raid error came before it (see vashnik.ts).

export const LE_PULL_OVER_RULE_ID = "wow-le-pull-over";

function detectPullOver(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): PullError[] {
  // A called wipe: players die at full health with no killing blow logged,
  // several at once, just before the pull ends (A3, A8, A14, B6, B9, B10,
  // B13, B16, B19: 5-15 such deaths within 6-17s of the end). Deaths from
  // then on are the reset, not a mechanic.
  const unlogged = deaths.filter((d) => !d.killingAbilityGameId).sort((a, b) => a.timestamp - b.timestamp);
  const wipeCall = unlogged.find((d) => pullEnd - d.timestamp <= CALLED_WIPE_END_MS &&
    unlogged.filter((o) => o.timestamp >= d.timestamp && o.timestamp <= d.timestamp + CALLED_WIPE_SPAN_MS).length >= CALLED_WIPE_MIN);
  const called = wipeCall && {
    at: wipeCall.timestamp,
    marker: raidMarker(LE_PULL_OVER_RULE_ID, "Wipe Called",
      `${unlogged.filter((o) => o.timestamp >= wipeCall.timestamp).length} players died with no killing blow logged from ` +
      `+${sec(wipeCall.timestamp)}s, ${sec(pullEnd - wipeCall.timestamp)}s before the pull ended: the raid reset the pull. ` +
      "Treated as the point the pull was over.",
      wipeCall.timestamp, 0, "Wipe Called"),
  };
  return pullOverMarker(players, deaths, pullEnd, {
    ruleId: LE_PULL_OVER_RULE_ID,
    collapseDead: COLLAPSE_DEAD,
    cause: (d) => (d.killingAbilityGameId ? d.cause : "no killing blow logged"),
    tankDeath: { kind: "pullEnded", rezGraceMs: TANK_REZ_GRACE_MS, endMs: TANK_DEATH_END_MS },
    calledWipe: called,
  });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function detectLostExplorersErrors(
  players:         PlayerInfo[],
  deaths:          DeathEvent[] = [],
  enemyCasts:      EnemyEvent[] = [],
  enemyBuffs:      EnemyEvent[] = [],
  pullDurationMs?: number
): PullError[] {
  // Self-gate: tank deaths and generic damage exist in every fight.
  const isLostExplorers = players.some((p) => p.debuffs.some((e: PlayerEvent) => LOST_EXPLORERS_SIGNATURE.has(e.abilityId)));
  if (!isLostExplorers) return [];

  const finalAscension = detectFinalAscension(players, deaths, enemyBuffs);
  // After the enrage everything dies to it; per-player errors are fallout.
  const enrageAt = finalAscension.find((e) => e.name === "Final Ascension (Enrage)")?.timestamp ?? Infinity;
  const errors = [
    ...finalAscension,
    ...[
      ...detectRelicRupture(players, deaths),
      ...detectBlastWave(players, deaths, enemyCasts),
      ...detectElementalExplosion(players, deaths),
      ...detectMightyThud(players, deaths, enemyCasts),
      ...detectIcebound(players, deaths, enemyCasts),
      ...detectShardsNoSwap(players, deaths),
      ...detectAvoidable(players, deaths),
    ].filter((e) => e.timestamp < enrageAt),
  ];

  const pullEnd = pullDurationMs ?? lastPlayerEventMs(players);
  const firstRaid = Math.min(Infinity, ...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  errors.push(...detectPullOver(players, deaths, pullEnd).filter((e) => e.timestamp < firstRaid));

  return suppressDuplicateRaidErrors(errors.sort((a, b) => a.timestamp - b.timestamp));
}
