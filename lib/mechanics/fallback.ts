// lib/mechanics/fallback.ts
//
// The fallback model: error detection for a boss that has no encounter
// module. It knows nothing about the fight. Everything comes from the log
// itself and from the report's other pulls of the same boss, so it works on
// a boss nobody has modeled yet.
//
// Enabled for FFXIV only so far (fallbackApplies). The signals are written
// against Pull/PlayerInfo and degrade when a field is missing (WoW has no
// statusIds snapshot, and its cast IDs rarely match its damage IDs), so
// WoW is a switch to flip once a WoW boss has been tested.
//
// ── Built against ──────────────────────────────────────────────────────
// Vamp Fatale, report jN3XDrf2z8PmLgRJ (13 pulls, two groups, one kill),
// analysed blind: no boss knowledge, only the log.
//
// ── The ability profile (cross-pull) ───────────────────────────────────
// Each pull gets its own profile, built from that pull and the boss's
// earlier pulls only: what the raid had seen so far. Later pulls are never
// used, because week-1 progression doesn't have them (user, 2026-10-08).
// Pull 1 of a new boss therefore knows little, and the profile-based
// signals switch on as clean resolutions accumulate.
// For every enemy ability ID, over those pulls:
//   - casts: completed enemy casts of that ID
//   - hits: non-DoT damage events of that ID on players
//   - resolutions: hits clustered by RESOLUTION_GAP_MS. A resolution is
//     clean when nobody died to it and nobody it hit carried a Vulnerability
//     Up. Clean resolutions record which roles they hit.
// The same is kept per ability NAME, since one mechanic often uses several
// IDs. A rare variant borrows its family's evidence: Vamp's Hardcore
// 45952 had one clean resolution, but the name has 25+, all tank-only.
//
// Two facts come out of it:
//   - "rarely hits": casts >= RARE_MIN_CASTS and hits/casts <= RARE_MAX_HIT_RATE.
//     Ground AoEs and puddles: most casts hit nobody, so any hit is
//     avoidable. Vamp: Vampette Blast Beat 13/165, Coffinfiller 6/28,
//     Half Moon 1-4/21, Aetherletting 45971 8/56. Not flagged: Hardcore
//     45952 17/10, Explosion 33/33, the raidwides at ~8 per cast.
//   - "roles it hits": with >= ROLE_MIN_CLEAN_RESOLUTIONS clean resolutions
//     and >= ROLE_MIN_CLEAN_HITS clean hits, a role never hit in any of
//     them is a role the ability isn't meant for. Vamp: Hardcore is
//     tank-only, Blood Lash and Ultrasonic Spread come in per-role IDs.
//     The minimums keep a random 2-target spread from looking role-bound
//     by chance (it misses both tanks in 4 resolutions ~8% of the time).
//   - "how many it hits": clean resolution sizes per ID, and whether they
//     hit every living player. See underSoak.
// And per ability name and episode (the nth time it went off in the pull),
// the enemy stack counters at the start of clean episodes (stackSamples).
//
// ── Per-pull signals ───────────────────────────────────────────────────
// Shared hits too few players took (underSoak): fewer players than any
// clean resolution, and it hurt more for it. Nobody who took it is blamed.
// When clean resolutions hit everyone and 1-2 living players were missing,
// they get the error (Major if someone died); otherwise it's a player-less
// Minor naming who took it.
// Deaths (one error per death, timed at the fatal hit; death events lag
// the hit by up to ~2s):
//   - vulnerable: the fatal hit landed on a Vulnerability Up an enemy
//     ability applied. A double-up. Vamp: every opening-bomb death; those
//     hits ran 6-22x max HP. Major on the victim; the description names
//     what gave the vulnerability.
//   - doubled: the player took two or more copies of one ability in one
//     resolution (distinct source instances; each copy is meant for one
//     target), unless half or more of its clean resolutions so far did.
//     Vamp pull 2 +21.7: the tanks stood 5.6y apart and each took both
//     Hardcores (user: both tanks at fault). A whole-raid double with no
//     death is how that raid plays it and isn't flagged, and neither is
//     one player taking every copy with nobody else hit, if they live: a
//     lone soaker (TEA pull 2 +204, a tank soaking both Hidden Mines).
//   - wrong target: hit by an ability whose clean resolutions never hit
//     the victim's role. Major. Vamp pull 1 +221.9: four non-tanks killed
//     by a tank-only Hardcore at 3.4-3.8x max HP.
//   - avoidable: the fatal hit is a "rarely hits" ability. Major.
//   - unsurvivable: raw damage >= UNSURVIVABLE_RATIO (TANK_UNSURVIVABLE_RATIO
//     for tanks) of max HP, with none of the above. Nothing heals through
//     that, so the player was most likely somewhere the hit wasn't meant
//     for, or took more than their share. Major. Vamp: clean tank busters
//     reach 1.36x on a tank; non-tank deaths of this kind ran 1.6-6x. When
//     the hit reached more players than any clean resolution, it says so.
//   - after a mistake: a small finishing blow (an auto-attack, a tick)
//     within DEATH_LOOKBACK_MS of a doubled, wrong-target or avoidable hit
//     that left the player at LOW_HP_AFTER or less. The death is that
//     hit's. Vamp pull 2: Alice at 5% from the doubled Hardcore, killed
//     2.4s later by an auto-attack.
//   - survivable: everything else (a hit under max HP that landed on a low
//     player, DoT ticks, auto-attacks). Nobody to blame from the log, so
//     one player-less Minor per cluster of such deaths, with each victim's
//     HP before the hit. Vamp pulls 2/10/13: 5-7 players dead to
//     Aetherletting from 6-80% HP.
//   - no killing blow before the cutoff: Major on the player, who went off
//     the arena. After the cutoff, or 2+ within 10s, it's players jumping
//     off once a wipe is called (user, 2026-10-08): the called-wipe marker.
// Wrong-target, unsurvivable, full-HP and too-few-players errors also give
// the enemy stack counters beside their clean range. Vamp's Satisfied
// enlarges Hardcore (user, VOD of pull 1, which died at 10 stacks).
// Non-fatal hits (one per player per ability per CLUSTER_GAP_MS): wrong
// target, avoidable, then doubled, in that priority. Major in FFXIV, Minor
// in WoW (avoidableSeverity). A hit taken while vulnerable is only an error
// if it kills (see "vulnerable" above): tanks often eat a second hit on a
// vulnerability and live (user, TEA pull 2, 2026-10-08).
// Penalties: a Damage Down is folded into the hit that caused it; on its
// own it is a Major on each player who got it, raid-wide ones included
// (the description says how many got it at once). Never suppressed: the
// fallback is for week-1 bosses, where a Damage Down is what costs the
// enrage check (user, 2026-10-08). On fallback pulls, these replace the
// generic ffxiv-damage-down rule, so a penalty and its hit are one error.
//
// ── The cutoff (Raid) ──────────────────────────────────────────────────
// The earliest of:
//   - a raid-lethal hit: one resolution killing RAID_LETHAL_FRACTION of the
//     living raid at unsurvivable damage (Vamp pull 6 +608: Finale Fatale,
//     8 of 8 at 34-54x, the enrage)
//   - half the raid dead at once, net of raises (Vamp pull 1 +224: the 4th
//     Hardcore death)
//   - a tank death not raised within 15s, with the pull ending within 30s
//   - a called wipe
// Errors after the cutoff are dropped: they are fallout.
//
// ── Known gaps ─────────────────────────────────────────────────────────
//   - A bomb or spread hitting a neighbour: the victim is named, not the
//     bomb carrier.
//   - A shared hit split into groups (Ultrasonic Amp: 4 and 4) can't name
//     who was missing from which group.

