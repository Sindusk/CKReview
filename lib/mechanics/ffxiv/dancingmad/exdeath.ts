// lib/mechanics/ffxiv/dancingmad/exdeath.ts
//
// Encounter-specific error detection for two Phase 3 ("Exdeath & Chaos")
// mechanics in FFXIV's Dancing Mad ultimate: Thunder III's personal
// tankbuster mis-targeting a bystander tank, and Shockwave's occasional
// instant-kill bypass of its own Damage Down debuff.
//
// Exposure (docs/archive/exposure-plan.md): Thunder III is role-only
// targeted — each mark cluster is a chance for the two tanks alone.
//
// ── THUNDER III (confirmed 2026-07-22, report VtdBqhLQkWJXMvDg) ────────────
//
// Thunder III (damage ability 47884) is a personal tankbuster. ~200-300ms
// before every hit, the boss applies a pre-cast marker debuff (1002998,
// carrying extraAbilityGameID 47884) to exactly ONE player — confirmed
// across 10 clean marks spanning two other pulls in this same report, every
// single one landed on exactly one tank. The underlying enemy cast even
// shows *why*: a clean cast always carries a real single targetID, but the
// one confirmed failure's first cast recorded targetID -1 (an untargeted/
// AoE form) instead of locking one tank — the ability apparently falls back
// to hitting whoever's in range when it can't cleanly resolve a single
// target, which happens when both tanks are standing too close together.
//
// When that happens, BOTH tanks get marked and hit by the same cast. The
// tank who wasn't meant to take it gets caught by proximity, picking up an
// unplanned hit and a stacking vulnerability debuff (1002998's own
// duration window) — confirmed fatal on the real case: the wrongly-hit tank
// took a completely normal-looking hit here, but their next (legitimately
// scheduled) Thunder III arrived while still carrying the leftover
// vulnerability from this one, and that combination one-shot them.
//
// Attribution: FFLogs' own `activeBuffNames` on each tank's Thunder III
// damage tick is ground truth for what mitigation they personally had up at
// the moment of the hit (the same snapshot lib/mitigation/ reads). On the
// confirmed case, the correctly-targeted
// Paladin had Holy Sheltron + Knight's Resolve active; the wrongly-caught
// Dark Knight had Dark Mind up (a low-commitment, habitually-kept-up
// mitigation present on BOTH this erroneous hit and every legitimate one —
// not a useful signal) but neither Living Dead nor The Blackest Night,
// which only ever showed up on their actual legitimately-targeted hit. So
// among the two simultaneously-marked tanks, whichever one has NONE of
// their own job's "big personal" defensive active (deliberately excluding
// the habitually-up ones like Dark Mind — see TANK_PERSONAL_MITIGATION_NAMES)
// is the one who wasn't prepped for this cast — because they weren't
// supposed to be its target. If both or neither have one up, the call is
// too close to guess, so both get flagged rather than risk blaming the
// wrong tank.
//
// Override (2026-10-24, gTkMH91DWRmLbNCn): Thunder III lands in pairs ~3.0s
// apart (this static: MT then OT at ~10:38/10:41, every pull). When both
// tanks are hit, a tank who took the pair's first hit is the bystander,
// whatever their cooldowns: pull 5 10:41.7 the PLD took 10:38.7 and stood
// in the DRK's hit (user: the PLD is wrong, the DRK should take it). The
// mitigation split above runs only when neither or both took the first hit.
//
// ── PHASE 3 ENRAGE: METEOR (2026-10-24, same report) ─────────────────────
//
// Exdeath casts Meteor (50718) when he survives the DPS check; it kills the
// party (pull 11, 12:10.7, Exdeath at 0.1%). Pulls that killed him by
// ~12:07 entered Phase 4 at 12:10.8. One Raid error,
// ffxiv-exdeath-meteor-enrage, at the first Meteor hit.
//
// VOD review 2026-10-24 (user): report gTkMH91DWRmLbNCn pulls 5 and 11,
// rulings in expectations/rulings.json.
//
// Job coverage is necessarily partial: only Paladin and Dark Knight have
// been observed taking Thunder III in this report's logs so far, so only
// their ability lists are populated from real data. Warrior/Gunbreaker
// entries are absent rather than guessed — a mis-targeted WAR/GNB pull
// would fall through to the "ambiguous, flag both" branch until a real log
// supplies their own personal-mitigation names.
//
// ── SHOCKWAVE SILENT KILL (confirmed 2026-07-22, same report) ─────────────
//
// Shockwave (47871/47851, both named "Shockwave" in-game) normally punishes
// a missed positional requirement by applying Damage Down (1002911) — that
// case is already caught by the generic `ffxiv-damage-down` rule in
// error-rules.ts (fires on receiving the debuff at all). But Shockwave can
// also just outright kill the player before the debuff application ever
// registers (confirmed: a Pictomancer died to 47871 with zero Damage Down
// events anywhere in their debuff history), which leaves the generic rule
// silent since it only triggers on the debuff itself. This rule covers that
// gap: a death credited to Shockwave with no preceding Damage Down
// application is flagged directly, under the same "missed the mechanic"
// assumption the debuff-triggered rule already makes.
//
// ── LOG IDS FOUND FOR THE REPLAY (2026-10-18, 2T1HzdPKgbhM43am 10, ──────────
// ── yBKPqGwHparm7Tk4 5; replay.ts has the evidence) ───────────────────────
//   - Bowels of Agony's sigils sit 14y out on three intercardinals; each
//     element's cast comes from a helper there (fire Inferno 47860, water
//     Tsunami 47861, wind Cyclone 47864), when that helper logs a sample.
//   - Latitudinal Implosion's Shockwave (47871): sides of Chaos first, then
//     front and back (fight 5). Slap Happy's Shockwave (47851) hits all
//     eight: raidwide.
//
// ── OPEN QUESTIONS (VOD needed; moved from docs/open-items.md 2026-10-15) ──
//   - Thunder III marking two non-tanks is a distinct, unexplained failure
//     (skipped in detectThunderIIIErrors). It may be Phase 5's Lightning
//     Resistance Down II, which shares ID 1002998 and goes to two players at
//     once. The marks are now filtered to cause 47884 (2026-09-27), so
//     recheck whether the observation survives; no recheck is recorded.
// Not built:
//   - Shockwave role-stack markers

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";

