// lib/mechanics/ffxiv/dancingmad/blackhole.ts
//
// Encounter-specific error detection for Black Hole ("Earthquake"), the
// tether conga-line mechanic in FFXIV's Dancing Mad (Kefka's Return)
// ultimate, beginning ~9:23 into the fight. Like mechanics/forsaken.ts it
// correlates multiple per-player event streams (assignment debuffs + a
// specific damage tick), which the declarative ERROR_RULES table can't
// express, so it lives as its own module called from log-transforms.ts.
//
// ── THE MECHANIC (reverse-engineered from real logs, confirmed against a
//    raid-plan cheatsheet) ────────────────────────────────────────────────
//
// At one instant ("the burst") every player simultaneously receives:
//
//   1005454  "Primordial Crust"    — all 8 players; its DURATION encodes the
//                                    player's line: 72s / 106s / 139s for
//                                    First / Second / Third in Line.
//   1003004  "First in Line"       — 3 players   (matches the 72s crusts)
//   1003005  "Second in Line"      — 3 players   (matches the 106s crusts)
//   1003006  "Third in Line"       — 2 players   (matches the 139s crusts)
//   1001604  "Accretion"           — exactly 2 players: one First in Line
//                                    and one Second in Line. Nominally 14s,
//                                    but it drops off early (observed ~3s on
//                                    one holder, ~11s on the other, in both
//                                    logs) — the cheatsheet even warns "the
//                                    Accretion debuff WILL fall off", so
//                                    holders must remember it. Detection
//                                    keys off the APPLICATION, never uptime.
//
// Then 4 sets of tethers spawn (each tether a separate sourceInstance of
// one NPC actor) and fire ability 47868 ("Nothingness") at their holder at
// 10 fixed "tether moments", locked to the burst with sub-100ms precision
// in every log seen:
//
//   set 1: m1  +24.3s   m2  +31.4s               (m2 fires TWO tethers)
//   set 2: m3  +54.8s   m4  +59.9s   m5  +65.0s  (3 concurrent tethers)
//   set 3: m6  +89.1s   m7  +94.1s   m8  +99.2s  (3 concurrent tethers)
//   set 4: m9 +122.1s   m10 ~+129s               (mirror of set 1; m10's
//                                                 exact offset never seen
//                                                 clean — every log wiped)
//
// Each player must be hit by Nothingness exactly 3 times, at consecutive
// moments, forming a conga line. Raids run (at least) three documented
// strategies for who holds which tether when (see the BlackHoleDoubleTether
// / BlackHoleDSA / BlackHoleSDA cheatsheets in sampledata/ff), and crews
// also re-shuffle within a strategy on the fly to salvage a bad start —
// observed for real: a first tether that clipped BOTH First-in-Line
// players, after which the two simply ran parallel lanes (each hit at
// moments 1,2,3) and the mechanic stayed on schedule.
//
//   DoubleTether: p1 F 1,3,4 (skips m2) · p2 F 2,2 (BOTH m2 tethers),3 ·
//                 F+Acc 3,4,5 · p4 S 4,5,6 · p5 S 5,6,7 · S+Acc 6,7,8 ·
//                 p7 T 7,8,9 · p8 T 8,9,10
//   DSA / SDA:    three fixed lanes (DPS/Support/Accretion columns in
//                 either order). Lane A: F 1,2,3 · S 4,5,6 · T 7,8,9.
//                 Lane B: F 2,3,4 · S 5,6,7 · T 8,9,10. Accretion lane:
//                 F+Acc 3,4,5 · S+Acc 6,7,8.
//
// Every strategy (and the observed on-the-fly reshuffle) lands inside the
// same per-debuff-role UNION of moments — which is the whole check, making
// it strategy-agnostic by construction:
//
//   First in Line, no Accretion   {1,2,3,4}
//   First in Line + Accretion     {3,4,5}
//   Second in Line, no Accretion  {4,5,6,7}
//   Second in Line + Accretion    {6,7,8}
//   Third in Line                 {7,8,9,10}
//
// The confirmed individual failure was a First-in-Line + Accretion player
// (assigned moments 3-5) taking a Nothingness hit at moment 1. An extra
// hit still gets game credit — 1005452 ("soaked once") / 1005453 ("soaked
// twice") was applied to the erroneous soaker just like a legitimate one —
// and the un-soaked hit resurfaces later as a doubled earthquake that
// wipes the raid. Flagging the out-of-schedule hit reports the root cause.
//
// Separately from WHO got hit, ONE tether hitting SEVERAL players at the
// same moment (players standing too close together when it fires) is
// raised as a raid-severity error: the extra hits skip ahead in everyone's
// 3-hit budget, which makes the remaining schedule borderline unresolvable
// — both observed cases doubled the follow-up earthquake and wiped the
// raid within seconds. (The DoubleTether strategy's m2 is the opposite
// shape — TWO tethers hitting ONE player — and never triggers this.)
//
// ── PRIMORDIAL CRUST: THE THIRD HIT'S SAFETY NET (confirmed 2026-07-21) ────
//
// That "big" 3rd hit isn't graduated damage — every single Nothingness hit
// with `overkill` set (the 3rd/final hit of every conga, clean or not) is
// effectively the SAME near-9,999,999 raw hit regardless of buffs, always
// bringing the victim to exactly 0 HP with millions in overkill. What
// actually decides life or death is Primordial Crust: the 1005454 debuff
// every player receives at the burst is a once-per-phase "instead of dying,
// drop to 1 HP" charge, consumed the instant a lethal-magnitude hit lands.
// On every confirmed-clean soak, the debuff's `removed` event lands at the
// EXACT millisecond of the player's own big Nothingness hit — that's the
// crust firing as designed. If something else lethal-magnitude hits the
// player FIRST (any other raid mechanic, or an earlier stray tether), the
// crust gets spent there instead, and by the time their real 3rd Nothingness
// hit arrives they have nothing left to fall back on — full, actually-fatal
// damage. Confirmed on a real death (report rXBbzFV49hd1QPwf pull 12): a
// White Mage's crust was consumed 15s early by an unrelated raid AoE
// ("Slap Happy", 47848); their subsequent 3rd Nothingness hit had no
// safety net and killed them outright, even though the tether assignment
// itself was correct and otherwise undetected. The same early-loss pattern
// (crust consumed by 47884/47850, other raid mechanics) was found on three
// more players across other pulls in the same report, confirming this
// isn't a one-off.
//
// ── WHAT THIS DOES NOT DO YET ───────────────────────────────────────────
//
// It doesn't flag MISSED tether hits (fewer than 3), nor verify the exact
// per-strategy lane ordering, nor check the earthquake/Accretion soak
// positioning that follows — every failure observed so far surfaces as an
// out-of-schedule hit, a multi-player tether hit, or an early Primordial
// Crust loss, which are what's detected here.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";

