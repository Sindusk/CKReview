#!/usr/bin/env node
// scripts/ff-rankings.js — lists FFLogs character rankings for one job on
// one encounter, from the bottom up by default, to find pulls where a
// mistake happens (docs/xiva-audit-plan.md phase 3: a check is only
// tested on a pull where someone makes the mistake, and weak parses make
// it most). Read-only: prints, writes nothing.
//
// Usage:
//   node scripts/ff-rankings.js <encounter> <Job> [options]
//
//   <encounter>  FFLogs encounter id, or a name known below (Dancing Mad,
//                Vamp Fatale, Red Hot and Deep Blue, The Tyrant, Lindwurm,
//                Lindwurm II). Other ids: any sampledata/ff/*/meta.json
//                fight's encounterID.
//   <Job>        spec name as FFLogs writes it (Ninja, RedMage, BlackMage,
//                DarkKnight, Gunbreaker ...)
//
// Options:
//   --from-pct <n>  start at this percentile (default 0: the bottom)
//   --pages <n>     pages of 100 to list, walking up (default 1)
//   --metric <m>    rdps (default), dps, adps, ndps
//   --stop-at <f>   refuse to query once this share of the hour's points is
//                   spent (default 0.5)
//   --creds <path>  default .credentials/ffl-token.json
//
// Each page costs a few points; the hour's budget prints after every
// query. Next steps (CLAUDE.md, xiva-audit-plan): probe a pull cheaply
// with `node scripts/fetch-ff-dps.js <code> --fight <id>` (~15 points),
// then `node scripts/fetch-ff-report.js <code> --fight <id>` for the one
// you'll use, into its own report folder. Never fetch whole reports.
//
// Percentiles are by rank in this listing (rank 1 = 100), close to but
// not exactly FFLogs' parse colour.

const path = require('path');
const { ROOT } = require('./lib/require-ts');
const { createNodeLogAuth } = require('./lib/node-log-auth');

const ENCOUNTERS = {
  'dancing mad': 1085,
  'vamp fatale': 101,
  'red hot and deep blue': 102,
  'the tyrant': 103,
  'lindwurm': 104,
  'lindwurm ii': 105,
};

function parseArgs(argv) {
  const a = { fromPct: 0, pages: 1, metric: 'rdps', stopAt: 0.5, creds: null, pos: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--from-pct') a.fromPct = Number(argv[++i]);
    else if (x === '--pages') a.pages = Number(argv[++i]);
    else if (x === '--metric') a.metric = argv[++i];
    else if (x === '--stop-at') a.stopAt = Number(argv[++i]);
    else if (x === '--creds') a.creds = argv[++i];
    else a.pos.push(x);
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (args.pos.length < 2) {
  console.log('usage: node scripts/ff-rankings.js <encounter id|name> <Job> [--from-pct n] [--pages n] [--metric rdps] [--stop-at 0.5]');
  process.exit(1);
}
const encounterId = /^\d+$/.test(args.pos[0]) ? Number(args.pos[0]) : ENCOUNTERS[args.pos[0].toLowerCase()];
if (!encounterId) { console.log(`unknown encounter "${args.pos[0]}"; pass its id`); process.exit(1); }
const spec = args.pos[1];

const auth = createNodeLogAuth({
  providerLabel: 'FFLogs',
  clientId:      'a225e605-1025-4b97-ad2f-b71347ca2e64', // must match lib/log-auth.ts's FFLogs clientId
  tokenUrl:      'https://www.fflogs.com/oauth/token',
  credsPath:     args.creds ? path.resolve(args.creds) : path.join(ROOT, '.credentials', 'ffl-token.json'),
});

let budget = null;
async function gql(query, variables) {
  if (budget && budget.pointsSpentThisHour >= budget.limitPerHour * args.stopAt) {
    throw new Error(`stopping: ${budget.pointsSpentThisHour} of ${budget.limitPerHour} points spent this hour (--stop-at ${args.stopAt}); resets in ${Math.ceil(budget.pointsResetIn / 60)} min`);
  }
  let token = await auth.getAccessToken();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://www.fflogs.com/api/v2/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401 && attempt === 0) { token = await auth.forceRefreshAccessToken(); continue; }
    if (!res.ok) throw new Error(`FFLogs request failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`FFLogs GraphQL error: ${json.errors[0].message}`);
    budget = json.data.rateLimitData;
    return json.data;
  }
  throw new Error('FFLogs auth failed twice');
}

const QUERY = `query($id:Int!,$spec:String!,$page:Int!,$metric:CharacterRankingMetricType){
  rateLimitData{limitPerHour pointsSpentThisHour pointsResetIn}
  worldData{encounter(id:$id){name characterRankings(specName:$spec,page:$page,metric:$metric)}}
}`;

const clock = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

(async () => {
  const pages = new Map();
  const fetchPage = async (page) => {
    if (!pages.has(page)) pages.set(page, (await gql(QUERY, { id: encounterId, spec, page, metric: args.metric })).worldData.encounter);
    return pages.get(page);
  };
  const first = await fetchPage(1);
  const perPage = 100;
  if (!first.characterRankings.rankings?.length) { console.log(`${first.name} — ${spec}: none ranked`); return; }
  // FFLogs gives no total (`count` is the page's): find the last page by
  // doubling, then bisecting on hasMorePages (about a point a page).
  let lo = 1, hi = 2;
  while ((await fetchPage(hi)).characterRankings.hasMorePages) { lo = hi; hi *= 2; }
  if (!(await fetchPage(hi)).characterRankings.rankings?.length) {
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2), c = (await fetchPage(mid)).characterRankings;
      if (!c.rankings?.length) hi = mid; else if (c.hasMorePages) lo = mid; else { lo = hi = mid; }
    }
    hi = (await fetchPage(hi)).characterRankings.rankings?.length ? hi : lo;
  }
  const lastPage = hi;
  const total = (lastPage - 1) * perPage + (await fetchPage(lastPage)).characterRankings.rankings.length;
  console.log(`${first.name} — ${spec}: ${total} ranked (${args.metric})`);
  // Rank r (1-based) sits at percentile 100 * (1 - (r - 1) / total).
  const startRank = Math.min(total, Math.max(1, Math.floor(total * (1 - args.fromPct / 100))));
  let page = Math.min(lastPage, Math.ceil(startRank / perPage));
  for (let n = 0; n < args.pages && page >= 1; n++, page--) {
    const enc = await fetchPage(page);
    const rows = enc.characterRankings.rankings ?? [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i], rank = (page - 1) * perPage + i + 1;
      const pct = 100 * (1 - (rank - 1) / total);
      console.log(`${pct.toFixed(1).padStart(5)}  ${String(Math.round(r.amount)).padStart(6)}  ${clock(r.duration ?? 0).padStart(5)}  ${r.report?.code} fight ${r.report?.fightID}  ${r.name} (${r.server?.name ?? '?'})`);
    }
  }
  console.log(`[points: ${budget.pointsSpentThisHour.toFixed(0)} of ${budget.limitPerHour} this hour, resets in ${Math.ceil(budget.pointsResetIn / 60)} min]`);
})().catch((e) => { console.error(e.message); process.exit(1); });
