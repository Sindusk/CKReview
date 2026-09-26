// lib/mechanics/wow/va/entombed-sentinels.ts
//
// Mythic Entombed Sentinels (The Venomous Abyss) — per-pull error detection.
// Called from transformFightToPull in lib/log-transforms.ts; every check
// self-gates on this encounter's ability IDs, so it is safe on any WoW pull.
//
// The second half of this header is the guide-derived encounter model
// (written 2026-09-25 from Method / Wowhead / Icy Veins before any log was
// available). The first half is what the logs actually showed; where the
// two disagree, the log section wins.
//
// ── VERIFIED AGAINST LOGS (report Mvz3r1AnVKYpdFTH, 30 Mythic pulls, no
//    kill; offsets fight-relative) ───────────────────────────────────────────
//
// Actors: "Breath of Ula'tek" (green), "Blood of Ula'tek" (red), "Vashnik"
// (casts Shifting Protovenom + Concealing Shadows), "Venom Coagulation"
// (the slime). Always match by ability ID, never by actor ID.
//
// Cycle: Vitriolic Stasis cast (1284588 Blood / 1284606 Breath, same
// instant) at +46 and then every ~104-110s; the bosses keep the Stasis buff
// ~10-23s. This raid swaps WHOLE TEAMS across bosses every Stasis (every
// player's Mark alternates Acid/Blood), not only the tanks. Within a phase:
// Empowering Slam/Bloodvenom Injection ~every 22s, Venom Coagulation at
// ~+12s after Stasis end, Toxic Droplets every ~33s, Unstable Miasma, then
// Shifting Protovenom ~+36/+102/+143.
//
// Marks (player debuffs 1284500 Acid / 1284506 Blood; the 1284494/1284503
// IDs in the model below are the BOSS buffs): +1 stack every 5s near the
// boss, tick damage scales with stacks (~130-150k/tick at 15-18 stacks),
// and a Mark lasts 40s after its last refresh (771 of 790 natural expiries
// were 39-41s) — so everyone carries both Marks for ~20s into every phase
// BY DESIGN. Mark deaths (78 in the report) read as attrition and are not
// flagged. A player who keeps re-entering the old boss's range refreshes
// the old Mark forever (pull 26 Sylmigron died carrying Acid 18 + Blood
// 18); not flagged yet — crossing is legitimate for Protovenom pairs and
// orb collection, and no clean discriminator has been found.
//
// Toxic Droplets (cast 1284434): exactly 20 orbs per set (pickups + misses
// = 20 in every complete set). Pickup = 1284451 damage on the collector
// (~200-310k, amount 0 while immune). Each MISSED orb explodes ~14.3s
// after the cast as 1284452 Noxious Blast, hitting EVERY living player
// once — so misses per instant = hits / unique targets (pull 26 +313.9:
// 38 hits on 19 players = 2 orbs). Each pickup launches 1284209 Living
// Venom at Breath exactly 4.0s later, travelling in a straight line from
// the pickup spot to the boss: every Living Venom hit sits within ~1.6yd
// of some pickup->Breath segment with a 4.0s lag (pulls 3/16/26, measured
// against Breath's true position from the damageDone stream).
//
// Helical Toxins (debuff 1284590, applied to everyone at Stasis, expires
// 28.0s later): WCL never shows the initial 1/2/3 count, but a collision
// that does NOT total exactly 4 emits applydebuffstack on BOTH players with
// `stack` = the combined total (pull 2: Abuki+Veinglas -> 6, then 12). A
// total of exactly 4 removes both debuffs at the same instant. Sub-4 merges
// are recoverable (pull 12 +165: Cocroach+Polpo -> 2, later cleared);
// totals above 4 never clear, tick 1284813 every 2s for ~80-160k, and end
// in Cultivated Burst. Corpses keep their toxin and still merge (pull 14:
// Cocomber merged with Shadowmeld 8s after Shadowmeld died). Expiry while
// still holding it = 1284941 Cultivated Burst on the holder only (137-550k),
// plus debuff 1284947 / 1284948 ticks on survivors. A dead holder's toxin
// is removed at expiry with no Burst damage.
//
// Shifting Protovenom (cast 1296878; debuff 1296880 on 8 players in two
// waves ~0.6s apart; 1296882 ticks ~200k every 2s while held). Two marked
// players touching remove both debuffs at the same instant (median 3.2s,
// 90th pct 6.9s after the cast). 1296962 Protovenom Eruption = a marked
// player touched an unmarked one: it hits everyone around the collision,
// does NOT remove the debuff, and knocks back — ~1.2s after an eruption
// the knocked player often lands in the arena-edge venom, 1297338 Deadly
// Venom (source "Environment", ~40-100k/s). Among an eruption's victims the
// marked ones sit 1-5yd from their nearest unmarked victim.
//
// Unstable Miasma (cast 1288232; debuff 1288260 on the target, 8.5s;
// split damage 1288282): normal soak is 8-10 players (the Blood team),
// ~250-400k each; the thinnest clean soaks were 7 (pull 9: ~541k each,
// nobody died); 6 soakers at ~565k killed one (pull 25 +192). Up to 8
// soakers get Clinging Murk (1288297, ticks 1303097 every 2s for 6s); on
// expiry each drops a Blood Venom pool UNDER THEMSELVES — the first
// 1284210 tick lands ~1.05s after the Murk removal and is unavoidable,
// both for the carrier and for anyone standing on the spot. The Blood
// tank's Bloodvenom Injection DoT (1284491) and an UNDISPELLED Blighted
// Blood (below) drop a pool the same way. Every other Blood Venom
// application is someone entering a pool.
//
// Blighted Blood (cast 1284483; debuff/ticks 1284471, ~150-180k per 2s):
// 18.0s natural expiry; 209 of 248 were dispelled (the healer's
// Nature's Cure / Purify / Purify Spirit / Detox cast lands on the target
// at the removal instant). A natural expiry drops a Blood Venom pool
// 1.0-1.2s later under the carrier (25 expiries; pull 3 +125.7 Bragontix's
// landed on 7 stacked players, pull 17 +124.5 Neptune's on 8).
//
// Venom Coagulation: slime cast 1284251, Contaminate (1284258) pulses the
// raid every ~3s while it lives. Normal lifetime 13-27s (the post-Stasis
// slime 21-34s). Contaminate deaths happened almost only once the raid was
// already collapsing (pull 3 +188: five deaths to a slime only 8.8s old),
// so only a slime that outlived a normal kill is blamed.
//
// ── RULES IMPLEMENTED ───────────────────────────────────────────────────────
//
// Severity follows the user's definitions: Minor = avoidable damage taken
// that didn't kill; Major = it killed the player or someone else; Raid =
// leads to an inevitable wipe (the app treats the first Raid error as the
// pull's cutoff). Player-less errors are only ever Minor or Raid —
// report-data.ts assumes every Major carries a player.
//
//   wow-es-noxious-blast        missed orbs (raid-wide; Raid when >=2 of its
//                               victims die within 3s)
//   wow-es-droplet-pickup-death died collecting an orb (Major)
//   wow-es-living-venom         hit by a returning Living Venom (current
//                               Breath tank exempt — every venom converges
//                               on the boss)
//   wow-es-helical-overload     collided toxins to a total above 4
//   wow-es-helical-unresolved   still holding toxins at expiry
//   wow-es-helical-collapse     Raid at the first overload of a Stasis (or
//                               >=3 toxin deaths without one)
//   wow-es-protovenom-eruption  marked<->unmarked collision (both flagged)
//   wow-es-protovenom-ticks     died to Protovenom ticks before pairing
//   wow-es-miasma-missed-soak   thin Miasma soak: flags the Blood-team
//                               members who were out of it
//   wow-es-blood-venom          stood in a Blood Venom pool
//   wow-es-deadly-venom         stood in the arena-edge venom
//   wow-es-blighted-blood       undispelled Blighted Blood killed someone
//   wow-es-blighted-blood-pool  undispelled Blighted Blood expired and its
//                               pool landed on other players (carrier
//                               flagged; player-less when it hit nobody)
//   wow-es-contaminate          a slime outlived a normal kill (>=25s) and
//                               Contaminate killed players
//   wow-es-pull-over            generic "the pull was over here" Raid marker
//                               (5+ dead, tank death, untanked boss, bosses
//                               not separated, Berserk) when no mechanic Raid
//                               error came first — see "When was the pull over?"
//
// Deliberately NOT flagged (see above): Mark deaths, Contaminate ticks,
// Helical Toxins ticks on a pairing player, tank-buster hits/deaths, the
// unavoidable first Blood Venom tick from a player's own Murk/Injection
// pool, and Ula'tek's Dominance (appears mostly for a few seconds after
// Stasis while tanks separate the bosses, or at pull end).
//
// ── ENCOUNTER MODEL (guide-derived, pre-log) ────────────────────────────────
//
// Sources checked 2026-09-25:
//   Mythic strategy: https://www.method.gg/guides/the-venomous-abyss/entombed-sentinels
//   Encounter journal and spells:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-entombed-sentinels-boss-strategy-abilities
//   Additional Mythic notes: https://www.icy-veins.com/wow/entombed-sentinels-raid-guide
//
// This is a 20-player, two-boss encounter. Breath of Ula'tek (green/acid)
// and Blood of Ula'tek (red/blood) have separate health pools. Split the
// raid into roughly equal teams, one on each boss. Keep the bosses well
// separated (practically >= 40 yards): Ula'tek's Dominance (1290193 Breath /
// 1290189 Blood) makes them take 99% less damage when close. The two
// bosses' mechanics run in parallel. Balance boss damage before each
// intermission: Vitriolic Stasis heals the lower-health boss UP to the
// higher-health boss.
//
// Each nearby player gains a stacking Mark of Acid or Mark of Blood from
// that Sentinel. At 100 energy, both bosses rush together for the Vitriolic
// Stasis intermission. After it, the tanks take the OPPOSITE boss, allowing
// their former mark to expire (this raid swaps the whole team). The
// main-phase/intermission cycle repeats until both Sentinels die. There is
// no separate final phase.
//
// Shifting Protovenom (Mythic-only): Vashnik contaminates eight random
// players with a circular, ticking debuff. Two marked players touching
// neutralize BOTH debuffs harmlessly. A marked player touching an unmarked
// player triggers Protovenom Eruption: heavy damage and knockback around
// the collision. A chain reaction near a stacked raid is lethal. Pre-spread
// before each application, identify other marked players, pair in open
// space, and leave lanes for pairs to reach one another. Do not assume each
// side receives an even number of marks; a player may need to cross.
//
// Toxic Droplets: small orbs explode as Noxious Blast if not destroyed by a
// player stepping on each orb. On Mythic the pickup costs serious damage;
// one player collecting too many can die. Assign players to clear all orbs
// and rotate mobile immunities for dense sets. A cleared orb releases
// Living Venom, which travels back to Breath; keep its return paths out of
// the raid. Do not blame a collector merely for taking the intended pickup
// hit.
//
// Venom Coagulation spawns a large slime that deals raid damage with
// Contaminate while alive. Kill it quickly, especially the set immediately
// before Stasis.
//
// Empowering Slam (Breath) / Bloodvenom Injection (Blood, 1284487 hit +
// 1284491 stacking DoT): tank hits that ramp until the post-Stasis swap. A
// large tank hit or death alone does not prove a missed swap or missed
// mitigation.
//
// Unstable Miasma marks one player, then splits a large hit among players
// within 7.5 yards. Too few soakers is often fatal on Mythic. The hit
// spreads Clinging Murk to the soakers; when Murk expires it produces Blood
// Venom pools — place these near an edge or existing pools so the arena
// remains usable. Do not require a particular world-marker layout.
//
// Blighted Blood: dispellable Shadow DoT. Healers should dispel promptly.
//
// Vitriolic Stasis: ~30s of boss convergence and 99% damage reduction. Do
// not score low damage during Stasis as poor play. Helical Toxins: every
// player receives a 1-, 2-, or 3-application assignment; collision combines
// them and exactly four clears. On Mythic the visible count disappears
// quickly. Wrong combinations, especially a sum above four, can kill; an
// unresolved toxin expires into Cultivated Burst.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent, ErrorSeverity } from "@/types/PullError";
import { suppressDuplicateRaidErrors } from "../../../error-detection";
import { findPlayerPosition, type Position } from "../../player-position";
import { distanceBetween, distanceToSegment } from "../../geometry";

