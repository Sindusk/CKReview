// lib/local-log/act-report.ts
//
// Turns an ACT / IINACT network log into the same report the FFLogs import
// produces (FFLReport + one FFLFightData per pull, lib/ffl-client.ts), so
// every detection module, the statics import and the replay run on it
// unchanged. Runs in the browser on the user's file (lib/local-log/
// read-lines.ts streams it); nothing is uploaded. FFLogs builds its reports
// from these same lines, so this file redoes the part of FFLogs' parser the
// app reads. Line layouts are in LINE FIELDS below; the field indices count
// the line split on "|" (f[0] the type, f[1] the timestamp).
//
// ── WHAT IT REPRODUCES ────────────────────────────────────────────────────
//
// - Actors. Players are one actor per name + job (FFLogs splits a job
//   swap the same way); pets carry petOwner. Enemies are grouped like
//   FFLogs: one actor per name + BNpcBase id (`gameID`), each spawned copy
//   an instance, numbered per pull from 1 (FFLogs' sourceInstance /
//   targetInstance: towers, black holes, clones). Actor ids are small
//   integers in order of appearance; "E0000000" (no source) is -1.
// - Pulls. A pull runs from the first hostile action after the game's
//   combat flag turns on (line 260) to the director's wipe (33 40000005) or
//   victory (40000002/3), or the combat flag turning off. Kill = victory,
//   or the encounter boss dying with no wipe. Only pulls in duty zones (a
//   director 40000001 seen there) count; open-world fights don't.
// - Fight names. FFLogs names a fight by encounter, which detection keys on
//   (lib/mechanics/module-names.ts): ultimates by zone (ZONE_ENCOUNTERS),
//   everything else by the enemy that took the most player damage
//   ("Vamp Fatale", "Lindwurm II"), which is FFLogs' name for every savage
//   and extreme fight the app has.
// - Hits. Each ability line (21 single target, 22 one line per target)
//   holds the hit; its EffectResult (37, same target and sequence number)
//   is when it lands. A paired hit becomes FFLogs' "damage" / "heal" at
//   the landing time with the post-hit HP; an unpaired one stays a
//   "calculateddamage" with `unpaired: true`, as FFLogs does for a hit
//   absorbed to 0. Damage values decode as FFLogs and cactbot do (DAMAGE
//   VALUES below). DoT/HoT ticks (24) are `tick: true`.
// - Statuses (26 apply, 30 remove) as apply / refresh / stack / remove,
//   ids as FFLogs' 1000000 + status id. Buff vs debuff isn't in the log:
//   a status an enemy or the environment applied is a debuff, one a player
//   or pet applied to an enemy is a debuff, the rest are buffs. The
//   per-hit `buffs` list is the statuses up on the target at the hit.
//   `extraInfo` is the status line's parameter (Dancing Mad P4's real/fake
//   bit, kefka-says.ts).
// - Head markers (27), tethers (35), deaths (25, killing ability = the
//   last hit that landed on the player), casts (20 begincast with its
//   cast time; 21/22 as one "cast" per action, not per target).
// - Phases: Dancing Mad only (DANCING_MAD_PHASES); other encounters get
//   no phase data, which lib/pull-phases.ts treats as unknown.
// - Replay positions: every resource snapshot plus OverlayPlugin's
//   position lines (261 CombatantMemory, 270 ActorMove, 271 ActorSetPos),
//   which FFLogs doesn't have, so local replays are denser than FFLogs'.
//
// ── NOT REPRODUCED (absent fields; their readers already tolerate it) ────
//
// FFLogs' mitigation breakdown (absorbed, mitigated, unmitigatedAmount,
// multiplier), shield "absorbed" events, simulated crit / DH stats for
// players other than the recorder, damage-done potency estimates, and
// ability icons. `amount` is the hit's full value: shields aren't
// subtracted. The Mitigation and Damage dialogs are therefore rougher on a
// local log than on FFLogs.
//
// ── LINE FIELDS (checked on the user's IINACT 2.10 logs, 2026-07 to 11) ──
//
//   01 zone      f2 zone id hex, f3 zone name
//   02 primary   f2 id, f3 name (the recorder)
//   03 add       f2 id, f3 name, f4 job hex, f6 owner id, f9 BNpcName,
//                f10 BNpcBase, f11/12 hp/max, f13/14 mp/max, f17-20 x y z heading
//   12 stats     the recorder's: f9 direct hit, f10 crit, f13 det, f14 sks, f15 sps
//   20 begincast f2 src, f4 ability hex, f5 name, f6 target, f8 cast secs, f9-12 pos
//   21/22 hit    f2 src, f4 ability hex, f5 name, f6 target, f8-f23 eight
//                (flags, value) effects, f24-27 target hp/max/mp/max,
//                f30-33 target x y z heading, f34-37 source hp/max/mp/max,
//                f40-43 source pos, f44 sequence, f45 target index
//   24 tick      f2 target, f4 "DoT"/"HoT", f5 status hex, f6 value hex,
//                f7/8 hp/max, f13-16 pos, f17 source
//   25 death     f2 target, f4 source
//   26/30 status f2 status hex, f3 name, f4 secs, f5 src, f7 target, f9 param hex
//   27 marker    f2 target, f6 marker id hex
//   33 director  f3 command (40000001 commence, 40000005 wipe, 40000002/3 victory)
//   35 tether    f2 source, f4 target, f8 tether id hex
//   37 result    f2 target, f4 sequence, f5-8 hp/max/mp/max, f11-14 pos
//   40 map       f2 map id (decimal: XIVAPI's Map row)
//   260 combat   f3 in-game combat 0/1
//   261 memory   Add/Change|id|key|value...: PosX PosY PosZ Heading
//   270/271 move f2 id, f3 heading, f6-8 x y z
//
// ── DAMAGE VALUES ─────────────────────────────────────────────────────────
//
// An effect is (flags, value). flags & 0xFF is the kind: 0x03 damage, 0x05
// blocked, 0x06 parried, 0x04 heal (others: miss, status, no effect).
// (flags >> 16) & 0x0F is the attack type: 1-4 physical, 5 magic, 6
// unaspected ("darkness"). Crit is flags & 0x2000, direct hit 0x4000. The
// value is 0xAABBCCDD: amount (AA << 8) | BB, unless CC has 0x40, a hit
// over 65535: (DD << 16) | (AA << 8) | BB.