export const THUNDER_III_WRONG_TANK_RULE_ID   = "ffxiv-exdeath-thunder3-wrong-tank";
export const SHOCKWAVE_SILENT_KILL_RULE_ID    = "ffxiv-exdeath-shockwave-silent-kill";
export const METEOR_ENRAGE_RULE_ID            = "ffxiv-exdeath-meteor-enrage";

const THUNDER_III_MARK_ABILITY_ID   = 1002998; // pre-cast targeting marker
const THUNDER_III_DAMAGE_ABILITY_ID = 47884;

// Marks from the same cast land within a few ms of each other on real logs
// (observed: identical millisecond); this is generous without risking two
// genuinely separate casts (which are always several seconds apart) merging.
const MARK_CLUSTER_TOLERANCE_MS = 100;

// How far from the mark timestamp to look for the matching damage tick and
// its activeBuffNames snapshot.
const MARK_TO_DAMAGE_WINDOW_MS = 1000;

// A pair's two hits land 3.0-3.1s apart (gTkMH91DWRmLbNCn, every pull).
const THUNDER_III_PAIR_GAP_MS = 4500;

// Each tank job's own "big personal" defensive cooldowns — the ones a tank
// times specifically because THEY expect to take a hit, as opposed to
// generic raid-wide mitigation (Reprisal, Addle, Rampart, Kerachole, ...)
// that both tanks carry regardless of who's actually being targeted. Names
// are matched case-insensitively against PlayerEvent.activeBuffNames.
const TANK_PERSONAL_MITIGATION_NAMES: Readonly<Record<string, readonly string[]>> = {
  Paladin: [
    "sentinel", "holy sheltron", "knight's resolve",
    "guardian", "guardian's will", "intervention", "hallowed ground", "bulwark",
  ],
  // Dark Mind deliberately excluded — confirmed on the real case that it's
  // kept up habitually regardless of whether THIS hit is expected (present
  // on both the erroneous and the legitimate hit), unlike the others below,
  // which only showed up on the legitimately-targeted hit.
  DarkKnight: [
    "living dead", "the blackest night",
    "shadowed vigil", "vigilant", "undead rebirth",
  ],
  // Not yet confirmed against a real log — populate from real data once a
  // WAR/GNB tank is caught by this mechanic (see module comment).
  Warrior: [],
  Gunbreaker: [],
};