// ─── Ability IDs (all verified in Mvz3r1AnVKYpdFTH) ──────────────────────────

const STASIS_CAST              = 1284588; // Vitriolic Stasis (Blood's copy; Breath's is 1284606, same instant)
const MARK_OF_ACID             = 1284500; // player debuff
const MARK_OF_BLOOD            = 1284506; // player debuff
const TOXIC_DROPLETS_PICKUP    = 1284451;
const NOXIOUS_BLAST            = 1284452;
const LIVING_VENOM             = 1284209;
const EMPOWERING_SLAM          = 1284458;
const VENOM_COAGULATION_CAST   = 1284251;
const CONTAMINATE              = 1284258;
const MIASMA_DEBUFF            = 1288260;
const MIASMA_DAMAGE            = 1288282;
const CLINGING_MURK            = 1288297;
const BLOOD_VENOM              = 1284210; // debuff + damage share the ID
const BLOODVENOM_INJECTION_DOT = 1284491;
const BLIGHTED_BLOOD           = 1284471; // debuff + damage share the ID
const PROTOVENOM_DEBUFF        = 1296880;
const PROTOVENOM_TICK          = 1296882;
const PROTOVENOM_ERUPTION      = 1296962;
const DEADLY_VENOM             = 1297338; // arena-edge venom, source "Environment"
const HELICAL_TOXINS           = 1284590; // debuff
const HELICAL_TOXINS_TICK      = 1284813;
const CULTIVATED_BURST         = 1284941; // expiry hit on the holder
const CULTIVATED_BURST_DOT     = 1284948;

// ─── Thresholds ──────────────────────────────────────────────────────────────

// Kills at which an unattributable raid-wide event is treated as the wipe.
const RAID_WIPE_KILLS = 3;
// Noxious Blast: counting deaths of its victims within 3s, every blast
// with 2+ kills ended the pull (pulls 10/12/13/15/22/26); single kills did
// not (pull 26 +268 continued ~45s).
const NOXIOUS_RAID_KILLS = 2;
const NOXIOUS_KILL_WINDOW_MS = 3000;

// Unstable Miasma: clean soaks were 8-10 players; 7 (pulls 9/22/24) cost
// ~490-540k per soaker, 6 killed a soaker (pull 25 +192). Flag <= 7.
const MIASMA_MIN_SOAKERS = 8;
// Soak radius from the journal. A missing Blood-team player measured
// within this radius is treated as a position-staleness artifact, not a miss.
const MIASMA_RADIUS = 750;

// Blood Venom / Deadly Venom ticks at ~1/s. One tick = brushed an edge while
// moving (292 of 472 pool entries); >= 2 = actually stood in it.
const POOL_MIN_TICKS = 2;
// A pool that spawned under the player (their own Murk/Injection pool, or
// anyone's pool landing where they stood): 591 of 720 own-pool entries
// took 1 tick, 109 took 2 (walking out takes ~1s); >= 3 means they stayed.
const OWN_POOL_MIN_TICKS = 3;
// A pool spawns this long after its source debuff (Murk / Injection DoT /
// undispelled Blighted Blood) is removed: observed 0.9-1.56s, one 2.75s.
const POOL_SPAWN_MIN_MS = 700;
const POOL_SPAWN_MAX_MS = 1600;
// Blighted Blood's natural duration is 18.0s; anything shorter was a dispel
// (or a death).
const BLIGHTED_FULL_DURATION_MS = 17500;

// Venom Coagulation normally dies 13-27s after spawning (13-34s for the
// post-Stasis slime); a slime killing players younger than this is
// attrition on an already-collapsing raid, not a slow kill.
const SLIME_SLOW_KILL_MS = 25000;

// Living Venom launches 4.0s after the pickup (a few 2.7-5.5s outliers from
// immunity/latency); path matching tolerance uses the Breath tank's position
// as a stand-in for the boss, so it is looser than the ~1.6yd measured
// against the boss itself.
const LIVING_VENOM_LAG_MIN_MS = 2500;
const LIVING_VENOM_LAG_MAX_MS = 6000;
const LIVING_VENOM_PATH_TOLERANCE = 300;
const LIVING_VENOM_CLUSTER_MS = 2000;

// Helical Toxins: expiry is 28.0s after application.
const HELICAL_WINDOW_MS = 31000;
const HELICAL_EXACT_TOTAL = 4;
// A Cultivated Burst hit followed by death this soon is the Burst's kill.
const BURST_DEATH_WINDOW_MS = 5000;

// Blighted Blood dispels land within ~2s normally (126 of 209 under 4s);
// a player dying to it after holding it this long went undispelled.
const BLIGHTED_UNDISPELLED_MS = 6000;

// ─── Small helpers ───────────────────────────────────────────────────────────

const yd  = (units: number) => (units / 100).toFixed(1);
const kFmt = (n: number) => `~${Math.round(n / 1000)}k`;
const sec = (ms: number) => (ms / 1000).toFixed(1);

type Interval = { start: number; end: number }; // end = Infinity while still active