import type {
  FFLActor, FFLBuffEvent, FFLCastEvent, FFLCombatantInfoEvent, FFLDamageEvent, FFLDeathEvent,
  FFLDebuffEvent, FFLFight, FFLFightData, FFLGameAbility, FFLHealEvent, FFLHeadMarkerEvent, FFLReport, FFLTetherEvent,
} from "@/lib/ffl-client";
import type { EncounterPhase } from "@/lib/pull-phases";
import type { ReplayRawEvent } from "@/lib/replay/ffxiv-replay";
import { PLAYER_BUFF_STATUS_IDS } from "@/lib/damage/ffxiv/buff-stream";
import { parseActTimestamp, readLogLines } from "./read-lines";
import { waymarkEventFromLine, type WaymarkEvent } from "@/lib/replay/waymarks";

// ─── Public types ────────────────────────────────────────────────────────────

/** One duty visit in the log, from the quick scan (scanActLog). */
export type ActZoneVisit = {
  zoneId:   number;
  zone:     string;
  start:    number;   // epoch ms
  end:      number;
  pulls:    number;   // combat spans while in the duty
};

/** What one parse produces. Timestamps in `report` are ms from `report.startTime`. */
export type ActLogImport = {
  report:        FFLReport;
  fightDataList: FFLFightData[];
  // Per fight: the replay's raw events (lib/replay/ffxiv-replay.ts) and its map id.
  replay:        Map<number, { events: ReplayRawEvent[]; mapId: number | null }>;
  actors:        FFLActor[];   // with gameID / icon, for the replay
  waymarks:      WaymarkEvent[];
  fileStart:     number;
  fileEnd:       number;
};

// ─── Encounter tables ────────────────────────────────────────────────────────

const DANCING_MAD_PHASE_LIST: EncounterPhase[] = [
  { id: 1, name: "P1: Kefka", isIntermission: false },
  { id: 2, name: "P2: Forsaken Kefka", isIntermission: false },
  { id: 3, name: "P3: Exdeath and Chaos", isIntermission: false },
  { id: 4, name: "P4: Kefka Says", isIntermission: false },
  { id: 5, name: "P5: Ultima Kefka", isIntermission: false },
];

/** Ultimates FFLogs names by encounter rather than by boss. */
const ZONE_ENCOUNTERS: Record<string, { name: string; encounterID?: number; phases?: EncounterPhase[] }> = {
  "Dancing Mad (Ultimate)":           { name: "Dancing Mad", encounterID: 1085, phases: DANCING_MAD_PHASE_LIST },
  "Futures Rewritten (Ultimate)":     { name: "Futures Rewritten", encounterID: 1079 },
  "The Omega Protocol (Ultimate)":    { name: "The Omega Protocol" },
  "The Epic of Alexander (Ultimate)": { name: "The Epic of Alexander" },
  "Dragonsong's Reprise (Ultimate)":  { name: "Dragonsong's Reprise" },
  // AAC Heavyweight savage floors whose top enemy isn't FFLogs' encounter
  // name (M2S's boss logs as "Red Hot"). M4S holds two encounters
  // (Lindwurm, Lindwurm II) and keeps the per-pull boss name.
  "AAC Heavyweight M1 (Savage)":      { name: "Vamp Fatale" },
  "AAC Heavyweight M2 (Savage)":      { name: "Red Hot and Deep Blue" },
  "AAC Heavyweight M3 (Savage)":      { name: "The Tyrant" },
};

// FFXIV ClassJob ids -> FFLogs' subType. Base classes read as their job.
const JOBS: Record<number, string> = {
  1: "Paladin", 2: "Monk", 3: "Warrior", 4: "Dragoon", 5: "Bard", 6: "WhiteMage", 7: "BlackMage",
  19: "Paladin", 20: "Monk", 21: "Warrior", 22: "Dragoon", 23: "Bard", 24: "WhiteMage", 25: "BlackMage",
  26: "Summoner", 27: "Summoner", 28: "Scholar", 29: "Ninja", 30: "Ninja", 31: "Machinist", 32: "DarkKnight",
  33: "Astrologian", 34: "Samurai", 35: "RedMage", 36: "BlueMage", 37: "Gunbreaker", 38: "Dancer",
  39: "Reaper", 40: "Sage", 41: "Viper", 42: "Pictomancer",
};

const PLAYER_BUFF_IDS = new Set(PLAYER_BUFF_STATUS_IDS);
// A landed hit's EffectResult arrives within ~1s; past this the preview is unpaired.
const PAIR_WINDOW_MS = 4000;

// ─── Small helpers ───────────────────────────────────────────────────────────

const hex = (s: string | undefined) => (s ? parseInt(s, 16) : NaN);
const num = (s: string | undefined) => (s === undefined || s === "" ? NaN : Number(s));
const isPlayerId = (id: string) => id.startsWith("10");
const isNone = (id: string | undefined) => !id || id === "E0000000" || id === "00" || id === "0";

/** Decodes an effect's value field into an amount (see DAMAGE VALUES). */
export function decodeAmount(value: string): number {
  const v = parseInt(value.padStart(8, "0"), 16) >>> 0;
  const a = (v >>> 24) & 0xff, b = (v >>> 16) & 0xff, c = (v >>> 8) & 0xff, d = v & 0xff;
  return c & 0x40 ? (d << 16) | (a << 8) | b : (a << 8) | b;
}

/** FFLogs' damage type string from an effect's flags (1-4 physical, 5 magic, else unaspected). */
function damageType(flags: number): string {
  const t = (flags >>> 16) & 0x0f;
  return t >= 1 && t <= 4 ? "128" : t === 5 ? "1024" : "32";
}

type Res = { x?: number; y?: number; facing?: number; hitPoints?: number; maxHitPoints?: number; mp?: number; maxMP?: number };
function res(hp: string, maxHp: string, mp: string, maxMp: string, x: string, y: string, h: string): Res {
  const r: Res = {};
  const X = num(x), Y = num(y), H = num(h), HP = num(hp), MHP = num(maxHp), MP = num(mp), MMP = num(maxMp);
  if (Number.isFinite(X) && Number.isFinite(Y)) { r.x = Math.round(X * 100); r.y = Math.round(Y * 100); }
  if (Number.isFinite(H)) r.facing = Math.round(H * 100);
  if (Number.isFinite(HP)) r.hitPoints = HP;
  if (Number.isFinite(MHP) && MHP > 0) r.maxHitPoints = MHP;
  if (Number.isFinite(MP)) r.mp = MP;
  if (Number.isFinite(MMP) && MMP > 0) r.maxMP = MMP;
  return r;
}

// ─── Quick scan: which duties are in the file ───────────────────────────────