const FIRST_IN_LINE_ID  = 1003004;
const SECOND_IN_LINE_ID = 1003005;
const THIRD_IN_LINE_ID  = 1003006;
const ACCRETION_ID      = 1001604;
export const NOTHINGNESS_ABILITY_ID = 47868; // the tether hit
const EARTHQUAKE_ABILITY_ID  = 47866; // the doubled-earthquake wipe symptom of an earlier missed soak

export const BLACKHOLE_INCORRECT_TETHER_RULE_ID = "ffxiv-blackhole-soaked-incorrect-tether";
export const BLACKHOLE_LOST_CRUST_RULE_ID       = "ffxiv-blackhole-lost-primordial-crust";
export const BLACKHOLE_EARTHQUAKE_DURING_VULN_RULE_ID = "ffxiv-blackhole-earthquake-during-vulnerability";

// ── Accretion earthquake vulnerability overlap (confirmed 2026-07-21,
//    report VtdBqhLQkWJXMvDg pull 8) ─────────────────────────────────────
//
// Separately from the tether conga line, the two Accretion (1001604)
// holders each trigger their own raid-wide "Earthquake" (47866) the moment
// they're healed back to full HP — landing on the whole raid and applying
// debuff 1003372 (a ~2s vulnerability, observed 1960ms) to whoever it hits.
// If a SECOND Earthquake lands anywhere on the raid before that
// vulnerability has actually worn off (per real removedebuff timing, not a
// nominal duration — see below), the still-vulnerable players get dropped
// to 1 HP instead of taking the hit normally (their Primordial Crust,
// 1005454, is what actually saves them — see BLACKHOLE_LOST_CRUST_RULE_ID
// above), and the mechanic's own designed follow-up ("once the debuff
// expires, an Earthquake is sent out") then finishes the raid off for real
// since nobody has a crust left. That follow-up cascade is deliberately NOT
// flagged as its own error — it's the encounter enforcing the wipe, not an
// independent mistake — so this only ever reports the FIRST overlap found
// in a pull (the actual root cause).
//
// Confirmed on pull 8: the first Earthquake (566391ms) applies 1003372 to 7
// of 8 players; the second (567589ms, only 1198ms later — from Chauzey
// Solstice being topped too quickly) lands while all 7 are still under it
// (their real removedebuff events don't fire until 568212-568478ms). Cross-
// checked against every other pull with this debuff in the same report:
// pulls 11/17 show the identical shape (an early overlap, unreviewed by the
// user yet but consistent with this rule); pulls 7/16/20/22 run multiple
// clean, non-overlapping Earthquakes with zero false positives.
const EARTHQUAKE_VULNERABILITY_ABILITY_ID = 1003372;

