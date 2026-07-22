// lib/mechanics/ffxiv/dancingmad/limitcut.ts
//
// Encounter-specific error detection for Limit Cut, the facing-check
// mechanic in FFXIV's Dancing Mad (Kefka's Return) ultimate that runs
// immediately before Black Hole (~7:30-8:40 into the fight; see
// mechanics/blackhole.ts for what follows). Like the other mechanics
// modules it correlates per-player event streams (a debuff window + the
// death log), which the declarative ERROR_RULES table can't express, so it
// lives here and is called from log-transforms.ts.
//
// ── THE MECHANIC (from real logs) ───────────────────────────────────────
//
// At ~+451s every player simultaneously receives one of two gaze debuffs,
// 68 seconds long. The split between the two varies per pull (4/4 in three
// logs, 6/2 in another), and which of the two means "look at Exdeath" and
// which means "look away" hasn't been pinned to an ID yet — neither
// matters for detection:
//
//   1001602 — face-toward-or-away variant A
//   1001603 — face-toward-or-away variant B
//
// The check resolves as the boss's accompanying cast finishes ~65s later:
// all 8 debuffs are removed within ~400ms of each other (~+516). A player
// facing the wrong way at that instant is knocked back off the arena —
// there is no distinctive knockback damage event in the log; what appears
// instead is a DEATH with no killing ability at all (sourceID -1,
// killingAbilityGameId 0 — the FFLogs signature of a fall/environment
// death) about 2.5-3s after the removal, while everyone who resolved the
// check correctly shows nothing. Confirmed twice on real pulls, in
// different logs, each ~2.5-2.9s after that player's own removal.
//
// So the detection is: a zero-ability death occurring while the player's
// gaze debuff is active, or within a short grace window after it ends
// (they get pushed at the resolution instant but take a couple of seconds
// to slide off the edge). Anchoring on the player's own debuff window is
// what keeps this from misfiring on OTHER fall deaths — one log has a
// genuine knock-off death at +56s into the fight, long before Limit Cut,
// which must not be attributed to it.
//
// ── THE DASH SET (the "Limit Cut" proper, ~14s after the gaze check) ────
//
// Eight boss clones (one NPC actor, sourceInstance 1-8) each fire ONE
// heavy targeted dash (ability 47844, ~110-125k unmitigated) in instance
// order, 0.22s apart, ~+531s. Every clean pass shows the same shape: 8
// dashes, 8 DISTINCT players hit exactly once each, every soaker parked on
// the arena rim (r≈1650-1975 from center, ~45° apart). Each hit applies
// vulnerability 1002941 for ~2.5s.
//
// The bait positions form a precise structure, identical in every log:
// the 8 victims stand at the 8 slot angles 22.5° + k*45° around center,
// and INSTANCE ORDER WALKS CONSECUTIVE SLOTS — clone N+1's target always
// sits 45° from clone N's, with the starting slot and rotation direction
// varying per pull. The instance IS the player's strategy number
// (confirmed: a pull's #1/#7/#8 assignments matched instances 1/7/8).
// Clean baits deviate ≤ ~13° from their slot. EVERY living player gets
// hit — a full shield absorb still logs a 0-damage hit — so "nobody was
// hit by dash N" is never a thing to detect on a player.
//
// The dash itself is a straight chord across the arena: the clones sit ON
// the rim (r=2000, at the k*45° angles between bait slots — both facts
// captured directly in stray sourceResources/position records), and the
// chord runs from the clone's spawn to its numbered player — WHEREVER
// that player actually stands. A confirmed two-player position swap
// (#6 and #7 standing on each other's slots) had dash 6 and dash 7 land
// squarely on the swapped spots, so the dash follows its player, not the
// slot — which makes instance→victim the assignment itself, and a
// single-victim dash landing away from its fitted slot direct evidence
// that the victim stood at the wrong spot. It's also lethal: the
// mispositioned dash hit for ~5x the normal unmitigated damage (649k vs
// the usual 113-140k) and killed its target, while the other swapped
// player's dash happened to hit normally. A player can also be clipped
// ANYWHERE along a dash chord — one confirmed case idled near the far END
// of a dash lane (next to the clone's own spawn, ~3500 units from the
// dash's actual target) and was struck at the chord's origin. Everyone
// stays safe purely by standing on their OWN slot. The earlier pulses from the same clones (47843) and the
// 47864 burst at ~+519 hit the whole raid for incidental damage and are
// NOT part of the check.
//
// What counts as a player error (per the raid's own standard): being out
// of position. When one dash strikes TWO living players and some victim
// is clearly outside the clean bait band, the blame goes to whichever
// victim is FARTHEST from their own slot — never automatically to whoever
// took the second hit. When every victim of a multi-hit dash stands at a
// proper bait spot, the dash came to THEM: it re-fired because its
// assigned player was missing (dead, or already killed by their own
// positioning error) — pure fallout, deliberately unflagged: the root
// cause either carries its own death-related error or was already flagged
// on the mispositioned player, and the re-target victims had no say at
// all. The same reasoning skips the whole set when a player died between
// the gaze check and the dashes without ever being dash-hit (their
// clone's re-fire scrambles the set; observed lethal at up to 2.67
// MILLION via the own-dash vulnerability).
//
// Pulls that wipe before Limit Cut never see 1001602/1001603, so the
// module self-gates on the debuffs' presence rather than any
// encounter-name or timing check.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";

