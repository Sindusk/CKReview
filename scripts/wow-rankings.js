#!/usr/bin/env node
// scripts/wow-rankings.js — lists Warcraft Logs character rankings for one
// spec on one encounter, from the bottom up by default, to find kills where
// a mistake happens (docs/wowa-audit-plan.md phase 3: weak parses make the
// mistake, top parses are the premise check). The WoW twin of
// ff-rankings.js. Read-only: prints, writes nothing.
//
// Usage:
//   node scripts/wow-rankings.js <encounter> <spec> [options]
//
//   <encounter>  WCL encounter id, or a name (or part of one) of an
//                encounter in the zones WCL lists: "Entombed Sentinels",
//                "vashnik". The newest zone wins a tie.
//   <spec>       "Windwalker", "Windwalker Monk", "Frost Mage",
//                "Beast Mastery Hunter" ... A spec name two classes share
//                (Frost, Holy, Protection, Restoration) needs its class.
//
// Options:
//   --from-pct <n>    start at this percentile (default 0: the bottom)
//   --pages <n>       pages of 100 to list, walking up (default 1)
//   --difficulty <n>  5 Mythic (default), 4 Heroic, 3 Normal
//   --metric <m>      dps (default), hps, bossdps, tankhps ...
//   --stop-at <f>     refuse to query once this share of the hour's points
//                     is spent (default 0.5)
//   --creds <path>    default .credentials/wcl-token.json
//
// Each page costs a few points; the hour's budget prints at the end. Next
// steps: probe a kill cheaply with `node scripts/wow-probe.js <code>
// <fightId> <name>`, then `node scripts/fetch-wow-report.js <code> --fight
// <id>` for the one you'll use. Never fetch whole reports.
//
// Percentiles are by rank in this listing (rank 1 = 100), close to but not
// exactly WCL's parse colour (which also counts unlisted parses).

const { createWclGql } = require('./lib/wcl-gql');

// WCL's class and spec names (no spaces).
const CLASSES = {
  DeathKnight: ['Blood', 'Frost', 'Unholy'],
  DemonHunter: ['Havoc', 'Vengeance', 'Devourer'],
  Druid:       ['Balance', 'Feral', 'Guardian', 'Restoration'],
  Evoker:      ['Augmentation', 'Devastation', 'Preservation'],
  Hunter:      ['BeastMastery', 'Marksmanship', 'Survival'],
  Mage:        ['Arcane', 'Fire', 'Frost'],
  Monk:        ['Brewmaster', 'Mistweaver', 'Windwalker'],
  Paladin:     ['Holy', 'Protection', 'Retribution'],
  Priest:      ['Discipline', 'Holy', 'Shadow'],
  Rogue:       ['Assassination', 'Outlaw', 'Subtlety'],
  Shaman:      ['Elemental', 'Enhancement', 'Restoration'],
  Warlock:     ['Affliction', 'Demonology', 'Destruction'],
  Warrior:     ['Arms', 'Fury', 'Protection'],
};

/** "Beast Mastery Hunter", "Windwalker", "Monk Windwalker" → { className, specName }. */
function resolveSpec(text) {
  const words = text.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean);
  const joined = words.join('');
  const hits = [];
  for (const [cls, specs] of Object.entries(CLASSES)) {
    const c = cls.toLowerCase();
    for (const spec of specs) {
      const s = spec.toLowerCase();
      if (joined === s || joined === s + c || joined === c + s) hits.push({ className: cls, specName: spec });
    }
  }
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) throw new Error(`"${text}" is ambiguous: ${hits.map((h) => `${h.specName} ${h.className}`).join(', ')}; add the class`);
  throw new Error(`unknown spec "${text}"`);
}

