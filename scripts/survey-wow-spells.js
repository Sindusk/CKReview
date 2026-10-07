#!/usr/bin/env node
// scripts/survey-wow-spells.js
//
// Collects per-spec spell and aura statistics from real WCL fights, for
// scripts/build-wow-spell-data.js (which writes lib/damage/wow/spell-data.ts).
// WCL carries no GCD, cooldown or aura metadata, and WoWAnalyzer's tables are
// AGPL (docs/archive/damage-analysis-plan.md, "WoW port"), so every spell fact the
// WoW damage analysis uses is measured from logs like these.
//
// Fetches four unfiltered streams for each fight: friendly Casts,
// DamageDone (its per-hit aura snapshot), Buffs, and Debuffs on enemies.
// It writes condensed statistics rather than the raw events, to
// sampledata/wow/<code>/survey/<fightId>.json (gitignored with the rest of
// sampledata/). A fight already surveyed is skipped unless --refetch.
// Cost: ~1 WCL point per stream page; a 7-minute 20-player kill is ~25.
//
// Usage:
//   node scripts/survey-wow-spells.js <reportCode|URL> --fight <id> [--fight <id>]... [--refetch]
//   node scripts/survey-wow-spells.js <reportCode|URL> --kills       (every kill in the report)

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/require-ts');
const { createNodeLogAuth } = require('./lib/node-log-auth');
const { withRateLimitWait, writeAtomic } = require('./lib/fetch-plan');

const GQL = 'https://www.warcraftlogs.com/api/v2/client';

function parseArgs(argv) {
  const out = { code: null, fights: [], kills: false, refetch: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fight') out.fights.push(Number(argv[++i]));
    else if (a === '--kills') out.kills = true;
    else if (a === '--refetch') out.refetch = true;
    else if (!out.code) out.code = (a.match(/reports\/([a-zA-Z0-9]+)/) || [null, a])[1];
  }
  if (!out.code || (!out.kills && out.fights.length === 0)) {
    console.error('Usage: node scripts/survey-wow-spells.js <reportCode|URL> (--fight <id>... | --kills) [--refetch]');
    process.exit(1);
  }
  return out;
}

const auth = createNodeLogAuth({
  providerLabel: 'WarcraftLogs',
  clientId:      'a22351f8-ab0e-4861-88c3-f27023c99156', // must match lib/log-auth.ts's WCL clientId
  tokenUrl:      'https://www.warcraftlogs.com/oauth/token',
  credsPath:     path.join(ROOT, '.credentials', 'wcl-token.json'),
});

async function gql(query, variables) {
  return withRateLimitWait(async () => {
    const token = await auth.getAccessToken();
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 429) throw new Error(`HTTP 429 rate limited: ${await res.text()}`);
    const j = await res.json();
    if (j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
  }, 'the survey query');
}

async function stream(code, fight, args) {
  const out = [];
  let cursor = fight.startTime;
  while (cursor !== null && cursor < fight.endTime) {
    const d = await gql(`query($code:String!,$f:[Int]!,$s:Float!,$e:Float!){ reportData{report(code:$code){
      events(fightIDs:$f,startTime:$s,endTime:$e,${args}){data nextPageTimestamp}}}}`,
    { code, f: [fight.id], s: cursor, e: fight.endTime });
    const ev = d.reportData.report.events;
    out.push(...ev.data);
    cursor = ev.nextPageTimestamp;
  }
  return out;
}

const inc = (obj, key, n = 1) => { obj[key] = (obj[key] || 0) + n; };