// Every player hit by the SAME Earthquake gets applydebuff within a few ms
// of each other (confirmed simultaneous in every log) — used both to
// cluster one landing's applies together, and as the minimum gap before an
// interval counts as "from an earlier, distinct landing" rather than the
// current one.
const EARTHQUAKE_LANDING_CLUSTER_MS = 100;

const PRIMORDIAL_CRUST_ABILITY_ID = 1005454;

// The crust's `removed` event lands at the exact millisecond of whatever
// hit consumed it — every confirmed case matched within a few ms.
const CRUST_CONSUMPTION_TOLERANCE_MS = 100;

// The 10 tether moments, as offsets from the debuff burst (see the
// timetable above). Matched across two independent logs to within 100ms.
export const TETHER_MOMENT_OFFSETS_MS: readonly number[] = [
  24300, 31400,                 // set 1
  54800, 59900, 65000,          // set 2
  89100, 94100, 99200,          // set 3
  122100, 129200,               // set 4 (m10 extrapolated — see above)
];

// A Nothingness hit further than this from every scheduled moment is left
// unclassified (and unflagged) rather than guessed at — moments are 5.1s
// apart at their closest, so ±3s can never straddle two of them.
const TETHER_MOMENT_TOLERANCE_MS = 3000;

// An Accretion application belongs to the burst if it lands within this
// window of it (observed: same millisecond).
const BURST_MATCH_WINDOW_MS = 2000;

// ── Wipe suppression ────────────────────────────────────────────────────
//
// When holders start dying mid-mechanic the surviving tethers retarget
// whoever is closest, producing out-of-schedule hits that are fallout, not
// the mistake itself (observed: a tether hitting a long-since-finished
// player seconds after three deaths). A moment is considered compromised —
// and exempt from flagging — once 2+ players died shortly before it. A
// single death doesn't suppress: one player dying elsewhere leaves the
// remaining tethers on their normal targets.
const WIPE_DEATHS_WINDOW_MS = 15000;
const WIPE_DEATHS_THRESHOLD = 2;

export type LineNumber = 1 | 2 | 3;

export type BlackHoleAssignment = {
  line:         LineNumber;
  hasAccretion: boolean;
  /** 1-based tether moments this player may legitimately be hit at (role-pair union — see module comment). */
  allowedMoments: ReadonlySet<number>;
  /** Human phrasing of the assignment, for error descriptions. */
  label:        string;
  assignedSpan: string;
};

const ROLE_TABLE: ReadonlyArray<{
  line: LineNumber; hasAccretion: boolean;
  moments: readonly number[]; label: string; assignedSpan: string;
}> = [
  { line: 1, hasAccretion: false, moments: [1, 2, 3, 4],  label: "First in Line",              assignedSpan: "tethers 1-4" },
  { line: 1, hasAccretion: true,  moments: [3, 4, 5],     label: "First in Line + Accretion",  assignedSpan: "tethers 3-5" },
  { line: 2, hasAccretion: false, moments: [4, 5, 6, 7],  label: "Second in Line",             assignedSpan: "tethers 4-7" },
  { line: 2, hasAccretion: true,  moments: [6, 7, 8],     label: "Second in Line + Accretion", assignedSpan: "tethers 6-8" },
  { line: 3, hasAccretion: false, moments: [7, 8, 9, 10], label: "Third in Line",              assignedSpan: "tethers 7-10" },
];

