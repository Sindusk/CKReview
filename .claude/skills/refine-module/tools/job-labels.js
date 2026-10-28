// Player name -> job label for the refine-module tools' --jobs output, so
// tool output (and what agents pass around) carries "DRK", "SCH", ... rather
// than character names. One map per report: every player seen in any pull,
// sorted by name, labelled by job (FFXIV: lib/ffl-job-data.ts's
// abbreviations; WoW: the class with spaces removed); a second player of
// the same job becomes "DRK2", a third "DRK3".
//
//   const { jobLabels } = require('./job-labels');
//   const J = jobLabels(pullsWithPlayers, 'ff');   // each item needs .players
//   J.label('Some Name')   // "DRK"
//   J.sub(description)     // every player name in the text replaced
//
// Unknown names (pets, NPCs) pass through unchanged.

const path = require('path');
const { requireTsFromRoot } = require(path.resolve(__dirname, '../../../../scripts/lib/require-ts'));

function jobLabels(pulls, game) {
  const { getFFJobAbbr } = requireTsFromRoot('lib/ffl-job-data.ts');
  const jobOf = new Map();
  for (const p of pulls) for (const q of p.players ?? []) if (q.name && !jobOf.has(q.name)) jobOf.set(q.name, q.className ?? '?');
  const abbr = (cls) => (game === 'wow' ? String(cls).replace(/\s+/g, '') : getFFJobAbbr(String(cls)));
  const count = new Map(), map = new Map();
  for (const name of [...jobOf.keys()].sort()) {
    const a = abbr(jobOf.get(name));
    const n = (count.get(a) ?? 0) + 1;
    count.set(a, n);
    map.set(name, n === 1 ? a : `${a}${n}`);
  }
  // Longest first, so a name that contains another is replaced whole.
  const names = [...map.keys()].sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = names.length ? new RegExp(names.map(esc).join('|'), 'g') : null;
  return {
    label: (name) => (name == null ? name : map.get(name) ?? name),
    sub: (text) => (re && typeof text === 'string' ? text.replace(re, (m) => map.get(m)) : text),
    map,
  };
}

const identity = { label: (n) => n, sub: (t) => t, map: new Map() };

module.exports = { jobLabels, identity };
