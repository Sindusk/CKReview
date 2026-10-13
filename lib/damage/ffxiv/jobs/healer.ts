// lib/damage/ffxiv/jobs/healer.ts
//
// Healer checks (healer batch). The first DPS study's biggest gap was the
// healers (−3.6k rDPS each, docs/dps-analysis.md): extra heal GCDs that
// the incoming damage didn't call for. So the headline is measured per
// heal GCD, not guessed from counts:
//
// ── Heal GCDs ──────────────────────────────────────────────────────────
// For each heal GCD (timeline.ts gcdKinds), what it actually did:
//   - its direct heal: the player's landed heals of that ability within
//     1.5s of the cast landing, amount and overheal
//   - its HoT: heals logged under a status it applies, until the next cast
//     of the same action (at most 30s)
//   - its shield: shield absorbs (PlayerInfo.shieldAbsorbs, on every
//     player) by a status it applies, cast by this player, credited to the
//     latest cast applying that status to that player (Adloquium, Succor
//     and Concitation share Galvanize; a SCH pre-shields four players with
//     four Adloquiums before P2, so matching on the target matters)
// Efficiency = (healed + absorbed) ÷ (healed + absorbed + overheal). Under
// HEAL_WASTE_SHARE it's a finding, valued at the healer's damage filler
// (their most-cast damage GCD without a cooldown) and marked inference:
// whether a heal was needed for safety is the healer's call. A heal GCD
// during forced time (boss untargetable) costs no damage and is forced.
// The dialog shows heal vs damage GCDs next to the raid's damage taken.
//
// ── Job specifics ──────────────────────────────────────────────────────
// - DoTs (shared.ts dotFindings): Biolysis, Combust III, Dia, Eukrasian
//   Dosis III / Dyskrasia, from xivanalysis's per-job DoTs modules.
// - Astrologian Divination, from xivanalysis
//   src/parser/jobs/ast/modules/Divination.tsx: 8 GCDs; Lord of Crowns,
//   Oracle and Combust III once each. Divination is +6% (FFLogs
//   multiplier: Technical Finish + Divination = 1.11).
// - Cooldown drift: tracked-cooldowns.ts.
// - Hardcast AoE spells on one target (aoeOnOneTarget, below).
// - Astrologian, checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull
//   8: its missed Lightspeed (Divination at 4:08) isn't a finding of its
//   own; what it cost (a cancelled cast, the gap weaving the burst) is
//   already in the GCD gaps. Its Combust III clipping (9.8s a minute) is
//   higher than our seconds were because ours is per target: a DoT on a
//   second enemy isn't a clip. Rechecked on 2T1HzdPKgbhM43am Dancing Mad
//   fight 10 (2026-10-09): its 82.7% Combust uptime exposed a bug (a DoT
//   with no logged removal ran to the end of the pull, hiding the 12s
//   gaps at 13:54 and 16:59); its 10 interrupted casts and 1 Gravity II
//   match. Its Earthly Star hold is the drift check now
//   (tracked-cooldowns.ts, valued from the Stellar hits): the star is
//   placed for the heal plan, but a held one still loses its damage.
// - Astrologian, checked against xivanalysis on dDar482XvFKBPJYh FRU kill
//   (7.1, 2026-10-12): its 18/20 cards and "2 Draws missed" are draws
//   held across P4's downtime and to align Divination (no damage); its
//   one Draw over an unplayed card holds (`cards` below); 3 Divinations
//   without Lightspeed cost what the weaving gaps already count; 2 of its
//   5 interrupted casts were the boss going untargetable (6:54, 12:55).
// - Astrologian, checked against xivanalysis on qjCMx4bRfgNKwX9T Dancing
//   Mad kill (7.5, 2026-10-13): GCD uptime, Combust uptime, 40
//   interrupted casts, 1 Gravity II, the weaving gaps (16:59 12s, 13:41
//   9s) and Combust missing from Divination all match findings here.
//   Overstated: Combust clipping 11.8s a minute (per target it's 2.3s;
//   P3's Exdeath and Chaos DoTs counted as one); "1 Earthly Star use
//   missed" (it can't see the pre-pull star, exploded 0:18); 3 Combusts
//   before invulnerability (each got 7-9 ticks, more than a Fall
//   Malefic). Divination GCD counts differ by definition: it counts heal
//   GCDs, these windows count damage GCDs and heal-gcd values the heals.
//   No damage: the 12:05 Divination without Lightspeed (all 8 GCDs and
//   every oGCD fit), overheal, Synastry, Horoscope / Neutral Sect.
// - Scholar, checked against xivanalysis on qjCMx4bRfgNKwX9T Dancing Mad
//   kill (7.5, 2026-10-13): GCD uptime, Chain Stratagem and Aetherflow
//   (no use lost), 6 interrupted casts and its weaving gaps (17:24 6.2s,
//   17:19, 18:16, 17:55; 11:49 is the end-of-P3 hold) all match here.
//   Overstated: Biolysis clipping 15.8s a minute (per target it's ~48s
//   over the pull; P3's two bosses again); Dissipation drift 3:11 (it
//   counts 6:05-7:40, when Seraph, summoned 5:58, locks Dissipation out
//   until P2's downtime: from 7:09 on, room is 6 and it used 6); Biolysis
//   at 6:06 before the downtime (3 ticks, 46k, a Broil IV's worth; the
//   14:03 one is a dot-clip finding). No damage: overheal, Faerie Gauge
//   overcap, Swiftcast 7/23.
// - Healer DoTs are valued per application against the filler
//   (shared.ts dotFindings with fillerId), not by seconds overwritten.
// - Sage, checked against xivanalysis on dDar482XvFKBPJYh FRU kill (7.1,
//   2026-10-12): its Psyche 16/17 holds (ready 5:10, unused through 41s
//   of targetable boss before P2's downtime); Phlegma III 28/29 holds
//   only as perfect play (the 0:09 opener Phlegma, aligned to burst, put
//   a recharge 1s past the start of P4's downtime), so it isn't counted;
//   its Eukrasian Dosis clipping (24.4s a minute) counts the double casts
//   on P4's two bosses (10:42/10:45, 11:10/11:13, 12:38/12:41) as clips;
//   Addersgall / Addersting are healing resources (Addersgall is drawn on
//   the timeline, gauges.ts). 1 of its 4 interrupted casts (12:55) was
//   the boss going untargetable.
// White Mage is unverified: no sample pull has one.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { gcdKinds, inWindows, mergeWindows } from "../../timeline";
import { aoeOnOneTargetFindings, burstWindowFindings, dotFindings, k } from "./shared";

