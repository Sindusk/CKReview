// lib/mechanics/ffxiv/dsr/nidhogg-and-hraesvelgr.ts
//
// -- DIGEST --
// DSR Ultimate P6: six opposite-element breath tethers, tank busters,
// Mortal/Solemn Vows, HP balance, wings, Wroth spreads/pairs and final
// elemental dives. A dead Hraesvelgr victim or failed vow can enrage a
// dragon; failed spreads can detonate on death. Both dragons must die in
// time, and P5 Thordan must have been spared. Sections: "-- SCOPE AND
// SOURCES --", "-- SHAPE AND CLOCK --", "-- MECHANICS --", "-- PULL
// ENDERS --", "-- STRATEGY AND NOT ERRORS --", "-- OPEN QUESTIONS --".
// Signals are guide-inferred, not log-verified.
//
// -- SCOPE AND SOURCES --
// Ultimate. Checked 2026-11-02:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-nidhogg-and-hraesvelgr
// https://ultimates.guide/dsr/
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// Release 6.11; official 7.0 freeze malfunction fixed 2024-07-02, see
// P1 source. No other numerical hotfix established. Job/gear changes alter
// push timing. Hex IDs below are candidate network events, not FFLogs proof.
//
// -- SHAPE AND CLOCK --
// Both dragons stationary, generally Nidhogg west, Hraesvelgr east. From
// the phase sync: first breaths 0:35, first vow 0:43, Akh Afah 0:54,
// Hallowed Wings/Cauterize 1:07, Wroth 1:22, Akh Morn 1:33, Wroth
// resolution 1:47, second Akh Afah 2:03, wings 2:15, second breaths 2:35,
// final dives/Touchdown ~2:48-2:55, then kill before Revenge of the Horde.
// Script is timed from transition, but killing both ends it; offsets are
// guide timeline approximations, not a fixed pull clock.
//
// -- MECHANICS --
// WYRMCLAW: both dragons auto their enmity targets; tanks establish aggro.
// WYRMSBREATH (6D33/6D35): three non-tanks tether to each dragon. Lengthen
// the tethers and spread their cones; fire inflicts Boiling -> Pyretic,
// ice Freezing -> Deep Freeze. Simultaneous opposite breaths cancel these
// element debuffs; otherwise opposite-element Cauterize later removes them.
// LOG SIGNAL: short-tether lethal damage, overlapping same-element hits,
// movement during Pyretic, or Deep Freeze where a cleanse was expected;
// FAULT: tether player for proven own line/position, overlap attribution
// otherwise unknown; CONSEQUENCE: Major on death or Raid if vow enrages.
// Boiling/Freezing removal via opposite breath/dive is expected. Duration,
// death effects and exact timing should be established in current logs.
//
// TANK BREATHS: glowing mouths indicate either one Staggering Breath
// circular tankbuster plus the other dragon's central line, or two glowing
// mouths produce Dark Orb/Holy Orb, two split tank hits with opposite
// Sustained Light/Dark Damage DoTs that cancel one another. Tanks stack
// for both orbs, isolate the solo circle. Swirling Blizzard donut (6D38)
// narrows positions. LOG SIGNAL: extra circle victims, lethal central line,
// unpaired elemental DoT or donut hit; FAULT: tank or victim only if their
// positions/assignment establish it; CONSEQUENCE: Major on death, possibly
// Raid through Solemn Vow. Successful shared orbs and tank hits are normal.
//
// MORTAL VOW (6D30 initial, 6D31 pass candidates): initially on random DPS,
// reduces healing and ticks; at ~34s expiry passes by close contact to one
// new player. Previous carrier receives Mortal Atonement (~2 min) preventing
// return. Additional players hit receive Suppuration, max HP down 50% and
// vulnerability. No eligible receiver enrages Nidhogg. LOG SIGNAL: absent
// new vow aura, enrage buff, Suppuration or carrier death; FAULT: passer /
// receiver not distinguishable without agreed order and positions;
// CONSEQUENCE: Raid for enrage when unrecoverable, Major for caused death.
// Expiry deliberately transfers, not a dispel. Holder death and whether
// pass can select multiple eligible players need log verification.
//
// SOLEMN VOW: Hraesvelgr enrages if his attacks kill a player. LOG SIGNAL:
// player death to Hraesvelgr or its lingering ice damage, followed by boss
// enrage buff and increased damage/reduced damage taken; FAULT: original
// cause may be positioning, healing or mitigation, not automatically the
// victim. CONSEQUENCE: Raid if enrage makes continuation impossible.
// Ordinary Nidhogg-caused deaths do not by themselves prove this vow broke.
//
// AKH AFAH (6D42): each dragon targets a healer with a separate group stack.
// Keep groups apart; Magic Vulnerability Up makes overlapping stacks lethal.
// If dragons differ by >3% HP at cast resolution, the higher-HP dragon's
// stack is lethal; colored tether signals imbalance during cast. LOG SIGNAL:
// HP difference/tether at resolution, stack hit/deaths, overlapping hit
// recipients; FAULT: raid damage balance or position, usually player-less;
// CONSEQUENCE: Raid on lethal imbalance/overlap. Damage split behavior and
// percentage rounding require verification. Successful stack hits normal.
//
// HALLOWED WINGS (6D23/24/26/27) / PLUME (6D29): glowing wing cleaves one
// half; head up/down selects two farthest/closest for circular tankbusters.
// Tanks take selected positions, group avoids cleave/busters. First overlaps
// Nidhogg's Cauterize; second overlaps Hot Wing/Hot Tail. LOG SIGNAL: wing,
// line or buster damage to extra players; FAULT: affected position or tank
// bait only when identifiable; CONSEQUENCE: Major on death, possibly Raid.
//
// WROTH FLAMES (6D45): three sets of three orbs explode in crosses, middle
// then opposite corners. Four Spreading Flames and two Entangled Flames
// expire after ~24s; two unmarked players pair one each with white stacks,
// red carriers spread. Entangled Pyre needs two people; solo causes heavy
// raid damage and Damage Down. Red explosions hit other players lethally;
// both red and white detonate immediately if carrier dies, often cascading.
// Four Akh Morn hits (6D46/6D47) are shared and leave lethal bleed puddles;
// Hraesvelgr dives and Nidhogg's Hot Wing/Tail restrict safe locations.
// LOG SIGNAL: Flame Burst, overlap hit, raid penalty, premature detonation,
// Bleeding from puddle, or death; FAULT: holder/partner or earlier cause
// only when proven. CONSEQUENCE: Major on death, Raid for cascading wipe.
// Intentional four-hit stack and two-person Entangled Pyre are expected.
//
// FINAL CAUTERIZE / TOUCHDOWN (6D3E/6D3F, 70E7): after second breaths,
// each group takes the opposite element dive to remove Boiling/Freezing;
// each tank stands first in line and survives heavy hit plus DoT. The
// dragons land with proximity damage; move away, pass vow, kill both.
// Wrong element/ordering -> LOG SIGNAL: lingering debuff, tankbuster/DoT on
// wrong player, Pyretic damage or death; FAULT: assignment-dependent;
// CONSEQUENCE: Major or Raid if Hraesvelgr enrages. Guide says ice DoT
// death triggers Solemn Vow. Correct dives and landing damage are expected.
//
// -- PULL ENDERS --
// Revenge of the Horde if both dragons not killed, broken Mortal/Solemn
// Vow, lethal HP imbalance, Wroth detonation cascades, or party collapse.
// If P5 Thordan was killed, success here leads to an unwinnable eye loop,
// not P7. The original wrong-route event belongs in P5.
//
// -- STRATEGY AND NOT ERRORS --
// Community plans choose different vow pass order, group sides, Wroth
// pair priority, and tank invulnerability timings; no static plan supplied.
// Normal DoTs, movement holds, HP balancing, tank invulns, stack damage,
// elemental cleansing and planned sacrifice policies are not automatic
// mistakes. Boss enrage indicates outcome, not uniquely who caused it.
//
// -- OPEN QUESTIONS --
// 1. Identify FFLogs aura IDs, pass target, vow enrage and missed-pass event;
//    what happens on death, expiration or multiple candidates?
// 2. Confirm HP comparison at cast end and whether boss HP is available.
// 3. Map Wroth early explosions, solo stack penalty and orb pattern events.
// 4. Verify breath sources, cancellation, buster target counts and ice DoT
//    death triggering Solemn Vow, including the historical 7.0 bug window.
