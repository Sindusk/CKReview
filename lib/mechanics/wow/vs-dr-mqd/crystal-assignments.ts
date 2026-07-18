// lib/mechanics/wow/vs-dr-mqd/crystal-assignments.ts
//
// Detects the raid's Dawn Crystal carry assignments for Midnight Falls,
// aggregated across every pull of a report. Feeds the Strategy dialog —
// REPORT-level strategy detection like terminate-kicks.ts, not per-pull
// error detection (midnightfalls.ts consumes the DECLARED assignment
// below for its Radiance / accidental-pickup errors).
//
// ── HOW THE MECHANIC LOGS (reverse-engineered from xvQbZ6Cwkm1XaHPD's 42
//    pulls, 2026-07-17) ─────────────────────────────────────────────────
//
// Six Dawn Crystals spawn in two waves of three, and carrying one shows
// as the 1253031 "Glimmering" debuff (applydebuff = pickup, removedebuff
// = drop or death-strip):
//
//   wave 1 crystals: picked up ~+15-25   — Religiouspp / Neptune / Cococaines
//   wave 2 crystals: picked up ~+84-91   — Sindusk / Cocoroach / Polpo
//   ~+177-189 (heading into the Total Eclipse intermission) two carriers
//   hand off to the tanks:  Polpo → Legionshifts, Cocoroach → Veinglas
//
// Assigned carriers hold their crystal continuously until the intermission
// (~+190); after Total Eclipse the crystals get juggled deliberately
// (constant hot-potato in every long pull), so nothing after intermission
// says anything about assignment. A crystal left on the ground for ~6s
// starts pulsing raid-wide ramping "Radiance" (1282458) damage — that
// per-pull consequence is handled in midnightfalls.ts.
//
// Detection here: per pull, credit each wave's STABLE holders (held ≥25s,
// or held until their own death / the pull's end — short grabs are the
// accidental pickups midnightfalls.ts flags, not assignment evidence),
// rank by pull count, take the top three per wave. The intermission swap
// is detected from drops at ~+165-195 answered within 10s by a pickup
// from someone outside both trios. The declared assignment below is then
// re-validated against the detection (kick-chain pattern): if they agree
// the dialog shows the declared strategy; a contradiction (roster swap,
// different raid) falls back to the raw detected holders.

import type { PlayerInfo } from "@/types/PlayerInfo";

const GLIMMERING_ID = 1253031;

// Wave-1 crystal pickups land ~+15-25 and wave-2 ~+84-91; these windows
// bound which wave a pickup's crystal belongs to. WAVE_BOUNDARY_MS also
// serves midnightfalls.ts as the set-1/set-2 divider for chain origins.
export const CRYSTAL_WAVE_BOUNDARY_MS = 80000;
// Assignment evidence ends at the intermission — Total Eclipse completes
// ~+190.6 and the deliberate crystal juggling starts immediately after.
const ASSIGNMENT_CUTOFF_MS = 190000;
// A holder is "stable" (assignment evidence) after this much continuous
// carry; every observed accidental grab was returned or lost sooner
// except multi-minute covers, which the return-to-assigned check in
// midnightfalls.ts handles separately.
const STABLE_HOLD_MS = 25000;
// Intermission handoff: assigned DPS drop ~+177-189 and the receiving
// tank picks up within ~0-3s.
const SWAP_WINDOW_START_MS = 165000;
const SWAP_WINDOW_END_MS   = 195000;
const SWAP_PICKUP_GAP_MS   = 10000;
const CRYSTALS_PER_WAVE    = 3;

// Declared assignment (derived from this capture, 2026-07-17): the same
// six players carry in every clean pull, and the same two tanks receive
// the intermission handoffs. Used directly by midnightfalls.ts's
// Radiance attribution and accidental-pickup errors (per-pull detection
// can't aggregate across a report), and validated against the live
// detection for the Strategy dialog.
export const KNOWN_CRYSTAL_ASSIGNMENTS = {
  set1: ["Religiouspp", "Neptune", "Cococaines"],
  set2: ["Sindusk", "Cocoroach", "Polpo"],
  intermissionSwaps: [
    { from: "Polpo",     to: "Legionshifts" },
    { from: "Cocoroach", to: "Veinglas" },
  ],
};

export type CrystalSlot = {
  player:     string;
  className?: string;
  specId?:    number;
  pullsSeen:  number;   // pulls in which they were a stable holder of this wave
};

export type CrystalSwap = {
  from:      CrystalSlot;
  to:        CrystalSlot;
  pullsSeen: number;    // pulls in which this exact handoff was observed
};

export type CrystalAssignmentStrategy = {
  pullsAnalyzed:   number;        // pulls with at least one Glimmering pickup
  set1:            CrystalSlot[]; // top wave-1 holders (max 3)
  set2:            CrystalSlot[]; // top wave-2 holders (max 3)
  swaps:           CrystalSwap[]; // detected intermission handoffs
  // True when detection agrees with KNOWN_CRYSTAL_ASSIGNMENTS (trios match
  // as sets, each declared swap is the majority handoff for its dropper).
  matchesDeclared: boolean;
};

type Transition = { t: number; player: PlayerInfo; type: "pickup" | "drop" };