function detectThunderIIIErrors(players: PlayerInfo[], occurrences?: ReportedOccurrence[]): PullError[] {
  type Mark = { player: PlayerInfo; timestamp: number };
  const marks: Mark[] = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.abilityId !== THUNDER_III_MARK_ABILITY_ID || d.debuffStatus !== "applied") continue;
      // 1002998 is also Phase 5's Lightning Resistance Down II (Celestriad
      // hands it to two players at once, cause-less or caused by a Thunder
      // III tower 47941). Every real Exdeath mark carries cause 47884 (609/609
      // across all captures, 2026-09-27).
      if (d.causeAbilityId !== THUNDER_III_DAMAGE_ABILITY_ID) continue;
      marks.push({ player, timestamp: d.timestamp });
    }
  }
  if (marks.length === 0) return [];

  marks.sort((a, b) => a.timestamp - b.timestamp);
  const clusters: Mark[][] = [];
  for (const mark of marks) {
    const current = clusters[clusters.length - 1];
    if (current && mark.timestamp - current[current.length - 1].timestamp <= MARK_CLUSTER_TOLERANCE_MS) {
      current.push(mark);
    } else {
      clusters.push([mark]);
    }
  }

  const errors: PullError[] = [];
  // Role-only (user, 2026-10-11): only the tanks can fail a Thunder III,
  // so each one is a chance for the two tanks alone.
  const tankNames = players.filter((p) => p.role === "Tank").map((p) => p.name);

  for (const cluster of clusters) {
    occurrences?.push({ mechanicKey: THUNDER_III_WRONG_TANK_RULE_ID, timestamp: cluster[0].timestamp, players: tankNames });
    const byPlayer = new Map<number, Mark>();
    for (const m of cluster) byPlayer.set(m.player.actorId, m);
    if (byPlayer.size < 2) continue; // the normal, single-target case

    // Only the confirmed "both tanks marked" failure is understood well
    // enough to attribute — a mark landing on 2+ non-tanks was also
    // observed in the data (both healers, boss otherwise undamaged, no
    // prior deaths to explain a target-pool fallback) but is a different,
    // not-yet-explained failure mode. Rather than force it through the
    // tank-mitigation attribution logic (which has nothing meaningful to
    // say about healers), this bows out entirely until a confirmed case
    // explains what's actually happening there.
    const tankMarks = [...byPlayer.values()].filter((m) => m.player.role === "Tank");
    if (tankMarks.length < 2) continue;

    const clusterTime = cluster[0].timestamp;

    const candidates = tankMarks.map(({ player }) => {
      const hit = player.damageTaken.find(
        (e) =>
          e.abilityId === THUNDER_III_DAMAGE_ABILITY_ID &&
          Math.abs(e.timestamp - clusterTime) <= MARK_TO_DAMAGE_WINDOW_MS
      );
      const wanted = TANK_PERSONAL_MITIGATION_NAMES[player.className] ?? [];
      const hasOwnMitigation =
        wanted.length > 0 &&
        (hit?.activeBuffNames?.some((n) => wanted.includes(n.toLowerCase())) ?? false);
      return { player, hasOwnMitigation };
    });

    const withMitigation = candidates.filter((c) => c.hasOwnMitigation);
    const withoutMitigation = candidates.filter((c) => !c.hasOwnMitigation);

    // Decisive only on a clean split — some tanks prepped, some didn't. If
    // every candidate (or none) shows their own big cooldown, the call is
    // ambiguous and every marked tank gets flagged rather than a guess.
    // Overrides the mitigation split: Thunder III comes in pairs ~3s apart,
    // and a tank who took the pair's first hit (still vulnerable) should be
    // clear of the second. gTkMH91DWRmLbNCn pull 5 10:41.7: the PLD took
    // 10:38.7 and stood in 10:41.7, which the DRK was prepped for (user,
    // 2026-10-24: the PLD is wrong; the DRK "should be taking the
    // tankbuster"). Every other pair in that report hit one tank per cast.
    const tookPrevious = candidates.filter(({ player }) => player.damageTaken.some(
      (e) => e.abilityId === THUNDER_III_DAMAGE_ABILITY_ID &&
        e.timestamp < clusterTime - MARK_TO_DAMAGE_WINDOW_MS && clusterTime - e.timestamp <= THUNDER_III_PAIR_GAP_MS));
    const toFlag =
      tookPrevious.length === 1 ? tookPrevious :
      withMitigation.length > 0 && withoutMitigation.length > 0 ? withoutMitigation : candidates;

    for (const { player } of toFlag) {
      errors.push({
        ruleId:      THUNDER_III_WRONG_TANK_RULE_ID,
        severity:    "Major",
        name:        "Wrong Tank Hit By Thunder III",
        description: tookPrevious.length === 1
          ? "Was hit by Thunder III alongside the other tank at the same moment — having just taken the previous Thunder III, they should have been clear of this one, which belonged to the other tank. The stacked vulnerability can make the next hit lethal."
          : "Was hit by Thunder III alongside the other tank at the same moment — the cast landed as an untargeted AoE instead of locking a single tank, and this player wasn't the one prepped with their own mitigation for it. The leftover vulnerability can make their next Thunder III lethal.",
        timestamp:   clusterTime,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   THUNDER_III_DAMAGE_ABILITY_ID,
        abilityName: "Thunder III",
      });
    }
  }

  return errors;
}

