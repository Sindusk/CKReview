#!/usr/bin/env node
// scripts/analyze-dps.js — compares damage output between two groups of
// FFXIV pulls (typically "our enrages" vs "other groups' clears") from data
// fetched by scripts/fetch-ff-dps.js. Read-only, no API calls. Each command
// is one check from the first DPS-improvement study; docs/dps-analysis.md
// explains the order to run them in and the traps each one guards against.
//
// Usage:
//   node scripts/analyze-dps.js <command> <target>... [--vs <target>...] [options]
//
// <target> is a report code (every fetched fight in sampledata/ff/<code>/dps)
// or code:fightIds ("ZADQVgGzTm8HNc2W:3,12"). Targets before --vs are group A
// (marked *), targets after it group B. Times are seconds from the focus
// phase's start (the --phase given to the fetch; default the last phase).
//
// Commands:
//   phases                 raid damage, duration and DPS per phase, LB damage,
//                          comp. Identical totals across logs = a fixed HP
//                          pool; varying totals = overflow is lost
//   players [--phase n]    per player: aDPS, rDPS, active %, phase deaths.
//                          Default: the focus phase, ended at the wipe
//   window                 fixed focus window: raid damage per bin, rDPS per
//                          player, role averages per group
//   casts <Job> [--from s] [--to s] [--list] [--hide <re>]
//                          that job's ability counts per fight; --list prints
//                          each fight's timeline (--hide drops filler names)
//   buffs [--filter <re>] [--from s] [--to s]
//                          raid buffs, personal burst, potions, LBs by time
//   rdps <Job>             own damage, damage received from others' buffs,
//                          damage given by own buffs (per buff), rDPS — over
//                          the whole focus phase up to the kill or wipe
//   taken                  damage taken by ability, focus-window debuff
//                          summary (Damage Down etc.)
//   debuffs                each tracked debuff event (fetch --debuffs) with
//                          target and time
//   stacks <Job> [abilityId]
//                          stack-size classification of a stacking ability
//                          from damage size (needs fetch --hits). Default
//                          7404 Pitch Perfect
//   songs                  BRD: Pitch Perfect count per Wanderer's Minuet and
//                          the song/Apex sequence around the focus-phase start

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/require-ts');

const ABBR = { Paladin: 'PLD', Warrior: 'WAR', DarkKnight: 'DRK', Gunbreaker: 'GNB', WhiteMage: 'WHM', Scholar: 'SCH', Astrologian: 'AST', Sage: 'SGE', Monk: 'MNK', Dragoon: 'DRG', Ninja: 'NIN', Samurai: 'SAM', Reaper: 'RPR', Viper: 'VPR', Bard: 'BRD', Machinist: 'MCH', Dancer: 'DNC', BlackMage: 'BLM', Summoner: 'SMN', RedMage: 'RDM', Pictomancer: 'PCT', LimitBreak: 'LB' };
const ROLE = { PLD: 'Tank', WAR: 'Tank', DRK: 'Tank', GNB: 'Tank', WHM: 'Healer', SCH: 'Healer', AST: 'Healer', SGE: 'Healer', LB: 'LB' };
const roleOf = (type) => ROLE[ABBR[type]] || 'DPS';
const DEFAULT_BUFFS = "^(Divination|Battle Litany|Battle Voice|Radiant Finale|Searing Light|Brotherhood|Chain Stratagem|Embolden|Technical Finish|Arcane Circle|Starry Muse|Dokumori|Lance Charge|Fight or Flight|Living Shadow|Serpent's Ire|Ley Lines|Raging Strikes|The Wanderer's Minuet|Grade \\d+ Gemdraught.*|Dragonsong Dive)$";

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const command = argv.shift();
const opts = {}; const groupA = []; const groupB = []; const extra = [];
let inB = false;
for (let i = 0; i < argv.length; i++) {
  const x = argv[i];
  if (x === '--vs') inB = true;
  else if (x === '--list') opts.list = true;
  else if (x.startsWith('--')) opts[x.slice(2)] = argv[++i];
  else if (/^[a-zA-Z0-9]{16,}(:[\d,]+)?$/.test(x)) (inB ? groupB : groupA).push(x);
  else extra.push(x);
}
if (!command || groupA.length === 0) {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(command ? 1 : 0);
}