import type { EnemyStackEvent, Pull } from "@/types/Pull";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { ErrorSeverity, PlayerRole, PullError } from "@/types/PullError";
import { calledWipe, clusterByGap, joinNames, playerError, pullOverMarker, sec } from "./wow/common";

export const FALLBACK_RULE_PREFIX = "fallback-";

// Bosses with an encounter module, by fight name. The fallback never runs
// on these.
const COVERED_ENCOUNTERS: Record<Pull["game"], Set<string>> = {
  ffxiv: new Set(["Dancing Mad", "Vamp Fatale"]),
  wow: new Set([
    "Midnight Falls", "Entombed Sentinels", "Vashnik the Malignant", "Sszorak",
    "Nek'zali the Soulcoiler", "The Lost Explorers", "The Twin Fangs",
    "The Coiled Altar", "Ula'tek",
  ]),
};

const RESOLUTION_GAP_MS = 1_000;
const EPISODE_GAP_MS = 10_000;
const MIN_CLEAN_STACK_EPISODES = 2;
const EVERYONE_FRACTION = 0.8;
const SHARE_RAW_RISE = 1.5;
const MAX_NAMED_MISSING = 2;
const NORMAL_DOUBLE_FRACTION = 0.5;
// A flagged hit that left a player at or under this much HP owns a death
// that follows within DEATH_LOOKBACK_MS (Vamp pull 2: Alice left at 5% by
// a doubled tank buster, killed 2.4s later by an auto-attack).
const LOW_HP_AFTER = 0.3;
const STACK_NOTE_RULES = new Set([
  "fallback-death-wrong-target", "fallback-wrong-target-hit", "fallback-death-unsurvivable",
  "fallback-death-full-hp", "fallback-under-soak", "fallback-missed-share",
]);
const RARE_MIN_CASTS = 8;
const RARE_MAX_HIT_RATE = 0.25;
const ROLE_MIN_CLEAN_RESOLUTIONS = 4;
const ROLE_MIN_CLEAN_HITS = 12;
const UNSURVIVABLE_RATIO = 1.5;
const TANK_UNSURVIVABLE_RATIO = 2.0;
const RAID_LETHAL_FRACTION = 0.75;
const LETHAL_WINDOW_MS = 2_000;
const FULL_HP_FRACTION = 0.95;
const DEATH_LOOKBACK_MS = 5_000;
const CLUSTER_GAP_MS = 3_000;
const PENALTY_MATCH_MS = 1_500;
const OWN_DEBUFF_LAG_MS = 1_000;
const PENALTY_RAIDWIDE_MIN = 4;
const TANK_REZ_GRACE_MS = 15_000;
const TANK_DEATH_END_MS = 30_000;
const CALLED_WIPE_COUNT = 2;
const CALLED_WIPE_WINDOW_MS = 10_000;

const VULN_RE = /Vulnerability Up/;
const PENALTY_RE = /^Damage Down$/;
const GENERIC_DAMAGE_DOWN_RULE = "ffxiv-damage-down";

/**
 * Avoidable damage that killed nobody. In FFXIV it's Major: it hands out a
 * Damage Down, and that costs the enrage check (user, 2026-10-08). In WoW
 * it's Minor, per the attribution philosophy.
 */
const avoidableSeverity = (pull: Pull): ErrorSeverity => (pull.game === "ffxiv" ? "Major" : "Minor");

export function fallbackApplies(pull: Pull): boolean {
  return pull.game === "ffxiv" && !COVERED_ENCOUNTERS[pull.game].has(pull.name);
}

// ── Profile ─────────────────────────────────────────────────────────────

type AbilityStats = {
  casts: number;
  hits: number;
  cleanResolutions: number;
  cleanHits: number;
  cleanRoles: Partial<Record<PlayerRole, number>>;
  /** Players hit per clean resolution. */
  cleanSizes: number[];
  /** Clean resolutions that hit every living player. */
  cleanEveryone: number;
  /** Damage before mitigation / max HP, per clean hit. */
  cleanRaw: number[];
  /** Clean resolutions where a player took two or more of its instances. */
  cleanDoubled: number;
};

