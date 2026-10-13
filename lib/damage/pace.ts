// lib/damage/pace.ts
//
// Same-spec press pace (WoW). The GCD model (wow/haste.ts) fits each
// player's base GCD from their own fastest back-to-back instants, so a
// player who presses on a slow rhythm all pull gets a slow base, and the
// gap check measures their idle from it: the slow rhythm itself is never
// counted. On qpZx3mWaG7gcDdYB pull 3 Hervous (Arms) fitted 1.13s against
// Cocomber's 0.98s on the same pull; their haste ratings (947 vs 1063)
// explain ~3%, their talents differ in one choice node, and no haste buff
// differs. The user chose (2026-10-13) to count the difference.
//
// The check: for each other player of the same spec (this pull, or a
// reference clear's analysis passed in), the base this player could have
// had = the peer's base × (1 + peer's rating haste) ÷ (1 + own rating
// haste), rating haste = rating ÷ each pull's own calibration (haste.ts).
// Their median, if 5%+ under the player's own base, is the expectation. Every instant GCD outside forced time then had a lock
// (recast × the player's GCD factor at t) longer than the expectation's
// (recast × expected ÷ 1.5s × the haste buffs up at t); the difference is
// valued like the gap check's idle (average GCD ÷ base GCD). Hard casts are
// left out: their lock is the cast time, which pace can't shorten.
// Inference: it rests on the peer's pace being reachable with this
// player's gear and talents.

import type { DamageFinding, PacePeer } from "./types";
import { finding, type PlayerCheckContext } from "./checks";
import { inWindows } from "./timeline";

// The peer's scaled base must be 5%+ faster. At 3% the 100th-percentile
// Arcane Mage Màzz (3Vz6Qt2RyTPXwpJn) was flagged against a raid member's
// base fitted on 3 minutes alive (1.07s vs 1.03s): fit noise, not play.
const MARGIN = 0.95;
const FLOOR_SHARE = 0.5;  // WoW's 0.75s GCD floor, as a share of the recast

/** The player's own pace, from their speed model (undefined when it isn't comparable). */
export function paceOf(
  player: string, job: string, model: { factor: number; baseFrom?: string; ratingC?: number } | undefined,
  hasteRating: number | undefined,
): PacePeer | undefined {
  if (!model || model.baseFrom !== "instants") return undefined;
  return {
    player, job, baseMs: model.factor * 1_500,
    ratingHaste: model.ratingC && hasteRating !== undefined ? hasteRating / model.ratingC / 100 : undefined,
  };
}

export function checkSameSpecPace(
  ctx: PlayerCheckContext, own: PacePeer | undefined, peers: PacePeer[], hasteAt: ((t: number) => number) | undefined,
): DamageFinding[] {
  if (!own || own.ratingHaste === undefined || !hasteAt) return [];
  // The median of the same-spec players' scaled bases (the slower middle
  // one when even), not the fastest: with eight reference kills loaded the
  // fastest of many noisy fits drifted low (Sylmigron's benchmark became a
  // non-top Balance's 0.98s) and the 99th-percentile Kaströ was flagged
  // against one raid member (JZjf9x3mK76NzabP, 2026-10-13).
  const scaled: { peer: PacePeer; expectedMs: number }[] = [];
  for (const q of peers) {
    if (q.job !== own.job || (q.player === own.player && q.source === undefined) || q.ratingHaste === undefined) continue;
    scaled.push({ peer: q, expectedMs: q.baseMs * (1 + q.ratingHaste) / (1 + own.ratingHaste) });
  }
  scaled.sort((a, b) => a.expectedMs - b.expectedMs);
  const best = scaled[Math.floor(scaled.length / 2)];
  if (!best || best.expectedMs > own.baseMs * MARGIN) return [];

  let savedMs = 0, lost = 0, n = 0, first = Infinity, last = 0;
  for (const u of ctx.uses) {
    if (u.startMs >= ctx.endMs || u.castMs > 0 || !u.action.speedScaled) continue;
    if (ctx.forced.some((w) => u.startMs >= w.startMs && u.startMs < w.endMs)) continue;
    const recast = u.action.recastMs;
    const lock = recast * ctx.factorAt(u.startMs);
    const expected = Math.max(recast * FLOOR_SHARE, recast * (best.expectedMs / 1_500) * hasteAt(u.startMs));
    const saved = lock - expected;
    if (saved <= 0) continue;
    const value = ctx.values.gcdValue(ctx.phaseOf(u.startMs), inWindows(u.startMs, ctx.buffWindows));
    savedMs += saved; lost += saved * value / ctx.baseGcdMs; n++;
    first = Math.min(first, u.startMs); last = Math.max(last, u.startMs);
  }
  if (n === 0) return [];
  const peer = best.peer;
  const who = `${peer.player}${peer.source ? ` (${peer.source})` : ""}` +
    (scaled.length > 1 ? `, the median of ${scaled.length} same-spec players` : "");
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  return [finding(ctx, {
    kind: "gcd-pace", startMs: first, endMs: last, forced: false, inference: true,
    label: "GCD pace vs same spec",
    lostDamage: lost,
    basis: `${who}'s base GCD ${(peer.baseMs / 1000).toFixed(2)}s at ${pct(peer.ratingHaste!)} rating haste → ` +
      `${(best.expectedMs / 1000).toFixed(2)}s at this player's ${pct(own.ratingHaste)}; ${(savedMs / 1000).toFixed(1)}s ` +
      `over ${n} instant GCDs ÷ ${(ctx.baseGcdMs / 1000).toFixed(2)}s GCD × average GCD`,
    detail: `Base GCD ${(own.baseMs / 1000).toFixed(2)}s against ${(best.expectedMs / 1000).toFixed(2)}s from ${who}, ` +
      `same spec, after the haste-rating difference: ${(savedMs / 1000).toFixed(1)}s of slower presses`,
  })];
}