/** Lists the duties in the log and how many pulls each had (reads only lines 01, 33, 260). */
export async function scanActLog(file: Blob, onProgress?: (f: number) => void): Promise<ActZoneVisit[]> {
  const visits: ActZoneVisit[] = [];
  let cur: (ActZoneVisit & { duty: boolean }) | null = null;
  let inCombat = false;
  await readLogLines(file, (f) => {
    const t = parseActTimestamp(f[1]);
    if (!Number.isFinite(t)) return;
    if (f[0] === "01") {
      if (cur?.duty) visits.push({ zoneId: cur.zoneId, zone: cur.zone, start: cur.start, end: t, pulls: cur.pulls });
      cur = { zoneId: hex(f[2]), zone: f[3] ?? "", start: t, end: t, pulls: 0, duty: false };
      inCombat = false;
    } else if (!cur) {
      return;
    } else if (f[0] === "33" && f[3] === "40000001") {
      cur.duty = true;
    } else if (f[0] === "260") {
      const c = f[3] === "1";
      if (c && !inCombat && cur.duty) cur.pulls++;
      inCombat = c;
    }
    if (cur) cur.end = t;
  }, { wanted: new Set(["01", "33", "260"]), onProgress });
  const last = cur as (ActZoneVisit & { duty: boolean }) | null;
  if (last?.duty) visits.push({ zoneId: last.zoneId, zone: last.zone, start: last.start, end: last.end, pulls: last.pulls });
  return visits.filter((v) => v.pulls > 0);
}

// ─── Full parse ──────────────────────────────────────────────────────────────

type Combatant = {
  act: string; name: string; job: number; owner: string; bnpcBase: number;
  hp: number; maxHp: number;
};

type ActorKey = string;   // players: "p|name|job"; pets: "pet|actId"; enemies: "e|name|base"

type PendingHit = {
  t: number; src: string; tgt: string; ability: number; name: string;
  kind: "damage" | "heal"; amount: number; flags: number; srcRes: Res; tgtRes: Res;
  buffs: string; hpBefore: number;
};

type FightBuild = {
  id: number;
  start: number; end: number;                     // epoch ms
  combatStart: number;
  firstAction: number | null;
  zone: string; mapId: number | null;
  kill: boolean; wiped: boolean;
  instances: Map<string, number>;                 // ACT enemy id -> instance within this pull
  instanceCount: Map<number, number>;             // FFLogs actor id -> instances so far
  players: Set<number>;
  enemyDamage: Map<number, number>;               // actor id -> player damage taken
  data: Omit<FFLFightData, "fight" | "actors">;
  replay: ReplayRawEvent[];
  // ACT player id -> the landed hit that took them to 0 HP (the killing
  // blow; a death with none in the last 6s is environmental, as FFLogs has it).
  lastHit: Map<string, { ability: number; t: number }>;
  bossDeaths: Set<number>;
  statuses: RawStatus[];
  combatSeen: boolean;          // the game's combat flag came on
  endAt: number | null;         // epoch ms: wipe / victory + 6s, the latest end
};

type RawStatus = {
  t: number; sid: number; srcId: number; tgtId: number; tgtInst?: number;
  friendlySrc: boolean; friendlyTgt: boolean;
  op: "apply" | "refresh" | "stack" | "remove"; param: number; duration?: number;
};

/**
 * Parses the duty visits in `visits` (from scanActLog) into one report.
 * `code` becomes the report code (a local id, see localLogCode).
 */
