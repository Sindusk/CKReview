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
// For every enemy ability ID, over all pulls of the boss in the report:
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
//
// ── Per-pull signals ───────────────────────────────────────────────────
// Deaths (one error per death, timed at the fatal hit; death events lag
// the hit by up to ~2s):
//   - vulnerable: the fatal hit landed on a Vulnerability Up an enemy
//     ability applied. A double-up. Vamp: every opening-bomb death; those
//     hits ran 6-22x max HP. Major on the victim; the description names
//     what gave the vulnerability.
//   - wrong target: hit by an ability whose clean resolutions never hit
//     the victim's role. Major. Vamp pull 1 +221.9: four non-tanks killed
//     by a tank-only Hardcore at 3.4-3.8x max HP.
//   - avoidable: the fatal hit is a "rarely hits" ability. Major.
//   - unsurvivable: raw damage >= UNSURVIVABLE_RATIO (TANK_UNSURVIVABLE_RATIO
//     for tanks) of max HP, with none of the above. Nothing heals through
//     that, so the player was most likely somewhere the hit wasn't meant
//     for, or took more than their share. Major. Vamp: clean tank busters
//     reach 1.36x on a tank; non-tank deaths of this kind ran 1.6-6x.
//   - survivable: everything else (a hit under max HP that landed on a low
//     player, DoT ticks, auto-attacks). Nobody to blame from the log, so
//     one player-less Minor per cluster of such deaths, with each victim's
//     HP before the hit. Vamp pulls 2/10/13: 5-7 players dead to
//     Aetherletting from 6-80% HP.
//   - no killing blow before the cutoff: Major on the player (likely fell
//     or was knocked off). After the cutoff, or 2+ within 10s, it's a reset
//     (the called-wipe marker).
// Non-fatal hits (Minor, one per player per ability per CLUSTER_GAP_MS):
// wrong target, avoidable, then hit while vulnerable, in that priority.
// Penalties: a Damage Down is folded into the hit that caused it; on its
// own it is a Minor. One applied to PENALTY_RAIDWIDE_MIN+ players at once
// is player-less (Dancing Mad showed raid-wide Damage Downs that weren't
// the recipients' fault). On fallback pulls, these replace the generic
// ffxiv-damage-down rule.
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
//   - Stack/share mechanics: too few players in a stack makes the hit
//     unsurvivable for those who were there, and the fault is whoever was
//     missing. That reads as "unsurvivable" on the victims today.
//   - A bomb or spread hitting a neighbour: the victim is named, not the
//     bomb carrier.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PlayerRole, PullError } from "@/types/PullError";
import { calledWipe, clusterByGap, joinNames, playerError, pullOverMarker, sec } from "./wow/common";

export const FALLBACK_RULE_PREFIX = "fallback-";

// Bosses with an encounter module, by fight name. The fallback never runs
// on these.
const COVERED_ENCOUNTERS: Record<Pull["game"], Set<string>> = {
  ffxiv: new Set(["Dancing Mad"]),
  wow: new Set([
    "Midnight Falls", "Entombed Sentinels", "Vashnik the Malignant", "Sszorak",
    "Nek'zali the Soulcoiler", "The Lost Explorers", "The Twin Fangs",
    "The Coiled Altar", "Ula'tek",
  ]),
};

const RESOLUTION_GAP_MS = 1_000;
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
};