async function surveyFight(code, fight, actors) {
  const byId = new Map(actors.map((a) => [a.id, a]));
  const ownerOf = (id) => { const a = byId.get(id); return a?.type === 'Pet' ? a.petOwner : id; };

  const combatants = await stream(code, fight, 'dataType: CombatantInfo');
  const specOf = new Map(combatants.map((c) => [c.sourceID, c.specID]));
  const players = [...specOf.keys()];

  const casts = await stream(code, fight, 'dataType: Casts');
  const damage = await stream(code, fight, 'dataType: DamageDone');
  const buffs = await stream(code, fight, 'dataType: Buffs');
  const enemyDebuffs = await stream(code, fight, 'dataType: Debuffs, hostilityType: Enemies');
  const healing = await stream(code, fight, 'dataType: Healing');

  // Per player: casts as [ms into fight, type, abilityId, fake?].
  const TYPE = { begincast: 'b', cast: 'c', empowerstart: 's', empowerend: 'e' };
  const perPlayer = {};
  for (const id of players) {
    perPlayer[id] = {
      specId: specOf.get(id), name: byId.get(id)?.name,
      casts: [],
      // abilityId -> damage events from this player (and pets, under "pet"):
      // { hits, ticks, amount, pet }
      damage: {},
      // status id -> hits whose aura snapshot listed it
      snapshot: {}, hits: 0,
      // status id on this player -> { apply, refresh, remove, stack, self, absorb, sources }
      auras: {},
      // status id this player (or pet) put on an enemy -> events
      enemyDebuffs: {},
      // abilityId -> heal events (HoT ticks included)
      heals: {},
    };
  }
  for (const e of casts) {
    const p = perPlayer[e.sourceID];
    if (!p || !TYPE[e.type]) continue;
    p.casts.push([e.timestamp - fight.startTime, TYPE[e.type], e.abilityGameID, e.fake ? 1 : 0]);
  }
  for (const e of damage) {
    const owner = ownerOf(e.sourceID);
    const p = perPlayer[owner];
    if (!p) continue;
    const pet = owner !== e.sourceID;
    const d = p.damage[e.abilityGameID] || (p.damage[e.abilityGameID] = { hits: 0, ticks: 0, amount: 0, pet: pet ? 1 : 0 });
    d.hits++;
    if (e.tick) d.ticks++;
    d.amount += e.amount || 0;
    if (!pet) {
      p.hits++;
      for (const s of new Set((e.buffs || '').split('.').filter(Boolean))) inc(p.snapshot, s);
    }
  }
  for (const e of buffs) {
    const p = perPlayer[e.targetID];
    if (!p) continue;
    const a = p.auras[e.abilityGameID] || (p.auras[e.abilityGameID] = { apply: 0, refresh: 0, remove: 0, stack: 0, self: 0, absorb: 0, sources: {} });
    if (e.type === 'applybuff') a.apply++;
    else if (e.type === 'refreshbuff') a.refresh++;
    else if (e.type === 'removebuff') a.remove++;
    else a.stack++;
    if (e.sourceID === e.targetID) a.self++;
    if (e.absorb !== undefined) a.absorb++;
    const src = specOf.get(ownerOf(e.sourceID));
    if (src !== undefined && e.sourceID !== e.targetID) inc(a.sources, src);
  }
  for (const e of enemyDebuffs) {
    const p = perPlayer[ownerOf(e.sourceID)];
    if (p) inc(p.enemyDebuffs, e.abilityGameID);
  }
  for (const e of healing) {
    const p = perPlayer[e.sourceID];
    if (p && e.type === 'heal') inc(p.heals, e.abilityGameID);
  }
  return {
    code, fightId: fight.id, name: fight.name, kill: !!fight.kill,
    durationMs: fight.endTime - fight.startTime,
    players: perPlayer,
  };
}

async function main() {
  const { code, fights, kills, refetch } = parseArgs(process.argv.slice(2));
  const meta = await gql(`query($code:String!){ reportData{report(code:$code){
    fights{id name startTime endTime kill}
    masterData(translate:true){ actors{id name type subType petOwner} abilities{gameID name} } }}}`, { code });
  const report = meta.reportData.report;
  const targets = report.fights.filter((f) => f.endTime > f.startTime && (kills ? f.kill : fights.includes(f.id)));
  const outDir = path.join(ROOT, 'sampledata', 'wow', code, 'survey');
  fs.mkdirSync(outDir, { recursive: true });
  // Ability names, for the generator's comments.
  writeAtomic(path.join(outDir, 'abilities.json'),
    JSON.stringify(Object.fromEntries(report.masterData.abilities.map((a) => [a.gameID, a.name]))));
  for (const fight of targets) {
    const file = path.join(outDir, `${fight.id}.json`);
    if (!refetch && fs.existsSync(file)) { console.log(`  ${fight.name} fight ${fight.id}: already surveyed`); continue; }
    console.log(`  ${fight.name} fight ${fight.id} (${Math.round((fight.endTime - fight.startTime) / 1000)}s)...`);
    const s = await surveyFight(code, fight, report.masterData.actors);
    writeAtomic(file, JSON.stringify(s));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