/** The burst instant: the earliest "(N) in Line" application in the pull, or undefined if Black Hole never happened. */
export function findBurstTimestamp(players: PlayerInfo[]): number | undefined {
  let earliest: number | undefined;
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.debuffStatus !== "applied") continue;
      if (d.abilityId !== FIRST_IN_LINE_ID && d.abilityId !== SECOND_IN_LINE_ID && d.abilityId !== THIRD_IN_LINE_ID) continue;
      if (earliest === undefined || d.timestamp < earliest) earliest = d.timestamp;
    }
  }
  return earliest;
}

/**
 * Resolves every player's Black Hole assignment from the burst, or
 * undefined if the composition doesn't match the only pattern the schedule
 * is known for (3 First / 3 Second / 2 Third, with exactly one Accretion
 * on a First and one on a Second). An unrecognized composition means the
 * entry order can't be trusted, and guessing it would risk flagging clean
 * players — so detection bows out entirely instead.
 */
export function buildAssignments(
  players: PlayerInfo[],
  burstTimestamp: number
): Map<number, BlackHoleAssignment> | undefined {
  const lineByPlayer = new Map<number, LineNumber>();
  const accretionPlayers = new Set<number>();

  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.debuffStatus !== "applied") continue;
      if (Math.abs(d.timestamp - burstTimestamp) > BURST_MATCH_WINDOW_MS) continue;

      if (d.abilityId === FIRST_IN_LINE_ID)  lineByPlayer.set(player.actorId, 1);
      if (d.abilityId === SECOND_IN_LINE_ID) lineByPlayer.set(player.actorId, 2);
      if (d.abilityId === THIRD_IN_LINE_ID)  lineByPlayer.set(player.actorId, 3);
      if (d.abilityId === ACCRETION_ID)      accretionPlayers.add(player.actorId);
    }
  }

  const lineCounts = { 1: 0, 2: 0, 3: 0 };
  const accretionLines: LineNumber[] = [];
  for (const [actorId, line] of lineByPlayer) {
    lineCounts[line]++;
    if (accretionPlayers.has(actorId)) accretionLines.push(line);
  }

  const isKnownComposition =
    lineCounts[1] === 3 && lineCounts[2] === 3 && lineCounts[3] === 2 &&
    accretionLines.length === 2 && accretionLines.includes(1) && accretionLines.includes(2);
  if (!isKnownComposition) return undefined;

  const assignments = new Map<number, BlackHoleAssignment>();
  for (const [actorId, line] of lineByPlayer) {
    const hasAccretion = accretionPlayers.has(actorId);
    const role = ROLE_TABLE.find((r) => r.line === line && r.hasAccretion === hasAccretion);
    if (!role) return undefined; // Accretion on a Third in Line — no known schedule
    assignments.set(actorId, {
      line,
      hasAccretion,
      allowedMoments: new Set(role.moments),
      label:          role.label,
      assignedSpan:   role.assignedSpan,
    });
  }
  return assignments;
}

/** Maps a hit timestamp to its 1-based tether moment, or undefined when it's not near any scheduled moment. */
export function momentIndexFor(hitTimestamp: number, burstTimestamp: number): number | undefined {
  const offset = hitTimestamp - burstTimestamp;
  for (let i = 0; i < TETHER_MOMENT_OFFSETS_MS.length; i++) {
    if (Math.abs(offset - TETHER_MOMENT_OFFSETS_MS[i]) <= TETHER_MOMENT_TOLERANCE_MS) return i + 1;
  }
  return undefined;
}

/**
 * Whether a moment (given its timestamp) is compromised by a nearby mass
 * death — see the module comment's "Wipe suppression" section. Exported so
 * blackhole-strategy.ts's cross-pull aggregation and per-pull schedule
 * checks apply the exact same exemption the role-band checks above use.
 */
