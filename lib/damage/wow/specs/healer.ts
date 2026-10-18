// lib/damage/wow/specs/healer.ts
//
// Healer checks (docs/archive/damage-analysis-plan.md, "WoW build order" step 6,
// second role batch, 2026-10-06). The FFXIV study's biggest gap was
// healers' extra heal GCDs (docs/dps-analysis.md), so the headline is the
// same as FFXIV's (lib/damage/ffxiv/jobs/healer.ts): what each heal GCD
// actually healed. Which specs: Holy Priest (12 sample players),
// Restoration Druid (10), Holy Paladin, Restoration Shaman, Preservation
// Evoker (9 each), Mistweaver (2 in the survey; 14 on 13 reports in the
// WoWAnalyzer audit, 2026-10-17, below); Discipline (10 player-pulls since
// the audit's phase 3, below). Mistweaver's one damage check of its own is
// Celestial Conduit drift, the healing Priests' Power Infusion drift
// (tracked-cooldowns.ts). Holy Priest has the heal-GCD check off (below).
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
// Not judged: DoTs (WoW healers aren't expected to keep them up).
// Power Infusion's casts log in pairs 0–50ms apart (with Twins of the Sun
// Priestess: one on the ally, one on the priest), which made the survey's
// median interval 23s; deduplicated (TrackedCooldown.twinCastMs) it's a
// clean 120s recast, judged by drift since 2026-10-17. Preservation's Echo (364343, from
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
//
// Mistweaver's filler: Rushing Wind Kick (cast 467307) hits as 468179, so
// by id it's never a damage GCD; the filler is Tiger Palm or Blackout Kick
// (5–13k) when pressed, else none, and heal GCDs price at 0 on 14 of
// Abuki's 16 pulls. That is about right: a Mistweaver's spare GCD is a
// Tiger Palm, since the kick is already pressed on cooldown. Matching hits
// by name instead was measured and not adopted: it makes the kick the
// filler (47–70k), and for other healers it picks cooldowns (Lava Burst
// over Flame Shock for Resto Shamans, ~2×; Fire Breath for Preservation).
//
// ── Fillers per spec (WoWAnalyzer audit phase 3, 2026-10-17) ───────────
// The most-cast damage GCD is a cooldown for three specs, so fillerFor()
// names the press a spare GCD really buys. Measured on 10 Discipline,
// 18 Holy Paladin and 23 Holy Priest player-pulls, top ones from the
// Vashnik HPS rankings (99–100th) and the samples on disk.
// - Holy Paladin: every damage press has a cooldown (Judgment, Hammer of
//   Wrath, Holy Shock) and Crusader Strike was pressed 0 times on 109
//   player-pulls, so a heal GCD buys nothing. Top paladins don't even keep
//   Judgment rolling (median interval 9–17s, against 5–8s for weaker
//   ones). Priced at a Judgment, the check read 0.25–2.27M on the top three
//   (Neuropala 1Rx3cDy2fF6jpPVk 2.26M against 1.86M of damage in all) and
//   up to 2.0M on weaker ones (荼茶荼茶 wPmFHVKRQb31X97z), a third of some
//   players' damage. The one damage alternative left: an overhealed Holy
//   Power heal (Eternal Flame, Word of Glory, Light of Dawn) could have
//   been a Shield of the Righteous (20–44k), counted only within
//   SOTR_MELEE_MS of one of the paladin's own Shields (in melee then). Now
//   0–133k a pull (Drpippen zdyhBj7pxWG6A8QZ 133k: 5 Shields' worth); the
//   top three 0–20k.
// - Discipline: Smite outside Entropic Rift, Void Blast inside it (93–98%
//   of Void Blasts land in the Rift, up 62–72% of a pull; Smite 18–25k,
//   Void Blast 40–53k). Power Word: Radiance and Flash Heal aren't judged:
//   both are Atonement applicators. Radiance read 80–301k on every
//   Discipline player (its 0%-effective casts are the pre-damage ramps at
//   0:00–0:13); Flash Heal read most on the 100th-percentile Jennerpriest
//   (jPcLX7zyn8m42rGg, 601k: 12 of 24 under 20%, all 13 wasted ones free
//   Surge of Light casts, with 855k of Atonement healing on their targets
//   in the next 15s), 78–245k on the others. The fetch keeps too few
//   Atonement buff events to price the applications themselves.
// - Holy Priest: Smite only (Holy Nova at 204k, Holy Fire at 106k and
//   Shadow Word: Pain had been picked as fillers). Even at Smite the check
//   fired on the top players as much as on the weak, so it's off for the
//   spec, pending the user's review: 4.24M on Jakbcastin
//   (HfLB17FvWJbCA4yM, 100th) and 4.31M on Chai (1ZtTkMm4qfF9KBPw, 100th),
//   about 9× their own damage (0.46–0.53M; Smite 0.5 a minute), Tobii
//   (Z7gYXjnQzR6JkpD8) 1.31M; weaker players 0–3.6M. Benediction (pressed
//   11–14 a minute by every Holy Priest) was the largest part, and Echo of
//   Light, their top heal source, logs under its own name, so each heal's
//   own effective share reads low.