const GAZE_DEBUFF_IDS = [1001602, 1001603] as const;

// How long after the player's gaze debuff disappears a no-ability death is
// still attributed to the facing check. Observed falls landed 2.5-2.9s
// after removal; the next scripted deaths in the timeline (the second dash
// set) come 13+ seconds later and always carry a killing ability, so 10s
// is comfortably wide without being able to reach anything unrelated.
const FALL_GRACE_WINDOW_MS = 10000;

export const LIMITCUT_PUSHED_OFF_RULE_ID   = "ffxiv-limitcut-pushed-off-arena";
export const LIMITCUT_DASH_CLIP_RULE_ID    = "ffxiv-limitcut-dash-clipped-other-player";
export const LIMITCUT_WRONG_POSITION_RULE_ID = "ffxiv-limitcut-wrong-dash-position";
export const LIMITCUT_DEAD_DURING_MECHANIC_RULE_ID = "ffxiv-limitcut-dead-during-mechanic";

const DASH_ABILITY_ID = 47844;

// The dash set fires ~79-82s after the gaze debuffs are applied (observed
// +530.5 to +533.3 against a +451 application in five logs). The window
// below brackets that comfortably while staying inside the Limit Cut
// phase — nothing else in the fight uses 47844.
const DASH_WINDOW_AFTER_GAZE_MS = 120000;

// The 8 bait slots sit at 22.5° + k*45° around arena center; clean baits
// stand at r ≈ 1650-1975 (see the dash-set model in the module comment).
const ARENA_CENTER    = 10000;
const SLOT_BASE_DEG   = 22.5;
const SLOT_STEP_DEG   = 45;
const IDEAL_SLOT_RADIUS = 1880; // middle of the observed clean bait band

// A single-victim dash anchors the slot fit only if its victim stands
// within half a slot of some slot angle (they always do on real data).
const SLOT_SNAP_TOLERANCE_DEG = 22.5;

// Culprit attribution for a clipped dash compares each victim's distance
// to their own ideal slot point; calls closer than this margin are too
// ambiguous to single one player out, so both get flagged.
const CLIP_ATTRIBUTION_MARGIN = 150;

// A multi-hit dash is only attributed when some victim is CLEARLY out of
// position; when every victim is inside the clean bait band, the dash
// came to them (a re-target of a missing player), not the other way
// around. The band is tight on both sides: the sloppiest clean bait ever
// observed sat 469 from its ideal slot point, while the one confirmed
// real culprit measured 561 — revisit here first if a new log misjudges.
const CLIP_MIN_CULPRIT_DEV = 500;

type GazeWindow = {
  abilityId:   number;
  abilityName: string;
  start:       number;
  end:         number; // removal timestamp, or Infinity if never removed (death/wipe first)
};