function parseArgs(argv) {
  const a = { fromPct: 0, pages: 1, difficulty: 5, metric: 'dps', stopAt: 0.5, creds: null, pos: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--from-pct') a.fromPct = Number(argv[++i]);
    else if (x === '--pages') a.pages = Number(argv[++i]);
    else if (x === '--difficulty') a.difficulty = Number(argv[++i]);
    else if (x === '--metric') a.metric = argv[++i];
    else if (x === '--stop-at') a.stopAt = Number(argv[++i]);
    else if (x === '--creds') a.creds = argv[++i];
    else a.pos.push(x);
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (args.pos.length < 2) {
  console.log('usage: node scripts/wow-rankings.js <encounter id|name> <spec> [--from-pct n] [--pages n] [--difficulty 5] [--metric dps] [--stop-at 0.5]');
  process.exit(1);
}
const { gql, budgetLine } = createWclGql({ creds: args.creds, stopAt: args.stopAt });

const ZONES_QUERY = `{
  rateLimitData{limitPerHour pointsSpentThisHour pointsResetIn}
  worldData{zones{id name encounters{id name}}}
}`;
const QUERY = `query($id:Int!,$cls:String!,$spec:String!,$page:Int!,$diff:Int!,$metric:CharacterRankingMetricType){
  rateLimitData{limitPerHour pointsSpentThisHour pointsResetIn}
  worldData{encounter(id:$id){name characterRankings(className:$cls,specName:$spec,page:$page,difficulty:$diff,metric:$metric)}}
}`;

async function resolveEncounter(text) {
  if (/^\d+$/.test(text)) return Number(text);
  const zones = (await gql(ZONES_QUERY)).worldData.zones;
  const want = text.toLowerCase();
  const hits = zones.sort((a, b) => b.id - a.id)
    .flatMap((z) => (z.encounters ?? []).filter((e) => e.name.toLowerCase().includes(want)).map((e) => ({ ...e, zone: z.name })));
  if (!hits.length) throw new Error(`no encounter matching "${text}"; pass its id (a sampledata/wow/*/meta.json fight's encounterID)`);
  const exact = hits.find((e) => e.name.toLowerCase() === want) ?? hits[0];
  if (hits.length > 1) console.log(`(${hits.length} encounters match; using ${exact.name}, ${exact.zone}, id ${exact.id})`);
  return exact.id;
}

const clock = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

(async () => {
  const { className, specName } = resolveSpec(args.pos.slice(1).join(' '));
  const encounterId = await resolveEncounter(args.pos[0]);
  const pages = new Map();
  const fetchPage = async (page) => {
    if (!pages.has(page)) {
      pages.set(page, (await gql(QUERY, { id: encounterId, cls: className, spec: specName, page, diff: args.difficulty, metric: args.metric })).worldData.encounter);
    }
    return pages.get(page);
  };
  const first = await fetchPage(1);
  const perPage = 100;
  const label = `${first.name} (difficulty ${args.difficulty}) — ${specName} ${className}`;
  if (!first.characterRankings.rankings?.length) { console.log(`${label}: none ranked`); return; }
  // No total in the answer: find the last page by doubling, then bisecting
  // on hasMorePages (about a point a page).
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
  console.log(`${label}: ${total} ranked (${args.metric})`);
  console.log('  pct  amount   time  ilvl  report fight  player');
  // Rank r (1-based) sits at percentile 100 * (1 - (r - 1) / total).
  const startRank = Math.min(total, Math.max(1, Math.floor(total * (1 - args.fromPct / 100))));
  // --pages × 100 rows, walking up from the start rank.
  const endRank = Math.max(1, startRank - args.pages * perPage + 1);
  for (let rank = startRank; rank >= endRank; rank--) {
    const page = Math.ceil(rank / perPage);
    const r = ((await fetchPage(page)).characterRankings.rankings ?? [])[rank - (page - 1) * perPage - 1];
    if (!r) continue;
    {
      const pct = 100 * (1 - (rank - 1) / total);
      const ilvl = r.bracketData != null ? String(Math.round(r.bracketData)) : '?';
      console.log(`${pct.toFixed(1).padStart(5)}  ${String(Math.round(r.amount)).padStart(6)}  ${clock(r.duration ?? 0).padStart(5)}  ${ilvl.padStart(4)}  ${r.report?.code} fight ${r.report?.fightID}  ${r.name} (${r.server?.name ?? '?'})`);
    }
  }
  console.log(budgetLine());
})().catch((e) => { console.error(e.message); process.exit(1); });