export type FallbackProfile = {
  byId: Map<number, AbilityStats>;
  byName: Map<string, AbilityStats>;
  /** Abilities that gave PENALTY_RAIDWIDE_MIN+ players a penalty at once in a kill. */
  raidwidePenaltiesInKills: Set<number>;
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

const emptyStats = (): AbilityStats => ({ casts: 0, hits: 0, cleanResolutions: 0, cleanHits: 0, cleanRoles: {} });

/** One profile per boss name, from every pull of that boss given. */
export function buildFallbackProfiles(pulls: Pull[]): Map<string, FallbackProfile> {
  const out = new Map<string, FallbackProfile>();
  for (const pull of pulls) {
    if (!fallbackApplies(pull)) continue;
    let profile = out.get(pull.name);
    if (!profile) out.set(pull.name, profile = { byId: new Map(), byName: new Map(), raidwidePenaltiesInKills: new Set() });
    if (pull.result === "Kill") {
      for (const same of penaltyGroups(pull)) {
        if (same.length >= PENALTY_RAIDWIDE_MIN) profile.raidwidePenaltiesInKills.add(same[0].d.causeAbilityId ?? 0);
      }
    }
    const statsFor = (id: number, name: string) => {
      if (!profile!.byId.has(id)) profile!.byId.set(id, emptyStats());
      if (!profile!.byName.has(name)) profile!.byName.set(name, emptyStats());
      return [profile!.byId.get(id)!, profile!.byName.get(name)!];
    };
    for (const c of pull.enemyCasts ?? []) for (const s of statsFor(c.abilityId, c.abilityName)) s.casts++;
    for (const res of resolutions(pull)) {
      const first = res[0].event;
      const clean = !res.some((h) => isFatal(h.event) || isVulnerable(h.event));
      for (const s of statsFor(first.abilityId, first.abilityName)) {
        s.hits += res.length;
        if (!clean) continue;
        s.cleanResolutions++;
        s.cleanHits += res.length;
        for (const h of res) s.cleanRoles[h.player.role] = (s.cleanRoles[h.player.role] ?? 0) + 1;
      }
    }
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

function wrongTarget(profile: FallbackProfile, h: Hit) {
  const r = rolesHit(profile, h.event);
  return r && !r.roles.includes(h.player.role) ? r : undefined;
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

function aliveCount(pull: Pull, t: number): number {
  return pull.players.filter((p) => {
    const mine = pull.deathEvents.filter((d) => d.player === p.name && d.timestamp < t).pop();
    if (!mine) return true;
    return [...p.casts, ...p.damageTaken].some((e) => e.timestamp > mine.timestamp + 2_000 && e.timestamp < t);
  }).length;
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
          description: "Died with no killing blow while the pull was still going: most likely fell or was knocked off the arena.",
          timestamp: d.timestamp, abilityId: 0, abilityName: d.cause,
        }));
      }
      continue;
    }
    // The fatal hit and that ability's hits leading into it are one error.
    for (const x of player.damageTaken) {
      if (x.abilityId === e.abilityId && x.timestamp <= e.timestamp && e.timestamp - x.timestamp <= CLUSTER_GAP_MS) handled.add(x);
    }
    if (e.timestamp >= cutoff || lethalHits.has(e)) continue;
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
          `in this report's ${wrong.stats.cleanResolutions} clean resolutions of it.`,
      }));
    } else if (rare) {
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-avoidable", severity: "Major", name: "Died to Avoidable Damage",
        description: `Died to ${e.abilityName}${fromSource(e)}, which hit a player on only ${rare.hits} of its ${rare.casts} casts in this report: avoidable.`,
      }));
    } else if (unsurvivable(h)) {
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-unsurvivable", severity: "Major", name: "Unsurvivable Hit",
        description: `Took ${times(ratioOf(e))} their max HP from ${e.abilityName}${fromSource(e)}. No healing or mitigation survives that: ` +
          "most likely they stood where it wasn't meant to hit, or took more than their share.",
      }));
    } else if (fromFull(e)) {
      errors.push(playerError(player, {
        ...base, ruleId: "fallback-death-full-hp", severity: "Major", name: "Died From Full HP",
        description: `One ${e.abilityName}${e.isDoT ? " tick" : ""}${fromSource(e)} took them from full HP to dead ` +
          `(${times(ratioOf(e))} max HP before mitigation): not enough mitigation for it, or they took it when they weren't meant to.`,
      }));
    } else {
      survivable.push({ d, hit: e });
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
      if (event.isDoT || !landed(event) || handled.has(event) || event.timestamp >= cutoff) continue;
      const h = { player, event };
      const wrong = wrongTarget(profile, h);
      const rare = rarelyHits(profile, event);
      let flag: Flag | undefined;
      if (wrong) flag = { rule: "fallback-wrong-target-hit", name: "Hit by Someone Else's Mechanic",
        text: `which hit only ${roleList(wrong.roles)} in this report's ${wrong.stats.cleanResolutions} clean resolutions of it` };
      else if (rare) flag = { rule: "fallback-avoidable-hit", name: "Avoidable Damage",
        text: `which hit a player on only ${rare.hits} of its ${rare.casts} casts in this report` };
      else if (isVulnerable(event)) flag = { rule: "fallback-vulnerable-hit", name: "Hit While Vulnerable",
        text: `while carrying ${vulnCause(player, event)}` };
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
          ruleId: flag.rule, severity: "Minor", name: flag.name,
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
    if (same.length >= PENALTY_RAIDWIDE_MIN) {
      // The kill took it too: part of the fight, not a failure.
      if (profile.raidwidePenaltiesInKills.has(first.causeAbilityId ?? 0)) continue;
      errors.push({
        ruleId: "fallback-penalty-raidwide", severity: "Minor", name: `Raid-Wide ${first.abilityName}`,
        description: `${same.length} players got ${first.abilityName} from ${causeName} at once: a raid-wide penalty, not one player's mistake.`,
        timestamp: first.timestamp, abilityId: first.abilityId, abilityName: first.abilityName,
      });
      continue;
    }
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
        ruleId: "fallback-penalty", severity: "Minor", name: d.abilityName,
        description: `Got ${d.abilityName} from ${causeName}: a mechanic was missed or failed.`,
        timestamp: d.timestamp, abilityId: d.abilityId, abilityName: d.abilityName,
      }));
    }
  }

  return [...errors, ...hitErrors.map((x) => x.error), ...marker].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * The pull with the fallback's errors in place of the generic Damage Down
 * rule, or the pull unchanged when the boss has a module.
 */
export function applyFallback(pull: Pull, profiles: Map<string, FallbackProfile>): Pull {
  const profile = profiles.get(pull.name);
  if (!profile || !fallbackApplies(pull)) return pull;
  return {
    ...pull,
    errors: [...pull.errors.filter((e) => e.ruleId !== GENERIC_DAMAGE_DOWN_RULE), ...detectFallbackErrors(pull, profile)],
  };
}