/** Every gaze-debuff window for one player (normally exactly one per pull). */
function collectGazeWindows(player: PlayerInfo): GazeWindow[] {
  const windows: GazeWindow[] = [];
  const open = new Map<number, { start: number; abilityName: string }>();

  const events = player.debuffs
    .filter((d) => (GAZE_DEBUFF_IDS as readonly number[]).includes(d.abilityId))
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const e of events) {
    if (e.debuffStatus === "applied") {
      open.set(e.abilityId, { start: e.timestamp, abilityName: e.abilityName });
    } else if (e.debuffStatus === "removed") {
      const o = open.get(e.abilityId);
      windows.push({
        abilityId:   e.abilityId,
        abilityName: o?.abilityName ?? e.abilityName,
        start:       o?.start ?? 0,
        end:         e.timestamp,
      });
      open.delete(e.abilityId);
    }
  }
  for (const [abilityId, o] of open) {
    windows.push({ abilityId, abilityName: o.abilityName, start: o.start, end: Infinity });
  }

  return windows;
}

/**
 * Detects Limit Cut facing-check failures: a death with no killing ability
 * (the fall-off-the-arena signature) during or shortly after the player's
 * gaze-debuff window.
 *
 * Returns [] immediately for any pull that never reaches Limit Cut —
 * self-gating on the gaze debuffs.
 */
