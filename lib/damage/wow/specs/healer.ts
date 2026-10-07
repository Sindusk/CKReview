// lib/damage/wow/specs/healer.ts
//
// Healer checks (docs/archive/damage-analysis-plan.md, "WoW build order" step 6,
// second role batch, 2026-10-06). The FFXIV study's biggest gap was
// healers' extra heal GCDs (docs/dps-analysis.md), so the headline is the
// same as FFXIV's (lib/damage/ffxiv/jobs/healer.ts): what each heal GCD
// actually healed. Which specs: Holy Priest (12 sample players),
// Restoration Druid (10), Holy Paladin, Restoration Shaman, Preservation
// Evoker (9 each), Mistweaver (2, unverified); Discipline isn't in any
// sample (unverified).
//
// ── Heal GCDs ──────────────────────────────────────────────────────────
// WCL's healing stream (kGVX7tafBT2pM1N3 pull 19): `heal` events carry
// amount and overheal (the raid overhealed 522M against 572M effective);
// `absorbed` events are shields that took damage (128M). A shield that
// expires unused leaves no amount, so wasted shields aren't visible.
// For each heal GCD (timeline.ts gcdKinds), its healing is every event of
// the same spell name (Prayer of Mending heals under another id than its
// cast) by the player:
// - from the cast landing (begin + cast time) until the next cast of that
//   spell, at most HOT_MAX_MS, so HoT ticks count
// - on the cast's own target, unless the spell landed on several players
//   within HEAL_LAND_MS (Wild Growth, Chain Heal): then on anyone. Several
//   Rejuvenations run at once on different players; matching the target
//   keeps each one's ticks apart.
// Effective share = (healed + absorbed) ÷ (that + overheal). Under
// HEAL_WASTE_SHARE it's a wasted heal GCD, valued at the healer's damage
// filler (their most-cast damage GCD), marked inference: whether the heal
// was needed for safety is the healer's call. Grouped per spell per phase
// (WoW healers press ~300 GCDs a pull). A heal GCD in forced time is
// forced.
//
// Not judged: DoTs (WoW healers aren't expected to keep them up) and Power
// Infusion's recast (its casts log in pairs 1ms apart; the measured median
// interval, 23s, is no recast).

import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { gcdKinds, inWindows, mergeWindows } from "../../timeline";
import { k } from "./shared";

export const HEAL_WASTE_SHARE = 0.2;
const HEAL_LAND_MS = 1_500;
const HOT_MAX_MS = 30_000;

function filler(ctx: PlayerCheckContext): { name: string; value: number } {
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const counts = new Map<number, { name: string; n: number }>();
  for (const u of ctx.uses) {
    if (kinds.get(u.action.id) !== "damage") continue;
    const c = counts.get(u.action.id) ?? { name: u.abilityName, n: 0 };
    c.n++;
    counts.set(u.action.id, c);
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  return top ? { name: top[1].name, value: ctx.values.perUse(top[0]) } : { name: "damage GCD", value: 0 };
}

const healGcds: JobCheck = (ctx): DamageFinding[] => {
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const healUses = ctx.uses.filter((u) => u.startMs < ctx.endMs && kinds.get(u.action.id) === "heal");
  if (healUses.length === 0) return [];
  const byName = new Map<string, typeof ctx.player.healing>();
  for (const h of ctx.player.healing) {
    if ((h.amount ?? 0) <= 0 && (h.overheal ?? 0) <= 0) continue;
    const list = byName.get(h.abilityName) ?? [];
    list.push(h);
    byName.set(h.abilityName, list);
  }
  const fill = filler(ctx);
  const forced = mergeWindows(ctx.forced);
  type Group = { name: string; phaseId?: number; wasted: number; casts: number; start: number; end: number; over: number; forced: number };
  const groups = new Map<string, Group>();
  for (let i = 0; i < healUses.length; i++) {
    const u = healUses[i];
    const events = byName.get(u.abilityName) ?? [];
    const landed = u.startMs + u.castMs;
    const firstWave = events.filter((h) => h.timestamp >= landed - 100 && h.timestamp <= landed + HEAL_LAND_MS);
    const aoe = new Set(firstWave.map((h) => h.target)).size > 1 || u.target === undefined;
    const next = healUses.slice(i + 1).find((x) => x.abilityName === u.abilityName && (aoe || x.target === u.target))?.startMs ?? Infinity;
    const end = Math.min(next, landed + HOT_MAX_MS);
    let healed = 0, over = 0;
    for (const h of events) {
      if (h.timestamp < landed - 100 || h.timestamp >= end) continue;
      if (!aoe && h.target !== u.target) continue;
      healed += h.amount ?? 0;
      over += h.overheal ?? 0;
    }
    const phaseId = ctx.phaseOf(u.startMs);
    const key = `${u.abilityName}|${phaseId}`;
    const g = groups.get(key) ?? { name: u.abilityName, phaseId, wasted: 0, casts: 0, start: u.startMs, end: u.startMs, over: 0, forced: 0 };
    g.casts++;
    groups.set(key, g);
    const potential = healed + over;
    if (potential <= 0 || healed / potential >= HEAL_WASTE_SHARE) continue;
    if (inWindows(u.startMs, forced)) { g.forced++; continue; }
    g.wasted++; g.over += over; g.end = u.startMs;
  }
  const out: DamageFinding[] = [];
  for (const g of groups.values()) {
    if (g.wasted === 0) continue;
    out.push(finding(ctx, {
      kind: "heal-gcd", startMs: g.start, endMs: g.end, forced: false,
      label: `${g.name} mostly overhealed`,
      lostDamage: g.wasted * fill.value, inference: true,
      basis: `${g.wasted} × a ${fill.name} (${k(fill.value)} average) instead; whether the heal was needed for safety is the healer's call`,
      detail: `${g.name}: ${g.wasted} of ${g.casts} casts under ${Math.round(HEAL_WASTE_SHARE * 100)}% effective in ${ctx.phaseName(g.phaseId) ?? "the pull"} ` +
        `(${k(g.over)} overheal)${g.forced ? `; ${g.forced} more during forced time` : ""}`,
    }));
  }
  return out;
};

export const HEALER_CHECKS: JobCheck[] = [healGcds];
