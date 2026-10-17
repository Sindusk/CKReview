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
// interval, 23s, is no recast). Preservation's Echo (364343, from
// VWMbYPRyxCAmhZFj's masterData) isn't judged either: its own small heal
// isn't its value, the copy of the next heal is, and that logs under the
// copied spell's name. Judged by its own heal it read 0.8–2.0M a kill on
// three top Preservations (Drizzy VWMbYPRyxCAmhZFj, Tsonge and
// Pelinmerkkii baRCnPv62YQ1dJZN; WoWAnalyzer audit, 2026-10-17).
//
// Mistweaver's GCD (settled 2026-10-17, WoWAnalyzer audit phase 3, seven
// Mistweavers on six reports and the static's Abuki on gVDPhzp61Zm29HMw):
// the survey's observed 740ms (spell-data.ts observedGcdMs) is Rushing Wind
// Kick's and Soothing Mist's own short GCD (the next press p25 0.74–0.76s),
// not the base: after a Renewing Mist or Vivify it's 0.84–0.97s, the
// ordinary 1.5s hasted GCD. Rushing Wind Kick sat on the haste fit's
// short-GCD threshold and dragged some bases to 0.77s (haste.ts
// SHORT_GCD_IDS now lists both). The survey also missed Sheilun's Gift,
// Detox, Revival and Mana Tea's channel (game.ts), which read as idle: GCD
// uptime moved 48–82% → 65–89% (Karambicaak 6kHtGaQXCMWYxFpZ 48 → 83%,
// Chiyune ZjVtM1vFcrp7w3WC 73 → 89%, Abuki's 16 pulls +0–9 points), and
// gap + delay loss fell by up to 93% a pull (Karambicaak 3.73M → 0.28M;
// Abuki Vashnik Pull 4 1.61M → 0.99M). Tiger Palm and Blackout Kick take
// Windwalker's fixed 1.0s lock (the action table is per id, not per spec):
// a Mistweaver's is ~0.87s, so idle after them is undercounted (lenient).

import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { gcdKinds, inWindows, mergeWindows } from "../../timeline";
import { k } from "./shared";

export const HEAL_WASTE_SHARE = 0.2;
const HEAL_LAND_MS = 1_500;
const HOT_MAX_MS = 30_000;
const NOT_JUDGED = new Set([364343]);   // Echo: its value is the copied heal

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
  const healUses = ctx.uses.filter((u) => u.startMs < ctx.endMs && kinds.get(u.action.id) === "heal" && !NOT_JUDGED.has(u.action.id));
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
