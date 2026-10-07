#!/usr/bin/env node
// scripts/build-wow-spell-data.js
//
// Writes lib/damage/wow/spell-data.ts from the survey files that
// scripts/survey-wow-spells.js leaves in sampledata/wow/<code>/survey/.
// Everything in the output is measured from those logs; nothing comes from
// WoWAnalyzer (AGPL; docs/archive/damage-analysis-plan.md, "WoW port"). Re-run it
// after surveying more fights.
//
// Per spec (combatantInfo specID), across every surveyed player of it:
//
// ── Abilities (cast by the player) ─────────────────────────────────────
// - start: a cast's begin-cast of the same ability (matched back to the
//   previous begin-cast, with no other begin-cast in between), else the
//   cast. Empowered spells start at empowerstart. `fake` casts are WCL's
//   own and are left out.
// - castMs: median begin → cast of hard casts (the cast event lands at the
//   end of the cast in WoW). instantShare: casts with no hard cast (a
//   begin-cast at the same ms is an instant proc).
// - onGcd, inferred: the minimum GCD is 750ms, so two GCD starts can't sit
//   closer than that. Start with every ability (5+ casts) on the GCD; count,
//   per ability, the starts within OFF_GCD_MS of the previous or next
//   start of another on-GCD ability; take the worst ability off the GCD while
//   its share is above OFF_GCD_SHARE, then recount. Abilities with fewer
//   casts are `onGcd: null` (unknown).
// - minIntervalMs / medianIntervalMs: between one player's casts of it. A
//   cooldown shows as a floor; charges blur it.
// - observedGcdMs (per spec): the most common interval between two
//   consecutive instant on-GCD starts, after the first 60s (lust is
//   usually early). A check on the base GCD in lib/damage/wow/game.ts.
//
// ── Statuses (on the player, from the Buffs stream) ────────────────────
// Kept when the spec's own damage hits list it in their aura snapshot on
// MIN_SNAPSHOT..MAX_SNAPSHOT of hits (so it was on them while they did
// damage, and isn't an always-on passive, flask or form), it has
// apply/remove events in the fight, and it isn't mostly an absorb.
// HoTs never reach the snapshot, so they drop out. `selfShare` = events
// applied by the player themselves; `perMin` = events per player-minute
// (what it adds to the filtered Buffs stream).
// `kind`, from the view across every spec:
// - "external": mostly applied by others, from players of at most
//   EXTERNAL_MAX_CLASSES classes (Heroism, Power Infusion, Ebon Might).
// - "gear": self-applied by specs of 2+ classes, or applied to others by
//   3+ classes (trinkets, embellishments, augment runes, potions).
// - "class": everything else (procs, cooldown buffs, talent auras).
// lib/damage/wow/buff-stream.ts fetches "class" and "external" only.
//
// ── Enemy side ─────────────────────────────────────────────────────────
// - dots: the player's own damage abilities that are mostly ticks.
// - enemyDebuffs: statuses the player (or their pet) put on enemies whose
//   id is also one of their DoTs or cast abilities (the debuff a spell
//   applies usually shares its id). Everything else on enemies (trinket
//   and raid-wide debuffs) is left out.
//
// Usage: node scripts/build-wow-spell-data.js

const fs = require('fs');
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');

const OFF_GCD_MS = 600;
const OFF_GCD_SHARE = 0.25;
const MIN_CASTS = 5;
const MIN_SNAPSHOT = 0.01;
const MAX_SNAPSHOT = 0.98;
const DOT_TICK_SHARE = 0.8;
const EXTERNAL_MAX_CLASSES = 2;
const OUT = path.join(ROOT, 'lib', 'damage', 'wow', 'spell-data.ts');

const { SPEC_DATA } = requireTsFromRoot('lib/spec-data.ts');

function loadSurveys() {
  const base = path.join(ROOT, 'sampledata', 'wow');
  const surveys = [];
  const names = new Map();
  for (const code of fs.readdirSync(base)) {
    const dir = path.join(base, code, 'survey');
    if (!fs.existsSync(dir)) continue;
    const abilities = path.join(dir, 'abilities.json');
    if (fs.existsSync(abilities)) {
      for (const [id, name] of Object.entries(JSON.parse(fs.readFileSync(abilities, 'utf8')))) names.set(Number(id), name);
    }
    for (const f of fs.readdirSync(dir)) {
      if (!/^\d+\.json$/.test(f)) continue;
      surveys.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    }
  }
  return { surveys, names };
}