export const HEAL_WASTE_SHARE = 0.2;
const HEAL_LAND_MS = 1_500;
const HOT_MAX_MS = 30_000;
const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** The healer's damage filler: most-cast damage GCD with no cooldown of its own. */
function filler(ctx: PlayerCheckContext): { id?: number; name: string; value: number } {
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const counts = new Map<number, { name: string; n: number }>();
  for (const u of ctx.uses) {
    if (kinds.get(u.action.id) !== "damage" || u.action.cooldownMs > 2_500) continue;
    const c = counts.get(u.action.id) ?? { name: u.abilityName, n: 0 };
    c.n++;
    counts.set(u.action.id, c);
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  return top ? { id: top[0], name: top[1].name, value: ctx.values.perUse(top[0]) } : { name: "damage GCD", value: 0 };
}

const healGcds: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const heals = ctx.player.healing.filter((e) => e.healType === undefined || e.healType === "heal");
  const absorbs = ctx.pull.players.flatMap((p) => (p.shieldAbsorbs ?? []).map((a) => ({ ...a, target: p.name })))
    .filter((a) => a.caster === ctx.player.name);
  const healUses = ctx.uses.filter((u) => u.startMs < ctx.endMs && kinds.get(u.action.id) === "heal");
  if (healUses.length === 0) return out;

  // Shield absorbs credited to the latest cast applying that status to that
  // player: a single-target cast only shields its target, a party cast
  // (targeting the healer or nothing) shields anyone.
  const party = (u: (typeof healUses)[number]) => u.target === undefined || u.target === ctx.player.name;
  const credited = new Map<(typeof healUses)[number], number>();
  for (const a of absorbs) {
    let best: (typeof healUses)[number] | undefined;
    for (const u of healUses) {
      if (!u.action.appliesStatusIds.includes(a.statusId)) continue;
      if (!party(u) && u.target !== a.target) continue;
      if (u.startMs <= a.timestamp && a.timestamp - u.startMs <= HOT_MAX_MS) best = u;
    }
    if (best) credited.set(best, (credited.get(best) ?? 0) + a.amount);
  }

  const fill = filler(ctx);
  const forced = mergeWindows(ctx.forced);
  for (let i = 0; i < healUses.length; i++) {
    const u = healUses[i];
    const landed = u.startMs + u.castMs;
    const next = healUses.slice(i + 1).find((x) => x.action.id === u.action.id)?.startMs ?? Infinity;
    const hotEnd = Math.min(next, landed + HOT_MAX_MS);
    let healed = 0, over = 0;
    for (const h of heals) {
      const direct = h.abilityId === u.action.id && h.timestamp >= u.startMs && h.timestamp <= landed + HEAL_LAND_MS;
      const hot = u.action.appliesStatusIds.includes(h.abilityId) && h.timestamp >= landed && h.timestamp < hotEnd;
      if (!direct && !hot) continue;
      healed += h.amount ?? 0;
      over += h.overheal ?? 0;
    }
    const absorbed = credited.get(u) ?? 0;
    const potential = healed + absorbed + over;
    if (potential <= 0) continue;
    const share = (healed + absorbed) / potential;
    if (share >= HEAL_WASTE_SHARE) continue;
    const isForced = inWindows(u.startMs, forced);
    out.push(finding(ctx, {
      kind: "heal-gcd", startMs: u.startMs, endMs: landed, forced: isForced,
      cause: isForced ? "boss untargetable: the GCD was free" : undefined,
      label: `${u.abilityName} mostly overhealed`,
      lostDamage: fill.value, inference: true,
      basis: `a ${fill.name} (${k(fill.value)} average) instead; whether the heal was needed for safety is the healer's call`,
      detail: `${u.abilityName} at ${clock(u.startMs)}: ${Math.round((1 - share) * 100)}% overheal` +
        (u.action.appliesStatusIds.some((id) => absorbs.some((a) => a.statusId === id)) ? `, shield absorbed ${k(absorbed)}` : ""),
    }));
  }
  return out;
};

