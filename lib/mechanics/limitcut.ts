// lib/mechanics/limitcut.ts
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

export const LIMITCUT_PUSHED_OFF_RULE_ID = "ffxiv-limitcut-pushed-off-arena";

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

  for (const player of players) {
    const windows = collectGazeWindows(player);
    if (windows.length === 0) continue;

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

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