const median = (xs) => { if (xs.length === 0) return undefined; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const pct = (xs, p) => { if (xs.length === 0) return undefined; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

/** One player's casts → [{ id, startMs, castMs, hard, instant }] (fake casts dropped). */
function starts(casts) {
  const out = [];
  const open = new Map(); // abilityId -> begin-cast ms
  let lastBegin = null;
  for (const [t, type, id, fake] of casts) {
    if (fake) continue;
    if (type === 'b' || type === 's') { open.set(id, t); lastBegin = id; continue; }
    if (type !== 'c') continue;
    const b = open.get(id);
    if (b !== undefined && lastBegin === id && t - b <= 6000) {
      out.push({ id, startMs: b, castMs: t - b, hard: t - b > 0 });
      open.delete(id);
    } else {
      out.push({ id, startMs: t, castMs: 0, hard: false });
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

function inferGcd(seqs) {
  const counts = new Map();
  for (const seq of seqs) for (const s of seq) counts.set(s.id, (counts.get(s.id) || 0) + 1);
  const gcd = new Set([...counts].filter(([, n]) => n >= MIN_CASTS).map(([id]) => id));
  for (;;) {
    const bad = new Map();
    for (const seq of seqs) {
      const g = seq.filter((s) => gcd.has(s.id));
      for (let i = 0; i < g.length; i++) {
        const prev = g[i - 1], next = g[i + 1];
        const lock = Math.max(OFF_GCD_MS, g[i].castMs - 150);
        if ((prev && g[i].startMs - prev.startMs < Math.max(OFF_GCD_MS, prev.castMs - 150)) ||
            (next && next.startMs - g[i].startMs < lock)) {
          bad.set(g[i].id, (bad.get(g[i].id) || 0) + 1);
        }
      }
    }
    let worst = null, worstShare = OFF_GCD_SHARE;
    for (const [id, n] of bad) {
      const share = n / counts.get(id);
      if (share > worstShare) { worst = id; worstShare = share; }
    }
    if (worst === null) return gcd;
    gcd.delete(worst);
  }
}

function observedGcd(seqs, gcd) {
  const buckets = new Map();
  for (const seq of seqs) {
    const g = seq.filter((s) => gcd.has(s.id) && s.startMs > 60_000);
    for (let i = 1; i < g.length; i++) {
      if (g[i - 1].castMs > 0) continue;
      const iv = g[i].startMs - g[i - 1].startMs;
      if (iv < 700 || iv > 1600) continue;
      const b = Math.round(iv / 20) * 20;
      buckets.set(b, (buckets.get(b) || 0) + 1);
    }
  }
  let best, bestN = 0;
  for (const [b, n] of buckets) if (n > bestN) { best = b; bestN = n; }
  return best;
}

function buildSpec(specId, players, names, castIds) {
  const seqs = players.map((p) => starts(p.casts));
  const gcd = inferGcd(seqs);
  const minutes = players.reduce((a, p) => a + p.durationMs, 0) / 60000;

  // Abilities.
  const byId = new Map();
  seqs.forEach((seq, pi) => {
    const lastAt = new Map();
    for (const s of seq) {
      const a = byId.get(s.id) || { casts: 0, hard: [], instant: 0, intervals: [] };
      a.casts++;
      if (s.hard) a.hard.push(s.castMs); else a.instant++;
      const k = `${pi}`;
      const last = lastAt.get(s.id);
      if (last !== undefined) a.intervals.push(s.startMs - last);
      lastAt.set(s.id, s.startMs);
      byId.set(s.id, a);
      void k;
    }
  });
  const empowered = new Set(players.flatMap((p) => p.casts.filter((c) => c[1] === 's').map((c) => c[2])));
  const fakeOnly = new Set();
  for (const p of players) for (const c of p.casts) if (c[3] && !byId.has(c[2])) fakeOnly.add(c[2]);
  const abilities = [...byId].map(([id, a]) => ({
    id, name: names.get(id) ?? `Spell ${id}`,
    casts: a.casts,
    onGcd: a.casts < MIN_CASTS ? null : gcd.has(id),
    castMs: a.hard.length ? median(a.hard) : undefined,
    instantShare: Number((a.instant / a.casts).toFixed(2)),
    minIntervalMs: pct(a.intervals, 0.02),
    medianIntervalMs: median(a.intervals),
    empower: empowered.has(id) || undefined,
  })).sort((x, y) => y.casts - x.casts);

  // Statuses.
  const hits = players.reduce((a, p) => a + p.hits, 0);
  const status = new Map();
  for (const p of players) {
    for (const [id, a] of Object.entries(p.auras)) {
      const s = status.get(id) || { events: 0, self: 0, absorb: 0, applies: 0, sources: {} };
      const ev = a.apply + a.refresh + a.remove + a.stack;
      s.events += ev; s.self += a.self; s.absorb += a.absorb; s.applies += a.apply;
      for (const [src, n] of Object.entries(a.sources)) s.sources[src] = (s.sources[src] || 0) + n;
      status.set(id, s);
    }
  }
  const snap = {};
  for (const p of players) for (const [id, n] of Object.entries(p.snapshot)) snap[id] = (snap[id] || 0) + n;
  const statuses = [...status].flatMap(([idStr, s]) => {
    const share = hits > 0 ? (snap[idStr] || 0) / hits : 0;
    if (share < MIN_SNAPSHOT || share > MAX_SNAPSHOT || s.applies === 0 || s.absorb > s.events / 2) return [];
    const id = Number(idStr);
    const ext = Object.entries(s.sources).sort((a, b) => b[1] - a[1]).map(([src]) => Number(src));
    return [{
      id, name: names.get(id) ?? `Spell ${id}`,
      snapshotShare: Number(share.toFixed(2)),
      selfShare: Number((s.self / s.events).toFixed(2)),
      perMin: Number((s.events / Math.max(1, minutes)).toFixed(1)),
      fromSpecs: ext.length ? ext.slice(0, 4) : undefined,
    }];
  }).sort((a, b) => b.snapshotShare - a.snapshotShare);

  // Enemy side.
  const dmg = {};
  for (const p of players) {
    for (const [id, d] of Object.entries(p.damage)) {
      const x = dmg[id] || { hits: 0, ticks: 0, amount: 0, pet: d.pet };
      x.hits += d.hits; x.ticks += d.ticks; x.amount += d.amount;
      dmg[id] = x;
    }
  }
  const dots = Object.entries(dmg)
    .filter(([, d]) => !d.pet && d.hits >= 10 && d.ticks / d.hits >= DOT_TICK_SHARE)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([id]) => ({ id: Number(id), name: names.get(Number(id)) ?? `Spell ${id}` }));
  const pets = Object.entries(dmg).filter(([, d]) => d.pet).sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 10).map(([id]) => ({ id: Number(id), name: names.get(Number(id)) ?? `Spell ${id}` }));
  const dotIds = new Set(dots.map((d) => d.id));
  const enemyCount = {};
  for (const p of players) for (const [id, n] of Object.entries(p.enemyDebuffs)) enemyCount[id] = (enemyCount[id] || 0) + n;
  const enemyDebuffs = Object.entries(enemyCount)
    .filter(([id]) => dotIds.has(Number(id)) || castIds.has(Number(id)))
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id: Number(id), name: names.get(Number(id)) ?? `Spell ${id}`, perMin: Number((n / Math.max(1, minutes)).toFixed(1)) }));

  const info = SPEC_DATA[specId];
  return {
    specId, spec: info ? `${info.name} ${info.className}` : `Spec ${specId}`,
    players: players.length,
    observedGcdMs: observedGcd(seqs, gcd),
    abilities, statuses, dots, enemyDebuffs, pets,
  };
}