/** Active windows of `abilityId` on `player` (refresh/stack events keep a window open). */
function debuffIntervals(player: PlayerInfo, abilityId: number): Interval[] {
  const out: Interval[] = [];
  let open: number | null = null;
  for (const e of player.debuffs) {
    if (e.abilityId !== abilityId) continue;
    if (e.debuffStatus === "removed") {
      if (open !== null) out.push({ start: open, end: e.timestamp });
      open = null;
    } else if (open === null) {
      open = e.timestamp;
    }
  }
  if (open !== null) out.push({ start: open, end: Infinity });
  return out;
}

function hitsOf(player: PlayerInfo, abilityId: number): PlayerEvent[] {
  return player.damageTaken.filter((e) => e.abilityId === abilityId);
}

function deathOf(deaths: DeathEvent[], name: string): DeathEvent | undefined {
  return deaths.find((d) => d.player === name);
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function playerError(
  p: PlayerInfo,
  e: Omit<PullError, "player" | "class" | "specId" | "role">
): PullError {
  return { ...e, player: p.name, class: p.className, specId: p.specId, role: p.role };
}

function stasisTimes(enemyCasts: EnemyEvent[]): number[] {
  return enemyCasts.filter((e) => e.abilityId === STASIS_CAST).map((e) => e.timestamp).sort((a, b) => a - b);
}

/** Main-phase index of `t`: 0 before the first Stasis, 1 after it, ... */
function phaseOf(stasis: number[], t: number): number {
  return stasis.filter((s) => s <= t).length;
}

/**
 * The player tanking Breath of Ula'tek in each phase — whoever took the
 * most Empowering Slams between two Stasis casts (tanks swap every Stasis).
 */
function breathTankByPhase(players: PlayerInfo[], stasis: number[]): Map<number, PlayerInfo> {
  const counts = new Map<number, Map<PlayerInfo, number>>();
  for (const p of players) {
    for (const h of hitsOf(p, EMPOWERING_SLAM)) {
      const ph = phaseOf(stasis, h.timestamp);
      const m = counts.get(ph) ?? new Map<PlayerInfo, number>();
      m.set(p, (m.get(p) ?? 0) + 1);
      counts.set(ph, m);
    }
  }
  const out = new Map<number, PlayerInfo>();
  for (const [ph, m] of counts) {
    const best = [...m].sort((a, b) => b[1] - a[1])[0];
    if (best) out.set(ph, best[0]);
  }
  return out;
}

// ─── Toxic Droplets: missed orbs (Noxious Blast) ─────────────────────────────
//
// Each missed orb hits every living player once at the same instant, so the
// number of orbs missed at one instant is hits / unique targets. No log
// signal says who was assigned an orb, so this is raid-wide.

export const ES_NOXIOUS_BLAST_RULE_ID = "wow-es-noxious-blast";

function detectMissedOrbs(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const hits = players
    .flatMap((p) => hitsOf(p, NOXIOUS_BLAST).map((e) => ({ p, e })))
    .sort((a, b) => a.e.timestamp - b.e.timestamp);
  if (hits.length === 0) return [];

  type Burst = { start: number; end: number; hits: number; targets: Set<string>; icon?: string };
  const bursts: Burst[] = [];
  for (const { p, e } of hits) {
    const last = bursts[bursts.length - 1];
    if (last && e.timestamp - last.start <= 300) {
      last.hits++; last.targets.add(p.name); last.end = e.timestamp;
    } else {
      bursts.push({ start: e.timestamp, end: e.timestamp, hits: 1, targets: new Set([p.name]), icon: e.abilityIcon });
    }
  }

  // Bursts from one Droplets set land within ~1s of each other.
  const sets: Burst[][] = [];
  for (const b of bursts) {
    const cur = sets[sets.length - 1];
    if (cur && b.start - cur[cur.length - 1].end <= 2500) cur.push(b);
    else sets.push([b]);
  }

  return sets.map((set) => {
    const start = set[0].start;
    const end = set[set.length - 1].end;
    const orbs = set.reduce((n, b) => n + Math.max(1, Math.round(b.hits / b.targets.size)), 0);
    const victims = new Set(set.flatMap((b) => [...b.targets]));
    // A ~250-330k hit on everyone also finishes off players who die to the
    // next tick of something else (pull 22 +97.5: two Clinging Murk deaths
    // 0.7s later; pull 10 +152: two Contaminate deaths 2.2s later).
    const killed = deaths
      .filter((d) => victims.has(d.player) && d.timestamp >= start - 200 && d.timestamp <= end + NOXIOUS_KILL_WINDOW_MS)
      .map((d) => d.player);
    const raid = killed.length >= NOXIOUS_RAID_KILLS;
    const orbText = `${orbs} Toxic Droplet orb${orbs === 1 ? " was" : "s were"} not collected`;
    return {
      ruleId:      ES_NOXIOUS_BLAST_RULE_ID,
      severity:    (raid ? "Raid" : "Minor") as ErrorSeverity,
      name:        "Missed Toxic Droplet",
      description: killed.length === 0
        ? `${orbText} — Noxious Blast hit all ${victims.size} living players.`
        : `${orbText} — Noxious Blast hit all ${victims.size} living players; ${joinNames(killed)} died within ${NOXIOUS_KILL_WINDOW_MS / 1000}s.` +
          (raid ? " Unresolvable from here; treated as a cutoff point." : ""),
      timestamp:   start,
      abilityId:   NOXIOUS_BLAST,
      abilityName: "Noxious Blast",
      abilityIcon: set[0].icon,
    };
  });
}

// ─── Toxic Droplets: died collecting ─────────────────────────────────────────
//
// Every observed pickup death (20) was a player taking another ~250-300k
// orb at ~25-35% HP, usually seconds after their previous pickup.

export const ES_DROPLET_PICKUP_DEATH_RULE_ID = "wow-es-droplet-pickup-death";

function detectPickupDeaths(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId !== TOXIC_DROPLETS_PICKUP) continue;
    const p = players.find((pl) => pl.name === d.player);
    if (!p) continue;
    const pickups = hitsOf(p, TOXIC_DROPLETS_PICKUP)
      .filter((e) => e.timestamp >= d.timestamp - 15000 && e.timestamp <= d.timestamp + 50);
    const fatal = pickups[pickups.length - 1];
    const prev = pickups.length >= 2 ? pickups[pickups.length - 2] : undefined;
    const hpText = fatal?.healthBefore !== undefined
      ? ` at ${kFmt(fatal.healthBefore)} HP` +
        (fatal.maxHealth ? ` (${Math.round((fatal.healthBefore / fatal.maxHealth) * 100)}%)` : "")
      : "";
    const prevText = prev && prev.amount
      ? `, ${sec(fatal.timestamp - prev.timestamp)}s after a ${kFmt(prev.amount)} pickup`
      : "";
    errors.push(playerError(p, {
      ruleId:      ES_DROPLET_PICKUP_DEATH_RULE_ID,
      severity:    "Major",
      name:        "Died Collecting Toxic Droplets",
      description: `Died collecting a Toxic Droplet orb (their ${pickups.length}${ordinalSuffix(pickups.length)} of this set)${hpText}${prevText}.`,
      timestamp:   fatal?.timestamp ?? d.timestamp,
      abilityId:   TOXIC_DROPLETS_PICKUP,
      abilityName: "Toxic Droplets",
      abilityIcon: fatal?.abilityIcon,
      amount:      fatal?.amount,
    }));
  }
  return errors;
}

function ordinalSuffix(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return "th";
  return n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
}

// ─── Living Venom: hit by a returning venom ──────────────────────────────────
//
// Returning venoms converge on Breath, so the phase's Breath tank is exempt
// (hit in 37 of 143 sets — unavoidable where the path meets the boss).
// Everyone else hit stood on a pickup->Breath line; the description names
// whose pickup it was when exactly one path fits.

export const ES_LIVING_VENOM_RULE_ID = "wow-es-living-venom";

