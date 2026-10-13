// Whether status ids are usable: how many hits (any player) carry each in
// their snapshot, and how many player-buff events log it. A status in hit
// snapshots can be measured hit by hit (Death's Design); one in the buff
// stream can be windowed (Soulsow, Monochrome Tones); one in neither (a
// mitigation status, which the buff stream leaves out) has to come from
// casts (Passage of Arms).
//
//   node .claude/skills/damage-analysis/tools/statuses.js <code> "<boss>" <pull> <statusId>...
//
// FFXIV status ids carry FFLogs' +1000000 offset; WoW ids are spell ids. Run from the repo root. Read-only.

const path = require('path');
const { loadPull } = require(path.join(process.cwd(), 'scripts/lib/load-sample-pull')); // FFXIV or WoW

(async () => {
  const [code, boss, pullNumber, ...ids] = process.argv.slice(2);
  const { pull } = await loadPull(code, boss, pullNumber);
  for (const id of ids.map(Number)) {
    const hits = pull.players.reduce((a, p) => a + p.damageDone.filter((e) => e.statusIds?.includes(id)).length, 0);
    const buffs = pull.players.reduce((a, p) => a + (p.buffs ?? []).filter((e) => e.abilityId === id).length, 0);
    console.log(`${id}: in ${hits} hit snapshots, ${buffs} buff events`);
  }
})();