// Hardcast AoE damage GCDs: on one target they do less than the filler,
// which takes the same cast (Gravity II 130 potency vs Fall Malefic 270;
// xivanalysis flagged 3 on jN3XDrf2z8PmLgRJ Vamp pull 8, all found).
// Each cast whose hits reached a single enemy loses the filler's average
// minus what it dealt. The instant ones (Dyskrasia II, Art of War II) are
// left out: they're what a healer presses while moving, when the filler
// isn't an option, so the filler overstates the loss.
const AOE_GCD_KEYS = ["GRAVITY", "GRAVITY_II", "HOLY", "HOLY_III"];
const aoeOnOneTarget: JobCheck = (ctx) => {
  const fill = filler(ctx);
  return aoeOnOneTargetFindings(ctx, AOE_GCD_KEYS.filter((key) => A[key]).map((key) => A[key].id), () => fill);
};

const dot = (key: string, ...more: string[]): JobCheck => (ctx) => dotFindings(ctx, {
  statusIds: [key, ...more].map((x) => S[x].id),
  name: S[key].name,
  durationMs: S[key].duration ?? 30_000,
  fillerId: (c) => {
    const f = filler(c);
    return f.id === undefined ? undefined : { id: f.id, name: f.name };
  },
});

const divination: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.DIVINATION.id,
  name: "Divination",
  bonus: 0.06,
  bonusBasis: "Divination is +6% (FFLogs multiplier with Technical Finish: 1.11)",
  expectedGcds: () => 8,
  expected: () => [
    { ids: [A.LORD_OF_CROWNS.id], count: 1, name: "Lord of Crowns" },
    { ids: [A.ORACLE.id], count: 1, name: "Oracle" },
    // Combust deals no direct damage: a refresh inside Divination is worth
    // its ten ticks snapshotting the +6%.
    { ids: [A.COMBUST_III.id], count: 1, name: "Combust III", value: (c) => avgTick(c, S.COMBUST_III.id) * 10 * 0.06 },
  ],
});

function avgTick(ctx: PlayerCheckContext, statusId: number): number {
  const ticks = ctx.player.damageDone.filter((e) => e.abilityId === statusId);
  return ticks.length ? ticks.reduce((a, e) => a + (e.amount ?? 0), 0) / ticks.length : 0;
}