export async function parseActLog(
  file: Blob,
  visits: ActZoneVisit[],
  code: string,
  opts: {
    title?: string;
    onProgress?: (f: number) => void;
    // The game's StatusCategory (1 beneficial, 2 detrimental) per status
    // id, which says buff from debuff (lib/local-log/status-categories.ts).
    statusCategories?: (ids: number[]) => Promise<Map<number, number>>;
    // Item names by Item row id, for the potions and food the log names
    // "item_<hex>" (FFLogs: "Grade 4 Gemdraught of Strength [HQ]").
    itemNames?: (ids: number[]) => Promise<Map<number, string>>;
  } = {},
): Promise<ActLogImport> {
  const windows = visits.map((v) => [v.start, v.end] as const).sort((a, b) => a[0] - b[0]);
  const inWindow = (t: number) => windows.some(([a, b]) => t >= a && t <= b);

  // ── State across the file ──
  const combatants = new Map<string, Combatant>();
  const actorIdByKey = new Map<ActorKey, number>();
  const actors: FFLActor[] = [{ id: -1, name: "Environment", type: "NPC", subType: "NPC", petOwner: null }];
  const abilities = new Map<number, FFLGameAbility>();
  const statusIds = new Set<number>();
  // Unnamed enemy actions ("unknown_c252"): per caster + ability, when each
  // use landed and whether any hit more than one target (AUTO-ATTACKS).
  const unnamedUses = new Map<string, { ability: number; times: number[]; multi: boolean }>();
  // Statuses up per ACT id: status id -> { param, source }
  const statuses = new Map<string, Map<number, { param: number; source: string }>>();
  const waymarks: WaymarkEvent[] = [];
  let recorder = "";
  let recorderStats: Partial<FFLCombatantInfoEvent> = {};
  let zone = "";
  let mapId: number | null = null;
  let duty = false;
  let inCombat = false;
  let fileStart = NaN, fileEnd = NaN;
  let reportStart = NaN;
  const fights: FightBuild[] = [];
  let fight: FightBuild | null = null;
  const pending = new Map<string, PendingHit[]>();   // "target|sequence"

  const rel = (t: number) => t - reportStart;

  function ability(id: number, name: string, type?: string) {
    const a = abilities.get(id);
    if (!a) abilities.set(id, { gameID: id, name, ...(type ? { type } : {}) });
    else if (type && !a.type) a.type = type;
  }

  function actorFor(act: string): number {
    if (isNone(act)) return -1;
    const c = combatants.get(act);
    let key: ActorKey;
    let make: () => FFLActor;
    if (isPlayerId(act)) {
      const job = c?.job ?? 0;
      key = `p|${c?.name ?? act}|${job}`;
      make = () => ({ id: 0, name: c?.name ?? act, type: "Player", subType: JOBS[job] ?? "Unknown", petOwner: null, icon: JOBS[job] ?? "Unknown" });
    } else if (c && !isNone(c.owner) && isPlayerId(c.owner)) {
      key = `pet|${act}`;
      make = () => ({ id: 0, name: c.name, type: "Pet", subType: "Pet", petOwner: actorFor(c.owner) });
    } else {
      key = `e|${c?.name ?? act}|${c?.bnpcBase ?? 0}`;
      make = () => ({ id: 0, name: c?.name ?? "", type: "NPC", subType: c?.name ? "NPC" : "Unknown", petOwner: null, gameID: c?.bnpcBase || undefined, icon: "NPC" });
    }
    let id = actorIdByKey.get(key);
    if (id === undefined) {
      id = actors.length;
      actorIdByKey.set(key, id);
      actors.push({ ...make(), id });
    }
    return id;
  }

  /** FFLogs-style instance of an enemy within the current pull (undefined for players/pets). */
  function instanceOf(act: string, actorId: number): number | undefined {
    if (!fight || isNone(act) || isPlayerId(act)) return undefined;
    if (actors[actorId]?.type === "Pet") return undefined;
    let n = fight.instances.get(act);
    if (n === undefined) {
      n = (fight.instanceCount.get(actorId) ?? 0) + 1;
      fight.instanceCount.set(actorId, n);
      fight.instances.set(act, n);
    }
    return n;
  }

  const isFriendly = (act: string) => {
    if (isPlayerId(act)) return true;
    const c = combatants.get(act);
    return !!c && !isNone(c.owner) && isPlayerId(c.owner);
  };

  function buffsOn(act: string): string {
    const s = statuses.get(act);
    if (!s || s.size === 0) return "";
    return [...s.keys()].map((id) => `${1000000 + id}.`).join("");
  }

  function startFight(t: number) {
    fight = {
      id: fights.length + 1, start: t, end: t, combatStart: t, firstAction: null, zone, mapId,
      kill: false, wiped: false, instances: new Map(), instanceCount: new Map(), players: new Set(),
      enemyDamage: new Map(), replay: [], lastHit: new Map(), bossDeaths: new Set(), statuses: [],
      combatSeen: false, endAt: null,
      data: {
        deathEvents: [], combatantInfos: [], castEvents: [], damageDoneEvents: [], damageTakenEvents: [],
        healingEvents: [], debuffEvents: [], enemyCastEvents: [], enemyBuffEvents: [], enemyDamageTakenEvents: [],
        enemyDebuffEvents: [], headMarkerEvents: [], playerBuffEvents: [],
      },
    };
    if (!Number.isFinite(reportStart)) reportStart = t;
  }

  function endFight(t: number) {
    if (!fight) return;
    for (const k of [...pending.keys()]) flushPending(k);
    fight.end = t;
    // A pull with no hostile action (combat flag from a stray mob, a
    // countdown) isn't one.
    if (fight.firstAction !== null) fights.push(fight);
    fight = null;
  }

  function touch(t: number) {
    if (fight && fight.firstAction === null) fight.firstAction = t;
  }

  // A hit's landed (or unpaired) events into the fight's streams.
  function emitHit(h: PendingHit, landedAt: number | null, tgtRes: Res | null, hpAfter: number | null) {
    if (!fight) return;
    const srcId = actorFor(h.src), tgtId = actorFor(h.tgt);
    const srcInst = instanceOf(h.src, srcId), tgtInst = instanceOf(h.tgt, tgtId);
    const t = rel(landedAt ?? h.t);
    const tr = tgtRes ?? h.tgtRes;
    if (h.kind === "damage") {
      const e: FFLDamageEvent = {
        timestamp: t, type: landedAt === null ? "calculateddamage" : "damage",
        sourceID: srcId, targetID: tgtId, abilityGameID: h.ability, amount: h.amount,
        hitType: h.flags & 0x2000 ? 2 : 1, buffs: h.buffs,
        sourceResources: h.srcRes, targetResources: tr,
        ...(h.flags & 0x4000 ? { directHit: true } : {}),
        ...(landedAt === null ? { unpaired: true } : {}),
        ...(srcInst !== undefined ? { sourceInstance: srcInst } : {}),
        ...(tgtInst !== undefined ? { targetInstance: tgtInst } : {}),
      };
      if (hpAfter === 0 && h.hpBefore > 0 && h.amount > h.hpBefore) e.overkill = h.amount - h.hpBefore;
      const friendlySrc = isFriendly(h.src), friendlyTgt = isFriendly(h.tgt);
      if (friendlySrc && !friendlyTgt) {
        fight.data.damageDoneEvents.push(e);
        fight.data.enemyDamageTakenEvents.push(e);
        fight.enemyDamage.set(tgtId, (fight.enemyDamage.get(tgtId) ?? 0) + h.amount);
      } else if (friendlyTgt) {
        fight.data.damageTakenEvents.push(e);
        if (isPlayerId(h.tgt) && hpAfter === 0 && landedAt !== null) fight.lastHit.set(h.tgt, { ability: h.ability, t: landedAt });
      }
      fight.replay.push({ timestamp: t, type: e.type, sourceID: srcId, sourceInstance: srcInst, targetID: tgtId, targetInstance: tgtInst,
        abilityGameID: h.ability, amount: h.amount, hitType: e.hitType, unpaired: e.unpaired, sourceResources: h.srcRes, targetResources: tr });
    } else if (landedAt !== null) {
      emitHeal(h, landedAt, tgtRes);   // the preview went out with the ability line
    }
  }

  /** A heal as FFLogs has it: "calculatedheal" at the ability line, "heal" when it lands. */
  function emitHeal(h: PendingHit, landedAt: number | null, tgtRes: Res | null) {
    if (!fight) return;
    const srcId = actorFor(h.src), tgtId = actorFor(h.tgt);
    const srcInst = instanceOf(h.src, srcId), tgtInst = instanceOf(h.tgt, tgtId);
    const t = rel(landedAt ?? h.t);
    const tr = tgtRes ?? h.tgtRes;
    const maxHp = tr.maxHitPoints ?? 0;
    const overheal = maxHp && h.hpBefore >= 0 ? Math.max(0, h.amount - Math.max(0, maxHp - h.hpBefore)) : 0;
    const e: FFLHealEvent = {
      timestamp: t, type: landedAt === null ? "calculatedheal" : "heal",
      sourceID: srcId, targetID: tgtId, abilityGameID: h.ability, amount: Math.max(0, h.amount - overheal), overheal,
      targetResources: tr,
    };
    fight.data.healingEvents.push(e);
    fight.replay.push({ timestamp: t, type: e.type, sourceID: srcId, sourceInstance: srcInst, targetID: tgtId, targetInstance: tgtInst,
      abilityGameID: h.ability, amount: e.amount, sourceResources: h.srcRes, targetResources: tr });
  }

  /** Hits whose landing never came: damage stays an unpaired preview (a heal's preview is out already). */
  function flushPending(k: string) {
    const q = pending.get(k);
    if (!q) return;
    pending.delete(k);
    for (const h of q) if (h.kind === "damage") emitHit(h, null, null, null);
  }

  // Status changes are kept raw and sorted into buffs and debuffs once the
  // statuses' game categories are known (opts.statusCategories).
  function statusEvent(f: string[], t: number, applying: boolean) {
    const sid = hex(f[2]);
    if (!Number.isFinite(sid) || sid === 0) return;
    const src = f[5], tgt = f[7];
    const param = hex(f[9]) || 0;
    let s = statuses.get(tgt);
    if (!s) statuses.set(tgt, (s = new Map()));
    const prev = s.get(sid);
    if (applying) s.set(sid, { param, source: src }); else s.delete(sid);
    const abilityId = 1000000 + sid;
    ability(abilityId, f[3] ?? `Status ${sid}`, "1");
    statusIds.add(sid);
    if (!fight || f[3] === undefined) return;
    const srcId = actorFor(src), tgtId = actorFor(tgt);
    const secs = num(f[4]);
    fight.statuses.push({
      t: rel(t), sid, srcId, tgtId, tgtInst: instanceOf(tgt, tgtId),
      friendlySrc: isFriendly(src), friendlyTgt: isFriendly(tgt),
      op: !applying ? "remove" : !prev ? "apply" : prev.param !== param && param > 0 && param <= 32 ? "stack" : "refresh",
      param, duration: applying && Number.isFinite(secs) && secs > 0 && secs < 9000 ? Math.round(secs * 1000) : undefined,
    });
  }

  /** Sorts a pull's raw status changes into FFLogs' buff / debuff streams. */
  function emitStatuses(b: FightBuild, category: (sid: number) => number | undefined) {
    for (const s of b.statuses) {
      // Game category 2 is detrimental, 1 beneficial. Without it: an
      // enemy's or the environment's status on a player, or a player's on
      // an enemy, is a debuff.
      const cat = category(s.sid);
      const debuff = cat === 2 ? true : cat === 1 ? false : s.friendlyTgt ? !s.friendlySrc : s.friendlySrc;
      const word = debuff ? "debuff" : "buff";
      const type = s.op === "remove" ? `remove${word}` : s.op === "apply" ? `apply${word}` : s.op === "stack" ? `apply${word}stack` : `refresh${word}`;
      const abilityId = 1000000 + s.sid;
      const base = {
        timestamp: s.t, sourceID: s.srcId, targetID: s.tgtId, abilityGameID: abilityId,
        ...(s.tgtInst !== undefined ? { targetInstance: s.tgtInst } : {}),
        ...(s.duration !== undefined ? { duration: s.duration } : {}),
        ...(s.op === "stack" ? { stack: s.param } : {}),
      };
      if (debuff) {
        const e = { ...base, type, ...(s.op !== "remove" ? { extraInfo: s.param } : {}) } as FFLDebuffEvent;
        if (s.friendlyTgt) b.data.debuffEvents.push(e);
        else if (s.op !== "stack") b.data.enemyDebuffEvents.push(e);
        b.replay.push({ timestamp: s.t, type, sourceID: s.srcId, targetID: s.tgtId, targetInstance: s.tgtInst, abilityGameID: abilityId, duration: s.duration, stack: base.stack });
      } else {
        const e = { ...base, type } as FFLBuffEvent;
        if (!s.friendlyTgt) b.data.enemyBuffEvents.push(e);
        else if (PLAYER_BUFF_IDS.has(abilityId)) b.data.playerBuffEvents!.push(e);
      }
    }
  }

  function position(act: string, t: number, x: number, y: number, heading: number) {
    if (!fight || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const c = combatants.get(act);
    if (!c) return;
    const id = actorFor(act);
    if (actors[id]?.type === "Pet") return;
    fight.replay.push({ timestamp: rel(t), type: "position", sourceID: id, sourceInstance: instanceOf(act, id),
      sourceResources: { x: Math.round(x * 100), y: Math.round(y * 100), ...(Number.isFinite(heading) ? { facing: Math.round(heading * 100) } : {}),
        ...(c.maxHp > 0 ? { hitPoints: c.hp, maxHitPoints: c.maxHp } : {}) } });
  }

  await readLogLines(file, (f) => {
    const type = f[0];
    const t = parseActTimestamp(f[1]);
    if (!Number.isFinite(t)) return;
    if (!Number.isFinite(fileStart)) fileStart = t;
    fileEnd = t;

    // State that matters outside the chosen duties too.
    switch (type) {
      case "01": endFight(t); zone = f[3] ?? ""; duty = false; inCombat = false; mapId = null; break;
      case "02": recorder = f[2]; break;
      case "03": case "04": {
        if (type === "03") {
          combatants.set(f[2], { act: f[2], name: f[3] ?? "", job: hex(f[4]) || 0, owner: f[6] ?? "", bnpcBase: num(f[10]) || 0,
            hp: num(f[11]) || 0, maxHp: num(f[12]) || 0 });
        }
        break;
      }
      case "12":
        recorderStats = { directHit: num(f[9]), criticalHit: num(f[10]), determination: num(f[13]), skillSpeed: num(f[14]), spellSpeed: num(f[15]) };
        break;
      // Statuses are tracked everywhere (a buff put up before the pull is
      // still in a hit's `buffs`); statusEvent emits only inside a pull.
      case "26": case "30": statusEvent(f, t, type === "26"); return;
      case "28": { const w = waymarkEventFromLine(f, t); if (w) waymarks.push(w); return; }
      // Decimal, unlike most ids: 79 is Sigmascape V4.0 (Dancing Mad).
      case "40": mapId = num(f[2]); if (fight && fight.mapId === null) fight.mapId = mapId; return;
    }
    if (type === "01") { const w = waymarkEventFromLine(f, t); if (w) waymarks.push(w); return; }
    if (!inWindow(t)) return;

    // Pull bounds, matched to FFLogs on Hbd3BmMhwGAaF1px (the same night
    // as the user's 2026-07-18 log): a pull starts at the first player
    // action on an enemy (21/22), which comes before the game's combat flag
    // (Bloodfest at 48.86s, combat at 49.38s), and ends when ACT's own
    // combat flag drops, ~3s after the director's wipe, so the deaths and
    // jumps that end a wipe are in it. A start the combat flag doesn't
    // follow within 10s (a stray hit) is dropped.
    if (fight) {
      const F0: FightBuild = fight;
      if (F0.endAt !== null && t > F0.endAt) endFight(F0.endAt);
      else if (!F0.combatSeen && t - F0.start > 10000) { fight = null; pending.clear(); }
    }
    switch (type) {
      case "33": {
        const cmd = f[3];
        if (cmd === "40000001") duty = true;
        else if (fight && cmd === "40000005") { fight.wiped = true; fight.endAt ??= t + 6000; }
        else if (fight && (cmd === "40000002" || cmd === "40000003")) { fight.kill = true; fight.endAt ??= t + 6000; }
        return;
      }
      case "260": {
        const game = f[3] === "1", actCombat = f[2] === "1";
        if (game) {
          if (fight) fight.combatSeen = true;
          else if (!inCombat && duty) { startFight(t); fight!.combatSeen = true; }
        }
        if (!actCombat && fight && fight.combatSeen) {
          if (!fight.wiped && fight.bossDeaths.size) fight.kill = true;
          endFight(t);
        }
        inCombat = game;
        return;
      }
      case "21": case "22":
        if (!fight && duty && !isNone(f[6]) && isFriendly(f[2]) && !isFriendly(f[6]) && combatants.has(f[6])) {
          startFight(t);
          fight!.firstAction = t;
        }
        break;
    }
    if (!fight) return;
    const F: FightBuild = fight;

    switch (type) {
      case "20": {
        const src = f[2], tgt = f[6];
        const id = hex(f[4]);
        ability(id, f[5] ?? "");
        const secs = num(f[8]);
        const srcId = actorFor(src), tgtId = actorFor(tgt);
        const e: FFLCastEvent = {
          timestamp: rel(t), type: "begincast", sourceID: srcId, targetID: tgtId, abilityGameID: id,
          sourceResources: res("", "", "", "", f[9], f[10], f[12]),
          ...(Number.isFinite(secs) ? { duration: Math.round(secs * 1000) } : {}),
        };
        const si = instanceOf(src, srcId), ti = instanceOf(tgt, tgtId);
        if (si !== undefined) e.sourceInstance = si;
        if (!isFriendly(src)) { F.data.enemyCastEvents.push(e); touch(t); } else F.data.castEvents.push(e);
        F.replay.push({ ...e, sourceInstance: si, targetInstance: ti });
        return;
      }
      case "21": case "22": {
        const src = f[2], tgt = f[6];
        const id = hex(f[4]);
        const name = f[5] ?? "";
        const seq = f[44];
        const srcR = res(f[34], f[35], f[36], f[37], f[40], f[41], f[43]);
        const tgtR = res(f[24], f[25], f[26], f[27], f[30], f[31], f[33]);
        // One "cast" per action: the first target line carries it.
        if (f[45] === "0" || type === "21") {
          const srcId = actorFor(src), tgtId = actorFor(tgt);
          const e: FFLCastEvent = { timestamp: rel(t), type: "cast", sourceID: srcId, targetID: tgtId, abilityGameID: id, sourceResources: srcR, targetResources: tgtR };
          const si = instanceOf(src, srcId), ti = instanceOf(tgt, tgtId);
          if (si !== undefined) e.sourceInstance = si;
          const friendly = isFriendly(src);
          if (!friendly) F.data.enemyCastEvents.push(e); else F.data.castEvents.push(e);
          F.replay.push({ ...e, sourceInstance: si, targetInstance: ti });
        }
        if (!isNone(tgt) && (isFriendly(src) !== isFriendly(tgt))) touch(t);
        if (name.startsWith("unknown_") && !isFriendly(src)) {
          const k = `${src}|${id}`;
          const u = unnamedUses.get(k) ?? unnamedUses.set(k, { ability: id, times: [], multi: false }).get(k)!;
          if (f[45] === "0" || type === "21") u.times.push(t);
          if (Number(f[46]) > 1) u.multi = true;
        }
        if (isNone(tgt)) { ability(id, name); return; }
        let kindType: string | undefined;
        for (let i = 8; i < 24; i += 2) {
          const flags = hex(f[i]);
          if (!Number.isFinite(flags) || flags === 0) continue;
          const k = flags & 0xff;
          if (k !== 3 && k !== 4 && k !== 5 && k !== 6) continue;
          const amount = decodeAmount(f[i + 1] ?? "0");
          const kind = k === 4 ? "heal" : "damage";
          if (kind === "damage") kindType = damageType(flags);
          const c = combatants.get(tgt);
          const hit: PendingHit = { t, src, tgt, ability: id, name, kind, amount, flags, srcRes: srcR, tgtRes: tgtR,
            buffs: buffsOn(tgt), hpBefore: c?.hp ?? -1 };
          // One action can hit a target twice (Curing Waltz heals around the
          // dancer and the partner: eight lines, two per player), and one
          // EffectResult lands them all, so hits queue per target + sequence.
          const key = `${tgt}|${seq}`;
          const q = pending.get(key);
          if (q) q.push(hit); else pending.set(key, [hit]);
          if (kind === "heal") emitHeal(hit, null, null);   // FFLogs keeps every heal's preview
          break;   // one hit per target line; extra entries are the same hit's procs
        }
        ability(id, name, kindType);
        const c = combatants.get(tgt);
        if (c && Number.isFinite(tgtR.hitPoints!)) { c.hp = tgtR.hitPoints!; if (tgtR.maxHitPoints) c.maxHp = tgtR.maxHitPoints; }
        const cs = combatants.get(src);
        if (cs && Number.isFinite(srcR.hitPoints!)) { cs.hp = srcR.hitPoints!; if (srcR.maxHitPoints) cs.maxHp = srcR.maxHitPoints; }
        if (srcR.x !== undefined) position(src, t, srcR.x / 100, srcR.y! / 100, (srcR.facing ?? NaN) / 100);
        return;
      }
      case "37": {
        const tgt = f[2], seq = f[4];
        const r = res(f[5], f[6], f[7], f[8], f[11], f[12], f[14]);
        const c = combatants.get(tgt);
        if (c && r.hitPoints !== undefined) { c.hp = r.hitPoints; if (r.maxHitPoints) c.maxHp = r.maxHitPoints; }
        const key = `${tgt}|${seq}`;
        const q = pending.get(key);
        if (q) {
          pending.delete(key);
          for (const h of q) emitHit(h, t, r, r.hitPoints ?? null);
        }
        return;
      }
      case "24": {
        const tgt = f[2], src = f[17];
        const which = f[4];
        const sid = hex(f[5]);
        const amount = hex(f[6]);
        if (!Number.isFinite(amount)) return;
        const tgtR = res(f[7], f[8], f[9], f[10], f[13], f[14], f[16]);
        const srcId = actorFor(src), tgtId = actorFor(tgt);
        const abilityId = sid ? 1000000 + sid : which === "HoT" ? 500001 : 500000;
        if (!sid) ability(abilityId, which === "HoT" ? "Combined HoTs" : "Combined DoTs");
        const ti = instanceOf(tgt, tgtId);
        const t0 = rel(t);
        if (which === "DoT") {
          const e: FFLDamageEvent = { timestamp: t0, type: "damage", sourceID: srcId, targetID: tgtId, abilityGameID: abilityId, amount, tick: true, targetResources: tgtR,
            ...(ti !== undefined ? { targetInstance: ti } : {}) };
          if (isFriendly(tgt)) F.data.damageTakenEvents.push(e);
          else { F.data.damageDoneEvents.push(e); F.data.enemyDamageTakenEvents.push(e); F.enemyDamage.set(tgtId, (F.enemyDamage.get(tgtId) ?? 0) + amount); }
        } else if (which === "HoT") {
          F.data.healingEvents.push({ timestamp: t0, type: "heal", sourceID: srcId, targetID: tgtId, abilityGameID: abilityId, amount, targetResources: tgtR });
        }
        if (tgtR.x !== undefined) position(tgt, t, tgtR.x / 100, tgtR.y! / 100, (tgtR.facing ?? NaN) / 100);
        return;
      }
      case "25": {
        const tgt = f[2], src = f[4];
        const tgtId = actorFor(tgt), srcId = actorFor(src);
        if (isPlayerId(tgt)) {
          // As FFLogs: a death with no source (E0000000, a fall or the
          // wipe) is the environment's, with no killing blow; otherwise the
          // killer is the source and the blow the hit that took them to 0.
          const fatal = F.lastHit.get(tgt);
          const killing = srcId >= 0 && fatal && t - fatal.t <= 6000 ? fatal.ability : undefined;
          F.lastHit.delete(tgt);
          const si = instanceOf(src, srcId);
          const e: FFLDeathEvent = { timestamp: rel(t), type: "death", sourceID: srcId, targetID: tgtId, abilityGameID: 0,
            ...(killing !== undefined ? { killingAbilityGameID: killing } : {}),
            ...(srcId >= 0 ? { killerID: srcId, ...(si !== undefined ? { killerInstance: si } : {}) } : {}) };
          F.data.deathEvents.push(e);
          F.replay.push({ timestamp: rel(t), type: "death", sourceID: tgtId, targetID: tgtId });
        } else if (!isFriendly(tgt)) {
          F.bossDeaths.add(tgtId);
        }
        const c = combatants.get(tgt);
        if (c) c.hp = 0;
        return;
      }
      case "27": {
        const tgt = f[2];
        const id = actorFor(tgt);
        const inst = instanceOf(tgt, id);
        const e: FFLHeadMarkerEvent = { timestamp: rel(t), type: "headmarker", sourceID: -1, targetID: id, abilityGameID: 0, markerID: hex(f[6]) };
        if (inst !== undefined) (e as FFLHeadMarkerEvent & { targetInstance?: number }).targetInstance = inst;
        F.data.headMarkerEvents.push(e);
        F.replay.push({ timestamp: e.timestamp, type: "headmarker", sourceID: -1, targetID: id, targetInstance: inst, markerID: e.markerID });
        return;
      }
      case "35": {
        const src = f[2], tgt = f[4];
        const sId = actorFor(src), tId = actorFor(tgt);
        const e: FFLTetherEvent = { timestamp: rel(t), type: "tether", sourceID: sId, targetID: tId, tetherID: hex(f[8]) };
        const si = instanceOf(src, sId), ti = instanceOf(tgt, tId);
        if (si !== undefined) e.sourceInstance = si;
        if (ti !== undefined) e.targetInstance = ti;
        F.data.headMarkerEvents.push(e);
        F.replay.push({ timestamp: e.timestamp, type: "tether", sourceID: sId, sourceInstance: si, targetID: tId, targetInstance: ti, tetherID: e.tetherID });
        return;
      }
      case "261": {
        if (f[2] !== "Change" && f[2] !== "Add") return;
        const act = f[3];
        let x = NaN, y = NaN, h = NaN;
        for (let i = 4; i + 1 < f.length; i += 2) {
          if (f[i] === "PosX") x = num(f[i + 1]);
          else if (f[i] === "PosY") y = num(f[i + 1]);
          else if (f[i] === "Heading") h = num(f[i + 1]);
        }
        if (Number.isFinite(x) && Number.isFinite(y)) position(act, t, x, y, h);
        return;
      }
      case "270": case "271":
        position(f[2], t, num(f[6]), num(f[7]), num(f[3]));
        return;
    }
    // Expire previews whose landing never came.
    if (pending.size > 200) for (const [k, q] of pending) if (t - q[0].t > PAIR_WINDOW_MS) flushPending(k);
  }, { onProgress: opts.onProgress });
  endFight(fileEnd);

  // ── Names the log doesn't carry (checked against FFLogs' masterData for
  // Hbd3BmMhwGAaF1px: 446 of 478 names equal, 14 differ in case only) ──
  // AUTO-ATTACKS: the game names a boss's auto-attack nothing, the log
  // "unknown_<hex>", FFLogs "Attack" (roles.ts finds the main tank by the
  // first "Attack"). One is an unnamed enemy action that only ever hits one
  // target and that one caster repeats every 1.5-4.5s (median), 3+ times.
  for (const u of unnamedUses.values()) {
    if (u.multi || u.times.length < 3) continue;
    const gaps = u.times.slice(1).map((x, i) => x - u.times[i]).sort((a, b) => a - b);
    const median = gaps[gaps.length >> 1];
    if (median >= 1500 && median <= 4500) abilities.get(u.ability)!.name = "Attack";
  }
  // Items: "item_<hex>" is the Item row + 1000000 when high quality.
  const items = [...abilities.values()].filter((a) => /^item_[0-9a-f]+$/i.test(a.name));
  if (opts.itemNames && items.length) {
    const rows = items.map((a) => { const v = parseInt(a.name.slice(5), 16); return { a, row: v >= 1000000 ? v - 1000000 : v, hq: v >= 1000000 }; });
    try {
      const names = await opts.itemNames([...new Set(rows.map((r) => r.row))]);
      for (const r of rows) { const n = names.get(r.row); if (n) r.a.name = r.hq ? `${n} [HQ]` : n; }
    } catch { /* keep the log's name */ }
  }
  // FFLogs types an action that deals no damage "1".
  for (const a of abilities.values()) if (!a.type) a.type = "1";

  let categories = new Map<number, number>();
  if (opts.statusCategories && statusIds.size) {
    try { categories = await opts.statusCategories([...statusIds]); } catch { /* fall back to the source/target guess */ }
  }

  // ── Assemble the report ──
  const outFights: FFLFight[] = [];
  const fightDataList: FFLFightData[] = [];
  const replay = new Map<number, { events: ReplayRawEvent[]; mapId: number | null }>();
  for (const b of fights) {
    emitStatuses(b, (sid) => categories.get(sid));
    const start = b.firstAction ?? b.combatStart;
    // FFLogs' fight starts at the first hostile action; drop what came
    // before it (the countdown's buffs) except statuses, which detection
    // reads as "up at the pull" from their apply.
    const startRel = rel(start);
    for (const k of Object.keys(b.data) as (keyof typeof b.data)[]) {
      if (k === "debuffEvents" || k === "enemyDebuffEvents" || k === "enemyBuffEvents" || k === "playerBuffEvents") continue;
      const arr = b.data[k] as { timestamp: number }[];
      (b.data[k] as { timestamp: number }[]) = arr.filter((e) => e.timestamp >= startRel);
    }
    // FFLogs' cast streams leave out auto-attacks and pets' actions (the
    // replay keeps them; checked on Hbd3BmMhwGAaF1px fight 1).
    const castKept = (e: FFLCastEvent) => {
      const n = abilities.get(e.abilityGameID)?.name.toLowerCase();
      return n !== "attack" && n !== "shot" && actors[e.sourceID]?.type !== "Pet";
    };
    b.data.castEvents = b.data.castEvents.filter(castKept);
    b.data.enemyCastEvents = b.data.enemyCastEvents.filter(castKept);
    const enc = ZONE_ENCOUNTERS[b.zone];
    let topEnemy = -1, topDamage = -1;
    for (const [id, d] of b.enemyDamage) if (d > topDamage && actors[id]?.name) { topDamage = d; topEnemy = id; }
    const name = enc?.name ?? actors[topEnemy]?.name ?? b.zone;
    const kill = b.kill || (!b.wiped && topEnemy >= 0 && b.bossDeaths.has(topEnemy));
    const players = new Set<number>();
    for (const e of [...b.data.castEvents, ...b.data.damageTakenEvents]) {
      const a = actors[e.sourceID] ?? undefined;
      if (a?.type === "Player") players.add(a.id);
      const tg = actors[e.targetID] ?? undefined;
      if (tg?.type === "Player") players.add(tg.id);
    }
    const fight: FFLFight = {
      id: b.id, name, startTime: rel(start), endTime: rel(b.end), kill, friendlyPlayers: [...players],
      encounterID: enc?.encounterID ?? null,
    };
    if (enc?.phases) {
      fight.encounterPhases = enc.phases;
      if (name === "Dancing Mad") Object.assign(fight, dancingMadPhases(b, fight, actors));
    }
    // Bosses: the encounter's main enemies (FFLogs' "Boss" subtype).
    for (const [id, d] of b.enemyDamage) if (topDamage > 0 && d >= topDamage * 0.2 && actors[id]) { actors[id].subType = "Boss"; actors[id].icon = "Boss"; }
    for (const id of players) {
      b.data.combatantInfos.push({ timestamp: fight.startTime, type: "combatantinfo", sourceID: id,
        ...(actors[id]?.name === combatants.get(recorder)?.name ? recorderStats : {}) });
    }
    const sortByTime = <T extends { timestamp: number }>(a: T[]) => a.sort((x, y) => x.timestamp - y.timestamp);
    for (const k of Object.keys(b.data) as (keyof typeof b.data)[]) sortByTime(b.data[k] as { timestamp: number }[]);
    outFights.push(fight);
    fightDataList.push({ fight, actors, ...b.data });
    replay.set(b.id, { events: sortByTime(b.replay), mapId: b.mapId });
  }

  const start = Number.isFinite(reportStart) ? reportStart : fileStart;
  const report: FFLReport = {
    title: opts.title ?? `Local log ${new Date(start).toISOString().slice(0, 10)}`,
    code,
    startTime: start,
    phases: [...new Set(outFights.map((f) => f.encounterID).filter((x): x is number => !!x))].map((encounterID) => ({
      encounterID, separatesWipes: false,
      phases: Object.values(ZONE_ENCOUNTERS).find((z) => z.encounterID === encounterID)?.phases ?? null,
    })),
    fights: outFights,
    masterData: { actors: actors.map(({ gameID, icon, ...a }) => a), abilities: [...abilities.values()] },
  };
  return { report, fightDataList, replay, actors, waymarks, fileStart, fileEnd };
}

/**
 * Dancing Mad's phase transitions, matching FFLogs' to within a second on
 * 21 pulls of three FFLogs reports (GKnDWAxdbmhNaV7c, BpAdkacQh63VCrRM,
 * gTkMH91DWRmLbNCn), from the first player hit on an enemy:
 *   P2 Forsaken Kefka   the first hit on Kefka after 9s+ without one (P1's
 *                       clone dodge is ~6s; the P2 transition ~11s)
 *   P3 Exdeath / Chaos  the first hit on either
 *   P4 Kefka Says       the first hit on Kefka after P3
 *   P5 Ultima Kefka     the first hit after 20s+ without one, after P4 (~32s)
 * FFLogs' own times are ~0.7s earlier (the boss turning targetable).
 */
function dancingMadPhases(b: FightBuild, fight: FFLFight, actors: FFLActor[]): Pick<FFLFight, "phaseTransitions" | "lastPhase"> {
  const hits = b.data.damageDoneEvents.filter((e) => e.type === "damage" && !e.tick).sort((x, y) => x.timestamp - y.timestamp);
  const out = [{ id: 1, startTime: fight.startTime }];
  let phase = 1;
  let prev = fight.startTime;
  for (const e of hits) {
    const name = actors[e.targetID]?.name;
    const gap = e.timestamp - prev;
    prev = e.timestamp;
    if (phase === 1 && name === "Kefka" && gap >= 9000) { phase = 2; out.push({ id: 2, startTime: e.timestamp }); }
    else if (phase <= 2 && (name === "Exdeath" || name === "Chaos")) { phase = 3; out.push({ id: 3, startTime: e.timestamp }); }
    else if (phase === 3 && name === "Kefka") { phase = 4; out.push({ id: 4, startTime: e.timestamp }); }
    else if (phase === 4 && gap >= 20000) { phase = 5; out.push({ id: 5, startTime: e.timestamp }); }
  }
  return { phaseTransitions: out, lastPhase: phase };
}

/** A stable local report code for a log file: "local" + a hash of its name, size and first timestamp. */
export function localLogCode(name: string, size: number, firstTs: number): string {
  let h = 2166136261;
  for (const ch of `${name}|${size}|${firstTs}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return `local${(h >>> 0).toString(36)}`;
}
