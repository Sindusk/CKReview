#!/usr/bin/env node
// scripts/analyze-report.js — the standard investigation recipes for a
// fetched report, behind one command. Built from the throwaway probes every
// boss session used to rewrite (see lib/mechanics/README.md, "The working
// method" and the per-boss lessons). Works on any folder produced by
// scripts/fetch-{wow,ff}-report.js; read-only.
//
// Usage:
//   node scripts/analyze-report.js <reportCode|folder> <command> [args] [options]
//
// <reportCode> is looked up under sampledata/wow/ then sampledata/ff/.
// Ability arguments take IDs ("1292403,1307635") or a case-insensitive name
// regex ("Caustic Waves", "Serpent's Bite|Volatile Purge"), which expands to
// every ID with a matching name. Times are seconds from the pull start.
//
// Commands:
//   pulls                          every pull: kill/wipe, length, deaths
//   sweep [nameRegex]              ability table: stream | type | id | name |
//                                  count | pulls | sources | targets
//                                  (--players to include player-cast abilities)
//   timeline <pull>                boss/add casts, casts that began but never
//                                  finished (kicks), key enemy buffs, deaths
//                                  (--skip <re> hides names; --buffs <re> picks
//                                  which enemy buffs show, default boss-ish ones)
//   deaths [--mark <abilities>]    each pull's deaths with killing ability and
//                                  role, plus the times of --mark casts
//   hits <abilities>               clusters of player damage per pull: time,
//                                  hits, players, amount min/median/max, deaths
//                                  (--gap ms, default 1000; --names lists who)
//   window <pull> <from> <to> <abilities>
//                                  every debuff/damage/cast/buff event of those
//                                  abilities in the window, plus deaths
//                                  (--max n damage lines per player, default 2)
//   adds <npcNameRegex>            per NPC instance: first/last seen and its
//                                  buffs, casts and hits on players (--pulls)
//   bursts <debuffs>               moments when a debuff lands on many players
//                                  at once (--gap ms 1000, --min players 5)
//   soakers <castAbilities> <debuffs>
//                                  per completed cast: distinct players gaining
//                                  the debuff within ±ms (--ms 500) — counts
//                                  soakers via a lockout/"just soaked" debuff
//   collapse                       per pull: seconds from the Nth concurrent
//                                  death (net of battle-rezzes) to the pull end,
//                                  for N = 4..8 — sets the "N dead" marker
//   players [pull]                 roster with spec/role (WoW) or job (FFXIV)
//   profile <abilities>            per ability ID over all selected pulls:
//                                  resolutions, how many players each hit
//                                  (histogram), resolutions where one player
//                                  took 2+ distinct instances (caster+instance:
//                                  an overlap), resolutions with a death to it,
//                                  and the kill's resolutions as the clean
//                                  baseline (--gap ms, default 1500)
//   resolutions <abilities>        one line per resolution: cast targets by
//                                  caster#instance, each hit (player#instance,
//                                  amount, HP% after), auras the player held
//                                  (--auras <debuffs>), deaths within 4s
//                                  (--gap ms, default 1500)
//   nokb                           deaths with no killing blow: last 3 hits
//                                  before (with HP%), how many no-killing-blow
//                                  deaths within 10s, seconds to the pull end —
//                                  separates called wipes from walls/knockbacks
//   after <castAbilities> <debuffs>
//                                  per cast cluster: players gaining the debuff
//                                  --from..--to seconds after it (default 0..8),
//                                  with each one's delay — e.g. who stood in
//                                  ground fire a cast left behind
//
// Options (all commands):
//   --pulls 1,3,5-8   only these pull numbers      --kill   only kills
//   --boss <substr>   only fights whose name matches (for multi-boss reports)

const fs = require('fs');
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { buildActorMap, buildAbilityMap, STREAM_KEYS } = require('./lib/load-report-folder');

