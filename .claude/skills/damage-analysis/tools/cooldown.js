// One tracked cooldown's held time, through the app's own analysis: each
// ready stretch split into forced / unforced time, charges banked at each
// downtime, the room-for-uses simulation and the drift finding. For checking
// a xivanalysis "N / M uses" or WoWAnalyzer "NN% effic" claim.
//
//   node .claude/skills/damage-analysis/tools/cooldown.js <code> "<boss>" <pull> "<player>" "<cooldown name>"
//
// <cooldown name> is the tracked cooldown's name as the drift finding prints
// it ("Earthly Star", "Pom Muse / Winged Muse / Clawed Muse / Fanged Muse").
// Run from the repo root. Read-only.

const path = require('path');
const { loadPull } = require(path.join(process.cwd(), 'scripts/lib/load-sample-pull')); // FFXIV or WoW
const clock = (t) => { const s = Math.round(t / 100) / 10; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

(async () => {
  const [code, boss, pullNumber, who, name] = process.argv.slice(2);
  if (!name) { console.log('usage: cooldown.js <code> "<boss>" <pull> "<player>" "<cooldown name>"'); process.exit(1); }
  const { pull, game, mod } = await loadPull(code, boss, pullNumber);
  const a = mod.analyzePullDamage(pull, game, mod.getDamageContext(pull.name));
  const ps = a.players.find((p) => p.player === who);
  if (!ps) { console.log(`no player "${who}"`); process.exit(1); }
  const cd = game.trackedCooldowns(ps.job).find((c) => c.name === name);
  if (!cd) { console.log(`no tracked cooldown "${name}" for ${ps.job}: ${game.trackedCooldowns(ps.job).map((c) => c.name).join(', ')}`); process.exit(1); }
  const forced = mod.mergeWindows(ps.timeline.forced);
  const player = pull.players.find((p) => p.name === who);
  const casts = player.casts.filter((c) => cd.actionIds.includes(c.abilityId)).map((c) => c.timestamp);
  // The engine's pre-pull evidence (checks.ts checkCooldownDrift): an
  // action that only follows this cooldown, before its first cast.
  const evidence = new Set(cd.prePullEvidenceIds ?? []);
  const prePull = evidence.size > 0 && [...player.casts, ...player.damageDone]
    .some((c) => evidence.has(c.abilityId) && c.timestamp < (casts[0] ?? Infinity));
  console.log(`${cd.name}: ${cd.cooldownMs / 1000}s, ${cd.charges} charge(s), ${casts.length} casts; room for ${mod.roomForUses(cd, a.endMs, forced, prePull)}` +
    (prePull ? ' (used before the pull too: the first stretch is its recharge)' : ' (no pre-pull use)'));
  let u = 0;
  for (const w of mod.cappedStretches(casts, cd.cooldownMs, cd.charges, a.endMs).filter((w) => !(prePull && w.startMs === 0))) {
    const f = mod.overlapMs(w.startMs, w.endMs, forced);
    u += w.endMs - w.startMs - f;
    console.log(`  full ${clock(w.startMs)}-${clock(w.endMs)}: ${((w.endMs - w.startMs) / 1000).toFixed(1)}s, forced ${(f / 1000).toFixed(1)}s`);
  }
  console.log(`  unforced at full charges: ${(u / 1000).toFixed(1)}s`);
  for (const f of forced.filter((w) => w.endMs - w.startMs > 5000)) {
    console.log(`  downtime ${clock(f.startMs)}-${clock(f.endMs)}: ${mod.chargesAt(casts, cd.cooldownMs, cd.charges, f.startMs)} charge(s) banked at its start`);
  }
  const drift = ps.findings.filter((x) => x.kind === 'cooldown-drift' && x.label.startsWith(cd.name));
  console.log(drift.length ? drift.map((x) => `  finding: ${x.detail} (${Math.round(x.lostDamage / 1000)}k)`).join('\n') : '  no drift finding');
})();