export function detectLimitCutErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[]
): PullError[] {
  const errors: PullError[] = [];

  let earliestGazeStart: number | undefined;

  for (const player of players) {
    const windows = collectGazeWindows(player);
    if (windows.length === 0) continue;

    for (const w of windows) {
      if (earliestGazeStart === undefined || w.start < earliestGazeStart) {
        earliestGazeStart = w.start;
      }
    }

    for (const death of deathEvents) {
      if (death.player !== player.name) continue;
      // Fall/environment deaths carry no killing ability; any real ability
      // id means something else killed them and Limit Cut is off the hook.
      if (death.killingAbilityGameId) continue;

      const window = windows.find(
        (w) => death.timestamp >= w.start && death.timestamp <= w.end + FALL_GRACE_WINDOW_MS
      );
      if (!window) continue;

      errors.push({
        ruleId:      LIMITCUT_PUSHED_OFF_RULE_ID,
        severity:    "Major",
        name:        "Pushed Off Arena",
        description: "Failed Limit Cut's facing check while holding the gaze debuff and was knocked off the arena.",
        timestamp:   death.timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   window.abilityId,
        abilityName: window.abilityName,
      });
    }
  }

  if (earliestGazeStart !== undefined) {
    errors.push(...detectDashErrors(players, deathEvents, earliestGazeStart));
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}

// ── Dash-set detection (see "THE DASH SET" in the module comment) ─────────

type DashHit = { player: PlayerInfo; timestamp: number; instance?: number; x?: number; y?: number };

const angleOf = (x: number, y: number) =>
  (Math.atan2(y - ARENA_CENTER, x - ARENA_CENTER) * 180 / Math.PI + 360) % 360;

const angularDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

const slotAngle = (slotIndex: number) =>
  (SLOT_BASE_DEG + SLOT_STEP_DEG * ((slotIndex % 8) + 8)) % 360;

const slotPoint = (slotIndex: number): [number, number] => {
  const rad = (slotAngle(slotIndex) * Math.PI) / 180;
  return [
    ARENA_CENTER + IDEAL_SLOT_RADIUS * Math.cos(rad),
    ARENA_CENTER + IDEAL_SLOT_RADIUS * Math.sin(rad),
  ];
};

/**
 * Fits the set's instance→slot progression from its single-victim dashes:
 * slotIndex(instance) = base + direction * (instance - 1), the consecutive
 * walk confirmed in every clean log. Returns undefined when the data
 * doesn't overwhelmingly agree on one progression.
 */
function fitSlotProgression(
  singleVictimDashes: Array<{ instance: number; angle: number }>
): ((instance: number) => number) | undefined {
  let best: { base: number; direction: 1 | -1; score: number } | undefined;

  for (const direction of [1, -1] as const) {
    for (let base = 0; base < 8; base++) {
      let score = 0;
      for (const d of singleVictimDashes) {
        const expected = slotAngle(base + direction * (d.instance - 1));
        if (angularDist(d.angle, expected) <= SLOT_SNAP_TOLERANCE_DEG) score++;
      }
      if (!best || score > best.score) best = { base, direction, score };
    }
  }

  // Demand near-unanimity: with 8 dashes and at most one broken, at least
  // 5 clean anchors must agree before the fit is trusted for attribution.
  if (!best || best.score < 5) return undefined;
  const { base, direction } = best;
  return (instance: number) => base + direction * (instance - 1);
}

function detectDashErrors(
  players:        PlayerInfo[],
  deathEvents:    DeathEvent[],
  gazeStart:      number
): PullError[] {
  const windowEnd = gazeStart + DASH_WINDOW_AFTER_GAZE_MS;

  const hits: DashHit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== DASH_ABILITY_ID) continue;
      if (e.timestamp < gazeStart || e.timestamp > windowEnd) continue;
      hits.push({ player, timestamp: e.timestamp, instance: e.sourceInstance, x: e.x, y: e.y });
    }
  }
  if (hits.length === 0) return [];

  const firstDashTime = Math.min(...hits.map((h) => h.timestamp));

  // A player who died between the gaze going out and the dash set AND was
  // never hit by a dash left their clone with no target — it re-fires at a
  // living player, always observed lethal. That whole situation is
  // deliberately unflagged (being dead may not be their fault, and when it
  // is, the death's root cause is already flagged; the re-target victim
  // had no say at all), and it scrambles who-gets-hit badly enough that
  // the positional analysis below can't be trusted either — so the entire
  // dash set is skipped. A player who died in the gap but WAS hit got
  // raised in time and soaked normally (observed twice) — that doesn't
  // disturb the set.
  const hitsByActor = new Map<number, DashHit[]>();
  for (const h of hits) {
    const list = hitsByActor.get(h.player.actorId) ?? [];
    list.push(h);
    hitsByActor.set(h.player.actorId, list);
  }

  const hitActorNames = new Set(
    [...hitsByActor.keys()].map((id) => players.find((p) => p.actorId === id)?.name)
  );
  // Whoever died between the gaze check and the dash set and was NEVER hit
  // by a dash was still dead when Limit Cut actually went off — the
  // mechanic can't resolve around a missing body (their clone has nobody
  // to dash), so this is raised as its own raid-wide error rather than
  // silently folded into whatever killed them originally (already flagged
  // elsewhere, e.g. LIMITCUT_PUSHED_OFF_RULE_ID for a failed facing check).
  // Also still skips the positional analysis below — a scrambled dash set
  // can't be trusted for attribution either way (see module comment).
  const deadPlayersMissingDash = [
    ...new Set(
      deathEvents
        .filter((d) => d.timestamp >= gazeStart && d.timestamp < firstDashTime && !hitActorNames.has(d.player))
        .map((d) => d.player)
    ),
  ];
  if (deadPlayersMissingDash.length > 0) {
    return deadPlayersMissingDash.map((player) => ({
      ruleId:      LIMITCUT_DEAD_DURING_MECHANIC_RULE_ID,
      severity:    "Raid",
      name:        "Dead During Limit Cut",
      description: `${player} was dead during Limit Cut. Mechanic unresolvable.`,
      timestamp:   firstDashTime,
      abilityId:   DASH_ABILITY_ID,
      abilityName: "Limit Cut Dash",
    }));
  }

  const errors: PullError[] = [];

  // Group victims per clone instance, deduped per player — a piercing dash
  // can log several damage records on one victim.
  const victimsByInstance = new Map<number, DashHit[]>();
  for (const h of hits) {
    if (h.instance === undefined) continue;
    const group = victimsByInstance.get(h.instance) ?? [];
    if (!group.some((g) => g.player.actorId === h.player.actorId)) group.push(h);
    victimsByInstance.set(h.instance, group);
  }

  // Slot fit from the clean single-victim dashes (see module comment).
  const singleVictimDashes: Array<{ instance: number; angle: number }> = [];
  for (const [instance, group] of victimsByInstance) {
    if (group.length !== 1) continue;
    const h = group[0];
    if (h.x === undefined || h.y === undefined) continue;
    singleVictimDashes.push({ instance, angle: angleOf(h.x, h.y) });
  }
  const slotIndexFor = fitSlotProgression(singleVictimDashes);

  // Each player's own slot: the fitted slot of the dash that hit only them.
  const ownSlotByActor = new Map<number, number>();
  if (slotIndexFor) {
    for (const [instance, group] of victimsByInstance) {
      if (group.length === 1) ownSlotByActor.set(group[0].player.actorId, slotIndexFor(instance));
    }
  }

  // Slots claimed by clean single-victim baits — anything left unclaimed
  // is where a mispositioned player SHOULD have been standing, which is
  // how a player who never soaked their own dash (they were clipped and
  // killed elsewhere first) still gets measured against a meaningful spot.
  const claimedSlots = new Set(
    [...ownSlotByActor.values()].map((s) => ((s % 8) + 8) % 8)
  );
  const distToOwnIdeal = (hit: DashHit): number | undefined => {
    if (hit.x === undefined || hit.y === undefined) return undefined;
    const ownSlot = ownSlotByActor.get(hit.player.actorId);
    if (ownSlot !== undefined) {
      const [ix, iy] = slotPoint(ownSlot);
      return Math.hypot(hit.x - ix, hit.y - iy);
    }
    // No slot of their own — measure against the nearest UNCLAIMED slot
    // (the most charitable reading of where they were supposed to be).
    let best: number | undefined;
    for (let s = 0; s < 8; s++) {
      if (claimedSlots.has(s)) continue;
      const [ix, iy] = slotPoint(s);
      const d = Math.hypot(hit.x - ix, hit.y - iy);
      if (best === undefined || d < best) best = d;
    }
    return best;
  };

  // A player who was alive for the whole dash set but never appears as a
  // victim of ANY instance is a different, more severe signature than a
  // single-instance slot mismatch: their own clone never found them at all
  // (they were far enough from every valid bait spot that no chord landed
  // on them), and its dash retargeted wholesale onto some unrelated player
  // instead. Confirmed 2026-07 (report G7kTFVxjcAC6p1MN pull 12, via the
  // analyzer.wtfdig.info kefka-lc view): the Samurai was assigned bait #3
  // but physically stood far off — never hit by any dash, then died to an
  // unrelated environmental "fall" ~1.3s after the last dash (the same
  // zero-ability-death signature as the gaze check's own knockback,
  // confirming they were standing well outside the arena's valid area).
  // Their own clone's chord instead landed on two OTHER players who were
  // each standing correctly at their own assigned slot (confirmed against
  // the fitted progression) — those are pure fallout of the missing
  // player's redirect, not their own positioning mistakes, so per this
  // module's own "never blame the victim who took a stray hit" standard
  // (see module comment) they must NOT be flagged. When a missing player
  // like this exists, the per-instance slot-mismatch attribution below is
  // untrustworthy for whoever the redirect actually hit, so it's skipped
  // entirely in favor of flagging the missing player directly.
  const hitActorIds = new Set(hits.map((h) => h.player.actorId));
  // Excludes anyone already dead before the dash set even started (e.g. a
  // wipe cascade earlier in the fight) — never having reached Limit Cut at
  // all isn't a positioning mistake.
  const deadBeforeDash = new Set(
    deathEvents.filter((d) => d.timestamp < firstDashTime).map((d) => d.player)
  );
  const missingPlayers = players.filter(
    (p) => !hitActorIds.has(p.actorId) && !deadBeforeDash.has(p.name)
  );
  const lastDashTime = Math.max(...hits.map((h) => h.timestamp));

  if (missingPlayers.length > 0) {
    for (const p of missingPlayers) {
      errors.push({
        ruleId:      LIMITCUT_WRONG_POSITION_RULE_ID,
        severity:    "Major",
        name:        "Wrong Dash Position",
        description: "Never received their own Limit Cut dash — stood far enough from their assigned bait spot that their clone retargeted onto another player instead.",
        timestamp:   lastDashTime,
        player:      p.name,
        class:       p.className,
        specId:      p.specId,
        role:        p.role,
        abilityId:   DASH_ABILITY_ID,
        abilityName: "Limit Cut Dash",
      });
    }
  } else if (slotIndexFor !== undefined) {
    // ── Wrong bait spot: a dash landing away from its fitted slot ─────────
    //
    // The dash follows its numbered player (see module comment), so a
    // single-victim dash landing far off the slot the progression assigns
    // to that instance means the victim stood at the wrong spot — the
    // confirmed case was a #6/#7 swap, both dashes landing 45° away on
    // each other's slots, one victim dying to the ~5x-amplified
    // mispositioned hit. Clean baits sit within ~8° of their slot; a swap
    // is 45° minimum, so the half-slot tolerance splits them with room on
    // both sides. Only trusted when every living player was hit exactly
    // once each (no missing player above) — otherwise the hit victim may
    // just be catching someone else's redirect (see above).
    for (const [instance, group] of victimsByInstance) {
      if (group.length !== 1) continue;
      const h = group[0];
      if (h.x === undefined || h.y === undefined) continue;

      const expectedSlot = slotIndexFor(instance);
      if (angularDist(angleOf(h.x, h.y), slotAngle(expectedSlot)) <= SLOT_SNAP_TOLERANCE_DEG) continue;

      const [ix, iy] = slotPoint(expectedSlot);
      const yalms = (Math.hypot(h.x - ix, h.y - iy) / 100).toFixed(1);
      errors.push({
        ruleId:      LIMITCUT_WRONG_POSITION_RULE_ID,
        severity:    "Major",
        name:        "Wrong Dash Position",
        description: `Took their Limit Cut dash while standing at another number's bait spot (~${yalms} yalms from their assigned position) — a mispositioned dash hits several times harder and drags its path across the arena.`,
        timestamp:   h.timestamp,
        player:      h.player.name,
        class:       h.player.className,
        specId:      h.player.specId,
        role:        h.player.role,
        abilityId:   DASH_ABILITY_ID,
        abilityName: "Limit Cut Dash",
      });
    }
  }

  // ── Clipped dashes: one clone striking 2+ living players ────────────────
  for (const group of victimsByInstance.values()) {
    if (group.length < 2) continue;

    // Without a slot fit or positions there is no way to tell a genuine
    // clip from re-target fallout, and the one thing this rule must never
    // do is blame a fallout victim — so unmeasurable groups are skipped.
    if (slotIndexFor === undefined) continue;
    type Scored = { hit: DashHit; deviation: number | undefined };
    const scored: Scored[] = group.map((hit) => ({ hit, deviation: distToOwnIdeal(hit) }));
    if (scored.some((s) => s.deviation === undefined)) continue;

    // Attribute only when some victim is CLEARLY out of position. When
    // every victim stands inside the clean bait band, the dash came to
    // them — the re-fire of a clone whose assigned player was missing
    // (dead, or already killed by their own positioning error) — which is
    // fallout, not a new mistake (see module comment). Otherwise blame
    // whoever strayed farthest from their own slot: the intended target
    // dragging the lane and a wanderer walking into it look the same from
    // the victim list, and this is what tells them apart.
    const maxDev = Math.max(...scored.map((s) => s.deviation!));
    if (maxDev < CLIP_MIN_CULPRIT_DEV) continue;
    const culprits = scored.filter((s) => s.deviation! > maxDev - CLIP_ATTRIBUTION_MARGIN);

    for (const culprit of culprits) {
      const others = group
        .filter((g) => g.player.actorId !== culprit.hit.player.actorId)
        .map((g) => g.player.name)
        .join(", ");
      const yalms =
        culprit.deviation !== undefined ? ` (~${(culprit.deviation / 100).toFixed(1)} yalms off their spot)` : "";
      errors.push({
        ruleId:      LIMITCUT_DASH_CLIP_RULE_ID,
        severity:    "Major",
        name:        "Out Of Position For Dash",
        description: `Was out of position during the Limit Cut dashes${yalms}, putting multiple players in one dash's path (also hit: ${others}) — the extra, vulnerability-amplified hit is usually lethal.`,
        timestamp:   culprit.hit.timestamp,
        player:      culprit.hit.player.name,
        class:       culprit.hit.player.className,
        specId:      culprit.hit.player.specId,
        role:        culprit.hit.player.role,
        abilityId:   DASH_ABILITY_ID,
        abilityName: "Limit Cut Dash",
      });
    }
  }

  return errors;
}