export function detectCrystalAssignments(
  pulls: Array<{ players: PlayerInfo[] }>
): CrystalAssignmentStrategy | null {
  const set1Counts = new Map<string, { player: PlayerInfo; pulls: number }>();
  const set2Counts = new Map<string, { player: PlayerInfo; pulls: number }>();
  const swapCounts = new Map<string, { from: PlayerInfo; to: PlayerInfo; pulls: number }>();
  let pullsAnalyzed = 0;

  for (const pull of pulls) {
    const transitions: Transition[] = [];
    let pullEnd = 0;
    for (const p of pull.players ?? []) {
      for (const d of p.debuffs ?? []) {
        if (d.abilityId !== GLIMMERING_ID) continue;
        if (d.debuffStatus === "applied") transitions.push({ t: d.timestamp, player: p, type: "pickup" });
        if (d.debuffStatus === "removed") transitions.push({ t: d.timestamp, player: p, type: "drop" });
      }
      for (const h of p.damageTaken ?? []) if (h.timestamp > pullEnd) pullEnd = h.timestamp;
    }
    if (!transitions.some((tr) => tr.type === "pickup")) continue;
    pullsAnalyzed++;
    transitions.sort((a, b) => a.t - b.t);

    // Stable holders per wave: pair each pickup with the same player's next
    // drop (or the pull's end if they never dropped).
    const stable1 = new Set<string>();
    const stable2 = new Set<string>();
    for (const tr of transitions) {
      if (tr.type !== "pickup" || tr.t >= ASSIGNMENT_CUTOFF_MS) continue;
      const drop = transitions.find(
        (d) => d.type === "drop" && d.player.name === tr.player.name && d.t > tr.t
      );
      const heldUntil = drop ? drop.t : pullEnd;
      if (heldUntil - tr.t < STABLE_HOLD_MS) continue;
      (tr.t < CRYSTAL_WAVE_BOUNDARY_MS ? stable1 : stable2).add(tr.player.name);
      const counts = tr.t < CRYSTAL_WAVE_BOUNDARY_MS ? set1Counts : set2Counts;
      const c = counts.get(tr.player.name) ?? { player: tr.player, pulls: 0 };
      if (!counts.has(tr.player.name)) counts.set(tr.player.name, c);
    }
    for (const name of stable1) set1Counts.get(name)!.pulls++;
    for (const name of stable2) set2Counts.get(name)!.pulls++;

    // Intermission handoffs: a stable wave-2 holder VOLUNTARILY dropping in
    // the swap window (drops within ~1.5s of a fatal overkill hit are
    // death-strips, not handoffs — deaths aren't passed in here, but every
    // fatal hit carries overkill in damageTaken), answered within 10s by a
    // pickup from someone who held no stable crystal this pull. Requiring a
    // stable dropper + non-stable receiver filters the wipe scrambles that
    // otherwise dominate this window.
    const diedNear = (p: PlayerInfo, t: number) =>
      (p.damageTaken ?? []).some((h) => (h.overkill ?? 0) > 0 && Math.abs(h.timestamp - t) <= 1500);
    for (const drop of transitions) {
      if (drop.type !== "drop" || drop.t < SWAP_WINDOW_START_MS || drop.t > SWAP_WINDOW_END_MS) continue;
      if (!stable2.has(drop.player.name)) continue;
      if (diedNear(drop.player, drop.t)) continue;
      const pickup = transitions.find(
        (pk) => pk.type === "pickup" && pk.t >= drop.t && pk.t - drop.t <= SWAP_PICKUP_GAP_MS &&
          pk.player.name !== drop.player.name &&
          !stable1.has(pk.player.name) && !stable2.has(pk.player.name)
      );
      if (!pickup) continue;
      const key = `${drop.player.name}→${pickup.player.name}`;
      const c = swapCounts.get(key) ?? { from: drop.player, to: pickup.player, pulls: 0 };
      c.pulls++;
      swapCounts.set(key, c);
    }
  }

  if (pullsAnalyzed === 0) return null;

  const toSlots = (counts: Map<string, { player: PlayerInfo; pulls: number }>): CrystalSlot[] =>
    [...counts.values()]
      .sort((a, b) => b.pulls - a.pulls)
      .slice(0, CRYSTALS_PER_WAVE)
      .map((c) => ({
        player:    c.player.name,
        className: c.player.className,
        specId:    c.player.specId,
        pullsSeen: c.pulls,
      }));

  const set1 = toSlots(set1Counts);
  const set2 = toSlots(set2Counts);

  // Majority handoff per dropper.
  const byDropper = new Map<string, { from: PlayerInfo; to: PlayerInfo; pulls: number }>();
  for (const c of swapCounts.values()) {
    const existing = byDropper.get(c.from.name);
    if (!existing || c.pulls > existing.pulls) byDropper.set(c.from.name, c);
  }
  // Exactly two crystals swap to tanks in this strategy — droppers beyond
  // the top two are one-off covering handoffs, not assignment.
  const swaps: CrystalSwap[] = [...byDropper.values()]
    .sort((a, b) => b.pulls - a.pulls)
    .slice(0, KNOWN_CRYSTAL_ASSIGNMENTS.intermissionSwaps.length)
    .map((c) => ({
      from: { player: c.from.name, className: c.from.className, specId: c.from.specId, pullsSeen: c.pulls },
      to:   { player: c.to.name,   className: c.to.className,   specId: c.to.specId,   pullsSeen: c.pulls },
      pullsSeen: c.pulls,
    }));

  const sameTrio = (slots: CrystalSlot[], declared: string[]) =>
    slots.length === declared.length && slots.every((s) => declared.includes(s.player));
  const matchesDeclared =
    sameTrio(set1, KNOWN_CRYSTAL_ASSIGNMENTS.set1) &&
    sameTrio(set2, KNOWN_CRYSTAL_ASSIGNMENTS.set2) &&
    KNOWN_CRYSTAL_ASSIGNMENTS.intermissionSwaps.every((declared) =>
      swaps.some((s) => s.from.player === declared.from && s.to.player === declared.to)
    );

  return { pullsAnalyzed, set1, set2, swaps, matchesDeclared };
}