export type FallbackProfile = {
  byId: Map<number, AbilityStats>;
  byName: Map<string, AbilityStats>;
  /**
   * Enemy stack counts at the start of each clean episode, keyed by
   * "<ability name>#<episode>"; one sample per clean episode, each keyed by
   * "<enemy>|<status>". A counter missing from a sample was at 0.
   */
  stackSamples: Map<string, Map<string, number>[]>;
};

type Hit = { player: PlayerInfo; event: PlayerEvent };

const isVulnerable = (e: PlayerEvent) => (e.activeBuffNames ?? []).some((b) => VULN_RE.test(b));
const isFatal = (e: PlayerEvent) => (e.overkill ?? 0) > 0;

// A hit that did nothing: the player was dead, or immune.
const landed = (e: PlayerEvent) => (e.amount ?? 0) + (e.absorbed ?? 0) > 0;

/** Non-DoT hits on players, grouped per ability into resolutions. */
function resolutions(pull: Pull): Hit[][] {
  const byAbility = new Map<number, Hit[]>();
  for (const player of pull.players) {
    for (const event of player.damageTaken) {
      if (event.isDoT || !event.abilityId || !landed(event)) continue;
      const list = byAbility.get(event.abilityId) ?? [];
      list.push({ player, event });
      byAbility.set(event.abilityId, list);
    }
  }
  return [...byAbility.values()].flatMap((hits) => clusterByGap(hits, (h) => h.event.timestamp, RESOLUTION_GAP_MS));
}

/** Penalty debuffs applied together, split by the ability that caused them. */
function penaltyGroups(pull: Pull): { player: PlayerInfo; d: PlayerEvent }[][] {
  const penalties = pull.players.flatMap((player) => player.debuffs
    .filter((d) => d.debuffStatus === "applied" && PENALTY_RE.test(d.abilityName))
    .map((d) => ({ player, d })));
  return clusterByGap(penalties, (p) => p.d.timestamp, PENALTY_MATCH_MS).flatMap((group) =>
    [...new Set(group.map((p) => p.d.causeAbilityId ?? 0))].map((cause) => group.filter((p) => (p.d.causeAbilityId ?? 0) === cause)));
}

const emptyStats = (): AbilityStats => ({
  casts: 0, hits: 0, cleanResolutions: 0, cleanHits: 0, cleanRoles: {}, cleanSizes: [], cleanEveryone: 0, cleanRaw: [], cleanDoubled: 0,
});

/**
 * The players a resolution hit with two or more different copies of the
 * ability (distinct source instances), with how many. Each copy is meant
 * for one target, so a player taking two stood in someone else's.
 */
function doubledIn(res: Hit[]): Map<string, number> {
  const copies = new Map<string, Set<string>>();
  for (const h of res) {
    const set = copies.get(h.player.name) ?? new Set<string>();
    set.add(`${h.event.source ?? ""}#${h.event.sourceInstance ?? 0}`);
    copies.set(h.player.name, set);
  }
  return new Map([...copies].filter(([, s]) => s.size >= 2).map(([name, s]) => [name, s.size]));
}

const playersIn = (res: Hit[]) => new Set(res.map((h) => h.player.name));
const isClean = (hits: Hit[]) => !hits.some((h) => isFatal(h.event) || isVulnerable(h.event));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

/**
 * Each ability name's episodes: its hits grouped by EPISODE_GAP_MS, so one
 * set of staggered bombs or puddles is one episode. The episode index is
 * what lines up "the second Hardcore" across pulls.
 */
const episodeCache = new WeakMap<Pull, Map<string, Hit[][]>>();
function episodes(pull: Pull): Map<string, Hit[][]> {
  const cached = episodeCache.get(pull);
  if (cached) return cached;
  const byName = new Map<string, Hit[]>();
  for (const player of pull.players) {
    for (const event of player.damageTaken) {
      if (event.isDoT || !landed(event)) continue;
      byName.set(event.abilityName, [...(byName.get(event.abilityName) ?? []), { player, event }]);
    }
  }
  const out = new Map([...byName].map(([name, hits]) => [name, clusterByGap(hits, (h) => h.event.timestamp, EPISODE_GAP_MS)]));
  episodeCache.set(pull, out);
  return out;
}

const stackKey = (s: EnemyStackEvent) => `${s.actorName}|${s.statusName}`;

/** Every enemy stack counter's count at `t`; counters at 0 are left out. */
function stacksAt(pull: Pull, t: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of pull.enemyStacks ?? []) {
    if (s.timestamp > t) break;
    if (s.stack > 0) out.set(stackKey(s), s.stack); else out.delete(stackKey(s));
  }
  return out;
}

const emptyProfile = (): FallbackProfile => ({ byId: new Map(), byName: new Map(), stackSamples: new Map() });

/** What one pull adds to its boss's profile. */
function contribution(pull: Pull): FallbackProfile {
  const profile = emptyProfile();
  for (const [name, list] of episodes(pull)) {
    list.forEach((episode, i) => {
      if (!isClean(episode)) return;
      profile.stackSamples.set(`${name}#${i}`, [stacksAt(pull, episode[0].event.timestamp)]);
    });
  }
  const statsFor = (id: number, name: string) => {
    if (!profile.byId.has(id)) profile.byId.set(id, emptyStats());
    if (!profile.byName.has(name)) profile.byName.set(name, emptyStats());
    return [profile.byId.get(id)!, profile.byName.get(name)!];
  };
  for (const c of pull.enemyCasts ?? []) for (const s of statsFor(c.abilityId, c.abilityName)) s.casts++;
  for (const res of resolutions(pull)) {
    const first = res[0].event;
    const clean = isClean(res);
    const size = playersIn(res).size;
    const everyone = clean && size >= aliveCount(pull, first.timestamp);
    for (const s of statsFor(first.abilityId, first.abilityName)) {
      s.hits += res.length;
      if (!clean) continue;
      s.cleanResolutions++;
      s.cleanHits += res.length;
      s.cleanSizes.push(size);
      if (everyone) s.cleanEveryone++;
      if (doubledIn(res).size > 0) s.cleanDoubled++;
      for (const h of res) {
        s.cleanRoles[h.player.role] = (s.cleanRoles[h.player.role] ?? 0) + 1;
        if (h.event.maxHealth) s.cleanRaw.push(ratioOf(h.event));
      }
    }
  }
  return profile;
}