import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { gcdKinds, inWindows, mergeWindows, statusWindows, type GcdUse } from "../../timeline";
import { k } from "./shared";

export const HEAL_WASTE_SHARE = 0.2;
const HEAL_LAND_MS = 1_500;
const HOT_MAX_MS = 30_000;
const NOT_JUDGED = new Set([364343]);   // Echo: its value is the copied heal
// Per spec: Discipline's Power Word: Radiance (194509) and Flash Heal
// (2061, Holy Priest's too) are Atonement applicators, judged by what the
// Atonement heals after them, not by their own heal (header).
const NOT_JUDGED_FOR: Record<string, Set<number>> = {
  "Discipline Priest": new Set([194509, 2061]),
};
// Never a filler: Touch of Death (322109, a 90–180s execute). Abuki's one
// press (282k) priced 40 Vivifies and 4 Enveloping Mists at 12.4M on
// gVDPhzp61Zm29HMw Coiled Altar Pull 1; at his Blackout Kick (9k) it's
// 0.38M (WoWAnalyzer audit, 2026-10-17).
const NOT_FILLER = new Set([322109]);

// Per-spec fillers (header, "Fillers per spec"). Ids from the masterData of
// jPcLX7zyn8m42rGg and 2tCKk8xfM1Wbzj6c.
const SMITE = 585;
const VOID_BLAST = 450215;          // Discipline (Voidweaver), only inside Entropic Rift
const ENTROPIC_RIFT = 450193;       // the Discipline Priest's own buff while the Rift is out
const SHIELD_OF_THE_RIGHTEOUS = 415091;   // Holy Paladin's damage spender
// Holy Paladin's Holy Power spenders that heal: Eternal Flame, Word of
// Glory, Light of Dawn. An overhealed one could have been a Shield of the
// Righteous.
const HOLY_POWER_HEALS = new Set([156322, 85673, 85222]);
// ...but only near one of the paladin's own Shields of the Righteous: one
// within this long either side shows them in melee range then.
const SOTR_MELEE_MS = 10_000;

type Filler = { name: string; value: number };

function filler(ctx: PlayerCheckContext): Filler {
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const counts = new Map<number, { name: string; n: number }>();
  for (const u of ctx.uses) {
    if (kinds.get(u.action.id) !== "damage" || NOT_FILLER.has(u.action.id)) continue;
    const c = counts.get(u.action.id) ?? { name: u.abilityName, n: 0 };
    c.n++;
    counts.set(u.action.id, c);
  }
  const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  return top ? { name: top[1].name, value: ctx.values.perUse(top[0]) } : { name: "damage GCD", value: 0 };
}