// ── loading ──────────────────────────────────────────────────────────────────
const metaCache = new Map();
function loadMeta(code) {
  if (!metaCache.has(code)) {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'sampledata', 'ff', code, 'dps', 'meta.json'), 'utf8'));
    m.actorById = new Map(m.masterData.actors.map((a) => [a.id, a]));
    m.abilityName = new Map(m.masterData.abilities.map((a) => [a.gameID, a.name]));
    metaCache.set(code, m);
  }
  return metaCache.get(code);
}
function loadTargets(list, isA) {
  const out = [];
  for (const t of list) {
    const [code, ids] = t.split(':');
    const dir = path.join(ROOT, 'sampledata', 'ff', code, 'dps');
    if (!fs.existsSync(dir)) throw new Error(`No DPS data for ${code}; run scripts/fetch-ff-dps.js first`);
    const want = ids ? ids.split(',').map(Number) : null;
    for (const f of fs.readdirSync(dir).filter((n) => /^fight\d+\.json$/.test(n))) {
      const id = Number(f.match(/\d+/)[0]);
      if (want && !want.includes(id)) continue;
      const o = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      o.meta = loadMeta(code); o.isA = isA;
      o.tag = `${isA ? '*' : ' '}${code.slice(0, 4)}#${id}`;
      o.result = o.fight.kill ? 'KILL' : `${o.fight.bossPercentage}%`;
      out.push(o);
    }
  }
  return out;
}
const fights = [...loadTargets(groupA, true), ...loadTargets(groupB, false)];
const rel = (o, t) => (t - o.focus.start) / 1000;
const ab = (o, id) => o.meta.abilityName.get(id) ?? String(id);
const actorOfJob = (o, job) => o.meta.masterData.actors.find((a) => a.subType === job && o.fight.friendlyPlayers.includes(a.id));
const k = (n) => (n / 1000).toFixed(1);
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);

// Wipes keep logging ~8s after the enrage with the whole party dead, which
// dilutes per-second numbers. End a wipe's focus phase at the first moment
// 6+ deaths land within 15s.
function focusEnd(o) {
  if (o.fight.kill) return o.focus.end;
  const ds = o.deaths.filter((d) => d.t >= o.focus.start).map((d) => d.t).sort((a, b) => a - b);
  for (let i = 5; i < ds.length; i++) if (ds[i] - ds[i - 5] <= 15000) return ds[i];
  return o.focus.end;
}