export function isCompromisedMoment(deathEvents: DeathEvent[], momentTimestamp: number): boolean {
  return deathEvents.filter(
    (d) => d.timestamp <= momentTimestamp && momentTimestamp - d.timestamp <= WIPE_DEATHS_WINDOW_MS
  ).length >= WIPE_DEATHS_THRESHOLD;
}

/**
 * Detects an Accretion Earthquake landing on the raid while an EARLIER
 * Earthquake's own vulnerability debuff (1003372) hasn't actually worn off
 * yet — see the module comment above. Builds real applied/removed
 * intervals per player (ground truth, not a nominal duration), clusters
 * simultaneous applies into discrete "landings," then walks the landings
 * in order looking for the first one where some interval from an earlier,
 * different landing is still open. Only that first overlap is reported —
 * everything after is the mechanic's own designed (and unavoidable) wipe
 * cascade, not a fresh mistake.
 */
export function detectEarthquakeVulnerabilityOverlapErrors(players: PlayerInfo[]): PullError[] {
  type Interval = { start: number; end: number };
  const intervals: Interval[] = [];

  for (const player of players) {
    const events = player.debuffs
      .filter((d) => d.abilityId === EARTHQUAKE_VULNERABILITY_ABILITY_ID)
      .sort((a, b) => a.timestamp - b.timestamp);

    let openStart: number | undefined;
    for (const e of events) {
      if (e.debuffStatus === "applied") {
        openStart = e.timestamp;
      } else if (e.debuffStatus === "removed" && openStart !== undefined) {
        intervals.push({ start: openStart, end: e.timestamp });
        openStart = undefined;
      }
    }
    // Still open at the end of the pull's data (e.g. the wipe) — treat as
    // open-ended so it can still count as "still active" for any later
    // landing check within the data we do have.
    if (openStart !== undefined) intervals.push({ start: openStart, end: Infinity });
  }

  if (intervals.length === 0) return [];

  const starts = [...new Set(intervals.map((i) => i.start))].sort((a, b) => a - b);
  const landings: number[] = [];
  for (const s of starts) {
    if (landings.length > 0 && s - landings[landings.length - 1] <= EARTHQUAKE_LANDING_CLUSTER_MS) continue;
    landings.push(s);
  }

  for (let i = 1; i < landings.length; i++) {
    const landingTime = landings[i];
    const stillVulnerable = intervals.filter(
      (iv) => iv.start < landingTime - EARTHQUAKE_LANDING_CLUSTER_MS && iv.end > landingTime
    ).length;
    if (stillVulnerable === 0) continue;

    return [
      {
        ruleId:      BLACKHOLE_EARTHQUAKE_DURING_VULN_RULE_ID,
        severity:    "Raid",
        name:        "Earthquake Hit Raid While Still Vulnerable",
        description: `An Accretion Earthquake landed while ${stillVulnerable} player(s) were still under the previous Earthquake's vulnerability — the raid drops to 1 HP, and the mechanic's own follow-up Earthquake finishes the wipe once that runs out.`,
        timestamp:   landingTime,
        abilityId:   EARTHQUAKE_ABILITY_ID,
        abilityName: "Earthquake",
      },
    ];
  }

  return [];
}

/**
 * Detects Black Hole tether failures: a Nothingness hit landing on a
 * player at a tether moment their debuff assignment doesn't cover.
 *
 * Returns [] immediately for any pull that never reaches Black Hole —
 * self-gating on the "(N) in Line" debuffs rather than an encounter-name
 * check, so it's safe to always call regardless of fight.
 */