/** What a spare GCD at a heal use would have dealt instead, per spec. */
function fillerFor(ctx: PlayerCheckContext): (u: GcdUse) => Filler {
  const smite = ctx.values.perUse(SMITE);
  if (ctx.job === "Discipline Priest") {
    const vb = ctx.values.perUse(VOID_BLAST);
    const rift = statusWindows(ctx.player, new Set([ENTROPIC_RIFT]), ctx.endMs);
    const outside: Filler = smite > 0 ? { name: "Smite", value: smite } : filler(ctx);
    const inside: Filler = { name: "Void Blast", value: vb };
    return (u) => (vb > 0 && inWindows(u.startMs, rift) ? inside : outside);
  }
  if (ctx.job === "Holy Priest") {
    const f: Filler = { name: smite > 0 ? "Smite" : "Smite, never pressed this pull", value: smite };
    return () => f;
  }
  if (ctx.job === "Holy Paladin") {
    const sotr = ctx.values.perUse(SHIELD_OF_THE_RIGHTEOUS);
    const sotrAt = ctx.player.casts.filter((c) => c.abilityId === SHIELD_OF_THE_RIGHTEOUS).map((c) => c.timestamp);
    const none: Filler = { name: "no damage press free of a cooldown", value: 0 };
    const spend: Filler = { name: "Shield of the Righteous", value: sotr };
    return (u) => (HOLY_POWER_HEALS.has(u.action.id) && sotr > 0 &&
      sotrAt.some((t) => Math.abs(t - u.startMs) <= SOTR_MELEE_MS) ? spend : none);
  }
  const f = filler(ctx);
  return () => f;
}

const healGcds: JobCheck = (ctx): DamageFinding[] => {
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  const skip = NOT_JUDGED_FOR[ctx.job];
  const healUses = ctx.uses.filter((u) => u.startMs < ctx.endMs && kinds.get(u.action.id) === "heal" &&
    !NOT_JUDGED.has(u.action.id) && !skip?.has(u.action.id));
  if (healUses.length === 0) return [];
  const byName = new Map<string, typeof ctx.player.healing>();
  for (const h of ctx.player.healing) {
    if ((h.amount ?? 0) <= 0 && (h.overheal ?? 0) <= 0) continue;
    const list = byName.get(h.abilityName) ?? [];
    list.push(h);
    byName.set(h.abilityName, list);
  }
  const fillAt = fillerFor(ctx);
  const forced = mergeWindows(ctx.forced);
  type Group = {
    name: string; phaseId?: number; wasted: number; casts: number; start: number; end: number; over: number; forced: number;
    lost: number; by: Map<string, { n: number; value: number }>;
  };
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
    const g = groups.get(key) ?? {
      name: u.abilityName, phaseId, wasted: 0, casts: 0, start: u.startMs, end: u.startMs, over: 0, forced: 0, lost: 0, by: new Map(),
    };
    g.casts++;
    groups.set(key, g);
    const potential = healed + over;
    if (potential <= 0 || healed / potential >= HEAL_WASTE_SHARE) continue;
    if (inWindows(u.startMs, forced)) { g.forced++; continue; }
    g.wasted++; g.over += over; g.end = u.startMs;
    const f = fillAt(u);
    g.lost += f.value;
    const b = g.by.get(f.name) ?? { n: 0, value: f.value };
    b.n++;
    g.by.set(f.name, b);
  }
  const out: DamageFinding[] = [];
  for (const g of groups.values()) {
    if (g.wasted === 0) continue;
    const instead = [...g.by.entries()]
      .map(([name, b]) => (b.value > 0 ? `${b.n} × a ${name} (${k(b.value)} average)` : `${b.n} × nothing (${name})`)).join(" + ");
    out.push(finding(ctx, {
      kind: "heal-gcd", startMs: g.start, endMs: g.end, forced: false,
      label: `${g.name} mostly overhealed`,
      lostDamage: g.lost, inference: true,
      basis: `${instead} instead; whether the heal was needed for safety is the healer's call`,
      detail: `${g.name}: ${g.wasted} of ${g.casts} casts under ${Math.round(HEAL_WASTE_SHARE * 100)}% effective in ${ctx.phaseName(g.phaseId) ?? "the pull"} ` +
        `(${k(g.over)} overheal)${g.forced ? `; ${g.forced} more during forced time` : ""}`,
    }));
  }
  return out;
};

export const HEALER_CHECKS: JobCheck[] = [healGcds];

// Holy Priest: the heal-GCD check is off (header, "Holy Priest"), pending
// the user's review. Power Infusion drift (tracked-cooldowns.ts) and the
// generic checks still run.
export const HOLY_PRIEST_CHECKS: JobCheck[] = [];