function detectLivingVenom(
  players: PlayerInfo[],
  deaths: DeathEvent[],
  stasis: number[]
): PullError[] {
  const tanks = breathTankByPhase(players, stasis);
  const pickups = players.flatMap((p) =>
    hitsOf(p, TOXIC_DROPLETS_PICKUP)
      .filter((e) => e.x !== undefined && e.y !== undefined)
      .map((e) => ({ p, t: e.timestamp, pos: { x: e.x!, y: e.y! } }))
  );

  const errors: PullError[] = [];
  for (const p of players) {
    const hits = hitsOf(p, LIVING_VENOM).filter((e) => (e.amount ?? 0) > 0);
    const clusters: PlayerEvent[][] = [];
    for (const h of hits) {
      if (tanks.get(phaseOf(stasis, h.timestamp))?.name === p.name) continue;
      const cur = clusters[clusters.length - 1];
      if (cur && h.timestamp - cur[cur.length - 1].timestamp <= LIVING_VENOM_CLUSTER_MS) cur.push(h);
      else clusters.push([h]);
    }

    for (const c of clusters) {
      const first = c[0];
      const last = c[c.length - 1];
      const total = c.reduce((s, h) => s + (h.amount ?? 0), 0);
      const d = deathOf(deaths, p.name);
      const died = !!d && d.killingAbilityGameId === LIVING_VENOM &&
        d.timestamp >= first.timestamp - 50 && d.timestamp <= last.timestamp + 500;

      // Attribute each hit to the pickup whose straight path to Breath it lies on.
      const tank = tanks.get(phaseOf(stasis, first.timestamp));
      const sources = new Set<string>();
      for (const h of c) {
        if (!tank || h.x === undefined || h.y === undefined) continue;
        const boss = findPlayerPosition(tank, h.timestamp, { windowMs: 1500 });
        if (!boss) continue;
        const victim = { x: h.x, y: h.y };
        const fits = pickups
          .filter((k) => h.timestamp - k.t >= LIVING_VENOM_LAG_MIN_MS && h.timestamp - k.t <= LIVING_VENOM_LAG_MAX_MS)
          .map((k) => ({ k, dist: distanceToSegment(victim, k.pos, boss) }))
          .filter((f) => f.dist <= LIVING_VENOM_PATH_TOLERANCE)
          .sort((a, b) => a.dist - b.dist);
        if (fits.length > 0) sources.add(fits[0].k.p.name === p.name ? "their own" : `${fits[0].k.p.name}'s`);
      }
      const bossPos = tank ? findPlayerPosition(tank, first.timestamp, { windowMs: 1500 }) : undefined;
      const distText = bossPos && first.x !== undefined && first.y !== undefined
        ? ` ~${yd(distanceBetween({ x: first.x, y: first.y }, bossPos))}yd from Breath` : "";
      const srcText = sources.size > 0 ? ` — venom returning from ${joinNames([...sources])} orb pickup` : "";

      errors.push(playerError(p, {
        ruleId:      ES_LIVING_VENOM_RULE_ID,
        severity:    died ? "Major" : "Minor",
        name:        "Hit by Living Venom",
        description: `${died ? "Killed" : "Hit"} by ${c.length === 1 ? "a returning Living Venom" : `${c.length} returning Living Venoms`} ` +
          `(${kFmt(total)}) while standing in its path${distText}${srcText}.`,
        timestamp:   first.timestamp,
        abilityId:   LIVING_VENOM,
        abilityName: "Living Venom",
        abilityIcon: first.abilityIcon,
        amount:      total,
      }));
    }
  }
  return errors;
}

// ─── Helical Toxins (Vitriolic Stasis) ───────────────────────────────────────

export const ES_HELICAL_OVERLOAD_RULE_ID   = "wow-es-helical-overload";
export const ES_HELICAL_UNRESOLVED_RULE_ID = "wow-es-helical-unresolved";
export const ES_HELICAL_COLLAPSE_RULE_ID   = "wow-es-helical-collapse";

type Merge = { t: number; total: number; members: PlayerInfo[] };

function detectHelicalToxins(
  players: PlayerInfo[],
  deaths: DeathEvent[],
  stasis: number[]
): PullError[] {
  const errors: PullError[] = [];

  for (const s of stasis) {
    const winStart = s - 1000;
    const winEnd = s + HELICAL_WINDOW_MS;
    const inWin = (t: number) => t >= winStart && t <= winEnd;

    const holders = players.filter((p) =>
      p.debuffs.some((e) => e.abilityId === HELICAL_TOXINS && e.debuffStatus === "applied" && e.timestamp >= winStart && e.timestamp <= s + 3000)
    );
    if (holders.length === 0) continue;

    // Merges: both participants get a "stack" event with the same combined
    // total at the same instant.
    const stackEvents = holders.flatMap((p) =>
      p.debuffs
        .filter((e) => e.abilityId === HELICAL_TOXINS && e.debuffStatus === "stack" && e.stack !== undefined && inWin(e.timestamp))
        .map((e) => ({ p, t: e.timestamp, total: e.stack! }))
    ).sort((a, b) => a.t - b.t);
    const merges: Merge[] = [];
    for (const ev of stackEvents) {
      const m = merges.find((x) => x.total === ev.total && Math.abs(x.t - ev.t) <= 60 && !x.members.includes(ev.p));
      if (m) m.members.push(ev.p);
      else merges.push({ t: ev.t, total: ev.total, members: [ev.p] });
    }

    // Burst hit (expiry) per player, and each player's toxin-caused death.
    const burstHit = new Map<string, PlayerEvent>();
    for (const p of holders) {
      const h = hitsOf(p, CULTIVATED_BURST).find((e) => inWin(e.timestamp) || (e.timestamp > winEnd && e.timestamp <= winEnd + 3000));
      if (h) burstHit.set(p.name, h);
    }
    const toxinDeath = (p: PlayerInfo): DeathEvent | undefined => {
      const d = deathOf(deaths, p.name);
      if (!d || d.timestamp < s || d.timestamp > winEnd + BURST_DEATH_WINDOW_MS + 3000) return undefined;
      if ([HELICAL_TOXINS_TICK, CULTIVATED_BURST, CULTIVATED_BURST_DOT].includes(d.killingAbilityGameId)) return d;
      const b = burstHit.get(p.name);
      if (b && d.timestamp >= b.timestamp && d.timestamp - b.timestamp <= BURST_DEATH_WINDOW_MS) return d;
      return undefined;
    };

    // ── Overloads: a merge totalling more than 4 never clears.
    const overloadedAt = new Map<string, number>();
    const overloadNotes = new Map<string, { p: PlayerInfo; t: number; parts: string[] }>();
    for (const m of merges.sort((a, b) => a.t - b.t)) {
      if (m.total <= HELICAL_EXACT_TOTAL) continue;
      for (const p of m.members) {
        const others = m.members.filter((o) => o !== p);
        const otherText = others.map((o) =>
          overloadedAt.has(o.name) && overloadedAt.get(o.name)! < m.t ? `${o.name} (already overloaded)` : o.name
        );
        const part = `${joinNames(otherText)} for a total of ${m.total}`;
        const note = overloadNotes.get(p.name);
        if (note) note.parts.push(part);
        else overloadNotes.set(p.name, { p, t: m.t, parts: [part] });
      }
      for (const p of m.members) if (!overloadedAt.has(p.name)) overloadedAt.set(p.name, m.t);
    }
    for (const { p, t, parts } of overloadNotes.values()) {
      const d = toxinDeath(p);
      const burst = burstHit.get(p.name);
      const burstText = burst ? `Cultivated Burst hit them for ${kFmt(burst.amount ?? 0)} at expiry` : "";
      const outcome = !d
        ? (burst ? ` ${burstText}.` : "")
        : [HELICAL_TOXINS_TICK, CULTIVATED_BURST, CULTIVATED_BURST_DOT].includes(d.killingAbilityGameId)
          ? ` The overloaded toxin killed them (${d.cause}).`
          : ` ${burstText} and they died ${sec(d.timestamp - (burst?.timestamp ?? d.timestamp))}s later (${d.cause}).`;
      errors.push(playerError(p, {
        ruleId:      ES_HELICAL_OVERLOAD_RULE_ID,
        severity:    d ? "Major" : "Minor",
        name:        "Helical Toxins Overload",
        description: `Combined Helical Toxins with ${parts.join(", then with ")} — pairs must total exactly ${HELICAL_EXACT_TOTAL}, and an overloaded toxin can no longer be cleared.${outcome}`,
        timestamp:   t,
        abilityId:   HELICAL_TOXINS,
        abilityName: "Helical Toxins",
      }));
    }

    // ── Unresolved at expiry (not overloaded). If any holder died still
    // carrying an unpaired, non-overloaded toxin, a survivor's partner may
    // simply have died — fallout vs. failure can't be told apart, so stay
    // silent for this Stasis.
    const unresolved = holders.filter((p) => burstHit.has(p.name) && !overloadedAt.has(p.name));
    const firstBurst = Math.min(...[...burstHit.values()].map((h) => h.timestamp), Infinity);
    const deadUnpaired = holders.filter((p) => {
      const d = deathOf(deaths, p.name);
      if (!d || d.timestamp < s || d.timestamp >= firstBurst - 300) return false;
      if (overloadedAt.has(p.name) && overloadedAt.get(p.name)! <= d.timestamp) return false;
      return !debuffIntervals(p, HELICAL_TOXINS).some((iv) => iv.start <= d.timestamp && iv.end <= d.timestamp && iv.end >= winStart);
    });
    if (deadUnpaired.length === 0) {
      for (const p of unresolved) {
        const burst = burstHit.get(p.name)!;
        const d = toxinDeath(p);
        const subMerge = merges.filter((m) => m.members.includes(p) && m.total < HELICAL_EXACT_TOTAL);
        const mergeText = subMerge.length > 0
          ? ` They had merged with ${joinNames(subMerge.flatMap((m) => m.members.filter((o) => o !== p).map((o) => `${o.name} (total ${m.total})`)))} but never completed ${HELICAL_EXACT_TOTAL}.`
          : "";
        const others = unresolved.filter((o) => o !== p).map((o) => o.name);
        errors.push(playerError(p, {
          ruleId:      ES_HELICAL_UNRESOLVED_RULE_ID,
          severity:    d ? "Major" : "Minor",
          name:        "Helical Toxins Not Cleared",
          description: `Still held Helical Toxins when they expired — Cultivated Burst hit them for ${kFmt(burst.amount ?? 0)}${d ? " and killed them" : ""}.` +
            mergeText + (others.length > 0 ? ` Also unpaired at expiry: ${joinNames(others)}.` : ""),
          timestamp:   burst.timestamp,
          abilityId:   CULTIVATED_BURST,
          abilityName: "Cultivated Burst",
          abilityIcon: burst.abilityIcon,
          amount:      burst.amount,
        }));
      }
    }

    // ── Collapse. Every Stasis with an overload ended the pull within
    // 19-35s (11 of 11; pull 15 +366 took 52s and wiped anyway): the
    // overloaded pair can't clear and take Cultivated Burst, and this raid
    // resets on it. So the first overload IS the point the pull was over.
    // Without an overload, 3+ toxin deaths (unresolved expiries) also end it.
    const firstOverload = [...overloadNotes.values()].sort((a, b) => a.t - b.t)[0];
    const killed = holders.map((p) => toxinDeath(p)).filter((d): d is DeathEvent => !!d).sort((a, b) => a.timestamp - b.timestamp);
    if (firstOverload) {
      const pair = merges.find((m) => m.t === firstOverload.t && m.total > HELICAL_EXACT_TOTAL && m.members.includes(firstOverload.p));
      errors.push({
        ruleId:      ES_HELICAL_COLLAPSE_RULE_ID,
        severity:    "Raid",
        name:        "Helical Toxins Overloaded",
        description: `${joinNames((pair?.members ?? [firstOverload.p]).map((m) => m.name))} combined Helical Toxins for a total of ${pair?.total ?? "more than 4"} — ` +
          `an overloaded toxin can't be cleared and ends in Cultivated Burst` +
          (overloadNotes.size > 2 ? `; ${overloadNotes.size} players ended up overloaded this Stasis` : "") +
          `. Treated as the point the pull was over.`,
        timestamp:   firstOverload.t,
        abilityId:   HELICAL_TOXINS,
        abilityName: "Helical Toxins",
      });
    } else if (killed.length >= RAID_WIPE_KILLS) {
      errors.push({
        ruleId:      ES_HELICAL_COLLAPSE_RULE_ID,
        severity:    "Raid",
        name:        "Helical Toxins Failed",
        description: `${killed.length} players died to overloaded or unresolved Helical Toxins this Stasis (${joinNames(killed.map((d) => d.player))}). ` +
          "Unresolvable from here; treated as a cutoff point.",
        timestamp:   killed[0].timestamp,
        abilityId:   CULTIVATED_BURST,
        abilityName: "Cultivated Burst",
      });
    }
  }
  return errors;
}