// ── args ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const opts = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) opts[key] = true;
    else { opts[key] = next; i++; }
  } else positional.push(a);
}
if (positional.length < 2 || opts.help) {
  const lines = fs.readFileSync(__filename, 'utf8').split(/\r?\n/).slice(1);
  const header = lines.slice(0, lines.findIndex((l) => !l.startsWith('//')));
  console.log(header.map((l) => l.slice(3)).join('\n'));
  process.exit(positional.length < 2 && !opts.help ? 1 : 0);
}
const [target, command, ...rest] = positional;

// ── report loading (lazy per pull) ───────────────────────────────────────────

function resolveDir(t) {
  if (fs.existsSync(path.join(t, 'meta.json'))) return path.resolve(t);
  for (const game of ['wow', 'ff']) {
    const d = path.join(ROOT, 'sampledata', game, t);
    if (fs.existsSync(path.join(d, 'meta.json'))) return d;
  }
  console.error(`No report folder for "${t}" (looked in sampledata/wow and sampledata/ff). Fetch it first.`);
  process.exit(1);
}

const dir = resolveDir(target);
const game = dir.split(path.sep).includes('ff') ? 'ff' : 'wow';
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const actors = buildActorMap(meta);
const abilities = buildAbilityMap(meta);
const an = (id) => abilities.get(id) ?? `#${id}`;
const nm = (id) => actors.get(id)?.name ?? (id === -1 ? 'Environment' : `?${id}`);
const isPlayer = (id) => actors.get(id)?.type === 'Player';

