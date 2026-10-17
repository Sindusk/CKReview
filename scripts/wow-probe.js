#!/usr/bin/env node
// scripts/wow-probe.js — a cheap look at one player in one Warcraft Logs
// fight, to see whether a mistake happens there before downloading the
// pull (docs/wowa-audit-plan.md phase 3). The WoW twin of ff-probe.js.
// Fetches only that player's casts, the buffs they put on themselves and
// the pull's deaths: a few API points. Read-only: prints, writes nothing.
//
// Usage:
//   node scripts/wow-probe.js <code> <fightId> <player name|spec> [options]
//
//   A spec ("Windwalker") picks the fight's first player of that spec; the
//   fight's players and specs print when nothing matches.
//
// Prints, per self-buff: how many were applied, used (removed within 0.1s
// of one of their casts) and lost (removed with no cast beside it: expired,
// or overwritten), with the lost ones' times, each marked when it fell
// within 3s of the player's death or the pull's end. Then the cast counts.
//
// Options:
//   --buff <text>    only buffs whose name contains this (repeatable)
//   --casts <text>   also list the times of casts whose name contains this
//                    (repeatable)
//   --gaps <text>    intervals between casts whose name contains this:
//                    min / median / max and the five longest, with times
//                    (repeatable). A cooldown held too long shows up here.
//   --hits <text>    also fetch the player's damage (a few more points) and,
//                    per cast whose name contains this, the enemies it hit
//                    (repeatable): "Spinning Crane Kick 3:12.4 x1".
//                    Finds AoE on one target, or a finish that hit nothing.
//   --creds <path>   default .credentials/wcl-token.json
//
// Find candidate kills with scripts/wow-rankings.js; fetch the one you'll
// use with `node scripts/fetch-wow-report.js <code> --fight <id>`, then
// check the app's finding there. A "lost" here is a lead, not a verdict:
// overwrites, deaths and downtime still need the log.

const { createWclGql } = require('./lib/wcl-gql');

const argv = process.argv.slice(2);
const opt = { buffs: [], casts: [], gaps: [], hits: [], creds: null, pos: [] };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--buff') opt.buffs.push(argv[++i].toLowerCase());
  else if (argv[i] === '--hits') opt.hits.push(argv[++i].toLowerCase());
  else if (argv[i] === '--casts') opt.casts.push(argv[++i].toLowerCase());
  else if (argv[i] === '--gaps') opt.gaps.push(argv[++i].toLowerCase());
  else if (argv[i] === '--creds') opt.creds = argv[++i];
  else opt.pos.push(argv[i]);
}
const [code, fightArg, ...whoParts] = opt.pos;
const who = whoParts.join(' ');
if (!who) {
  console.log('usage: node scripts/wow-probe.js <code> <fightId> <player name|spec> [--buff text] [--casts text] [--gaps text] [--hits text]');
  process.exit(1);
}
const fightId = Number(fightArg);
const { gql, budgetLine } = createWclGql({ creds: opt.creds });

const META_QUERY = `query($code:String!,$f:[Int]!){
  rateLimitData{limitPerHour pointsSpentThisHour pointsResetIn}
  reportData{report(code:$code){
    fights(fightIDs:$f){id name startTime endTime kill difficulty friendlyPlayers}
    playerDetails(fightIDs:$f)
    masterData{actors(type:"Player"){id name subType} abilities{gameID name}}}}}`;
const EVENTS_QUERY = `query($code:String!,$f:[Int]!,$s:Float,$e:Float,$dt:EventDataType,$src:Int){
  rateLimitData{limitPerHour pointsSpentThisHour pointsResetIn}
  reportData{report(code:$code){
    events(dataType:$dt,hostilityType:Friendlies,fightIDs:$f,startTime:$s,endTime:$e,sourceID:$src,limit:10000){data nextPageTimestamp}}}}`;

async function events(fight, dt, src) {
  const out = [];
  for (let s = fight.startTime; s;) {
    const ev = (await gql(EVENTS_QUERY, { code, f: [fight.id], s, e: fight.endTime, dt, src })).reportData.report.events;
    out.push(...ev.data);
    s = ev.nextPageTimestamp;
  }
  return out;
}