// ─── Shifting Protovenom ─────────────────────────────────────────────────────
//
// An eruption proves a marked player touched an unmarked one, but not which
// of the two moved — so both are flagged (README attribution rule 3): every
// marked victim, plus the unmarked victim(s) nearest to them.

export const ES_PROTOVENOM_ERUPTION_RULE_ID = "wow-es-protovenom-eruption";
export const ES_PROTOVENOM_TICKS_RULE_ID    = "wow-es-protovenom-ticks";

function detectProtovenom(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const intervals = new Map(players.map((p) => [p.name, debuffIntervals(p, PROTOVENOM_DEBUFF)]));
  // Marked at t — including a pair clearing at the very same instant.
  const markedAt = (p: PlayerInfo, t: number) =>
    (intervals.get(p.name) ?? []).some((iv) => iv.start <= t + 150 && iv.end >= t - 50);

  const hits = players
    .flatMap((p) => hitsOf(p, PROTOVENOM_ERUPTION).map((e) => ({ p, e })))
    .sort((a, b) => a.e.timestamp - b.e.timestamp);
  // `eruptions`: simultaneous eruptions hit each nearby player once apiece,
  // so the most hits any one victim took = how many collisions happened.
  type Burst = { t: number; victims: Map<string, { p: PlayerInfo; e: PlayerEvent }>; hitCount: Map<string, number>; eruptions: number };
  const bursts: Burst[] = [];
  for (const h of hits) {
    let b = bursts[bursts.length - 1];
    if (!b || h.e.timestamp - b.t > 150) {
      b = { t: h.e.timestamp, victims: new Map(), hitCount: new Map(), eruptions: 0 };
      bursts.push(b);
    }
    if (!b.victims.has(h.p.name)) b.victims.set(h.p.name, h);
    b.hitCount.set(h.p.name, (b.hitCount.get(h.p.name) ?? 0) + 1);
    b.eruptions = Math.max(b.eruptions, b.hitCount.get(h.p.name)!);
  }

  const lastFlagged = new Map<string, number>();
  const flag = (p: PlayerInfo, t: number, err: PullError) => {
    const prev = lastFlagged.get(p.name);
    if (prev !== undefined && t - prev <= 2000) return;
    lastFlagged.set(p.name, t);
    errors.push(err);
  };

  for (const b of bursts) {
    const victims = [...b.victims.values()];
    const marked = victims.filter((v) => markedAt(v.p, b.t));
    const unmarked = victims.filter((v) => !markedAt(v.p, b.t));
    if (marked.length === 0) continue;
    if (unmarked.length === 0 && marked.length > 1) continue;

    const killed = victims.filter((v) => {
      const d = deathOf(deaths, v.p.name);
      if (!d) return false;
      return (d.killingAbilityGameId === PROTOVENOM_ERUPTION && d.timestamp >= b.t - 100 && d.timestamp <= b.t + 1000) ||
        (d.killingAbilityGameId === DEADLY_VENOM && d.timestamp >= b.t && d.timestamp <= b.t + 8000);
    }).map((v) => v.p.name);
    const severity: ErrorSeverity = killed.length > 0 ? "Major" : "Minor";
    const outcome = ` Protovenom Eruption hit ${victims.length} player${victims.length === 1 ? "" : "s"}` +
      (killed.length > 0 ? ` and killed ${joinNames(killed)}.` : ".");
    const posOf = (v: { e: PlayerEvent }): Position | undefined =>
      v.e.x !== undefined && v.e.y !== undefined ? { x: v.e.x, y: v.e.y } : undefined;

    // The collisions are the closest marked<->unmarked pairs — one per
    // eruption (ties within 1.5yd of the cut-off kept: ambiguity flags all
    // candidates). Marked victims outside those pairs were just caught in
    // the blast (pull 4 +38.9: Lunapri, 10.6yd out, vs. Neximage's 5.6yd).
    const pairs = marked.flatMap((m) => unmarked.map((u) => {
      const mp = posOf(m), up = posOf(u);
      return { m, u, dist: mp && up ? distanceBetween(mp, up) : Infinity };
    })).sort((a, b2) => a.dist - b2.dist);
    const cutoff = pairs[Math.min(b.eruptions, pairs.length) - 1]?.dist ?? Infinity;
    const chosen = pairs.filter((pr, i) => i < b.eruptions || pr.dist <= cutoff + 150);
    // Only a single marked victim and no unmarked one hit (the other party
    // was immune): that marked player is the collider.
    const colliders = chosen.length > 0 ? [...new Set(chosen.map((pr) => pr.m))] : marked;

    for (const m of colliders) {
      const partners = chosen.filter((pr) => pr.m === m).map((pr) => ({ u: pr.u, dist: pr.dist }));
      const partnerText = partners.length > 0
        ? ` into unmarked ${joinNames(partners.map((r) => r.u.p.name + (Number.isFinite(r.dist) ? ` (~${yd(r.dist)}yd)` : "")))}`
        : " into an unmarked player";
      flag(m.p, b.t, playerError(m.p, {
        ruleId:      ES_PROTOVENOM_ERUPTION_RULE_ID,
        severity,
        name:        "Protovenom Eruption",
        description: `Collided${partnerText} while carrying Shifting Protovenom — marked players must only touch other marked players.${outcome}`,
        timestamp:   b.t,
        abilityId:   PROTOVENOM_ERUPTION,
        abilityName: "Protovenom Eruption",
        abilityIcon: m.e.abilityIcon,
      }));
      for (const r of partners) {
        flag(r.u.p, b.t, playerError(r.u.p, {
          ruleId:      ES_PROTOVENOM_ERUPTION_RULE_ID,
          severity,
          name:        "Protovenom Eruption",
          description: `Collided with ${m.p.name}'s Shifting Protovenom while unmarked` +
            (Number.isFinite(r.dist) ? ` (~${yd(r.dist)}yd apart)` : "") + ` — unmarked players must make space.${outcome}`,
          timestamp:   b.t,
          abilityId:   PROTOVENOM_ERUPTION,
          abilityName: "Protovenom Eruption",
          abilityIcon: r.u.e.abilityIcon,
        }));
      }
    }
  }

  // Died to the ticks before pairing. Skipped when another marked player
  // from the same cast died still holding theirs first (the would-be
  // partner was gone — fallout).
  for (const d of deaths) {
    if (d.killingAbilityGameId !== PROTOVENOM_TICK) continue;
    const p = players.find((pl) => pl.name === d.player);
    if (!p) continue;
    const iv = (intervals.get(p.name) ?? []).find((i) => i.start <= d.timestamp && i.start >= d.timestamp - 30000);
    if (!iv) continue;
    const partnerDied = players.some((o) => {
      if (o === p) return false;
      const od = deathOf(deaths, o.name);
      return !!od && od.timestamp < d.timestamp &&
        (intervals.get(o.name) ?? []).some((oi) => Math.abs(oi.start - iv.start) <= 1500 && oi.end >= od.timestamp);
    });
    if (partnerDied) continue;
    const tick = hitsOf(p, PROTOVENOM_TICK).filter((e) => e.timestamp <= d.timestamp + 50).pop();
    errors.push(playerError(p, {
      ruleId:      ES_PROTOVENOM_TICKS_RULE_ID,
      severity:    "Major",
      name:        "Died to Shifting Protovenom",
      description: `Died to Shifting Protovenom ticks ${sec(d.timestamp - iv.start)}s after it was applied, without having paired with another marked player.`,
      timestamp:   d.timestamp,
      abilityId:   PROTOVENOM_TICK,
      abilityName: "Shifting Protovenom",
      abilityIcon: tick?.abilityIcon,
    }));
  }
  return errors;
}