// Pull numbering identical to buildFightLogLabels (per fight name, by start time).
const sanitize = (s) => s.replace(/[<>:"/\\|?*]/g, '').trim();
const fightByFile = new Map();
{
  const counters = new Map();
  for (const f of [...meta.fights].sort((a, b) => a.startTime - b.startTime)) {
    const name = f.name ?? 'Unknown Fight';
    const n = (counters.get(name) ?? 0) + 1;
    counters.set(name, n);
    fightByFile.set(`${sanitize(name)}_Pull${n}`, { fight: f, pullNumber: n, boss: name });
  }
}

const parsePullList = (s) => new Set(String(s).split(',').flatMap((part) => {
  const [a, b] = part.split('-').map(Number);
  return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
}));

const allPulls = fs.readdirSync(dir)
  .map((f) => f.match(/^(.*_Pull(\d+))\.json$/))
  .filter(Boolean)
  .map((m) => ({ file: path.join(dir, m[0]), ...(fightByFile.get(m[1]) ?? { fight: null, pullNumber: Number(m[2]), boss: m[1] }) }))
  .filter((p) => !opts.boss || p.boss.toLowerCase().includes(String(opts.boss).toLowerCase()))
  .sort((a, b) => a.boss.localeCompare(b.boss) || a.pullNumber - b.pullNumber);

function selectedPulls(onlyPull) {
  let ps = allPulls;
  if (onlyPull !== undefined) ps = ps.filter((p) => p.pullNumber === Number(onlyPull));
  if (opts.pulls) { const set = parsePullList(opts.pulls); ps = ps.filter((p) => set.has(p.pullNumber)); }
  if (opts.kill) ps = ps.filter((p) => p.fight?.kill);
  if (ps.length === 0) { console.error('No pulls match.'); process.exit(1); }
  return ps;
}

const cache = new Map();
function load(p) {
  if (cache.has(p.file)) return cache.get(p.file);
  const rep = JSON.parse(fs.readFileSync(p.file, 'utf8')).json.data.reportData.report;
  const s = {};
  for (const k of STREAM_KEYS) s[k] = rep[k]?.data ?? [];
  let start = p.fight?.startTime;
  if (start === undefined) start = Math.min(...(s.combatantInfo.length ? s.combatantInfo : s.damageTaken).map((e) => e.timestamp));
  const end = p.fight?.endTime ?? Math.max(...s.damageTaken.map((e) => e.timestamp));
  const out = { ...s, start, end, kill: !!p.fight?.kill, t: (ts) => ((ts - start) / 1000).toFixed(1) };
  if (cache.size >= 3) cache.delete(cache.keys().next().value); // big WoW pulls: keep memory bounded
  cache.set(p.file, out);
  return out;
}

/** Ability IDs from "123,456" or a name regex. */
function abilityIds(arg) {
  if (arg === undefined) { console.error('Missing ability argument (IDs or a name regex).'); process.exit(1); }
  if (/^[\d,\s]+$/.test(arg)) return new Set(arg.split(',').map(Number));
  const re = new RegExp(arg, 'i');
  const ids = [...abilities].filter(([, name]) => re.test(name)).map(([id]) => id);
  if (ids.length === 0) { console.error(`No ability name matches /${arg}/i.`); process.exit(1); }
  return new Set(ids);
}

let specInfo = null;
function roleOf(P, id) {
  const ci = P.combatantInfo.find((e) => e.sourceID === id);
  if (game === 'wow') {
    specInfo ??= requireTsFromRoot('lib/spec-data.ts').getSpecInfo;
    const s = specInfo(ci?.specID ?? 0);
    return { role: s.role, label: `${s.name} ${s.className}` };
  }
  const job = actors.get(id)?.subType ?? '';
  return { role: '', label: job };
}
const roleTag = (P, id) => { const r = roleOf(P, id).role; return r === 'Tank' ? 'T' : r === 'Healer' ? 'H' : ''; };
/** "Name (T): Killing Ability" — T/H marks tanks and healers (WoW). */
const deathText = (P, d) => {
  const tag = roleTag(P, d.targetID);
  return `${nm(d.targetID)}${tag ? ` (${tag})` : ''}: ${d.killingAbilityGameID ? an(d.killingAbilityGameID) : 'no killing blow'}`;
};

// Players dead at time `ts`, net of battle-rezzes (a rez = the player took
// damage or cast something 2s+ after dying and before dying again).
function deadAt(P, ts) {
  const deaths = P.deaths.filter((d) => isPlayer(d.targetID)).sort((a, b) => a.timestamp - b.timestamp);
  return deaths.filter((d) => {
    if (d.timestamp > ts) return false;
    const next = deaths.find((o) => o.targetID === d.targetID && o.timestamp > d.timestamp)?.timestamp ?? Infinity;
    if (next <= ts) return false;
    const active = (e) => e.timestamp > d.timestamp + 2000 && e.timestamp < next && e.timestamp <= ts;
    const rezzed = P.damageTaken.some((e) => e.targetID === d.targetID && active(e)) ||
      P.casts.some((e) => e.sourceID === d.targetID && active(e));
    return !rezzed;
  });
}

const cluster = (items, at, gap) => {
  const out = [];
  for (const x of [...items].sort((a, b) => at(a) - at(b))) {
    const g = out[out.length - 1];
    if (g && at(x) - at(g[g.length - 1]) <= gap) g.push(x); else out.push([x]);
  }
  return out;
};
const k = (n) => `${Math.round(n / 1000)}k`;
const amountOf = (e) => (e.amount ?? 0) + (e.absorbed ?? 0);
// Player hits that landed: FFLogs' "calculateddamage" previews only count
// when unpaired (the hit killed before its "damage" record), as in the app.
const landedHits = (P) => P.damageTaken.filter((e) => isPlayer(e.targetID) &&
  (e.type === undefined || e.type === 'damage' || (e.type === 'calculateddamage' && e.unpaired === true)));
// One copy of an ability: two bosses can reuse the same instance number.
const instKey = (e) => `${e.sourceID}#${e.sourceInstance ?? 0}`;

// ── commands ─────────────────────────────────────────────────────────────────

const commands = {
  pulls() {
    for (const p of selectedPulls()) {
      const P = load(p);
      const deaths = P.deaths.filter((d) => isPlayer(d.targetID)).length;
      console.log(`${p.boss} Pull ${String(p.pullNumber).padEnd(3)} ${P.kill ? 'KILL' : 'wipe'}  ${P.t(P.end).padStart(6)}s  ` +
        `${deaths} deaths  fight ${p.fight?.id ?? '?'}  ${(fs.statSync(p.file).size / 1e6).toFixed(1)}MB`);
    }
  },

  sweep(nameRe) {
    const re = nameRe ? new RegExp(nameRe, 'i') : null;
    const agg = new Map();
    for (const p of selectedPulls()) {
      const P = load(p);
      for (const s of ['casts', 'damageTaken', 'debuffs', 'enemyCasts', 'enemyBuffs', 'enemyDebuffs']) {
        for (const e of P[s]) {
          if (!opts.players && (s === 'casts' || s === 'damageTaken') && isPlayer(e.sourceID)) continue;
          if (!opts.players && s === 'debuffs' && !isPlayer(e.targetID)) continue;
          if (re && !re.test(an(e.abilityGameID))) continue;
          const key = `${s}|${e.type}|${e.abilityGameID}`;
          let a = agg.get(key);
          if (!a) agg.set(key, a = { n: 0, pulls: new Set(), src: new Set(), tgt: new Set() });
          a.n++; a.pulls.add(p.pullNumber); a.src.add(isPlayer(e.sourceID) ? 'players' : nm(e.sourceID));
          a.tgt.add(isPlayer(e.targetID) ? 'players' : nm(e.targetID));
        }
      }
    }
    const rows = [...agg].map(([key, a]) => { const [s, t, id] = key.split('|'); return { s, t, id: +id, ...a }; })
      .sort((a, b) => an(a.id).localeCompare(an(b.id)) || a.s.localeCompare(b.s) || a.t.localeCompare(b.t));
    for (const r of rows) {
      console.log(`${r.s.padEnd(12)} ${r.t.padEnd(17)} ${String(r.id).padEnd(8)} ${an(r.id).slice(0, 30).padEnd(30)} ` +
        `n=${String(r.n).padEnd(6)} pulls=${String(r.pulls.size).padEnd(3)} src=${[...r.src].slice(0, 3).join('/')} tgt=${[...r.tgt].slice(0, 3).join('/')}`);
    }
  },

  timeline(pullArg) {
    const skip = new RegExp(opts.skip || '^(Melee|Auto Attack|attack)$', 'i');
    const buffRe = new RegExp(opts.buffs || 'Heart|Rage|Bond|Revenge|Weakened|Boon|Protection|Berserk|Enrage|Shield|Immun', 'i');
    for (const p of selectedPulls(pullArg)) {
      const P = load(p);
      const rows = [];
      for (const e of P.enemyCasts) {
        if (isPlayer(e.sourceID) || skip.test(an(e.abilityGameID))) continue;
        const who = `${nm(e.sourceID)}${e.sourceInstance ? '#' + e.sourceInstance : ''}`;
        if (e.type === 'begincast') {
          const done = P.enemyCasts.some((c) => c.type === 'cast' && c.sourceID === e.sourceID && c.abilityGameID === e.abilityGameID &&
            (c.sourceInstance ?? 0) === (e.sourceInstance ?? 0) && c.timestamp >= e.timestamp && c.timestamp - e.timestamp < 30000);
          if (!done) rows.push([e.timestamp, `  NEVER FINISHED ${an(e.abilityGameID)} (${e.abilityGameID}) by ${who}`]);
        } else if (e.type === 'cast') {
          rows.push([e.timestamp, `cast ${an(e.abilityGameID)} (${e.abilityGameID}) by ${who}${isPlayer(e.targetID) ? ' -> ' + nm(e.targetID) : ''}`]);
        }
      }
      for (const e of P.enemyBuffs) {
        if (!buffRe.test(an(e.abilityGameID)) || skip.test(an(e.abilityGameID))) continue;
        rows.push([e.timestamp, `  ${e.type} ${an(e.abilityGameID)} (${e.abilityGameID}) on ${nm(e.targetID)}${e.targetInstance ? '#' + e.targetInstance : ''}`]);
      }
      for (const d of P.deaths) if (isPlayer(d.targetID)) rows.push([d.timestamp, `    DEATH ${deathText(P, d)}`]);
      rows.sort((a, b) => a[0] - b[0]);
      console.log(`=== ${p.boss} Pull ${p.pullNumber} (${P.kill ? 'kill' : 'wipe'}, ${P.t(P.end)}s)`);
      let last = '', count = 0, lastT = 0;
      const flush = () => { if (count) console.log(`          x${count + 1}`); count = 0; };
      for (const [ts, s] of rows) {
        if (s === last && ts - lastT < 3000) { count++; lastT = ts; continue; }
        flush(); last = s; lastT = ts;
        console.log(`+${P.t(ts).padStart(6)} ${s}`);
      }
      flush();
    }
  },

  deaths() {
    const mark = opts.mark ? abilityIds(opts.mark) : null;
    for (const p of selectedPulls()) {
      const P = load(p);
      const marks = mark ? P.enemyCasts.filter((e) => e.type === 'cast' && mark.has(e.abilityGameID)).map((e) => `${an(e.abilityGameID)}@${P.t(e.timestamp)}`) : [];
      console.log(`=== ${p.boss} Pull ${p.pullNumber} ${P.kill ? 'KILL' : 'wipe'} ${P.t(P.end)}s ${marks.join(' ')}`);
      const ds = P.deaths.filter((d) => isPlayer(d.targetID)).sort((a, b) => a.timestamp - b.timestamp)
        .map((d) => `+${P.t(d.timestamp)} ${deathText(P, d)}`);
      if (ds.length) console.log('   ' + ds.join(' | '));
    }
  },

  hits(arg) {
    const ids = abilityIds(arg);
    const gap = Number(opts.gap ?? 1000);
    for (const p of selectedPulls()) {
      const P = load(p);
      const hs = P.damageTaken.filter((e) => ids.has(e.abilityGameID) && isPlayer(e.targetID));
      const out = cluster(hs, (e) => e.timestamp, gap).map((g) => {
        const amts = g.map(amountOf).sort((a, b) => a - b);
        const who = new Set(g.map((e) => e.targetID));
        const dead = P.deaths.filter((d) => ids.has(d.killingAbilityGameID) && d.timestamp >= g[0].timestamp - 100 && d.timestamp <= g[g.length - 1].timestamp + 1500);
        return `+${P.t(g[0].timestamp)} n=${g.length} p=${who.size} ${k(amts[0])}/${k(amts[amts.length >> 1])}/${k(amts[amts.length - 1])}` +
          `${dead.length ? ' DEAD ' + dead.length : ''}${opts.names ? ' [' + [...who].map(nm).join(', ') + ']' : ''}`;
      });
      console.log(`${p.boss} P${p.pullNumber}${P.kill ? 'K' : ''}: ${out.join('  |  ') || '-'}`);
    }
  },

  window(pullArg, from, to, arg) {
    const ids = abilityIds(arg);
    const max = Number(opts.max ?? 2);
    for (const p of selectedPulls(pullArg)) {
      const P = load(p);
      const a = P.start + Number(from) * 1000, b = P.start + Number(to) * 1000;
      const inWin = (e) => e.timestamp >= a && e.timestamp <= b && ids.has(e.abilityGameID);
      const rows = [];
      const seen = new Map();
      const pos = (e) => (e.x !== undefined ? ` @${e.x},${e.y}` : '');
      for (const e of P.debuffs.filter(inWin)) rows.push([e.timestamp, `${e.type} ${an(e.abilityGameID)}(${e.abilityGameID}) on ${nm(e.targetID)} from ${nm(e.sourceID)}${e.stack ? ' stack ' + e.stack : ''}`]);
      for (const e of P.damageTaken.filter((x) => inWin(x) && isPlayer(x.targetID))) {
        const key = `${e.targetID}|${e.abilityGameID}`;
        const c = (seen.get(key) ?? 0) + 1; seen.set(key, c);
        if (c <= max) rows.push([e.timestamp, `  dmg ${an(e.abilityGameID)}(${e.abilityGameID}) -> ${nm(e.targetID)} ${k(amountOf(e))}${e.overkill ? ' OVERKILL' : ''}${pos(e)}`]);
      }
      for (const e of P.enemyCasts.filter(inWin)) rows.push([e.timestamp, `${e.type} ${an(e.abilityGameID)}(${e.abilityGameID}) by ${nm(e.sourceID)}${e.sourceInstance ? '#' + e.sourceInstance : ''}${e.targetID > 0 ? ' -> ' + nm(e.targetID) : ''}${pos(e)}`]);
      for (const e of [...P.enemyBuffs, ...P.enemyDebuffs].filter(inWin)) rows.push([e.timestamp, `${e.type} ${an(e.abilityGameID)}(${e.abilityGameID}) on ${nm(e.targetID)}${e.targetInstance ? '#' + e.targetInstance : ''}`]);
      for (const d of P.deaths) if (d.timestamp >= a && d.timestamp <= b && isPlayer(d.targetID)) rows.push([d.timestamp, `DEATH ${nm(d.targetID)} (${an(d.killingAbilityGameID)})`]);
      rows.sort((x, y) => x[0] - y[0]);
      console.log(`=== ${p.boss} Pull ${p.pullNumber} +${from}..+${to}s`);
      for (const [ts, s] of rows) console.log(`+${P.t(ts)} ${s}`);
      for (const [key, c] of seen) if (c > max) { const [id, ab] = key.split('|'); console.log(`  (${nm(+id)} ${an(+ab)} x${c})`); }
    }
  },

  adds(nameRe) {
    const re = new RegExp(nameRe ?? '.', 'i');
    for (const p of selectedPulls()) {
      const P = load(p);
      const by = new Map();
      const push = (id, inst, ts, s) => {
        if (isPlayer(id) || !re.test(nm(id))) return;
        const key = `${nm(id)}#${inst ?? 0}`;
        if (!by.has(key)) by.set(key, []);
        by.get(key).push([ts, s]);
      };
      for (const e of P.enemyBuffs) push(e.targetID, e.targetInstance, e.timestamp, `${e.type.replace('buff', '')}:${an(e.abilityGameID)}(${e.abilityGameID})`);
      for (const e of P.enemyCasts) push(e.sourceID, e.sourceInstance, e.timestamp, `${e.type}:${an(e.abilityGameID)}`);
      for (const e of P.damageTaken) if (isPlayer(e.targetID)) push(e.sourceID, e.sourceInstance, e.timestamp, `hit:${an(e.abilityGameID)}`);
      console.log(`=== ${p.boss} Pull ${p.pullNumber}`);
      for (const [key, ev] of [...by].sort((x, y) => Math.min(...x[1].map((e) => e[0])) - Math.min(...y[1].map((e) => e[0])))) {
        ev.sort((x, y) => x[0] - y[0]);
        const t0 = ev[0][0];
        const compact = [];
        for (const [ts, s] of ev) {
          const last = compact[compact.length - 1];
          if (last && last.s === s) { last.n++; continue; }
          compact.push({ ts, s, n: 1 });
        }
        console.log(`${key.padEnd(30)} +${P.t(t0)}..+${P.t(ev[ev.length - 1][0])}: ` +
          compact.map((c) => `${c.s}${c.n > 1 ? 'x' + c.n : ''}@${((c.ts - t0) / 1000).toFixed(1)}`).join(' ').slice(0, 400));
      }
    }
  },

  bursts(arg) {
    const ids = abilityIds(arg);
    const gap = Number(opts.gap ?? 1000), min = Number(opts.min ?? 5);
    for (const p of selectedPulls()) {
      const P = load(p);
      const ev = P.debuffs.filter((e) => ids.has(e.abilityGameID) && isPlayer(e.targetID) &&
        ['applydebuff', 'applydebuffstack', 'refreshdebuff'].includes(e.type));
      const out = cluster(ev, (e) => e.timestamp, gap)
        .filter((g) => new Set(g.map((e) => e.targetID)).size >= min)
        .map((g) => `+${P.t(g[0].timestamp)} x${new Set(g.map((e) => e.targetID)).size}`);
      console.log(`${p.boss} P${p.pullNumber}${P.kill ? 'K' : ''}: ${out.join(', ') || '-'}`);
    }
  },

  soakers(castArg, debuffArg) {
    const casts = abilityIds(castArg), debuffs = abilityIds(debuffArg);
    const ms = Number(opts.ms ?? 500);
    for (const p of selectedPulls()) {
      const P = load(p);
      const impacts = cluster(P.enemyCasts.filter((e) => e.type === 'cast' && casts.has(e.abilityGameID)), (e) => e.timestamp, 300).map((g) => g[0]);
      const out = impacts.map((c) => {
        const who = new Set(P.debuffs.filter((e) => debuffs.has(e.abilityGameID) && e.type === 'applydebuff' && Math.abs(e.timestamp - c.timestamp) <= ms).map((e) => e.targetID));
        return `+${P.t(c.timestamp)}:${who.size}${opts.names ? '[' + [...who].map(nm).join(',') + ']' : ''}`;
      });
      console.log(`${p.boss} P${p.pullNumber}${P.kill ? 'K' : ''}: ${out.join(' ') || '-'}`);
    }
  },

  collapse() {
    for (const p of selectedPulls()) {
      const P = load(p);
      const deaths = P.deaths.filter((d) => isPlayer(d.targetID)).sort((a, b) => a.timestamp - b.timestamp);
      const out = [];
      for (let n = 4; n <= 8; n++) {
        const d = deaths.find((x) => deadAt(P, x.timestamp).length >= n);
        if (d) out.push(`${n} dead @+${P.t(d.timestamp)} -> end in ${((P.end - d.timestamp) / 1000).toFixed(0)}s`);
      }
      console.log(`${p.boss} P${p.pullNumber}${P.kill ? 'K' : ''}: ${out.join(' | ') || '-'}`);
    }
  },

  players(pullArg) {
    const p = selectedPulls(pullArg)[0];
    const P = load(p);
    for (const ci of P.combatantInfo) {
      const r = roleOf(P, ci.sourceID);
      console.log(`${nm(ci.sourceID).padEnd(20)} ${(r.role || '').padEnd(7)} ${r.label}`);
    }
  },

  profile(arg) {
    const ids = abilityIds(arg);
    const gap = Number(opts.gap ?? 1500);
    const stat = new Map();
    for (const p of selectedPulls()) {
      const P = load(p);
      for (const id of ids) {
        for (const r of cluster(landedHits(P).filter((e) => e.abilityGameID === id), (e) => e.timestamp, gap)) {
          const per = new Map();
          for (const e of r) { if (!per.has(e.targetID)) per.set(e.targetID, new Set()); per.get(e.targetID).add(instKey(e)); }
          const multi = [...per].filter(([, v]) => v.size > 1);
          const died = P.deaths.some((d) => d.killingAbilityGameID === id && per.has(d.targetID) && d.timestamp >= r[0].timestamp && d.timestamp <= r[r.length - 1].timestamp + 3000);
          let st = stat.get(id);
          if (!st) stat.set(id, st = { res: 0, sizes: {}, multi: 0, deaths: 0, kill: [] });
          st.res++; st.sizes[per.size] = (st.sizes[per.size] ?? 0) + 1;
          if (multi.length) st.multi++;
          if (died) st.deaths++;
          if (P.kill) st.kill.push(`+${P.t(r[0].timestamp)} n=${per.size}${multi.length ? ' multi' : ''}`);
        }
      }
    }
    for (const [id, s] of stat) {
      console.log(`${String(id).padEnd(8)} ${an(id).slice(0, 28).padEnd(28)} res=${s.res} sizes=${JSON.stringify(s.sizes)} ` +
        `multiInstance=${s.multi} withDeaths=${s.deaths} | kill: ${s.kill.join('; ') || '-'}`);
    }
  },

  resolutions(arg) {
    const ids = abilityIds(arg);
    const auras = opts.auras ? abilityIds(opts.auras) : new Set();
    const gap = Number(opts.gap ?? 1500);
    for (const p of selectedPulls()) {
      const P = load(p);
      const held = (pid, ts) => [...auras].filter((a) => {
        const ev = P.debuffs.filter((e) => e.targetID === pid && e.abilityGameID === a && e.timestamp <= ts - 20);
        return ev.length && ev[ev.length - 1].type !== 'removedebuff';
      }).map(an);
      for (const r of cluster(landedHits(P).filter((e) => ids.has(e.abilityGameID)), (e) => e.timestamp, gap)) {
        const t0 = r[0].timestamp, t1 = r[r.length - 1].timestamp;
        const targets = P.enemyCasts.filter((c) => c.type === 'cast' && ids.has(c.abilityGameID) && c.timestamp >= t0 - 2000 && c.timestamp <= t1 && isPlayer(c.targetID))
          .map((c) => `${nm(c.sourceID)}#${c.sourceInstance ?? 0}>${nm(c.targetID)}`);
        const hits = r.map((e) => {
          const hp = e.targetResources?.maxHitPoints ? ` ${Math.round(100 * e.targetResources.hitPoints / e.targetResources.maxHitPoints)}%` : '';
          const a = held(e.targetID, e.timestamp);
          return `${nm(e.targetID)}#${e.sourceInstance ?? 0}:${k(amountOf(e))}${hp}${a.length ? '[' + a.join('/') + ']' : ''}`;
        });
        const died = P.deaths.filter((d) => isPlayer(d.targetID) && d.timestamp >= t0 && d.timestamp <= t1 + 4000).map((d) => `${nm(d.targetID)}(${an(d.killingAbilityGameID)})`);
        console.log(`${p.boss} P${p.pullNumber}${P.kill ? 'K' : ''} +${P.t(t0)} ${an(r[0].abilityGameID)}${targets.length ? ' targets ' + targets.join(',') : ''} | ${hits.join(' ')}${died.length ? ' | DIED ' + died.join(', ') : ''}`);
      }
    }
  },

  nokb() {
    for (const p of selectedPulls()) {
      const P = load(p);
      const silent = P.deaths.filter((d) => isPlayer(d.targetID) && !d.killingAbilityGameID);
      for (const d of silent) {
        const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= 10000).length;
        const last = landedHits(P).filter((e) => e.targetID === d.targetID && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - 8000).slice(-3)
          .map((e) => `${an(e.abilityGameID)}@-${((d.timestamp - e.timestamp) / 1000).toFixed(1)}s${e.targetResources?.maxHitPoints ? ' ' + Math.round(100 * e.targetResources.hitPoints / e.targetResources.maxHitPoints) + '%' : ''}`);
        console.log(`${p.boss} P${p.pullNumber}${P.kill ? 'K' : ''} +${P.t(d.timestamp)} ${nm(d.targetID)} within10s=${near} toEnd=${((P.end - d.timestamp) / 1000).toFixed(1)}s | ${last.join(' ; ') || '-'}`);
      }
    }
  },

  after(castArg, debuffArg) {
    const casts = abilityIds(castArg), debuffs = abilityIds(debuffArg);
    const from = Number(opts.from ?? 0) * 1000, to = Number(opts.to ?? 8) * 1000;
    const hist = {};
    for (const p of selectedPulls()) {
      const P = load(p);
      for (const g of cluster(P.enemyCasts.filter((e) => e.type === 'cast' && casts.has(e.abilityGameID)), (e) => e.timestamp, 3000)) {
        const t = g[0].timestamp;
        const first = new Map();
        for (const e of P.debuffs) {
          if (!debuffs.has(e.abilityGameID) || e.type !== 'applydebuff' || !isPlayer(e.targetID)) continue;
          if (e.timestamp < t + from || e.timestamp > t + to || first.has(e.targetID)) continue;
          first.set(e.targetID, e.timestamp);
        }
        hist[first.size] = (hist[first.size] ?? 0) + 1;
        if (first.size) console.log(`${p.boss} P${p.pullNumber}${P.kill ? 'K' : ''} ${an(g[0].abilityGameID)} +${P.t(t)}: ${first.size} — ` +
          [...first].map(([id, ts]) => `${nm(id)} +${((ts - t) / 1000).toFixed(1)}s`).join(', '));
      }
    }
    console.log('players per cast:', JSON.stringify(hist));
  },
};

if (!commands[command]) {
  console.error(`Unknown command "${command}". Commands: ${Object.keys(commands).join(', ')} (--help for details)`);
  process.exit(1);
}
commands[command](...rest);
