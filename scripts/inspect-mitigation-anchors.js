// scripts/inspect-mitigation-anchors.js
//
// Diagnostic tool for lib/mechanics/ffxiv/dancingmad/mitigation-review.ts's
// boss-cast-matching (see mechanicMatchesAbilityName / MECHANIC_NAME_ALIASES
// in mitigation-detection.ts). Built 2026-07-24 after the user spotted
// Phase 2's Towers I-VIII and "Light of Judgement" showing gray/"future"
// in a pull that clearly reached them — this is the tool for finding MORE
// cases like that, not just those two.
//
// For every plan mechanic (phase + tank), reports whether it currently
// resolves to a real boss cast in the given pull, and — for BOTH matched
// and unmatched mechanics — shows the nearest real enemyCasts by raw time
// proximity (ignoring name matching entirely) so you can eyeball whether
// the current match is actually correct, or spot which real ability name
// an unmatched sheet entry should be aliased to.
//
// Usage:
//   node scripts/inspect-mitigation-anchors.js <reportDir> <pullNumber> [--window=45] [--top=5]
//
// Example:
//   node scripts/inspect-mitigation-anchors.js sampledata/ff/LF2yJZabVprjXYvm 1
//   node scripts/inspect-mitigation-anchors.js sampledata/ff/LF2yJZabVprjXYvm 1 --window=60 --top=3

const path = require('path');
const { requireTsFromRoot } = require('./lib/require-ts');

const store = requireTsFromRoot('lib/sample-report-store.ts');
const lt    = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
const { getMitigationPlan } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-plan.ts');
const {
  flattenPhaseMechanics,
  flattenTankMechanics,
  mechanicMatchesAbilityName,
} = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-detection.ts');
const { findBossCastAnchor } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-review.ts');

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? true];
  })
);

const reportDir = positional[0] ? path.resolve(positional[0]) : null;
const pullNumber = positional[1] ? Number(positional[1]) : 1;
const windowMs = Number(flags.window ?? 45) * 1000;
const topN = Number(flags.top ?? 5);

if (!reportDir) {
  console.error('Usage: node scripts/inspect-mitigation-anchors.js <reportDir> <pullNumber> [--window=45] [--top=5]');
  process.exit(1);
}

const plan = getMitigationPlan('ikuya');

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

(async () => {
  const code = path.basename(reportDir);
  if (!(await store.sampleReportExists('ffl', code))) {
    console.error(`No sample data found for ${code} — fetch it first (scripts/fetch-ff-report.js)`);
    process.exit(1);
  }
  const payload = await store.loadSampleReport('ffl', code);
  if (payload.source !== 'ffl') { console.error('Not an FFLogs report'); process.exit(1); }

  const abilityMap = lt.buildFFLAbilityMap(payload.report.masterData.abilities);
  const pulls = lt.transformFFReportToPulls(payload.fightDataList, abilityMap, code);
  const pull = pulls.find(p => p.pullNumber === pullNumber);
  if (!pull) { console.error(`No pull #${pullNumber} in ${code} (have ${pulls.length} pulls)`); process.exit(1); }

  const enemyCasts = pull.enemyCasts || [];
  console.log(`${code} pull #${pullNumber} — ${enemyCasts.length} enemy casts, fightDuration=${formatMs(pull.fightDuration)}\n`);

  const flat = [
    ...flattenPhaseMechanics(plan).map(f => ({ ...f, section: 'phase' })),
    ...flattenTankMechanics(plan).map(f => ({ ...f, section: 'tank' })),
  ];

  for (const { phaseTitle, mech, section } of flat) {
    const sheetMs = mech.timeSeconds * 1000;
    const anchor = findBossCastAnchor(mech, enemyCasts);
    const matched = anchor !== null;

    // Nearest real casts by raw time proximity, regardless of name — the
    // "what should this actually be aliased to" readout.
    const nearest = [...enemyCasts]
      .map(c => ({ ...c, diff: Math.abs(c.timestamp - sheetMs) }))
      .filter(c => c.diff <= windowMs)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, topN);

    const status = matched ? `MATCHED @ ${formatMs(anchor)} (drift ${((anchor - sheetMs) / 1000).toFixed(1)}s)` : 'UNMATCHED';
    console.log(`[${section}] ${formatMs(sheetMs)} ${JSON.stringify(mech.name)} (${phaseTitle}) -> ${status}`);
    if (nearest.length === 0) {
      console.log(`    (no boss casts within ${windowMs / 1000}s of sheet time at all — mechanic likely not reached this pull)`);
    } else {
      for (const c of nearest) {
        const flag = mechanicMatchesAbilityName(mech, c.abilityName) ? '' : '  <- NOT considered a match by current logic';
        console.log(`    ${formatMs(c.timestamp)} ${JSON.stringify(c.abilityName)} (Δ${(c.diff / 1000).toFixed(1)}s)${flag}`);
      }
    }
  }
})();