function addStats(a: AbilityStats | undefined, b: AbilityStats): AbilityStats {
  if (!a) return { ...b, cleanRoles: { ...b.cleanRoles }, cleanSizes: [...b.cleanSizes], cleanRaw: [...b.cleanRaw] };
  const roles = { ...a.cleanRoles };
  for (const [r, n] of Object.entries(b.cleanRoles) as [PlayerRole, number][]) roles[r] = (roles[r] ?? 0) + n;
  return {
    casts: a.casts + b.casts, hits: a.hits + b.hits,
    cleanResolutions: a.cleanResolutions + b.cleanResolutions, cleanHits: a.cleanHits + b.cleanHits,
    cleanRoles: roles, cleanSizes: [...a.cleanSizes, ...b.cleanSizes],
    cleanEveryone: a.cleanEveryone + b.cleanEveryone, cleanRaw: [...a.cleanRaw, ...b.cleanRaw],
    cleanDoubled: a.cleanDoubled + b.cleanDoubled,
  };
}

/** A new profile: `a` plus `b`. Neither is changed. */
function merged(a: FallbackProfile, b: FallbackProfile): FallbackProfile {
  const out: FallbackProfile = { byId: new Map(a.byId), byName: new Map(a.byName), stackSamples: new Map(a.stackSamples) };
  for (const [id, s] of b.byId) out.byId.set(id, addStats(out.byId.get(id), s));
  for (const [name, s] of b.byName) out.byName.set(name, addStats(out.byName.get(name), s));
  for (const [key, samples] of b.stackSamples) out.stackSamples.set(key, [...(out.stackSamples.get(key) ?? []), ...samples]);
  return out;
}

/**
 * One profile per pull, keyed by Pull.id, built only from that pull and the
 * earlier pulls of the same boss: what a raid would have had in hand at the
 * time. Week-1 progression has no future pulls to learn from, so the
 * fallback must not use them either (user, 2026-10-08).
 */
export function buildFallbackProfiles(pulls: Pull[]): Map<number, FallbackProfile> {
  const out = new Map<number, FallbackProfile>();
  const sofar = new Map<string, FallbackProfile>();
  const ordered = pulls.filter(fallbackApplies).sort((a, b) => a.startTime - b.startTime || a.pullNumber - b.pullNumber);
  for (const pull of ordered) {
    const profile = merged(sofar.get(pull.name) ?? emptyProfile(), contribution(pull));
    sofar.set(pull.name, profile);
    out.set(pull.id, profile);
  }
  return out;
}

function rarelyHits(profile: FallbackProfile, e: PlayerEvent): AbilityStats | undefined {
  const s = profile.byId.get(e.abilityId);
  return s && s.casts >= RARE_MIN_CASTS && s.hits / s.casts <= RARE_MAX_HIT_RATE ? s : undefined;
}

/**
 * The roles this ability is meant for, when the report proves it; undefined
 * when it can't. An ability that rarely hits has no intended targets: its
 * hits are all mistakes.
 */
function rolesHit(profile: FallbackProfile, e: PlayerEvent): { roles: PlayerRole[]; stats: AbilityStats } | undefined {
  if (rarelyHits(profile, e)) return undefined;
  const enough = (s?: AbilityStats) => s && s.cleanResolutions >= ROLE_MIN_CLEAN_RESOLUTIONS && s.cleanHits >= ROLE_MIN_CLEAN_HITS;
  const byId = profile.byId.get(e.abilityId);
  const stats = enough(byId) ? byId : profile.byName.get(e.abilityName);
  if (!stats || !enough(stats)) return undefined;
  return { roles: (Object.keys(stats.cleanRoles) as PlayerRole[]), stats };
}

/**
 * Taking two copies is how this ability normally lands (a designed
 * multi-hit), going by its clean resolutions so far. Without that history
 * a double is an error. Vamp: Hardcore doubled once in 20 resolutions (pull
 * 2's tanks standing 5.6y apart, user-confirmed), Blast Beat 3 in 58, all
 * fatal; Brutal Rain 3 in 27, the second group's merged stacks.
 */
function doublesAreNormal(profile: FallbackProfile, e: PlayerEvent): boolean {
  const s = profile.byId.get(e.abilityId);
  return !!s && s.cleanResolutions >= ROLE_MIN_CLEAN_RESOLUTIONS && s.cleanDoubled >= s.cleanResolutions * NORMAL_DOUBLE_FRACTION;
}

function wrongTarget(profile: FallbackProfile, h: Hit) {
  const r = rolesHit(profile, h.event);
  return r && !r.roles.includes(h.player.role) ? r : undefined;
}

/**
 * A resolution that hit fewer players than this ability ever hits cleanly,
 * and hurt more for it (a death, or each hit SHARE_RAW_RISE+ times the clean
 * median): a shared hit that too few players took. `everyone` when clean
 * resolutions hit every living player, so the missing players are known.
 * Vamp: Ultrasonic Amp, cleanly 4 players at 0.8x max HP, killed a player
 * who took it alone at 3.2x; Brutal Rain, cleanly everyone at 0.5x, killed
 * the 1-2 players who took it at 2-4x.
 */