export function detectBlackHoleErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[]
): PullError[] {
  const burstTimestamp = findBurstTimestamp(players);
  if (burstTimestamp === undefined) return [];

  // May be undefined for an unrecognized composition — that only disables
  // the schedule check, not the multi-hit check below (a tether cleaving
  // several players is wrong under every conceivable assignment order).
  const assignments = buildAssignments(players, burstTimestamp);

  const deathTimestamps = deathEvents.map((d) => d.timestamp);
  const isCompromisedMoment = (momentTimestamp: number) =>
    deathTimestamps.filter(
      (t) => t <= momentTimestamp && momentTimestamp - t <= WIPE_DEATHS_WINDOW_MS
    ).length >= WIPE_DEATHS_THRESHOLD;

  const errors: PullError[] = [];

  // NOTE: the old raid-severity "Tether Hit Multiple Players" check (one
  // tether hitting 2+ players) was removed 2026-07 in favor of
  // blackhole-strategy.ts's per-player "Missed Assigned Black Hole Tether"
  // check, which names the specific player who should have soaked the
  // moment instead of everyone the stray tether happened to catch. See
  // detectMissedAssignedTetherErrors there — it's applied in the
  // displayPulls layer (app/page.tsx) once a strategy is resolved/selected,
  // same pattern as Mitigation detection, since it depends on cross-pull
  // analysis rather than single-pull debuff data.

  // ── Individual check: hit at a moment outside the player's schedule ─────
  for (const player of players) {
    const assignment = assignments?.get(player.actorId);
    if (!assignment) continue;

    // One error per (player, moment) — a single tether firing can surface
    // as multiple damage records (and m2/m10 legitimately fire two tethers
    // at the same holder), but it's one mistake either way.
    const flaggedMoments = new Set<number>();

    for (const e of player.damageTaken) {
      if (e.abilityId !== NOTHINGNESS_ABILITY_ID) continue;

      const moment = momentIndexFor(e.timestamp, burstTimestamp);
      if (moment === undefined) continue;
      if (assignment.allowedMoments.has(moment)) continue;
      if (flaggedMoments.has(moment)) continue;
      if (isCompromisedMoment(e.timestamp)) continue;

      flaggedMoments.add(moment);
      errors.push({
        ruleId:      BLACKHOLE_INCORRECT_TETHER_RULE_ID,
        severity:    "Major",
        name:        "Soaked Incorrect Tether",
        description: `Was hit by Black Hole tether #${moment}, but their assignment (${assignment.label}) covers ${assignment.assignedSpan} — the stolen hit resurfaces later as a doubled earthquake.`,
        timestamp:   e.timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   NOTHINGNESS_ABILITY_ID,
        abilityName: "Nothingness",
      });
    }
  }

  // ── Lost Primordial Crust: the safety net spent on the wrong hit ────────
  //
  // See the module comment above. A player's crust should be consumed by
  // their own big (lethal-magnitude) Nothingness hit — if it's gone before
  // that hit arrives, they have nothing left when the real one lands.
  for (const player of players) {
    for (const removal of player.debuffs) {
      if (removal.abilityId !== PRIMORDIAL_CRUST_ABILITY_ID || removal.debuffStatus !== "removed") continue;
      if (isCompromisedMoment(removal.timestamp)) continue; // wipe cascade, not a mistake

      // Whatever lethal-magnitude hit (overkill set — see PlayerEvent) landed
      // on this player at the exact moment the crust disappeared is what
      // consumed it. No matching hit at all means the removal can't be
      // confidently explained (e.g. a duration expiry) — skip rather than
      // guess.
      const consumedBy = player.damageTaken.find(
        (e) => e.overkill !== undefined && Math.abs(e.timestamp - removal.timestamp) <= CRUST_CONSUMPTION_TOLERANCE_MS
      );
      if (!consumedBy) continue;
      if (consumedBy.abilityId === NOTHINGNESS_ABILITY_ID) continue; // spent correctly, on their own big hit

      // Earthquake (47866) is itself the wipe-cascade SYMPTOM of an earlier
      // missed soak elsewhere (see the module comment) — not an independent
      // mistake this player made. isCompromisedMoment only catches this once
      // 2+ deaths have already landed nearby; the cascade's own damage can
      // arrive before the death event that explains it does, so it needs
      // its own exclusion here too.
      if (consumedBy.abilityId === EARTHQUAKE_ABILITY_ID) continue;

      errors.push({
        ruleId:      BLACKHOLE_LOST_CRUST_RULE_ID,
        severity:    "Major",
        name:        "Lost Primordial Crust",
        description: `Lost Primordial Crust to ${consumedBy.abilityName} instead of their own third Nothingness hit — with no charge left, the next big tether hit had nothing to fall back on and killed them outright.`,
        timestamp:   removal.timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   consumedBy.abilityId,
        abilityName: consumedBy.abilityName,
      });
    }
  }

  errors.push(...detectEarthquakeVulnerabilityOverlapErrors(players));

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
