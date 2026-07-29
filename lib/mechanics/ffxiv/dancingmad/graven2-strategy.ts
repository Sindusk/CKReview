// lib/mechanics/ffxiv/dancingmad/graven2-strategy.ts
//
// Per-pull detection of which Graven 2 strategy a raid is running (confirmed
// 2026-07-30, report Q3GzJNZg64k1hLRm pull 26). Split out from phase1.ts —
// like Black Hole's tether shape, this is a raid STRATEGY choice, not a
// hardcoded game constant, so it can't live as a single detection rule.
//
// ── THE TWO STRATEGIES ───────────────────────────────────────────────────
//
// Per the user: Graven 2 resolves around a boss cast named "Gravitas"
// (47788). The OLD/outdated (but still valid — "it technically works")
// strategy is LIGHT PARTY: the raid splits into its two logical light
// parties (LP1: whichever 4 players normally group as one party; LP2: the
// other 4) and each LP stacks together on opposite sides of the arena
// (confirmed pull 26: LP1 north ~(9880,8970), LP2 south ~(10160,11230) —
// roughly 2300 centi-yalms apart, both LPs individually within ~250
// centi-yalms of their own group's centroid) to split Gravitas's damage 4
// ways per group. The NEW strategy is an 8-PLAYER STACK: the whole raid
// stacks together in one spot instead of splitting into two.
//
// This module only tells the two shapes APART from what a single pull's
// own Gravitas hits look like — it does not (yet) attempt any per-player
// position error detection for the stack/spread step itself. No failure
// example exists for that step (pull 26's own stack resolved cleanly), and
// no example log of the 8-player-stack strategy exists to compare against,
// so per the user's explicit call (2026-07-30) this stays strategy-
// identification only until a real failure surfaces to calibrate against.
//
// ── HOW THE SHAPE IS DETECTED ────────────────────────────────────────────
//
// Take each player's OWN earliest Gravitas damageTaken position (self
// position — see lib/mechanics/README.md's position-semantics table) and
// greedily cluster them by mutual proximity: two hits join the same
// cluster if they're within GRAVEN2_CLUSTER_RADIUS_CENTIYALMS of ANY
// existing member (confirmed intra-group spread in pull 26 tops out at
// ~232 centi-yalms; the two groups sit ~2300 centi-yalms apart — wide
// margin for a single threshold to separate "same group" from "different
// group" without needing an exact centroid model). Exactly 2 clusters of 4
// each is "light-party"; exactly 1 cluster of 8 is "eight-stack"; anything
// else (mechanic not reached, a death scrambled the read, or a shape this
// module hasn't seen yet) reports "unknown" rather than guessing.

import type { PlayerInfo } from "@/types/PlayerInfo";
import { distanceBetween } from "@/lib/mechanics/geometry";

const GRAVITAS_ABILITY_ID = 47788;

// See module header: clean max intra-group spread observed ~232, clean min
// inter-group distance observed ~2300 — this sits comfortably between them.
const GRAVEN2_CLUSTER_RADIUS_CENTIYALMS = 1000;

export type Graven2Variant = "light-party" | "eight-stack" | "unknown";

export type Graven2Group = {
  players: string[];
};

export type Graven2StrategyResult = {
  variant: Graven2Variant;
  groups:  Graven2Group[];
};

/**
 * Detects this PULL's own Graven 2 strategy from its Gravitas hits. Returns
 * null if the pull never reached Graven 2 at all (no Gravitas hits with a
 * position on record).
 */
export function detectGraven2Strategy(players: PlayerInfo[]): Graven2StrategyResult | null {
  const hits: { name: string; x: number; y: number }[] = [];
  for (const player of players) {
    const events = player.damageTaken.filter(
      (e) => e.abilityId === GRAVITAS_ABILITY_ID && e.x !== undefined && e.y !== undefined
    );
    if (events.length === 0) continue;
    const first = events.reduce((a, b) => (a.timestamp <= b.timestamp ? a : b));
    hits.push({ name: player.name, x: first.x!, y: first.y! });
  }
  if (hits.length === 0) return null;

  const clusters: { name: string; x: number; y: number }[][] = [];
  for (const hit of hits) {
    const cluster = clusters.find((c) => c.some((m) => distanceBetween(m, hit) < GRAVEN2_CLUSTER_RADIUS_CENTIYALMS));
    if (cluster) cluster.push(hit);
    else clusters.push([hit]);
  }

  const groups: Graven2Group[] = clusters.map((c) => ({ players: c.map((m) => m.name) }));

  if (clusters.length === 2 && clusters.every((c) => c.length === 4)) {
    return { variant: "light-party", groups };
  }
  if (clusters.length === 1 && clusters[0].length === 8) {
    return { variant: "eight-stack", groups };
  }
  return { variant: "unknown", groups };
}