const SHOCKWAVE_ABILITY_IDS = new Set([47871, 47851]);
const DAMAGE_DOWN_ABILITY_ID = 1002911;

function detectShockwaveSilentKillErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];

  for (const death of deathEvents) {
    if (!SHOCKWAVE_ABILITY_IDS.has(death.killingAbilityGameId)) continue;

    const victim = players.find((p) => p.name === death.player);
    if (!victim) continue;

    const everHadDamageDown = victim.debuffs.some(
      (d) =>
        d.abilityId === DAMAGE_DOWN_ABILITY_ID &&
        d.debuffStatus === "applied" &&
        d.timestamp <= death.timestamp
    );
    if (everHadDamageDown) continue; // the generic ffxiv-damage-down rule already covers this

    errors.push({
      ruleId:      SHOCKWAVE_SILENT_KILL_RULE_ID,
      severity:    "Major",
      name:        "Shockwave Killed Instantly",
      description: "Died to Shockwave without ever receiving the Damage Down debuff it normally applies — the mechanic was missed badly enough to kill outright instead of just punishing with the debuff.",
      timestamp:   death.timestamp,
      player:      death.player,
      class:       death.class,
      specId:      death.specId,
      role:        death.role,
      abilityId:   death.killingAbilityGameId,
      abilityName: "Shockwave",
    });
  }

  return errors;
}

// Meteor (50718) is Phase 3's enrage: Exdeath casts it when he survives the
// DPS check, and it kills the party. gTkMH91DWRmLbNCn pull 11: cast 12:10.7
// with Exdeath at ~1.3%, all eight dead; pulls 3 and 8 killed him by 12:06.7
// and entered Phase 4 at 12:10.8 (user, 2026-10-24: "a failure of the DPS
// check"). Seen in no other pull on disk.
const METEOR_ABILITY_ID = 50718;

function detectMeteorEnrageError(players: PlayerInfo[]): PullError[] {
  const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === METEOR_ABILITY_ID));
  if (hits.length === 0) return [];
  const t = Math.min(...hits.map((e) => e.timestamp));
  const exdeath = players
    .flatMap((p) => p.damageDone)
    .filter((e) => e.target === "Exdeath" && e.timestamp <= t && e.maxHealth)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  const hp = exdeath ? ` at ${((100 * (exdeath.healthAfter ?? 0)) / exdeath.maxHealth!).toFixed(1)}% HP` : "";
  return [{
    ruleId:      METEOR_ENRAGE_RULE_ID,
    severity:    "Raid",
    name:        "Phase 3 Enrage (Meteor)",
    description: `Exdeath survived${hp} and cast Meteor — the Phase 3 DPS check wasn't met.`,
    timestamp:   t,
    abilityId:   METEOR_ABILITY_ID,
    abilityName: "Meteor",
  }];
}

/**
 * Returns [] immediately for any pull that never touches either mechanic —
 * self-gating on the Thunder III marker debuff / a Shockwave killing blow
 * rather than an encounter-name check, so it's safe to always call.
 */
export function detectExdeathErrors(players: PlayerInfo[], deathEvents: DeathEvent[], occurrences?: ReportedOccurrence[]): PullError[] {
  return [...detectThunderIIIErrors(players, occurrences), ...detectShockwaveSilentKillErrors(players, deathEvents), ...detectMeteorEnrageError(players)].sort(
    (a, b) => a.timestamp - b.timestamp
  );
}