// ── commands ─────────────────────────────────────────────────────────────────
const commands = {
  phases() {
    for (const o of fights) {
      const cells = o.phases.map((p) => {
        const t = o.tables[`p${p.phase}`]; const dur = t.totalTime / 1000;
        const tot = t.entries.reduce((s, e) => s + e.total, 0);
        const lb = t.entries.filter((e) => e.type === 'LimitBreak').reduce((s, e) => s + e.total, 0);
        return `P${p.phase} ${(tot / 1e6).toFixed(1)}M/${dur.toFixed(0)}s=${k(tot / dur)}k${lb ? ` lb${(lb / 1e6).toFixed(1)}` : ''}`;
      });
      const comp = o.tables.all.entries.filter((e) => e.type !== 'LimitBreak').map((e) => ABBR[e.type] || e.type).sort().join(' ');
      console.log(`${o.tag.padEnd(9)} ${o.result.padEnd(6)} ${cells.join(' | ')} | ${comp}`);
    }
  },

  players() {
    for (const o of fights) {
      const key = opts.phase ? `p${opts.phase}` : `p${o.focus.phase}`;
      const t = o.tables[key];
      const dur = (opts.phase ? t.totalTime : Math.min(t.totalTime, focusEnd(o) - o.focus.start)) / 1000;
      const start = o.phases.find((p) => `p${p.phase}` === key).start;
      console.log(`\n${o.tag} ${o.result} ${key} over ${dur.toFixed(1)}s`);
      for (const e of [...t.entries].sort((a, b) => (b.rdps ?? b.total) - (a.rdps ?? a.total)))
        console.log(`  ${(ABBR[e.type] || e.type).padEnd(4)} ${e.name.padEnd(24)} aDPS ${k(e.total / dur).padStart(6)}k  rDPS ${k((e.rdps ?? e.total) / dur).padStart(6)}k  active ${(100 * e.activeTime / (dur * 1000)).toFixed(0)}%`);
      const ds = o.deaths.filter((d) => d.t >= start && d.t <= focusEnd(o) - 1);
      if (ds.length) console.log('  deaths:', ds.map((d) => `${d.name}@${((d.t - start) / 1000).toFixed(0)}s(${d.killedBy.join('+') || (d.damageTotal ? '?' : 'no damage: DC?')})`).join(', '));
    }
  },

  window() {
    const roles = { A: {}, B: {} }; const bins = { A: [], B: [] };
    for (const o of fights) {
      const sum = (t) => t.entries.reduce((s, e) => s + e.total, 0) / 1e6;
      const w = o.focus.windowTable; const dur = w.totalTime / 1000;
      const pl = w.entries.filter((e) => e.type !== 'LimitBreak').sort((a, b) => b.rdps - a.rdps).map((e) => `${ABBR[e.type] || e.type} ${k(e.rdps / dur)}`).join('  ');
      console.log(`${o.tag.padEnd(9)} ${o.result.padEnd(6)} ${sum(w).toFixed(2).padStart(6)}M in ${dur.toFixed(0)}s | bins ${o.focus.bins.map((b) => sum(b.table).toFixed(2)).join(' ')} | ${pl}`);
      const g = o.isA ? 'A' : 'B';
      for (const e of w.entries) (roles[g][roleOf(e.type)] ||= []).push(e.rdps / dur);
      o.focus.bins.forEach((b, i) => (bins[g][i] ||= []).push(sum(b.table)));
    }
    for (const g of ['A', 'B']) {
      if (!Object.keys(roles[g]).length) continue;
      console.log(`group ${g}: rDPS per player ${Object.entries(roles[g]).map(([r, v]) => `${r} ${k(avg(v))}k`).join(', ')} | avg bins ${bins[g].map((v) => avg(v).toFixed(2)).join(' ')}`);
    }
    console.log('Window ends mid-burst? Check `buffs` before trusting a count difference near the window edge.');
  },

  casts() {
    const job = extra[0]; if (!job) throw new Error('casts <Job>, e.g. casts Bard');
    const from = Number(opts.from ?? 0), to = Number(opts.to ?? fights[0]?.focus.window ?? 210);
    const hide = opts.hide ? new RegExp(opts.hide) : null;
    const counts = {};
    for (const o of fights) {
      const a = actorOfJob(o, job); if (!a) continue;
      const cs = o.casts.filter((c) => c.src === a.id && rel(o, c.t) >= from && rel(o, c.t) <= to);
      const c = (counts[o.tag] = {});
      for (const x of cs) c[ab(o, x.ab)] = (c[ab(o, x.ab)] || 0) + 1;
      if (opts.list) console.log(`\n${o.tag} ${a.name}\n` + cs.filter((x) => !hide || !hide.test(ab(o, x.ab))).map((x) => `${rel(o, x.t).toFixed(1)} ${ab(o, x.ab)}`).join(' | '));
    }
    const names = [...new Set(Object.values(counts).flatMap(Object.keys))].sort();
    console.log(`\n${job} casts ${from}..${to}s`.padEnd(30) + Object.keys(counts).map((t) => t.padStart(9)).join(''));
    for (const n of names) console.log(n.slice(0, 28).padEnd(30) + Object.values(counts).map((c) => String(c[n] || '-').padStart(9)).join(''));
  },

  buffs() {
    const re = new RegExp(opts.filter ?? DEFAULT_BUFFS);
    const from = Number(opts.from ?? -40), to = Number(opts.to ?? 9999);
    for (const o of fights) {
      const cs = o.casts.filter((c) => rel(o, c.t) >= from && rel(o, c.t) <= to && re.test(ab(o, c.ab)));
      console.log(`\n${o.tag} ${o.result}: ` + cs.map((c) => `${rel(o, c.t).toFixed(0)} ${ABBR[o.meta.actorById.get(c.src)?.subType] || '?'}:${ab(o, c.ab).replace(/Grade \d+ Gemdraught of /, 'pot-').replace(/ \[HQ\]/, '')}`).join(' | '));
    }
  },

  rdps() {
    const job = extra[0]; if (!job) throw new Error('rdps <Job>');
    console.log('per second over the focus phase, ended at the kill or the wipe');
    for (const o of fights) {
      const e = o.tables[`p${o.focus.phase}`].entries.find((x) => x.type === job); if (!e) continue;
      const dur = (focusEnd(o) - o.focus.start) / 1000;
      const given = e.given.map((g) => `${g.name} ${k(g.total / dur)}`).join(', ');
      console.log(`${o.tag.padEnd(9)} own ${k(e.total / dur)}k  received ${k(e.rdpsTaken / dur)}k  own-received ${k((e.total - e.rdpsTaken) / dur)}k  given ${k(e.rdpsGiven / dur)}k  rDPS ${k(e.rdps / dur)}k | ${given}`);
    }
    console.log('own-received = the player\'s own play; given depends on how hard teammates hit under the buffs.');
  },

  taken() {
    const per = {};
    for (const o of fights) {
      let tot = 0;
      for (const e of o.focus.taken.entries) { tot += e.total; for (const a of e.abilities || []) (per[a.name] ||= {})[o.tag] = (per[a.name]?.[o.tag] || 0) + a.total; }
      const db = o.focus.debuffs.filter((a) => /Damage Down|Vulnerability|Weakness|Brink/.test(a.name)).map((a) => `${a.name} x${a.uses} ${(a.uptime / 1000).toFixed(0)}s`).join('; ');
      console.log(`${o.tag.padEnd(9)} taken ${(tot / 1e6).toFixed(1)}M | ${db}`);
    }
    console.log('\nability (M, top abilities per player only)'.padEnd(30) + fights.map((o) => o.tag.padStart(9)).join(''));
    for (const [n, v] of Object.entries(per).sort((a, b) => Object.values(b[1]).reduce((s, x) => s + x, 0) - Object.values(a[1]).reduce((s, x) => s + x, 0)))
      console.log(n.slice(0, 28).padEnd(30) + fights.map((o) => ((v[o.tag] || 0) / 1e6).toFixed(2).padStart(9)).join(''));
  },

  debuffs() {
    for (const o of fights) {
      console.log(`\n${o.tag} ${o.result}`);
      for (const e of o.debuffEvents) {
        const a = o.meta.actorById.get(e.tgt);
        console.log(`  ${rel(o, e.t).toFixed(1).padStart(7)}s ${e.type.padEnd(13)} ${ab(o, e.ab).padEnd(16)} ${a ? `${a.name} (${ABBR[a.subType] || a.subType})` : `actor ${e.tgt}`}`);
      }
    }
  },

  stacks() {
    const job = extra[0]; const id = Number(extra[1] ?? 7404);
    if (!job) throw new Error('stacks <Job> [abilityId]');
    console.log('Hits normalized for crit (x1.6), direct hit (x1.25) and buff multiplier, then compared with the');
    console.log('fight\'s 80th-percentile hit (= full stacks). Multi-target phases add falloff hits that look like low stacks.');
    for (const o of fights) {
      const hs = (o.hits?.[job] || []).filter((h) => h.ab === id && h.amount > 0); // 0 = untargetable/immune target
      if (!hs.length) { console.log(`${o.tag}: no hits fetched (fetch-ff-dps.js --hits ${job}:${id})`); continue; }
      const norm = hs.map((h) => ({ t: rel(o, h.t), v: h.amount / (h.crit ? 1.6 : 1) / (h.dh ? 1.25 : 1) / (h.multiplier || 1) }));
      const ref = [...norm].map((x) => x.v).sort((a, b) => a - b)[Math.floor(norm.length * 0.8)];
      const low = norm.filter((x) => x.v / ref <= 0.8);
      const inFocus = norm.filter((x) => x.t >= 0);
      console.log(`${o.tag.padEnd(9)} ${norm.length} hits, ${norm.length - low.length} full | focus phase: ${inFocus.length} hits, ${inFocus.filter((x) => x.v / ref > 0.8).length} full | below full at: ${low.map((x) => `${x.t.toFixed(0)}s(${(x.v / ref).toFixed(2)})`).join(' ')}`);
    }
  },

  songs() {
    const SONG = /^(The Wanderer's Minuet|Mage's Ballad|Army's Paeon)$/;
    for (const o of fights) {
      const a = actorOfJob(o, 'Bard'); if (!a) continue;
      const cs = o.casts.filter((c) => c.src === a.id).map((c) => ({ t: c.t, n: ab(o, c.ab) }));
      const wm = [];
      cs.forEach((c, i) => {
        if (c.n !== "The Wanderer's Minuet") return;
        const end = cs.slice(i + 1).find((x) => SONG.test(x.n))?.t ?? o.fight.endTime;
        const pp = cs.filter((x) => x.n === 'Pitch Perfect' && x.t > c.t && x.t <= end + 1500).length;
        wm.push(`${rel(o, c.t).toFixed(0)}s:${pp}PP/${((end - c.t) / 1000).toFixed(0)}s`);
      });
      const around = cs.filter((c) => rel(o, c.t) >= -75 && rel(o, c.t) <= 25 && /Apex|Blast|Ballad|Minuet|Paeon|Troubadour|Barrage|Resonant/.test(c.n))
        .map((c) => `${rel(o, c.t).toFixed(0)} ${c.n.replace("The Wanderer's Minuet", 'WM').replace("Mage's Ballad", 'MB').replace("Army's Paeon", 'AP')}`);
      console.log(`${o.tag} WM (start rel. focus: PP count/song length): ${wm.join(' ')}\n         around focus start: ${around.join(' | ')}`);
    }
  },
};

if (!commands[command]) { console.error(`Unknown command: ${command}`); process.exit(1); }
commands[command]();