function underSoak(profile: FallbackProfile, pull: Pull, res: Hit[]) {
  const s = profile.byId.get(res[0].event.abilityId);
  if (!s || s.cleanResolutions < ROLE_MIN_CLEAN_RESOLUTIONS || rarelyHits(profile, res[0].event)) return undefined;
  // A vulnerable target means a double-up, not a share (Vamp's opening
  // bombs: one went off on a player still vulnerable from a neighbour's).
  if (res.some((h) => isVulnerable(h.event))) return undefined;
  const t = res[0].event.timestamp;
  const alive = aliveCount(pull, t);
  const everyone = s.cleanEveryone >= s.cleanResolutions * EVERYONE_FRACTION;
  const normal = everyone ? alive : Math.min(...s.cleanSizes);
  const hit = playersIn(res);
  if (hit.size >= normal) return undefined;
  const hurt = res.some((h) => isFatal(h.event)) || median(res.map((h) => ratioOf(h.event))) >= SHARE_RAW_RISE * median(s.cleanRaw);
  if (!hurt) return undefined;
  const missing = everyone ? pull.players.filter((p) => !hit.has(p.name) && isAlive(pull, p, t)) : [];
  return { normal, everyone, hit, missing };
}

/** The enemy stack counts at `t` that no clean episode of this ability saw, as a sentence. */
function stackNote(profile: FallbackProfile, pull: Pull, abilityName: string, t: number): string {
  const list = episodes(pull).get(abilityName) ?? [];
  const i = list.findIndex((ep) => ep[0].event.timestamp <= t && t <= ep[ep.length - 1].event.timestamp + EPISODE_GAP_MS);
  const samples = i < 0 ? undefined : profile.stackSamples.get(`${abilityName}#${i}`);
  if (!samples || samples.length < MIN_CLEAN_STACK_EPISODES) return "";
  const now = stacksAt(pull, t);
  const notes: string[] = [];
  for (const key of new Set([...now.keys(), ...samples.flatMap((s) => [...s.keys()])])) {
    const stack = now.get(key) ?? 0;
    const seen = samples.map((s) => s.get(key) ?? 0);
    const min = Math.min(...seen), max = Math.max(...seen);
    if (stack === 0 && max === 0) continue;
    const [actor, status] = key.split("|");
    const range = min === max ? `${min}` : `${min}-${max}`;
    notes.push(`${actor} had ${stack} ${stack === 1 ? "stack" : "stacks"} of ${status} ` +
      `(the ${samples.length} clean resolutions of this ${abilityName} so far: ${range}${stack > max ? ", so more than any of them" : ""})`);
  }
  return notes.length ? ` ${notes.join("; ")}.` : "";
}

// ── Per-pull detection ──────────────────────────────────────────────────

