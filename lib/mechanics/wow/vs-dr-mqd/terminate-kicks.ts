// lib/mechanics/wow/vs-dr-mqd/terminate-kicks.ts
//
// Detects the raid's Terminate interrupt ("kick") rotation for Midnight
// Falls' Termination Matrices, aggregated across every pull of a report.
// Feeds the Strategy dialog — this is REPORT-level strategy detection,
// unlike midnightfalls.ts's per-pull error detection.
//
// ── HOW THE MECHANIC LOGS (reverse-engineered from xvQbZ6Cwkm1XaHPD's 42
//    pulls, 2026-07-17) ─────────────────────────────────────────────────
//
// Three "Termination Matrix" NPCs spawn together (waves at ~+7s, ~+69s,
// ~+134s) and each chain-casts 1284934 Terminate on its own ~2s cadence.
// Every successful interrupt shows up in the friendly casts stream as an
// interrupt-school spell cast targeting the matrix. Kicks land in strict
// ROUNDS of three — one player per matrix per round:
//
//   round 1: Mythnarra / Religiouspp / Laedria      (positions 1-3)
//   round 2: Shadowmeld / Nearly / Sindusk          (positions 4-6)
//   round 3: Neptune / Hervous / Neximage           (positions 7-9)
//   round 4: Polpo / Cocoroach / Pnkphnx            (positions 10-12)
//
// Across 94 wave-sequences the trios NEVER mix between rounds, but order
// WITHIN a trio shuffles freely pull-to-pull — it's just which matrix's
// cast came up first. All three waves of a pull use the same rotation.
//
// LIMITATION (why per-matrix assignment isn't detected): WCL provides no
// instance data anywhere on this fight's matrix events — no
// sourceInstance on the matrices' begincast/cast events, no
// targetInstance on players' interrupt casts (verified by refetching with
// those fields kept — the API simply doesn't send them here), and the
// Terminate damage is credited to L'ura (the boss), not a matrix. So
// "who kicks in which round" is fully recoverable, "who covers which of
// the three matrices" is not. Rounds are therefore presented as unranked
// trios.
//
// Detection: collect interrupt-spell casts targeting "Termination
// Matrix", split each pull's kicks into waves on a >20s gap, rank each
// player by average position across all wave-sequences, and chunk the
// ranked core roster into rounds of 3. Players appearing in under half
// the waves are listed as fill-ins rather than forced into a round slot
// (seen live: Veinglas subbing Mind Freeze in ~20 of 94 waves,
// Legionshifts adding late Skull Bashes in 8).

import type { PlayerInfo } from "@/types/PlayerInfo";

const MATRIX_NAME = "Termination Matrix";

// True interrupt/silence spells only — the matrix also gets hit by plenty
// of ordinary damage casts (Judgment, Kill Command, Disintegrate...) that
// must not read as kicks.
export const TERMINATE_INTERRUPT_IDS = new Set<number>([
  15487,          // Silence (Priest)
  183752,         // Disrupt (Demon Hunter)
  187707,         // Muzzle (Hunter)
  147362,         // Counter Shot (Hunter)
  2139,           // Counterspell (Mage)
  6552,           // Pummel (Warrior)
  57994,          // Wind Shear (Shaman)
  47528,          // Mind Freeze (Death Knight)
  96231,          // Rebuke (Paladin)
  31935,          // Avenger's Shield (Protection Paladin)
  106839, 93985,  // Skull Bash (Druid — two IDs)
  78675,          // Solar Beam (Balance Druid)
  116705,         // Spear Hand Strike (Monk)
  1766,           // Kick (Rogue)
  351338,         // Quell (Evoker)
  19647, 132409, 119910, // Spell Lock variants (Warlock pet/command)
]);

// Matrix waves inside one pull are ~62s apart and a wave's kicks span
// ~5-12s, so any >20s gap between consecutive kicks is a wave boundary.
const WAVE_GAP_MS = 20000;

// A player must appear in at least this fraction of the analyzed waves to
// claim a core rotation slot; rarer kickers are reported as fill-ins.
const CORE_WAVE_FRACTION = 0.5;

// One kicker per concurrent matrix per round.
const MATRICES_PER_WAVE = 3;

export type KickSlot = {
  player:     string;
  className?: string;
  specId?:    number;
  ability:    string;  // the interrupt spell they used most
  wavesSeen:  number;  // how many wave-sequences they kicked in
};

export type TerminateKickStrategy = {
  pullsAnalyzed: number;      // pulls that contained at least one kick
  wavesAnalyzed: number;      // total matrix-wave sequences aggregated
  rounds:        KickSlot[][]; // rotation order; each round is an unranked trio
  fillIns:       KickSlot[];   // sub-threshold kickers (subs/backups)
};

export function detectTerminateKickOrder(
  pulls: Array<{ players: PlayerInfo[] }>
): TerminateKickStrategy | null {
  type Stat = { player: PlayerInfo; rankSum: number; waves: number; abilities: Map<string, number> };
  const stats = new Map<string, Stat>();
  let pullsAnalyzed = 0;
  let wavesAnalyzed = 0;

  for (const pull of pulls) {
    const kicks: Array<{ t: number; player: PlayerInfo; ability: string }> = [];
    for (const p of pull.players ?? []) {
      for (const c of p.casts ?? []) {
        if (c.target !== MATRIX_NAME || !TERMINATE_INTERRUPT_IDS.has(c.abilityId)) continue;
        kicks.push({ t: c.timestamp, player: p, ability: c.abilityName });
      }
    }
    if (kicks.length === 0) continue;
    pullsAnalyzed++;
    kicks.sort((a, b) => a.t - b.t);

    const waves: Array<typeof kicks> = [];
    let current: typeof kicks = [];
    for (const k of kicks) {
      if (current.length > 0 && k.t - current[current.length - 1].t > WAVE_GAP_MS) {
        waves.push(current);
        current = [];
      }
      current.push(k);
    }
    if (current.length > 0) waves.push(current);

    for (const wave of waves) {
      wavesAnalyzed++;
      wave.forEach((k, position) => {
        const s = stats.get(k.player.name) ??
          { player: k.player, rankSum: 0, waves: 0, abilities: new Map<string, number>() };
        s.rankSum += position;
        s.waves   += 1;
        s.abilities.set(k.ability, (s.abilities.get(k.ability) ?? 0) + 1);
        stats.set(k.player.name, s);
      });
    }
  }

  if (wavesAnalyzed === 0) return null;

  const ranked = [...stats.values()]
    .map((s) => ({
      slot: {
        player:    s.player.name,
        className: s.player.className,
        specId:    s.player.specId,
        ability:   [...s.abilities.entries()].sort((a, b) => b[1] - a[1])[0][0],
        wavesSeen: s.waves,
      } satisfies KickSlot,
      avgPosition: s.rankSum / s.waves,
      waves:       s.waves,
    }))
    .sort((a, b) => a.avgPosition - b.avgPosition);

  const core    = ranked.filter((r) => r.waves >= wavesAnalyzed * CORE_WAVE_FRACTION);
  const fillIns = ranked.filter((r) => r.waves <  wavesAnalyzed * CORE_WAVE_FRACTION);

  const rounds: KickSlot[][] = [];
  for (let i = 0; i < core.length; i += MATRICES_PER_WAVE) {
    rounds.push(core.slice(i, i + MATRICES_PER_WAVE).map((r) => r.slot));
  }

  return {
    pullsAnalyzed,
    wavesAnalyzed,
    rounds,
    fillIns: fillIns.map((r) => r.slot),
  };
}