const clock = (ms) => { const s = Math.round(ms / 100) / 10; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

(async () => {
  const report = (await gql(META_QUERY, { code, f: [fightId] })).reportData.report;
  const fight = report.fights[0];
  if (!fight) throw new Error(`no fight ${fightId} in ${code}`);
  // playerDetails: { data: { playerDetails: { tanks, healers, dps: [{ id, name, type, specs: [{ spec }] }] } } }
  const pd = report.playerDetails?.data?.playerDetails ?? {};
  const specOf = new Map(['tanks', 'healers', 'dps'].flatMap((k) => (pd[k] ?? []).map((p) => [p.id, p.specs?.[0]?.spec ?? '?'])));
  const players = report.masterData.actors.filter((a) => fight.friendlyPlayers.includes(a.id));
  const lower = who.toLowerCase().replace(/\s+/g, '');
  const actor = players.find((a) => a.name.toLowerCase() === who.toLowerCase())
    ?? players.find((a) => [specOf.get(a.id), `${specOf.get(a.id)}${a.subType}`].some((s) => s && s.toLowerCase().replace(/\s+/g, '') === lower));
  if (!actor) throw new Error(`no ${who} in fight ${fightId}; players: ${players.map((a) => `${a.name} (${specOf.get(a.id) ?? '?'} ${a.subType})`).join(', ')}`);
  const name = new Map(report.masterData.abilities.map((a) => [a.gameID, a.name]));
  const nameOf = (id) => name.get(id) ?? `#${id}`;
  const t0 = fight.startTime, end = fight.endTime - t0;

  const casts = (await events(fight, 'Casts', actor.id)).filter((e) => e.type === 'cast');
  const buffs = (await events(fight, 'Buffs', actor.id)).filter((e) => e.targetID === actor.id);
  const deaths = (await events(fight, 'Deaths')).filter((e) => e.targetID === actor.id).map((e) => e.timestamp - t0);

  console.log(`${code} fight ${fightId} ${fight.name} (difficulty ${fight.difficulty}, ${fight.kill ? 'kill' : 'wipe'}, ${clock(end)}): ` +
    `${actor.name} (${specOf.get(actor.id) ?? '?'} ${actor.subType})` + (deaths.length ? `, died ${deaths.map(clock).join(', ')}` : ''));
  const castAt = (t) => casts.filter((c) => Math.abs(c.timestamp - t) <= 100).map((c) => nameOf(c.abilityGameID));
  const mark = (t) => (deaths.some((d) => t <= d && d - t <= 3000) ? ' (death)' : end - t <= 3000 ? ' (end)' : '');

  const byBuff = new Map();
  for (const b of buffs) {
    const n = nameOf(b.abilityGameID);
    if (opt.buffs.length && !opt.buffs.some((x) => n.toLowerCase().includes(x))) continue;
    const row = byBuff.get(n) ?? { applied: 0, by: new Map(), lost: [] };
    if (b.type === 'applybuff') row.applied++;
    else if (b.type === 'removebuff' || b.type === 'removebuffstack') {
      const at = castAt(b.timestamp);
      if (at.length) { const k = at.join(' + '); row.by.set(k, [...(row.by.get(k) ?? []), b.timestamp - t0]); }
      else if (b.type === 'removebuff') row.lost.push(b.timestamp - t0);
    }
    byBuff.set(n, row);
  }
  // Removals at a cast, by that cast: the rarer ones (a proc cleared by
  // the wrong action) with their times.
  for (const [n, r] of [...byBuff].sort((a, b) => b[1].lost.length - a[1].lost.length)) {
    const by = [...r.by].sort((a, b) => b[1].length - a[1].length)
      .map(([k, ts], i) => `${k} ${ts.length}` + (i > 0 && ts.length <= 3 ? ` (${ts.map(clock).join(', ')})` : '')).join(', ');
    console.log(`  ${n}: ${r.applied} applied; removed at ${by || 'no cast'}; ${r.lost.length} with no cast` +
      (r.lost.length ? `: ${r.lost.map((t) => clock(t) + mark(t)).join(', ')}` : ''));
  }
  const counts = new Map();
  for (const c of casts) { const n = nameOf(c.abilityGameID); counts.set(n, (counts.get(n) ?? 0) + 1); }
  console.log(`  casts: ${[...counts].sort((a, b) => b[1] - a[1]).map(([n, k]) => `${n} ${k}`).join(', ')}`);
  const matching = (x) => casts.filter((c) => nameOf(c.abilityGameID).toLowerCase().includes(x));
  for (const x of opt.casts) {
    console.log(`  "${x}": ${matching(x).map((c) => `${nameOf(c.abilityGameID)} ${clock(c.timestamp - t0)}`).join(', ') || 'none'}`);
  }
  for (const x of opt.gaps) {
    const ts = matching(x).map((c) => c.timestamp - t0);
    const iv = ts.slice(1).map((t, i) => ({ at: ts[i], s: (t - ts[i]) / 1000 }));
    if (!iv.length) { console.log(`  gaps "${x}": fewer than two casts`); continue; }
    const sorted = [...iv].sort((a, b) => a.s - b.s);
    const longest = [...iv].sort((a, b) => b.s - a.s).slice(0, 5).map((g) => `${g.s.toFixed(1)}s from ${clock(g.at)}`);
    console.log(`  gaps "${x}" (${ts.length} casts): min ${sorted[0].s.toFixed(1)}s, median ${sorted[sorted.length >> 1].s.toFixed(1)}s, max ${sorted[sorted.length - 1].s.toFixed(1)}s; longest ${longest.join(', ')}`);
  }
  if (opt.hits.length) {
    const all = (await events(fight, 'DamageDone', actor.id)).filter((e) => e.type === 'damage');
    const dmg = all.filter((e) => !e.tick);
    for (const x of opt.hits) {
      const sel = matching(x);
      const out = sel.map((c, i) => {
        // Hits of the same ability from this cast until the next one (at most 3s).
        const until = Math.min(sel[i + 1]?.timestamp ?? Infinity, c.timestamp + 3000);
        let hs = dmg.filter((e) => e.abilityGameID === c.abilityGameID && e.timestamp >= c.timestamp && e.timestamp < until);
        // Damage logged under another id of the same name (WoW often splits
        // cast and damage ids), or a DoT-only cast: same name, next 20s.
        if (hs.length === 0) {
          const nm = nameOf(c.abilityGameID);
          hs = all.filter((e) => nameOf(e.abilityGameID) === nm && e.timestamp >= c.timestamp && e.timestamp < Math.min(until, c.timestamp + 20_000));
        }
        const landed = hs.filter((e) => (e.amount ?? 0) + (e.absorbed ?? 0) > 0);
        const targets = new Set(landed.map((e) => `${e.targetID}.${e.targetInstance ?? 1}`));
        return `${nameOf(c.abilityGameID)} ${clock(c.timestamp - t0)} x${targets.size}${hs.length > landed.length ? ` (${hs.length - landed.length} for 0)` : ''}${hs.some((e) => e.tick) ? ` ${landed.length} ticks` : ''}`;
      });
      console.log(`  hits "${x}": ${out.join(', ') || 'none'}`);
    }
  }
  console.log(budgetLine());
})().catch((e) => { console.error(e.message); process.exit(1); });
