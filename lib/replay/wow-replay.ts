// lib/replay/wow-replay.ts
//
// Top-down replay of one WoW pull: turns raw Warcraft Logs events into the
// same ReplayData the FFXIV replay draws (lib/replay/ffxiv-replay.ts), so
// components/ReplayPanel.tsx, poseAt, fitReplayView and playerVitalsAt work
// unchanged. lib/wcl-client.ts's fetchWowReplayData fetches the events.
//
// ── WHERE THE POSITIONS COME FROM ─────────────────────────────────────────
//
// With `dataType: All, includeResources: true`, WCL attaches ONE flat
// resource block (x, y, facing, hitPoints, maxHitPoints, classResources, …)
// to cast, damage, heal and resourcechange events, plus `resourceActor`:
// 1 = the block is the SOURCE's, 2 = the TARGET's. So each event places one
// actor, unlike FFLogs' two. Measured on 19WyTrzgQRvdc4Z8 fight 5 (Vashnik
// kill, first 60s): players get 4–8 samples a second (their casts and
// resourcechanges, heals they receive, damage they take); the boss gets
// ~300 a second (every hit on it), so enemy tracks are thinned to one
// sample per ENEMY_SAMPLE_MS. Enemy casts carry no resources at all.
// begincast events carry no `duration`: the cast time is the gap to the
// matching cast.
//
// ── UNITS AND AXES (measured 2026-10-17) ──────────────────────────────────
//
// x/y are yards × 100. WCL's x is the game's world −Y (EAST) and its y is
// world X (NORTH): the same pull's positions (x 242–351y, y 389–486y) fall
// inside UiMap 2608's UiMapAssignment bounds (world X 265–885, Y −802–127)
// only that way round. So +y is NORTH, the opposite of FFLogs; this file
// negates y so the track is in FFLogs' screen convention (+y south) and
// everything downstream draws north up. The tooltip negates it back.
//
// `facing` is centi-radians with math angle (from +x toward +y north) =
// −facing/100; range −786 … −158. Checked on the same pull: 1242 player
// casts on Vashnik, the direction from caster to boss minus that angle
// clusters within ±20° of 0; and Vashnik's auto-attacks land on a target
// within 30° of its facing 30 times out of 42. Expressed as a compass
// bearing that is facing·180/π/100 + 90 — exactly geometry.ts's
// facingToCompassBearing for FFLogs, so the raw value is stored and the
// panel's conversion holds. Not yet confirmed against a VOD.

import type { ReplayActor, ReplayCast, ReplayData, ReplayHit, ReplaySample } from "@/lib/replay/ffxiv-replay";
import { WOW_AURA_SHAPES } from "@/lib/replay/wow-shapes";

/**
 * Server-side filter for the replay fetch: the event types that carry
 * resources, plus casts and deaths, plus the few debuffs the replay draws
 * as shapes (wow-shapes.ts).
 */
export const WOW_REPLAY_EVENT_FILTER =
  `type in ("cast", "begincast", "damage", "heal", "resourcechange", "death")` +
  ` or (type in ("applydebuff", "removedebuff") and ability.id in (${Object.keys(WOW_AURA_SHAPES).join(", ")}))`;

const ENEMY_SAMPLE_MS = 200;
// A begincast with no matching cast within this is an interrupted or
// cancelled cast: it gets no bar. Long enough for Vashnik's 85s Malignance.
const MAX_CAST_MS = 90000;

/** The fields of a raw WCL event the replay reads. */
export type WowReplayRawEvent = {
  timestamp:       number;
  type:            string;
  sourceID?:       number;
  sourceInstance?: number;
  targetID?:       number;
  targetInstance?: number;
  abilityGameID?:  number;
  resourceActor?:  number;
  x?: number; y?: number; facing?: number;
  hitPoints?: number; maxHitPoints?: number;
  classResources?: { amount: number; max: number; type: number }[];
};

/** masterData actor fields the replay reads. */
export type WowReplayActorInfo = {
  id: number; name: string; type: string; subType: string;
  petOwner?: number | null; gameID?: number; icon?: string;
};