export const SCH_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("BIOLYSIS")];
// Astrologian cards. Astral Draw gives The Balance (Play I) and Lord of
// Crowns, Umbral Draw The Spear; the next Draw replaces what's unplayed
// (xivanalysis's Draw "used when there was an available Play I or Lord of
// Crowns"). A card is lost when no play of it came between its draw and
// the next one. The Balance / The Spear are worth what one play of them
// added to the party in this pull (the buff ledger's share of each hit
// under them ÷ plays); Lord of Crowns its own average. The first card can
// come from a pre-pull draw: plays before the first Draw are its. A draw
// with no later one is left alone (the pull ended). Forced when the draw
// and the next one were all forced time (nothing to play it on).
// dDar482XvFKBPJYh FRU kill: The Balance from the 17:19 Astral Draw
// was never played; the 18:19 Umbral Draw replaced it before the 18:27
// Divination.
const CARD_FORCED_SLACK_MS = 2_500;
const cards: JobCheck = (ctx): DamageFinding[] => {
  const astral = A.ASTRAL_DRAW?.id, umbral = A.UMBRAL_DRAW?.id;
  if (astral === undefined || umbral === undefined) return [];
  const draws = ctx.player.casts.filter((c) => c.abilityId === astral || c.abilityId === umbral)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (draws.length < 2) return [];
  const playsOf = (actionId: number) => ctx.player.casts.filter((c) => c.abilityId === actionId).map((c) => c.timestamp);
  // What one play of a party card added: its share of every hit under it.
  const cardValue = (statusId: number, actionId: number) => {
    const plays = playsOf(actionId).filter((t) => t < ctx.endMs).length;
    if (!ctx.ledger || plays === 0) return 0;
    let added = 0;
    for (const p of ctx.pull.players) {
      for (const e of p.damageDone) {
        if (e.timestamp >= ctx.endMs || !e.statusIds?.includes(statusId)) continue;
        added += (e.amount ?? 0) * ctx.ledger.share(statusId, p);
      }
    }
    return added / plays;
  };
  const kinds = [
    { draw: astral, action: A.THE_BALANCE.id, status: S.THE_BALANCE.id, name: "The Balance" },
    { draw: umbral, action: A.THE_SPEAR.id, status: S.THE_SPEAR.id, name: "The Spear" },
    { draw: astral, action: A.LORD_OF_CROWNS.id, status: undefined, name: "Lord of Crowns" },
  ];
  const forced = mergeWindows(ctx.forced);
  const out: DamageFinding[] = [];
  for (const kind of kinds) {
    const plays = playsOf(kind.action);
    const value = kind.status !== undefined ? cardValue(kind.status, kind.action) : ctx.values.perUse(kind.action);
    if (value <= 0) continue;
    for (let i = 0; i < draws.length - 1; i++) {
      const d = draws[i], next = draws[i + 1];
      if (d.abilityId !== kind.draw || d.timestamp >= ctx.endMs) continue;
      if (plays.some((t) => t >= d.timestamp && t < next.timestamp)) continue;
      const span = next.timestamp - d.timestamp;
      let covered = 0;
      for (const f of forced) covered += Math.max(0, Math.min(f.endMs, next.timestamp) - Math.max(f.startMs, d.timestamp));
      const isForced = span - covered < CARD_FORCED_SLACK_MS;
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: d.timestamp, endMs: next.timestamp, forced: isForced,
        cause: isForced ? "nothing to play it on between the draws" : undefined,
        label: `${kind.name} not played`,
        lostDamage: value, inference: true,
        basis: kind.status !== undefined
          ? `${k(value)}: what one ${kind.name} added to the party in this pull (its share of every hit under it ÷ plays)`
          : `${k(value)} average ${kind.name}`,
        detail: `${kind.name} from the ${d.abilityName} at ${clock(d.timestamp)} wasn't played before the ${next.abilityName} at ${clock(next.timestamp)} replaced it`,
      }));
    }
  }
  return out;
};

export const AST_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("COMBUST_III"), divination, cards];
export const WHM_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("DIA")];
export const SGE_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("EUKRASIAN_DOSIS_III", "EUKRASIAN_DYSKRASIA")];
