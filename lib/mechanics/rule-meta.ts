// lib/mechanics/rule-meta.ts
//
// Curated mechanic grouping for the Statics analysis views
// (docs/static-player-analysis-plan.md): ruleId → the mechanic it belongs
// to. Several rules can share one mechanicKey ("hit by spread" and "spread
// too close" are one mechanic). A rule without an entry is its own mechanic:
// key = its ruleId, label = its rule name. Nothing breaks for an unlabeled
// rule, so fill this in per boss, active encounters first.
//
// phaseHint is the log's phase id (lib/pull-phases.ts) the rule belongs to,
// used only for pulls without phase data.
//
// Labels are copied into the static's StaticRule rows at import, and every
// import refreshes the rows for the rules it contains, so a relabel reaches
// a static's older sessions too once a session using that rule is imported.

export type RuleMeta = {
  mechanicKey:   string;
  mechanicLabel: string;
  phaseHint?:    number;
};

const RULE_META: Record<string, RuleMeta> = {};

/** The rule's mechanic, falling back to the rule itself. */
export function getRuleMeta(ruleId: string, ruleName: string): RuleMeta {
  return RULE_META[ruleId] ?? { mechanicKey: ruleId, mechanicLabel: ruleName };
}