// ─── Unstable Miasma: thin soak ──────────────────────────────────────────────
//
// The Blood team (players whose most recent Mark is Mark of Blood) soaks.
// When the soak is thin, every living Blood-team member measured outside
// the soak radius is flagged.

export const ES_MIASMA_MISSED_SOAK_RULE_ID = "wow-es-miasma-missed-soak";

function latestMark(p: PlayerInfo, t: number): number | undefined {
  let last: number | undefined;
  for (const e of p.debuffs) {
    if (e.timestamp > t) break;
    if ((e.abilityId === MARK_OF_ACID || e.abilityId === MARK_OF_BLOOD) && e.debuffStatus !== "removed") last = e.abilityId;
  }
  return last;
}

function detectMiasmaSoaks(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const hits = players
    .flatMap((p) => hitsOf(p, MIASMA_DAMAGE).map((e) => ({ p, e })))
    .sort((a, b) => a.e.timestamp - b.e.timestamp);
  const groups: { t: number; hits: { p: PlayerInfo; e: PlayerEvent }[] }[] = [];
  for (const h of hits) {
    const last = groups[groups.length - 1];
    if (last && h.e.timestamp - last.t <= 500) last.hits.push(h);
    else groups.push({ t: h.e.timestamp, hits: [h] });
  }

  const errors: PullError[] = [];
  for (const g of groups) {
    const soakers = new Set(g.hits.map((h) => h.p.name));
    if (soakers.size >= MIASMA_MIN_SOAKERS) continue;

    const target = players.find((p) =>
      p.debuffs.some((e) => e.abilityId === MIASMA_DEBUFF && e.debuffStatus === "removed" && Math.abs(e.timestamp - g.t) <= 300)
    );
    const targetHit = target ? g.hits.find((h) => h.p === target) : undefined;
    const targetPos = targetHit?.e.x !== undefined && targetHit.e.y !== undefined
      ? { x: targetHit.e.x, y: targetHit.e.y }
      : target ? findPlayerPosition(target, g.t, { windowMs: 1000 }) : undefined;
    if (!target || !targetPos) continue;

    const alive = (p: PlayerInfo) => {
      const d = deathOf(deaths, p.name);
      return !d || d.timestamp > g.t;
    };
    const perSoaker = g.hits.reduce((s, h) => s + (h.e.amount ?? 0), 0) / g.hits.length;
    const killed = deaths
      .filter((d) => d.killingAbilityGameId === MIASMA_DAMAGE && Math.abs(d.timestamp - g.t) <= 1000)
      .map((d) => d.player);

    for (const p of players) {
      if (soakers.has(p.name) || !alive(p) || latestMark(p, g.t) !== MARK_OF_BLOOD) continue;
      const pos = findPlayerPosition(p, g.t, { windowMs: 1500 });
      if (!pos) continue;
      const dist = distanceBetween(pos, targetPos);
      if (dist <= MIASMA_RADIUS) continue;
      errors.push(playerError(p, {
        ruleId:      ES_MIASMA_MISSED_SOAK_RULE_ID,
        severity:    killed.length > 0 ? "Major" : "Minor",
        name:        "Missed Unstable Miasma Soak",
        description: `Out of ${target.name}'s Unstable Miasma soak (~${yd(dist)}yd away) — only ${soakers.size} players soaked, ` +
          `taking ${kFmt(perSoaker)} each` + (killed.length > 0 ? `; it killed ${joinNames(killed)}.` : "."),
        timestamp:   g.t,
        abilityId:   MIASMA_DAMAGE,
        abilityName: "Unstable Miasma",
        abilityIcon: g.hits[0].e.abilityIcon,
      }));
    }
  }
  return errors;
}

// ─── Standing in Blood Venom pools / the arena-edge Deadly Venom ─────────────

export const ES_BLOOD_VENOM_RULE_ID  = "wow-es-blood-venom";
export const ES_DEADLY_VENOM_RULE_ID = "wow-es-deadly-venom";

type PoolDrop = { p: PlayerInfo; t: number; source: "murk" | "injection" | "blighted" };

/** Every moment a Blood Venom pool was dropped (its source debuff ending), with who dropped it. */
function poolDrops(players: PlayerInfo[], deaths: DeathEvent[]): PoolDrop[] {
  const drops: PoolDrop[] = [];
  for (const p of players) {
    const d = deathOf(deaths, p.name);
    const alive = (t: number) => !d || d.timestamp > t + 200;
    for (const iv of debuffIntervals(p, CLINGING_MURK)) {
      if (Number.isFinite(iv.end) && alive(iv.end)) drops.push({ p, t: iv.end, source: "murk" });
    }
    for (const iv of debuffIntervals(p, BLOODVENOM_INJECTION_DOT)) {
      if (Number.isFinite(iv.end) && alive(iv.end)) drops.push({ p, t: iv.end, source: "injection" });
    }
    for (const iv of debuffIntervals(p, BLIGHTED_BLOOD)) {
      if (Number.isFinite(iv.end) && alive(iv.end) && iv.end - iv.start >= BLIGHTED_FULL_DURATION_MS) {
        drops.push({ p, t: iv.end, source: "blighted" });
      }
    }
  }
  return drops;
}

const spawnedAt = (drop: PoolDrop, t: number) =>
  t - drop.t >= POOL_SPAWN_MIN_MS && t - drop.t <= POOL_SPAWN_MAX_MS;

function detectBloodVenom(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const drops = poolDrops(players, deaths);
  const errors: PullError[] = [];
  for (const p of players) {
    const ticks = hitsOf(p, BLOOD_VENOM);
    const pickups = hitsOf(p, TOXIC_DROPLETS_PICKUP);
    const d = deathOf(deaths, p.name);

    for (const iv of debuffIntervals(p, BLOOD_VENOM)) {
      const end = Number.isFinite(iv.end) ? iv.end : (d?.timestamp ?? iv.start);
      const inPool = ticks.filter((e) => e.timestamp >= iv.start - 50 && e.timestamp <= end + 50);
      if (inPool.length === 0) continue;
      const died = !!d && d.killingAbilityGameId === BLOOD_VENOM && d.timestamp >= iv.start - 50 && d.timestamp <= end + 300;
      // The pool appeared under them (theirs or someone else's) — the first
      // tick was unavoidable; only lingering counts.
      const ownPool = drops.some((drop) => spawnedAt(drop, iv.start));

      if (ownPool) {
        if (inPool.length < OWN_POOL_MIN_TICKS) continue;
      } else {
        if (inPool.length < POOL_MIN_TICKS && !died) continue;
        // Orbs landing in puddles must still be collected.
        if (pickups.some((e) => e.timestamp >= iv.start - 1500 && e.timestamp <= end + 1500)) continue;
      }

      const total = inPool.reduce((s, e) => s + (e.amount ?? 0), 0);
      if (total === 0) continue; // immune the whole time
      errors.push(playerError(p, {
        ruleId:      ES_BLOOD_VENOM_RULE_ID,
        severity:    died ? "Major" : "Minor",
        name:        "Stood in Blood Venom",
        description: (ownPool
          ? `Stayed in a Blood Venom pool that dropped under them for ${inPool.length} ticks`
          : `Stood in a Blood Venom pool for ${inPool.length} tick${inPool.length === 1 ? "" : "s"}`) +
          ` (${kFmt(total)})${died ? " and died to it" : ""}.`,
        timestamp:   iv.start,
        abilityId:   BLOOD_VENOM,
        abilityName: "Blood Venom",
        abilityIcon: inPool[0].abilityIcon,
        amount:      total,
      }));
    }
  }
  return errors;
}

