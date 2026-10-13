#!/usr/bin/env node
// How the GCD-gap check sees one player's casts: each GCD use's start, its
// cast time (from the paired begin-cast), the lock the gap check applies
// (the longer of the GCD and the cast), when the cast landed, and the idle
// before the next GCD. For checking a gap or delay finding, and that hard
// casts are paired with their begin-casts (a cast with none starts at its
// landing time, and its whole cast time reads as idle). FFXIV or WoW.
//
//   node .claude/skills/damage-analysis/tools/gcd-locks.js <code> "<boss>" <pull> "<player>" --from M:SS --to M:SS
//   node .claude/skills/damage-analysis/tools/gcd-locks.js <code> "<boss>" <pull> "<player>" --summary
//
// --summary: casts of hard-cast actions (ones with any begin-cast in the
// pull) left unpaired (zero-length begins are instants, e.g. a proc'd
// Incinerate, and fine), small delays split by what came before, and every
// gap of 1.1s or more. Run from the repo root. Read-only.

const path = require('path');
const { loadPull } = require(path.join(process.cwd(), 'scripts/lib/load-sample-pull'));
// Rounded to the centisecond first: 299.995s printed as "4:60.00".
const clock = (t) => { const s = Math.round(t / 10) / 100; return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`; };
const toMs = (x) => { const [m, s] = x.split(':'); return (+m * 60 + +s) * 1000; };

(async () => {
  const argv = process.argv.slice(2);
  const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
  const from = opt('--from'), to = opt('--to');
  const summary = argv.includes('--summary');
  const [code, boss, pullNo, who] = argv.filter((a) => a !== '--summary');
  if (!who) { console.log('usage: gcd-locks.js <code> "<boss>" <pull> "<player>" (--from M:SS --to M:SS | --summary)'); process.exit(1); }
  const { pull, game, mod } = await loadPull(code, boss, pullNo);
  const p = pull.players.find((x) => x.name === who);
  if (!p) { console.log(`no player "${who}"`); process.exit(1); }
  const uses = mod.gcdUses(p, game);
  // The analysis's own speed: WoW's fitted model (haste procs, gear, lust)
  // when the player has one, else the two-level profile.
  const usesOf = new Map(pull.players.map((x) => [x.name, mod.gcdUses(x, game)]));
  const model = game.speedModels?.(pull, usesOf, pull.fightDuration ?? Infinity)?.get(who);
  const prof = mod.speedProfile(uses, game, mod.statusWindows(p, game.hasteStatusIds, Infinity));
  const at = model ? model.at : prof.at;
  const lockOf = (u) => mod.gcdLockMs(u, at(u.startMs));
  console.log(model
    ? `GCD from the fitted model: base ${(prof.baseRecastMs * model.factor / 1000).toFixed(2)}s, ` +
      `haste terms ${model.terms.map((t) => `${t.id} ×${t.factor.toFixed(3)}`).join(', ') || 'none'} (${model.baseFrom})`
    : `GCD ${(prof.baseRecastMs * prof.factor / 1000).toFixed(2)}s outside haste windows (base ${prof.baseRecastMs}ms × ${prof.factor.toFixed(3)})`);

  if (summary) {
    const hardIds = new Set((p.beginCasts ?? []).filter((b) => (b.durationMs ?? 0) > 0).map((b) => b.abilityId));
    const hard = uses.filter((u) => hardIds.has(u.action.id));
    // Unpaired: a begin-cast of the same spell whose cast time ends at this
    // landing exists but wasn't taken. Instants show either a zero-length
    // begin (qpZx3mWaG7gcDdYB) or none at all (NK1hBtW9rckdjq36).
    const begins = p.beginCasts ?? [];
    const unpaired = hard.filter((u) => u.castMs === 0 && begins.some((b) => b.abilityId === u.action.id && (b.durationMs ?? 0) > 0 &&
      Math.abs(b.timestamp + b.durationMs - u.startMs) <= 300));
    const instants = hard.filter((u) => u.castMs === 0 && !unpaired.includes(u));
    console.log(`hard-cast actions: ${hard.length} uses; ${instants.length} instant (proc'd); ${unpaired.length} unpaired${unpaired.length ? `: ${unpaired.slice(0, 12).map((u) => `${clock(u.startMs)} ${u.abilityName}`).join(', ')}` : ''}`);
    const small = new Map(), big = [];
    for (let i = 0; i + 1 < uses.length; i++) {
      const u = uses[i], idle = uses[i + 1].startMs - u.startMs - lockOf(u);
      const kind = u.castMs > 0 ? 'after a hard cast' : 'after an instant';
      if (idle > 100 && idle < 1100) { const x = small.get(kind) ?? { n: 0, ms: 0 }; x.n++; x.ms += idle; small.set(kind, x); }
      if (idle >= 1100) big.push(`  ${clock(u.startMs + lockOf(u))} ${(idle / 1000).toFixed(1)}s after ${u.abilityName}`);
    }
    console.log(`small delays (0.1-1.1s): ${[...small].map(([k, x]) => `${x.n} ${k}, ${(x.ms / 1000).toFixed(1)}s`).join('; ')}`);
    console.log(`gaps of 1.1s+: ${big.length}\n${big.join('\n')}`);
    return;
  }

  const lo = from ? toMs(from) : 0, hi = to ? toMs(to) : Infinity;
  const casts = p.casts.filter((c) => !c.fake);
  for (let i = 0; i < uses.length; i++) {
    const u = uses[i];
    if (u.startMs < lo || u.startMs > hi) continue;
    const lock = lockOf(u);
    // not the previous cast of the spell landing as this one begins
    const landed = casts.find((c) => c.abilityName === u.abilityName && c.timestamp >= u.startMs + u.castMs - 20 && c.timestamp <= u.startMs + 6000);
    const next = uses[i + 1];
    console.log(`${clock(u.startMs)} ${u.abilityName.padEnd(18)} cast ${(u.castMs / 1000).toFixed(2)}s  gcd ${(prof.baseRecastMs * at(u.startMs) / 1000).toFixed(2)}s  lock ${(lock / 1000).toFixed(2)}s to ${clock(u.startMs + lock)}  landed ${landed ? clock(landed.timestamp) : '?'}  ` +
      (next ? `next ${clock(next.startMs)}  idle ${((next.startMs - u.startMs - lock) / 1000).toFixed(2)}s` : '(last)'));
  }
})();
