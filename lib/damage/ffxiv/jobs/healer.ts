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
//   higher than ours because ours is per target: a refresh on another
//   enemy isn't a clip.
// White Mage and Sage are unverified: no sample pull has either.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { gcdKinds, inWindows, mergeWindows } from "../../timeline";
import { burstWindowFindings, dotFindings, k } from "./shared";

export const HEAL_WASTE_SHARE = 0.2;
const HEAL_LAND_MS = 1_500;
const HOT_MAX_MS = 30_000;
const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** The healer's damage filler: most-cast damage GCD with no cooldown of its own. */
function filler(ctx: PlayerCheckContext): { name: string; value: number } {
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const counts = new Map<number, { name: string; n: number }>();
  for (const u of ctx.uses) {
    if (kinds.get(u.action.id) !== "damage" || u.action.cooldownMs > 2_500) continue;
    const c = counts.get(u.action.id) ?? { name: u.abilityName, n: 0 };
    c.n++;
    counts.set(u.action.id, c);
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  return top ? { name: top[1].name, value: ctx.values.perUse(top[0]) } : { name: "damage GCD", value: 0 };
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
const AOE_HIT_MS = 1_500;

const aoeOnOneTarget: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const aoe = new Set(AOE_GCD_KEYS.filter((key) => A[key]).map((key) => A[key].id));
  const fill = filler(ctx);
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  uses.forEach((u, i) => {
    if (!aoe.has(u.action.id)) return;
    const landed = u.startMs + u.castMs;
    const until = Math.min(uses[i + 1]?.startMs ?? Infinity, landed + AOE_HIT_MS);
    const hits = ctx.player.damageDone.filter((e) => e.abilityId === u.action.id && e.timestamp >= u.startMs && e.timestamp < until);
    const targets = new Set(hits.map((e) => `${e.targetActorId ?? e.target}.${e.targetInstance ?? 1}`));
    if (targets.size !== 1) return;
    const dealt = hits.reduce((a, e) => a + (e.amount ?? 0), 0);
    if (dealt >= fill.value) return;
    out.push(finding(ctx, {
      kind: "aoe-single", startMs: u.startMs, endMs: landed, forced: false,
      label: `${u.abilityName} on one target`,
      lostDamage: fill.value - dealt,
      basis: `${k(fill.value)} average ${fill.name} − ${k(dealt)} this ${u.abilityName} dealt`,
      detail: `${u.abilityName} hit only ${hits[0].target ?? "one enemy"}`,
    }));
  });
  return out;
};

const dot = (key: string, ...more: string[]): JobCheck => (ctx) => dotFindings(ctx, {
  statusIds: [key, ...more].map((x) => S[x].id),
  name: S[key].name,
  durationMs: S[key].duration ?? 30_000,
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
export const AST_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("COMBUST_III"), divination];
export const WHM_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("DIA")];
export const SGE_CHECKS: JobCheck[] = [healGcds, aoeOnOneTarget, dot("EUKRASIAN_DOSIS_III", "EUKRASIAN_DYSKRASIA")];