function detectDeadlyVenom(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const ticks = hitsOf(p, DEADLY_VENOM);
    if (ticks.length === 0) continue;
    const eruptions = hitsOf(p, PROTOVENOM_ERUPTION);
    const d = deathOf(deaths, p.name);
    for (const iv of debuffIntervals(p, DEADLY_VENOM)) {
      // Pull start: players cross the venom while running in.
      if (iv.start < 5000) continue;
      // Knocked in by a Protovenom Eruption (~1.2s earlier) — the eruption's fault.
      if (eruptions.some((e) => e.timestamp <= iv.start + 100 && iv.start - e.timestamp <= 5000)) continue;
      const end = Number.isFinite(iv.end) ? iv.end : (d?.timestamp ?? iv.start);
      const inVenom = ticks.filter((e) => e.timestamp >= iv.start - 50 && e.timestamp <= end + 50);
      const died = !!d && d.killingAbilityGameId === DEADLY_VENOM && d.timestamp >= iv.start - 50 && d.timestamp <= end + 300;
      if (inVenom.length < POOL_MIN_TICKS && !died) continue;
      const total = inVenom.reduce((s, e) => s + (e.amount ?? 0), 0);
      if (total === 0) continue; // immune the whole time
      errors.push(playerError(p, {
        ruleId:      ES_DEADLY_VENOM_RULE_ID,
        severity:    died ? "Major" : "Minor",
        name:        "Stood in Deadly Venom",
        description: `Stood in the Deadly Venom at the arena edge for ${sec(end - iv.start)}s (${inVenom.length} ticks, ${kFmt(total)})` +
          `${died ? " and died to it" : ""}.`,
        timestamp:   iv.start,
        abilityId:   DEADLY_VENOM,
        abilityName: "Deadly Venom",
        abilityIcon: inVenom[0]?.abilityIcon,
        amount:      total,
      }));
    }
  }
  return errors;
}

// ─── Blighted Blood: undispelled death ───────────────────────────────────────
//
// Dispel duty isn't visible in the log, so this is player-less (Minor).

export const ES_BLIGHTED_BLOOD_RULE_ID = "wow-es-blighted-blood";

function detectBlightedBlood(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId !== BLIGHTED_BLOOD) continue;
    const p = players.find((pl) => pl.name === d.player);
    if (!p) continue;
    const iv = debuffIntervals(p, BLIGHTED_BLOOD).find((i) => i.start <= d.timestamp && i.end >= d.timestamp - 300);
    if (!iv || d.timestamp - iv.start < BLIGHTED_UNDISPELLED_MS) continue;
    errors.push({
      ruleId:      ES_BLIGHTED_BLOOD_RULE_ID,
      severity:    "Minor",
      name:        "Blighted Blood Not Dispelled",
      description: `${p.name} held Blighted Blood for ${sec(d.timestamp - iv.start)}s without a dispel and died to it.`,
      timestamp:   d.timestamp,
      abilityId:   BLIGHTED_BLOOD,
      abilityName: "Blighted Blood",
    });
  }
  return errors;
}

// ─── Blighted Blood: expired undispelled and dropped a pool ──────────────────
//
// The guide: a player still carrying it at expiry should move to the
// planned puddle area. When its pool lands on other players the carrier is
// flagged; when it hits nobody else it is still a missed dispel, which has
// no attributable player (Minor, player-less).

export const ES_BLIGHTED_BLOOD_POOL_RULE_ID = "wow-es-blighted-blood-pool";

function detectBlightedPools(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const drops = poolDrops(players, deaths);
  for (const drop of drops) {
    if (drop.source !== "blighted") continue;
    // Another carrier whose own pool spawned at the same moment can't be
    // told apart from "caught by this one" (pull 2 +61: Sylmigron and
    // Neximage expired together) — leave them out of each other's list.
    const coDroppers = new Set(drops.filter((o) => o !== drop && Math.abs(o.t - drop.t) <= 500).map((o) => o.p.name));
    const caught = players.filter((o) =>
      o !== drop.p && !coDroppers.has(o.name) &&
      debuffIntervals(o, BLOOD_VENOM).some((iv) => spawnedAt(drop, iv.start))
    );
    const killed = caught.filter((o) => {
      const d = deathOf(deaths, o.name);
      return !!d && d.killingAbilityGameId === BLOOD_VENOM && d.timestamp >= drop.t && d.timestamp <= drop.t + 6000;
    });
    const base = {
      ruleId:      ES_BLIGHTED_BLOOD_POOL_RULE_ID,
      name:        "Blighted Blood Pool",
      timestamp:   drop.t,
      abilityId:   BLIGHTED_BLOOD,
      abilityName: "Blighted Blood",
    };
    if (caught.length === 0) {
      errors.push({
        ...base,
        severity:    "Minor",
        description: `Blighted Blood on ${drop.p.name} was never dispelled — it ran its full 18s and dropped a Blood Venom pool.`,
      });
    } else {
      errors.push(playerError(drop.p, {
        ...base,
        severity:    killed.length > 0 ? "Major" : "Minor",
        description: `Blighted Blood ran its full 18s undispelled and its Blood Venom pool dropped on ${joinNames(caught.map((o) => o.name))} ` +
          `— carriers should move to the puddle area before it expires` +
          (killed.length > 0 ? `; it killed ${joinNames(killed.map((o) => o.name))}.` : "."),
      }));
    }
  }
  return errors;
}

// ─── Venom Coagulation: slime lived long enough to kill ──────────────────────

export const ES_CONTAMINATE_RULE_ID = "wow-es-contaminate";

function detectContaminateKills(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const spawns = enemyCasts.filter((e) => e.abilityId === VENOM_COAGULATION_CAST).map((e) => e.timestamp).sort((a, b) => a - b);
  const bySpawn = new Map<number, DeathEvent[]>();
  for (const d of deaths) {
    if (d.killingAbilityGameId !== CONTAMINATE) continue;
    const spawn = spawns.filter((t) => t <= d.timestamp).pop();
    if (spawn === undefined) continue;
    bySpawn.set(spawn, [...(bySpawn.get(spawn) ?? []), d]);
  }
  const pulseTimes = [...new Set(players.flatMap((p) => hitsOf(p, CONTAMINATE).map((e) => Math.round(e.timestamp / 1000))))].sort((a, b) => a - b);

  const errors: PullError[] = [];
  for (const [spawn, allKilled] of bySpawn) {
    const killed = allKilled.filter((d) => d.timestamp - spawn >= SLIME_SLOW_KILL_MS);
    if (killed.length === 0) continue;
    const lastDeath = killed[killed.length - 1].timestamp;
    const pulses = pulseTimes.filter((s, i) => s * 1000 >= spawn && s * 1000 <= lastDeath + 500 && (i === 0 || s - pulseTimes[i - 1] > 1)).length;
    const raid = killed.length >= RAID_WIPE_KILLS;
    errors.push({
      ruleId:      ES_CONTAMINATE_RULE_ID,
      severity:    raid ? "Raid" : "Minor",
      name:        "Venom Coagulation Not Killed",
      description: `The Venom Coagulation was still alive ${sec(killed[0].timestamp - spawn)}s after spawning (${pulses} Contaminate pulses) ` +
        `and Contaminate killed ${joinNames(killed.map((d) => d.player))}.` + (raid ? " Unresolvable from here; treated as a cutoff point." : ""),
      timestamp:   killed[0].timestamp,
      abilityId:   CONTAMINATE,
      abilityName: "Contaminate",
    });
  }
  return errors;
}