/** WCL's actor icon as an image URL: "custom-icon-<name>.jpg" is an ability icon; anything else gets FFLogs' generic Boss / NPC art (WCL has no WoW copy). */
export function wowEnemyIconUrl(icon: string | undefined): string {
  const m = icon?.match(/^custom-icon-(.+)$/);
  if (m) return `https://assets.rpglogs.com/img/warcraft/abilities/${m[1]}`;
  return `https://assets.rpglogs.com/img/ff/icons/${icon === "Boss" ? "Boss" : "NPC"}.png`;
}

/** Blizzard's power bar colours for the roster's second bar, by power type. */
export const WOW_POWER_COLORS: Record<number, string> = {
  0: "#3d7bff",   // mana
  1: "#e5534b",   // rage
  2: "#ff8040",   // focus
  3: "#f2d43a",   // energy
  6: "#00d1ff",   // runic power
  8: "#4d85e6",   // astral power
  11: "#0080ff",  // maelstrom
  13: "#9b4dff",  // insanity
  17: "#c942fd",  // fury
  18: "#ff9c00",  // pain
};

export function buildWowReplayData(
  reportCode:   string,
  fightId:      number,
  fightStartMs: number,
  fightEndMs:   number,
  events:       WowReplayRawEvent[],
  actors:       WowReplayActorInfo[],
  abilityNames: Map<number, string> = new Map(),
  mapName?:     string,
): ReplayData {
  const actorById = new Map(actors.map((a) => [a.id, a]));
  const isPlayer = (a: WowReplayActorInfo | undefined) => a?.type === "Player";
  // Player pets and guardians (petOwner a player) are left out; boss adds
  // that WCL types "Pet" have no player owner and count as enemies.
  const isPet = (a: WowReplayActorInfo | undefined) =>
    !!a && a.type !== "Player" && a.petOwner != null && isPlayer(actorById.get(a.petOwner));
  const isEnemy = (a: WowReplayActorInfo | undefined) => !!a && a.id >= 0 && !isPlayer(a) && !isPet(a);
  const keyFor = (id: number, instance: number | undefined, player: boolean) =>
    player || !instance || instance <= 1 ? String(id) : `${id}.${instance}`;

  const byKey = new Map<string, ReplayActor>();
  const powerVotes = new Map<string, Map<number, number>>();
  const damagedEnemies = new Set<string>();
  const deaths: [number, string][] = [];
  const enemyCasts: ReplayCast[] = [];
  const enemyHits: ReplayHit[] = [];
  const hitNames: Record<number, string> = {};
  const enemyAuras: [number, number, string, 0 | 1][] = [];
  // Open begincasts by "sourceKey:ability", for the cast time.
  const openCasts = new Map<string, number>();

  for (const e of events) {
    if (e.timestamp < fightStartMs || e.timestamp > fightEndMs) continue;
    const t = e.timestamp - fightStartMs;
    const src = e.sourceID !== undefined ? actorById.get(e.sourceID) : undefined;
    const dst = e.targetID !== undefined && e.targetID >= 0 ? actorById.get(e.targetID) : undefined;

    // ── The one actor this event places ──
    if (e.x !== undefined && e.y !== undefined && (e.resourceActor === 1 || e.resourceActor === 2)) {
      const onSource = e.resourceActor === 1;
      const a = onSource ? src : dst;
      const inst = onSource ? e.sourceInstance : e.targetInstance;
      if (a && a.id >= 0 && !isPet(a)) {
        const player = isPlayer(a);
        const key = keyFor(a.id, inst, player);
        let track = byKey.get(key);
        if (!track) {
          track = {
            key, actorId: a.id,
            name: inst && inst > 1 && !player ? `${a.name} ${inst}` : a.name,
            kind: player ? "player" : "enemy",
            ...(player ? { job: a.subType } : { gameId: a.gameID, icon: a.icon }),
            samples: [],
          };
          byKey.set(key, track);
        }
        const hp = e.maxHitPoints ? Math.max(0, Math.min(1, (e.hitPoints ?? 0) / e.maxHitPoints)) : -1;
        const res = e.classResources?.[0];
        const mp = res && res.max > 0 ? Math.max(0, Math.min(1, res.amount / res.max)) : -1;
        if (player && res) {
          let votes = powerVotes.get(key);
          if (!votes) powerVotes.set(key, (votes = new Map()));
          votes.set(res.type, (votes.get(res.type) ?? 0) + 1);
        }
        track.samples.push([t, e.x, -e.y, e.facing ?? 0, hp, mp]);
      }
    }

    if (e.type === "death" && dst && e.targetID !== undefined) {
      deaths.push([t, keyFor(e.targetID, e.targetInstance, isPlayer(dst))]);
    }
    if ((e.type === "applydebuff" || e.type === "removedebuff") && dst && e.abilityGameID !== undefined && e.abilityGameID in WOW_AURA_SHAPES) {
      enemyAuras.push([t, e.abilityGameID, keyFor(dst.id, e.targetInstance, isPlayer(dst)), e.type === "applydebuff" ? 1 : 0]);
    }

    // ── Enemy casts: a bar from begincast to cast, a flash on the cast ──
    if ((e.type === "begincast" || e.type === "cast") && e.sourceID !== undefined && e.abilityGameID !== undefined && isEnemy(src)) {
      const name = abilityNames.get(e.abilityGameID);
      // Auto-attacks and unnamed server-side helpers are noise in a cast list.
      if (name && !/^(melee|attack|auto attack|\d+)$/i.test(name)) {
        const sourceKey = keyFor(e.sourceID, e.sourceInstance, false);
        const castKey = `${sourceKey}:${e.abilityGameID}`;
        const targetKey = dst ? keyFor(e.targetID!, e.targetInstance, isPlayer(dst)) : "";
        if (e.type === "begincast") {
          openCasts.set(castKey, enemyCasts.length);
          enemyCasts.push([t, sourceKey, name, 0, e.abilityGameID, targetKey]);
        } else {
          const open = openCasts.get(castKey);
          if (open !== undefined) {
            const begin = enemyCasts[open];
            if (t - begin[0] <= MAX_CAST_MS) begin[3] = t - begin[0];
            openCasts.delete(castKey);
          }
          enemyCasts.push([t, sourceKey, name, 0, e.abilityGameID, targetKey]);
        }
      }
    }

    if (e.type === "damage" && src && dst && e.abilityGameID !== undefined) {
      // Enemy hits that landed on a player, for AoE work. Only one side's
      // position rides on the event; the other is null.
      if (isEnemy(src) && isPlayer(dst)) {
        const s = e.resourceActor === 1 && e.x !== undefined, d = e.resourceActor === 2 && e.x !== undefined;
        enemyHits.push([t, e.abilityGameID, keyFor(src.id, e.sourceInstance, false), String(dst.id),
          s ? e.x! : null, s ? -e.y! : null, d ? e.x! : null, d ? -e.y! : null]);
        const name = abilityNames.get(e.abilityGameID);
        if (name) hitNames[e.abilityGameID] = name;
      }
      if ((isPlayer(src) || isPet(src)) && isEnemy(dst)) damagedEnemies.add(keyFor(dst.id, e.targetInstance, false));
    }
  }

  const out: ReplayActor[] = [];
  for (const track of byKey.values()) {
    track.samples.sort((a, b) => a[0] - b[0]);
    const kept: ReplaySample[] = [];
    for (const s of track.samples) {
      const last = kept[kept.length - 1];
      if (last && last[0] === s[0]) { kept[kept.length - 1] = s; continue; }
      if (last && last[1] === s[1] && last[2] === s[2] && last[3] === s[3] && last[4] === s[4] && last[5] === s[5]) continue;
      if (last && track.kind === "enemy" && s[0] - last[0] < ENEMY_SAMPLE_MS) continue;
      kept.push(s);
    }
    // A death leaves the actor where it last stood at 0 HP: dead players
    // log nothing until they're battle-rezzed.
    for (const [dt, key] of deaths) {
      if (key !== track.key) continue;
      let i = kept.length;
      while (i > 0 && kept[i - 1][0] > dt) i--;
      const prev = kept[i - 1] ?? kept[i];
      if (prev) kept.splice(i, 0, [dt, prev[1], prev[2], prev[3], 0, prev[5]]);
    }
    track.samples = kept;
    if (track.kind === "enemy") track.targetable = damagedEnemies.has(track.key);
    const votes = powerVotes.get(track.key);
    if (votes) track.powerType = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    out.push(track);
  }
  out.sort((a, b) => (a.kind === b.kind ? a.actorId - b.actorId : a.kind === "player" ? -1 : 1));

  return {
    version: 1, game: "wow", reportCode, fightId, durationMs: fightEndMs - fightStartMs,
    actors: out, map: null, mapName, enemyCasts, enemyHits, abilityNames: hitNames, enemyAuras,
  };
}
