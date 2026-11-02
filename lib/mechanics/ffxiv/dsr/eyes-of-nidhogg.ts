// lib/mechanics/ffxiv/dsr/eyes-of-nidhogg.ts
//
// -- DIGEST --
// DSR Ultimate P4: obtain both eye-damaging buffs, exchange four red and
// four blue tethers, soak two large and four small orbs, then rotate red
// tethers for four pairs of Mirage Dives. Kill the blue eye before paired
// raidwides and both before the influence enrage. Guides conflict on dive
// count in prose; the timeline and detailed strategy show four waves.
// Sections: "-- SCOPE AND SOURCES --", "-- SHAPE AND CLOCK --",
// "-- MECHANICS --", "-- PULL ENDERS --", "-- STRATEGY AND NOT ERRORS --",
// "-- OPEN QUESTIONS --". Signals are guide-inferred, not log-verified.
//
// -- SCOPE AND SOURCES --
// Ultimate. Checked 2026-11-02:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-eyes
// https://ultimates.guide/dsr/
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// Released 6.11; the official 7.0 freeze bug fix 2024-07-02 is linked in
// P1. No other numerical change established; modern damage may change
// kills. IDs are unverified hexadecimal network ability candidates.
//
// -- SHAPE AND CLOCK --
// Stationary Right Eye (blue, west) starts at 50% HP, Left Eye (red, east)
// at 100%. Approximate time from Right Eye's phase sync: buffs 0:03,
// Resentment 0:10, Hatebound 0:19, large orbs ~0:26, small ~0:32, four
// Mirage Dive waves ~0:46/0:51/0:56/1:01, Steep in Rage 1:11, influence
// enrage ~1:30. Orb soak times vary with player choice; both eyes dying
// advances the phase. Influence reaches 100 on a timer; rate unverified.
//
// -- MECHANICS --
// SOUL OF FRIENDSHIP (68C5), SOUL OF DEVOTION (68C6): Haurchefant's
// spirit targets a random player; Ysayle's targets Alphinaud. Stand in
// both buff areas to damage both eyes. Buffs disappear on death and are not
// reapplied on raise. Missing buff -> LOG SIGNAL: absent player aura and
// no damage to affected eye; FAULT: receiver if missing a reachable area,
// otherwise unknown; CONSEQUENCE: damage-check risk, Raid only if enrage
// actually makes the pull unrecoverable. Buff loss on death is consequence,
// not a second avoidable error. RESENTMENT (68BA) and six-second bleed are
// unavoidable raid damage; heal/mitigate; aura naturally expires.
//
// HATEBOUND (68BE): four Clawbound red chains transfer damage taken to
// red eye, four Fangbound blue chains heal blue eye when damaged. Opposite
// colors swap by contact; Bound and Determined prevents another swap for
// ~3s. Plan uses red players to take valuable damage, blue players to avoid
// it. LOG SIGNAL: aura exchange, eye heal or missing red damage; FAULT:
// assignment-dependent, no individual assumption; CONSEQUENCE: Raid only
// if resulting damage check actually fails. Receiving routine raid damage
// with blue is sometimes unavoidable. Expiry/death transfer is unverified.
//
// FLARE NOVA (68C1 candidate damage), FLARE STAR (68BF): two large yellow
// orbs require two players simultaneously each; four small blue orbs need
// one each. They grow four times and explode if left through the last
// growth. Large orbs commonly taken at third growth by red tethers to deal
// useful eye damage; then tethers swap and small orbs are soaked. Each soak
// applies Fire Resistance Down II. LOG SIGNAL: orb raid explosion, absent
// soak hits, resistant player hit twice or eye healing from blue damage;
// FAULT: unknown without orb ownership/timing; CONSEQUENCE: Raid on
// explosion, Major for caused death. Orb penalty name/ID unverified. Orb
// damage itself and the resistance aura are expected and expire naturally.
//
// MIRAGE DIVE (68C3 controller, 68C4 damage candidates): four waves about
// five seconds apart; two red-chain targets per wave. Each target must be
// alone; Piercing Resistance Down makes a second dive lethal. After each
// wave, transfer red chains to players not yet hit. Guides describe two
// initially hit players as the flex pair for the fourth wave. LOG SIGNAL:
// same target hit while resistant, extra victim of targeted dive, missing
// target or overlap; FAULT: recipient, partner or swapper cannot always be
// distinguished without assignments and positions; CONSEQUENCE: Major on
// death, Raid if collapse. Timer expiration/death and retarget behavior need
// verification. One dive on each assigned player is expected.
//
// STEEP IN RAGE (68BD): both eyes cast high raid damage together. Kill
// blue before its cast completes, then withstand red's. Blue can revive at
// low HP when Fangbound players take damage and must be killed again. LOG
// SIGNAL: both casts/hits resolve, or revived eye remains alive; FAULT:
// raid-level damage/check, not necessarily any individual. CONSEQUENCE:
// Raid when simultaneous hits or timeout make survival impossible.
//
// -- PULL ENDERS --
// Unsoaked orbs, simultaneous Steep in Rage, or Revenge of the Horde
// (6722) at influence 100 normally wipe. Eye deaths must both be achieved;
// one dying before the other is intentional. Deaths can remove essential
// damage buffs and indirectly fail the damage check.
//
// -- STRATEGY AND NOT ERRORS --
// Typical tanks/melees take first red/yellow orbs, swap to ranged/healers
// for small orbs and dives; pair priorities differ by region/group. Some
// strategies adjust flex positions and eye damage allocations. Correct
// damage to red chains and eye revival due to unavoidable blue damage are
// expected. No group-specific plan supplied.
//
// -- OPEN QUESTIONS --
// 1. Confirm four dive waves despite one guide's three-wave prose; map
//    actual aura IDs, lockouts, targets and the orb explosion penalty.
// 2. Can eye heals/damage and orb sizes/positions establish a missed soak?
// 3. What happens if a red/blue holder dies before transfer or during dives?
// 4. Does Steep hit/revive blue identically on current-patch kill logs?