// ─── When was the pull over? ─────────────────────────────────────────────────
//
// Surveyed every pull of Mvz3r1AnVKYpdFTH for what ended it. The
// mechanic-specific Raid errors above cover most (Helical overload: 11
// pulls; Noxious Blast with 2+ deaths: 6). The rest ended through:
//
//   · 5+ players dead at once (battle-rezzes subtracted — this raid rezzes
//     a lot): every pull that reached it wiped; the most any continuing
//     pull had was 4 (pull 20 +254/+288, pull 16 +265). Typical causes:
//     Mark ticks of ~140k/2s on everyone at a late Stasis (pulls 4/18),
//     Contaminate/Mark attrition (pulls 3/6/25), eruption chains (7/29).
//   · A tank death: every one ended the pull unless the tank was rezzed
//     within seconds AND the pull went on (pull 12 +223: rezzed after 8s,
//     continued 70s). Pull 21 +72: rezzed after 6s, reset 2s later anyway.
//   · A tank buster landing on a non-tank (nobody tanking that boss —
//     pull 30 +8).
//   · Ula'tek's Dominance staying up after Stasis (bosses never separated,
//     both at 99% damage reduction): pull 8, 13s, reset 4s after it ended.
//     Normal post-Stasis episodes last 1-5s; long ones elsewhere followed a
//     tank death.
//   · Berserk (pull 24 +420).
//
// Only the EARLIEST of these generic markers is emitted, and only when no
// mechanic-specific Raid error came before it. Unexplained by the log:
// pull 16 (reset at +296 with 2 dead) and pull 27 (reset 9s after two
// deaths) — use Call Wipe for those.

export const ES_PULL_OVER_RULE_ID = "wow-es-pull-over";

const BERSERK = 26662;
const DOMINANCE = 1290189;             // Blood's copy; Breath's (1290193) mirrors it
const BLOODVENOM_INJECTION_HIT = 1284487;
const COLLAPSE_DEAD = 5;
const TANK_REZ_GRACE_MS = 15000;
const TANK_DEATH_CONTINUE_MS = 30000;
const DOMINANCE_LONG_MS = 10000;
const DOMINANCE_END_GRACE_MS = 15000;

/** When this player was next active (hit or casting) after dying — i.e. battle-rezzed — if ever. */
function rezzedAt(p: PlayerInfo, deathT: number, nextDeathT: number): number | undefined {
  const t = [...p.damageTaken, ...p.casts]
    .map((e) => e.timestamp)
    .filter((x) => x > deathT + 2000 && x < nextDeathT)
    .sort((a, b) => a - b)[0];
  return t;
}

function detectPullOver(
  players:          PlayerInfo[],
  deaths:           DeathEvent[],
  enemyCasts:       EnemyEvent[],
  enemyBuffs:       EnemyEvent[],
  enemyBuffRemoves: EnemyEvent[],
  pullEnd:          number
): PullError[] {
  const candidates: PullError[] = [];
  const marker = (timestamp: number, name: string, description: string, abilityId: number, abilityName: string) =>
    candidates.push({ ruleId: ES_PULL_OVER_RULE_ID, severity: "Raid", name, description, timestamp, abilityId, abilityName });
  const byName = new Map(players.map((p) => [p.name, p]));
  const sorted = [...deaths].sort((a, b) => a.timestamp - b.timestamp);

  // Deaths with their rez time, for the concurrent-dead count.
  const lives = sorted.map((d) => {
    const next = sorted.find((o) => o.player === d.player && o.timestamp > d.timestamp)?.timestamp ?? Infinity;
    const p = byName.get(d.player);
    return { d, rez: p ? rezzedAt(p, d.timestamp, next) : undefined };
  });

  // ── 5+ dead at once.
  for (const { d } of lives) {
    const dead = lives.filter((l) => l.d.timestamp <= d.timestamp && (l.rez === undefined || l.rez > d.timestamp));
    if (dead.length >= COLLAPSE_DEAD) {
      marker(d.timestamp, "Raid Collapse",
        `${dead.length} players dead at once: ${joinNames(dead.map((l) => `${l.d.player} (${l.d.cause}, +${sec(l.d.timestamp)}s)`))}. ` +
        "Treated as the point the pull was over.",
        d.killingAbilityGameId, d.cause);
      break;
    }
  }

  // ── Tank deaths.
  for (const { d, rez } of lives) {
    if (byName.get(d.player)?.role !== "Tank") continue;
    const recovered = rez !== undefined && rez - d.timestamp <= TANK_REZ_GRACE_MS && pullEnd - d.timestamp >= TANK_DEATH_CONTINUE_MS;
    if (recovered) continue;
    marker(d.timestamp, "Tank Died",
      `Tank ${d.player} died (${d.cause})` +
      (rez !== undefined ? ` — rezzed ${sec(rez - d.timestamp)}s later, but the pull ended ${sec(pullEnd - d.timestamp)}s after the death.`
                         : ` and wasn't rezzed, leaving one tank for two bosses.`) +
      " Treated as the point the pull was over.",
      d.killingAbilityGameId, d.cause);
  }

  // ── Tank buster on a non-tank.
  for (const p of players) {
    if (p.role === "Tank") continue;
    const h = p.damageTaken.find((e) => e.abilityId === EMPOWERING_SLAM || e.abilityId === BLOODVENOM_INJECTION_HIT);
    if (!h) continue;
    const boss = h.abilityId === EMPOWERING_SLAM ? "Breath of Ula'tek" : "Blood of Ula'tek";
    marker(h.timestamp, "Boss Not Tanked",
      `${h.abilityName} hit ${p.name} (${p.role}) — nobody was tanking ${boss}. Treated as the point the pull was over.`,
      h.abilityId, h.abilityName);
  }

  // ── Bosses left together after Stasis.
  const stasisEnds = enemyBuffRemoves.filter((e) => e.abilityId === STASIS_CAST).map((e) => e.timestamp);
  for (const a of enemyBuffs.filter((e) => e.abilityId === DOMINANCE)) {
    const r = enemyBuffRemoves.find((e) => e.abilityId === DOMINANCE && e.timestamp > a.timestamp);
    const end = r?.timestamp ?? pullEnd;
    const afterStasis = stasisEnds.some((s) => a.timestamp >= s && a.timestamp - s <= 15000);
    if (!afterStasis || end - a.timestamp < DOMINANCE_LONG_MS || pullEnd - end > DOMINANCE_END_GRACE_MS) continue;
    marker(a.timestamp, "Bosses Not Separated",
      `Ula'tek's Dominance stayed on both bosses for ${sec(end - a.timestamp)}s after Vitriolic Stasis — they were never pulled ` +
      "apart and took 99% reduced damage. Treated as the point the pull was over.",
      DOMINANCE, "Ula'tek's Dominance");
  }

  // ── Enrage.
  const berserk = enemyCasts.find((e) => e.abilityId === BERSERK && e.actorName.includes("Ula'tek"));
  if (berserk) marker(berserk.timestamp, "Berserk", "The Sentinels went Berserk (enrage timer).", BERSERK, "Berserk");

  // Earliest wins; within 1s a specific cause (tank death, Berserk, ...)
  // beats the generic head-count (pull 20 +306.7: the 5th death WAS the tank).
  const rank = (e: PullError) => e.timestamp + (e.name === "Raid Collapse" ? 1000 : 0);
  return candidates.sort((a, b) => rank(a) - rank(b)).slice(0, 1);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function detectEntombedSentinelsErrors(
  players:          PlayerInfo[],
  deaths:           DeathEvent[] = [],
  enemyCasts:       EnemyEvent[] = [],
  enemyBuffs:       EnemyEvent[] = [],
  enemyBuffRemoves: EnemyEvent[] = [],
  pullDurationMs?:  number
): PullError[] {
  const stasis = stasisTimes(enemyCasts);
  const errors = [
    ...detectMissedOrbs(players, deaths),
    ...detectPickupDeaths(players, deaths),
    ...detectLivingVenom(players, deaths, stasis),
    ...detectHelicalToxins(players, deaths, stasis),
    ...detectProtovenom(players, deaths),
    ...detectMiasmaSoaks(players, deaths),
    ...detectBloodVenom(players, deaths),
    ...detectDeadlyVenom(players, deaths),
    ...detectBlightedBlood(players, deaths),
    ...detectBlightedPools(players, deaths),
    ...detectContaminateKills(players, deaths, enemyCasts),
  ];

  // Self-gate the generic markers: tank deaths / Berserk happen in every
  // WoW fight, so only run them on pulls that are this encounter.
  if (stasis.length > 0 || players.some((p) => p.debuffs.some((e) => e.abilityId === MARK_OF_ACID || e.abilityId === MARK_OF_BLOOD))) {
    const pullEnd = pullDurationMs ?? players.reduce((m, p) =>
      [...p.damageTaken, ...p.casts].reduce((mm, e) => Math.max(mm, e.timestamp), m), 0);
    const firstRaid = Math.min(Infinity, ...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
    errors.push(...detectPullOver(players, deaths, enemyCasts, enemyBuffs, enemyBuffRemoves, pullEnd)
      .filter((e) => e.timestamp < firstRaid));
  }

  return suppressDuplicateRaidErrors(errors.sort((a, b) => a.timestamp - b.timestamp));
}