const rawOf = (e: PlayerEvent) => e.unmitigatedAmount ?? (e.amount ?? 0) + (e.overkill ?? 0) + (e.absorbed ?? 0);
const ratioOf = (e: PlayerEvent) => (e.maxHealth ? rawOf(e) / e.maxHealth : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const times = (x: number) => `${x.toFixed(1)}x`;
const unsurvivable = (h: Hit) => ratioOf(h.event) >= (h.player.role === "Tank" ? TANK_UNSURVIVABLE_RATIO : UNSURVIVABLE_RATIO);
const hpBefore = (e: PlayerEvent) => (e.maxHealth && e.healthBefore !== undefined ? Math.min(1, e.healthBefore / e.maxHealth) : undefined);
// One hit took them from full HP to dead.
const fromFull = (e: PlayerEvent) => isFatal(e) && (hpBefore(e) ?? 0) >= FULL_HP_FRACTION;
const hopeless = (h: Hit) => unsurvivable(h) || fromFull(h.event);
const fromSource = (e: PlayerEvent) => (e.source ? ` (${e.source})` : "");
const roleList = (roles: PlayerRole[]) => joinNames(roles.map((r) => (r === "DPS" ? "DPS" : `${r.toLowerCase()}s`)));

/**
 * The Vulnerability Up the hit landed on, and what applied it. A hit applies
 * its own vulnerability ~0.5s before its damage event lands (Vamp pull 1
 * +39.06 / +39.55), so an application by this same hit is skipped.
 */
function vulnCause(player: PlayerInfo, e: PlayerEvent): string {
  const name = (e.activeBuffNames ?? []).find((b) => VULN_RE.test(b)) ?? "a Vulnerability Up";
  const ownApplication = (d: PlayerEvent) =>
    d.causeAbilityName === e.abilityName && d.extra === e.source && e.timestamp - d.timestamp < OWN_DEBUFF_LAG_MS;
  const applied = player.debuffs
    .filter((d) => d.abilityName === name && d.debuffStatus === "applied" && d.timestamp <= e.timestamp && !ownApplication(d))
    .pop();
  if (!applied) return name;
  const cause = applied.causeAbilityName ? ` from ${applied.causeAbilityName}${applied.extra ? ` (${applied.extra})` : ""}` : "";
  return `${name}${cause} ${sec(e.timestamp - applied.timestamp)}s earlier`;
}

/** The hit that killed this death's player, if the log has one. */
function fatalHit(player: PlayerInfo | undefined, d: DeathEvent): PlayerEvent | undefined {
  if (!player) return undefined;
  const window = player.damageTaken.filter((e) => e.timestamp >= d.timestamp - DEATH_LOOKBACK_MS && e.timestamp <= d.timestamp + 200);
  return [...window].reverse().find(isFatal) ?? window[window.length - 1];
}

/** Alive at `t`: never died, or active again (raised) since their last death. */
function isAlive(pull: Pull, p: PlayerInfo, t: number): boolean {
  const mine = pull.deathEvents.filter((d) => d.player === p.name && d.timestamp < t).pop();
  if (!mine) return true;
  return [...p.casts, ...p.damageTaken].some((e) => e.timestamp > mine.timestamp + 2_000 && e.timestamp < t);
}

function aliveCount(pull: Pull, t: number): number {
  return pull.players.filter((p) => isAlive(pull, p, t)).length;
}

/**
 * Moments where hits nobody could survive killed most of the living raid at
 * once, from one ability or several: an enrage, or a failed mechanic that
 * punishes everyone. Nobody's personal mistake. Vamp pull 6 +608 (Finale
 * Fatale, 8 of 8); Red Hot and Deep Blue pull 10 +198.8 (two abilities, 5
 * of 7).
 */
function raidLethal(pull: Pull): { marker: PullError; hits: Set<PlayerEvent> }[] {
  const fatal = pull.players.flatMap((player) => player.damageTaken.filter(isFatal).map((event) => ({ player, event })));
  const out: { marker: PullError; hits: Set<PlayerEvent> }[] = [];
  for (const group of clusterByGap(fatal, (h) => h.event.timestamp, LETHAL_WINDOW_MS)) {
    const hard = group.filter(hopeless);
    const alive = aliveCount(pull, group[0].event.timestamp);
    if (hard.length < 2 || hard.length < alive * RAID_LETHAL_FRACTION) continue;
    const e = hard[0].event;
    const abilities = [...new Set(hard.map((h) => h.event.abilityName))];
    out.push({
      hits: new Set(hard.map((h) => h.event)),
      marker: {
        ruleId: "fallback-raid-lethal", severity: "Raid", name: "Raid-Wide Lethal Hit",
        description: `${joinNames(abilities)} killed ${hard.length} of ${alive} living players at once with hits nobody could survive: ` +
          "an enrage, or a failed mechanic that punishes the whole raid. Treated as the point the pull was over.",
        timestamp: e.timestamp + 1, abilityId: e.abilityId, abilityName: e.abilityName,
      },
    });
  }
  return out;
}

export function detectFallbackErrors(pull: Pull, profile: FallbackProfile): PullError[] {
  const byName = new Map(pull.players.map((p) => [p.name, p]));
  const errors: PullError[] = [];

  // Cutoff first: nothing after it is reported.
  const called = calledWipe(pull.deathEvents, "fallback-wipe-called", CALLED_WIPE_COUNT, CALLED_WIPE_WINDOW_MS);
  const lethal = raidLethal(pull);
  const marker = pull.result === "Kill" ? [] : pullOverMarker(pull.players, pull.deathEvents, pull.fightDuration, {
    ruleId: "fallback-pull-over",
    collapseDead: Math.ceil(pull.players.length / 2),
    tankDeath: { kind: "pullEnded", rezGraceMs: TANK_REZ_GRACE_MS, endMs: TANK_DEATH_END_MS },
    calledWipe: called,
    extra: lethal.map((l) => l.marker),
  });
  const cutoff = marker[0]?.timestamp ?? Infinity;
  const lethalHits = lethal.find((l) => l.marker === marker[0])?.hits ?? new Set<PlayerEvent>();
  const resOf = new Map<PlayerEvent, Hit[]>();
  const allResolutions = resolutions(pull);
  for (const res of allResolutions) for (const h of res) resOf.set(h.event, res);

  // ── Shared hits too few players took ──
  // The fault is whoever was missing, so the players who took it (and any
  // who died to it) aren't blamed.
  const soakHits = new Set<PlayerEvent>();
  for (const res of allResolutions) {
    const e = res[0].event;
    if (e.timestamp >= cutoff || res.some((h) => lethalHits.has(h.event))) continue;
    const under = underSoak(profile, pull, res);
    if (!under) continue;
    for (const h of res) soakHits.add(h.event);
    const died = res.filter((h) => isFatal(h.event)).map((h) => h.player.name);
    const took = `${under.hit.size} player${under.hit.size === 1 ? "" : "s"} (${joinNames([...under.hit])})`;
    const deathText = died.length ? ` ${joinNames(died)} died to it.` : "";
    const base = { timestamp: e.timestamp, abilityId: e.abilityId, abilityName: e.abilityName };
    if (under.everyone && under.missing.length > 0 && under.missing.length <= MAX_NAMED_MISSING) {
      for (const p of under.missing) {
        errors.push(playerError(p, {
          ...base, ruleId: "fallback-missed-share", severity: died.length ? "Major" : avoidableSeverity(pull), name: "Missed a Shared Hit",
          description: `Wasn't in ${e.abilityName}: only ${took} of ${under.normal} living took it, where clean resolutions hit everyone.${deathText}`,
        }));
      }
    } else {
      errors.push({
        ...base, ruleId: "fallback-under-soak", severity: "Minor", name: "Too Few Took a Shared Hit",
        description: `Only ${took} took ${e.abilityName}, where clean resolutions hit ${under.everyone ? "every living player" : `at least ${under.normal}`}: ` +
          `the damage is shared, so the rest of the group was missing.${deathText}`,
      });
    }
  }

  // ── Doubled hits: two copies of one ability on one player ──
  const doubled = new Map<PlayerEvent, number>();
  for (const res of allResolutions) {
    if (doublesAreNormal(profile, res[0].event)) continue;
    const players = doubledIn(res);
    // Half the raid or more taking two, with nobody dying: how this raid
    // plays it (Vamp's second group stacked all 8 for two Brutal Rains in
    // every pull that reached it), not each player's mistake.
    if (players.size >= aliveCount(pull, res[0].event.timestamp) / 2 && !res.some((h) => isFatal(h.event))) continue;
    // One player took every copy and nobody else was hit: no copy was
    // anyone else's, so that's a lone soaker who lived, not a mistake (TEA
    // pull 2 +204: a tank soaked both Hidden Mines, user-confirmed).
    if (playersIn(res).size === 1 && !res.some((h) => isFatal(h.event))) continue;
    for (const h of res) if (players.has(h.player.name)) doubled.set(h.event, players.get(h.player.name)!);
  }

  // A flagged hit that left the player low, before a death to something
  // small: the death is that hit's, not the finishing blow's.
  const flaggedHitBefore = (player: PlayerInfo, e: PlayerEvent) => player.damageTaken
    .filter((x) => x !== e && !x.isDoT && x.timestamp < e.timestamp && e.timestamp - x.timestamp <= DEATH_LOOKBACK_MS)
    .filter((x) => x.maxHealth && x.healthAfter !== undefined && x.healthAfter / x.maxHealth <= LOW_HP_AFTER)
    .filter((x) => doubled.has(x) || rarelyHits(profile, x) || wrongTarget(profile, { player, event: x }))
    .pop();
  const doubledText = (x: PlayerEvent) => `took ${doubled.get(x)} copies of ${x.abilityName} at once, each meant for a different target`;

  // ── Deaths ──
  const handled = new Set<PlayerEvent>();
  const survivable: { d: DeathEvent; hit: PlayerEvent }[] = [];
  for (const d of [...pull.deathEvents].sort((a, b) => a.timestamp - b.timestamp)) {
    const player = byName.get(d.player);
    const e = fatalHit(player, d);
    if (!player) continue;
    if (!e) {
      if (d.timestamp < cutoff && (!called || d.timestamp < called.at)) {
        errors.push(playerError(player, {
          ruleId: "fallback-death-no-blow", severity: "Major", name: "Died Without a Hit",
          description: "Died with no killing blow while the pull was still going: went off the arena.",
          timestamp: d.timestamp, abilityId: 0, abilityName: d.cause,
        }));
      }
      continue;
    }
    // The fatal hit and that ability's hits leading into it are one error.
    for (const x of player.damageTaken) {
      if (x.abilityId === e.abilityId && x.timestamp <= e.timestamp && e.timestamp - x.timestamp <= CLUSTER_GAP_MS) handled.add(x);
    }
    if (e.timestamp >= cutoff || lethalHits.has(e) || soakHits.has(e)) continue;
    const h = { player, event: e };
    const base = { timestamp: e.timestamp, abilityId: e.abilityId, abilityName: e.abilityName, amount: e.amount };
    const wrong = wrongTarget(profile, h);
    const rare = rarelyHits(profile, e);
    if (isVulnerable(e)) {
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-vulnerable", severity: "Major", name: "Doubled Up",
        description: `Died to ${e.abilityName}${fromSource(e)} while carrying ${vulnCause(player, e)}: hit twice. ` +
          `The hit came to ${times(ratioOf(e))} their max HP.`,
      }));
    } else if (wrong) {
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-wrong-target", severity: "Major", name: "Hit by Someone Else's Mechanic",
        description: `Died to ${e.abilityName}${fromSource(e)} (${times(ratioOf(e))} max HP), which hit only ${roleList(wrong.roles)} ` +
          `in its ${wrong.stats.cleanResolutions} clean resolutions so far.`,
      }));
    } else if (doubled.has(e)) {
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-doubled", severity: "Major", name: "Took Two Copies",
        description: `Died after they ${doubledText(e)} (${times(ratioOf(e))} max HP for the last one).`,
      }));
    } else if (rare) {
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-avoidable", severity: "Major", name: "Died to Avoidable Damage",
        description: `Died to ${e.abilityName}${fromSource(e)}, which hit a player on only ${rare.hits} of its ${rare.casts} casts so far: avoidable.`,
      }));
    } else if (unsurvivable(h)) {
      const s = profile.byId.get(e.abilityId);
      const size = playersIn(resOf.get(e) ?? [h]).size;
      const most = s && s.cleanSizes.length >= ROLE_MIN_CLEAN_RESOLUTIONS ? Math.max(...s.cleanSizes) : Infinity;
      const crowd = size > most ? ` It hit ${size} players, where clean resolutions hit at most ${most}.` : "";
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-unsurvivable", severity: "Major", name: "Unsurvivable Hit",
        description: `Took ${times(ratioOf(e))} their max HP from ${e.abilityName}${fromSource(e)}. No healing or mitigation survives that: ` +
          `most likely they stood where it wasn't meant to hit, or took more than their share.${crowd}`,
      }));
    } else if (fromFull(e)) {
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-full-hp", severity: "Major", name: "Died From Full HP",
        description: `One ${e.abilityName}${e.isDoT ? " tick" : ""}${fromSource(e)} took them from full HP to dead ` +
          `(${times(ratioOf(e))} max HP before mitigation): not enough mitigation for it, or they took it when they weren't meant to.`,
      }));
    } else {
      const x = flaggedHitBefore(player, e);
      if (!x) {
        survivable.push({ d, hit: e });
        continue;
      }
      for (const y of player.damageTaken) {
        if (y.abilityId === x.abilityId && Math.abs(y.timestamp - x.timestamp) <= CLUSTER_GAP_MS) handled.add(y);
      }
      const what = doubled.has(x) ? doubledText(x)
        : wrongTarget(profile, { player, event: x }) ? `hit by ${x.abilityName} (not meant for their role)`
        : `hit by ${x.abilityName} (rarely hits anyone)`;
      errors.push(playerError(player, {
        timestamp: x.timestamp, abilityId: x.abilityId, abilityName: x.abilityName, amount: x.amount,
        ruleId: "fallback-death-after-hit", severity: "Major", name: "Died After a Mistake",
        description: `${what[0].toUpperCase()}${what.slice(1)}, which left them at ${pct((x.healthAfter ?? 0) / (x.maxHealth ?? 1))} HP; ` +
          `${e.abilityName}${e.isDoT ? " (a tick)" : ""} finished them ${sec(e.timestamp - x.timestamp)}s later.`,
      }));
    }
  }
  for (const group of clusterByGap(survivable, (x) => x.hit.timestamp, CLUSTER_GAP_MS)) {
    const first = group[0].hit;
    const who = group.map(({ d, hit }) => {
      const before = hpBefore(hit);
      return `${d.player} (${hit.abilityName}${hit.isDoT ? " tick" : ""}, ${before !== undefined ? `${pct(before)} HP before` : "HP unknown"})`;
    });
    errors.push({
      ruleId: "fallback-death-survivable", severity: "Minor", name: "Died to Survivable Damage",
      description: `${joinNames(who)} died to damage they could have survived at full HP: healing, mitigation or HP going into it.`,
      timestamp: first.timestamp, abilityId: first.abilityId, abilityName: first.abilityName,
    });
  }

  // ── Non-fatal hits ──
  type Flag = { rule: string; name: string; text: string };
  const flagged = new Map<string, Hit[]>();
  const flagOf = new Map<Hit, Flag>();
  for (const player of pull.players) {
    for (const event of player.damageTaken) {
      if (event.isDoT || !landed(event) || handled.has(event) || soakHits.has(event) || event.timestamp >= cutoff) continue;
      const h = { player, event };
      const wrong = wrongTarget(profile, h);
      const rare = rarelyHits(profile, event);
      let flag: Flag | undefined;
      if (wrong) flag = { rule: "fallback-wrong-target-hit", name: "Hit by Someone Else's Mechanic",
        text: `which hit only ${roleList(wrong.roles)} in its ${wrong.stats.cleanResolutions} clean resolutions so far` };
      else if (rare) flag = { rule: "fallback-avoidable-hit", name: "Avoidable Damage",
        text: `which hit a player on only ${rare.hits} of its ${rare.casts} casts so far` };
      else if (doubled.has(event)) flag = { rule: "fallback-doubled-hit", name: "Took Two Copies",
        text: `taking ${doubled.get(event)} copies at once, each meant for a different target` };
      if (!flag) continue;
      const key = `${player.name}|${event.abilityId}|${flag.rule}`;
      flagged.set(key, [...(flagged.get(key) ?? []), h]);
      flagOf.set(h, flag);
    }
  }
  const hitErrors: { error: PullError; player: PlayerInfo; abilityId: number }[] = [];
  for (const hits of flagged.values()) {
    for (const episode of clusterByGap(hits, (h) => h.event.timestamp, CLUSTER_GAP_MS)) {
      const { player, event } = episode[0];
      const flag = flagOf.get(episode[0])!;
      const total = episode.reduce((s, h) => s + (h.event.amount ?? 0), 0);
      const count = episode.length > 1 ? ` ${episode.length} times` : "";
      hitErrors.push({
        player, abilityId: event.abilityId,
        error: playerError(player, {
          ruleId: flag.rule, severity: avoidableSeverity(pull), name: flag.name,
          description: `Hit by ${event.abilityName}${fromSource(event)}${count} (${pct(Math.max(...episode.map((h) => ratioOf(h.event))))} max HP), ${flag.text}.`,
          timestamp: event.timestamp, abilityId: event.abilityId, abilityName: event.abilityName, amount: total,
        }),
      });
    }
  }

  // ── Penalties ──
  for (const same of penaltyGroups(pull)) {
    const first = same[0].d;
    if (first.timestamp >= cutoff) continue;
    const causeName = first.causeAbilityName ?? "an unknown source";
    const together = same.length >= PENALTY_RAIDWIDE_MIN ? ` ${same.length} players got it at once.` : "";
    for (const { player, d } of same) {
      const hit = hitErrors.find((x) => x.player === player &&
        (x.abilityId === d.causeAbilityId || x.error.abilityName === d.causeAbilityName) &&
        Math.abs(x.error.timestamp - d.timestamp) <= PENALTY_MATCH_MS);
      if (hit) {
        hit.error.description += ` It gave ${d.abilityName}.`;
        continue;
      }
      if (errors.some((x) => x.player === player.name && x.severity === "Major" && Math.abs(x.timestamp - d.timestamp) <= PENALTY_MATCH_MS)) continue;
      errors.push(playerError(player, {
        ruleId: "fallback-penalty", severity: "Major", name: d.abilityName,
        description: `Got ${d.abilityName} from ${causeName}: a mechanic was missed or failed.${together}`,
        timestamp: d.timestamp, abilityId: d.abilityId, abilityName: d.abilityName,
      }));
    }
  }

  // Enemy stack counters, beside the clean range, on the errors where a hit
  // landed bigger than usual. Vamp's Satisfied enlarges Hardcore (user, VOD
  // of pull 1): pull 1 died at 10 stacks and pull 11 at 8, while pull 7
  // survived 9, so the count is context for the reviewer, not a verdict.
  // Counters grow over the fight at each group's pace, so on other errors
  // they say nothing.
  const out = [...errors, ...hitErrors.map((x) => x.error)];
  for (const e of out) {
    if (STACK_NOTE_RULES.has(e.ruleId)) e.description += stackNote(profile, pull, e.abilityName, e.timestamp);
  }
  return [...out, ...marker].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * The pull with the fallback's errors in place of the generic Damage Down
 * rule, or the pull unchanged when the boss has a module.
 */
export function applyFallback(pull: Pull, profiles: Map<number, FallbackProfile>): Pull {
  const profile = profiles.get(pull.id);
  if (!profile || !fallbackApplies(pull)) return pull;
  return {
    ...pull,
    errors: [...pull.errors.filter((e) => e.ruleId !== GENERIC_DAMAGE_DOWN_RULE), ...detectFallbackErrors(pull, profile)],
  };
}