function classifyStatuses(specs) {
  const classOf = (specId) => SPEC_DATA[specId]?.className ?? `spec${specId}`;
  const selfClasses = new Map(), sourceClasses = new Map();
  const add = (map, id, cls) => { const s = map.get(id) || new Set(); s.add(cls); map.set(id, s); };
  for (const s of specs) {
    for (const st of s.statuses) {
      if (st.selfShare >= 0.5) add(selfClasses, st.id, classOf(s.specId));
      for (const src of st.fromSpecs ?? []) add(sourceClasses, st.id, classOf(src));
    }
  }
  for (const s of specs) {
    for (const st of s.statuses) {
      const self = selfClasses.get(st.id)?.size ?? 0;
      const from = sourceClasses.get(st.id)?.size ?? 0;
      st.kind = self >= 2 || from > EXTERNAL_MAX_CLASSES ? 'gear'
        : st.selfShare < 0.5 && from >= 1 ? 'external'
          : 'class';
    }
  }
}

const lit = (v) => JSON.stringify(v);
function entry(obj) {
  return '{ ' + Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${lit(v)}`).join(', ') + ' }';
}

function main() {
  const { surveys, names } = loadSurveys();
  if (surveys.length === 0) { console.error('No survey files under sampledata/wow/*/survey/. Run scripts/survey-wow-spells.js first.'); process.exit(1); }
  const bySpec = new Map();
  for (const s of surveys) {
    for (const p of Object.values(s.players)) {
      if (!p.specId) continue;
      const list = bySpec.get(p.specId) || [];
      list.push({ ...p, durationMs: s.durationMs });
      bySpec.set(p.specId, list);
    }
  }
  const specs = [...bySpec].sort((a, b) => a[0] - b[0]).map(([specId, players]) => {
    const castIds = new Set(players.flatMap((p) => p.casts.map((c) => c[2])));
    return buildSpec(specId, players, names, castIds);
  });
  classifyStatuses(specs);

  const sources = surveys.map((s) => `${s.code} fight ${s.fightId} (${s.name}${s.kill ? ', kill' : ''}, ${Math.round(s.durationMs / 1000)}s)`).sort();
  const lines = [];
  lines.push('// lib/damage/wow/spell-data.ts');
  lines.push('//');
  lines.push('// GENERATED by scripts/build-wow-spell-data.js; do not edit by hand.');
  lines.push('// Measured from these WCL fights (scripts/survey-wow-spells.js):');
  for (const s of sources) lines.push(`//   ${s}`);
  lines.push('// What each field means, and how it was inferred, is in the generator\'s');
  lines.push('// header. Corrections go in lib/damage/wow/game.ts (hand-written');
  lines.push('// overrides, each with its source), not here.');
  lines.push('');
  lines.push('export type WowAbilityData = {');
  lines.push('  id: number; name: string; casts: number;');
  lines.push('  onGcd: boolean | null;     // inferred from cast spacing; null = too few casts');
  lines.push('  castMs?: number;           // median hard-cast time (hasted)');
  lines.push('  instantShare: number;      // casts with no hard cast');
  lines.push('  minIntervalMs?: number; medianIntervalMs?: number;');
  lines.push('  empower?: boolean;');
  lines.push('};');
  lines.push('export type WowStatusData = {');
  lines.push('  id: number; name: string;');
  lines.push('  snapshotShare: number;     // share of the spec\'s hits that listed it');
  lines.push('  selfShare: number;         // events the player applied themselves');
  lines.push('  perMin: number;            // Buffs-stream events per player-minute');
  lines.push('  fromSpecs?: number[];      // specs that applied it to others');
  lines.push('  kind: "class" | "external" | "gear";');
  lines.push('};');
  lines.push('export type WowSpecSpellData = {');
  lines.push('  specId: number; spec: string; players: number;');
  lines.push('  observedGcdMs?: number;');
  lines.push('  abilities: WowAbilityData[];');
  lines.push('  statuses: WowStatusData[];');
  lines.push('  dots: { id: number; name: string }[];');
  lines.push('  enemyDebuffs: { id: number; name: string; perMin: number }[];');
  lines.push('  pets: { id: number; name: string }[];   // pet abilities, by damage');
  lines.push('};');
  lines.push('');
  lines.push('export const WOW_SPELL_DATA: Record<number, WowSpecSpellData> = {');
  for (const s of specs) {
    lines.push(`  // ── ${s.spec} (${s.players} player${s.players === 1 ? '' : 's'}) ──`);
    lines.push(`  ${s.specId}: {`);
    lines.push(`    specId: ${s.specId}, spec: ${lit(s.spec)}, players: ${s.players}, observedGcdMs: ${s.observedGcdMs ?? 'undefined'},`);
    lines.push('    abilities: [');
    for (const a of s.abilities) lines.push(`      ${entry(a)},`);
    lines.push('    ],');
    lines.push('    statuses: [');
    for (const a of s.statuses) lines.push(`      ${entry(a)},`);
    lines.push('    ],');
    lines.push(`    dots: [${s.dots.map(entry).join(', ')}],`);
    lines.push('    enemyDebuffs: [');
    for (const a of s.enemyDebuffs) lines.push(`      ${entry(a)},`);
    lines.push('    ],');
    lines.push(`    pets: [${s.pets.map(entry).join(', ')}],`);
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'));

  for (const s of specs) {
    const on = s.abilities.filter((a) => a.onGcd).length;
    console.log(`${String(s.specId).padStart(4)} ${s.spec.padEnd(28)} players ${s.players}  GCD ${s.observedGcdMs ?? '-'}ms  ` +
      `abilities ${s.abilities.length} (${on} on GCD)  statuses ${s.statuses.length}, fetched ${s.statuses.filter((x) => x.kind !== 'gear').length} ` +
      `(${s.statuses.filter((x) => x.kind !== 'gear').reduce((a, x) => a + x.perMin, 0).toFixed(0)}/min)  ` +
      `dots ${s.dots.length}  enemy debuffs ${s.enemyDebuffs.length}`);
  }
  console.log(`wrote ${path.relative(ROOT, OUT)} from ${surveys.length} fights`);
}

main();
