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
// used only for pulls without phase data. Dancing Mad's ids are P1–P5 in
// order; WoW encounters either carry phases in the log or have none, so
// their rules need no hint.
//
// Labels are copied into the static's StaticRule rows at import, and every
// import refreshes the rows for the rules it contains, so a relabel reaches
// a static's older sessions too once a session using that rule is imported.
//
// Generic rules: some rule ids cover many different abilities and name
// each error after the ability (ffxiv-damage-down → "Damage Down (Big
// Bang)", wow-ula-avoidable → "Hit by Falling Debris", every *-pull-over →
// "Raid Collapse" / "Tank Died"). Those are split by name: each name is its
// own mechanic. Rules whose name only varies cosmetically ("Egg Hatched" /
// "Viper Hatched") are grouped with mechanic() instead. A rule that is
// neither keeps one mechanic per rule id, so renaming it doesn't break its
// trend.

export type RuleMeta = {
  mechanicKey:   string;
  mechanicLabel: string;
  phaseHint?:    number;
};

/** A registry entry; omitted key/label fall back to the rule's own. */
type RuleMetaEntry = Partial<RuleMeta>;

const RULE_META: Record<string, RuleMetaEntry> = {};

/** Generic rules split into one mechanic per error name (see header). */
const SPLIT_BY_NAME = new Set<string>([
  "manual-added-error",  // MANUAL_ERROR_RULE_ID: the reviewer's own label
  "ffxiv-damage-down",
  "wow-ula-avoidable",
  "wow-ula-add-cast",
  "wow-ca-avoidable",
  "wow-ca-frontal",
  "wow-tf-out-of-range",
]);

function isSplitByName(ruleId: string): boolean {
  return SPLIT_BY_NAME.has(ruleId) || ruleId.endsWith("-pull-over");
}

/** Several rules forming one mechanic. */
function mechanic(mechanicKey: string, mechanicLabel: string, phaseHint: number | undefined, ruleIds: string[]): void {
  for (const id of ruleIds) RULE_META[id] = { mechanicKey, mechanicLabel, phaseHint };
}

/** Rules that stay their own mechanic but belong to a known phase. */
function phase(phaseHint: number, ruleIds: string[]): void {
  for (const id of ruleIds) RULE_META[id] = { ...RULE_META[id], phaseHint };
}

// ── Dancing Mad (FFXIV) ─────────────────────────────────────────────────────

// P1: Kefka (lib/mechanics/ffxiv/dancingmad/phase1.ts, graven-image.ts,
// wave-cannon.ts)
mechanic("dm-graven-1", "Graven Image 1", 1, [
  "ffxiv-phase1-graven-1-death-wipe",
  "ffxiv-phase1-graven-image-spread-misplaced",
  "ffxiv-phase1-graven-image-stack-misplaced",
]);
mechanic("dm-graven-2", "Graven Image 2", 1, [
  "ffxiv-phase1-graven2-death-wipe",
  "ffxiv-phase1-graven2-puddle-linger",
  "ffxiv-phase1-graven2-puddle-placement",
  "ffxiv-phase1-graven2-puddle-proximity",
  "ffxiv-phase1-graven2-puddle-soak-missed",
  "ffxiv-phase1-graven2-spread-misplaced",
]);
mechanic("dm-graven-3", "Graven Image 3", 1, [
  "ffxiv-phase1-graven3-stack-missed",
]);
mechanic("dm-tele-trouncing", "Tele-Trouncing", 1, [
  "ffxiv-phase1-tele-trouncing-arrow-misplaced",
  "ffxiv-phase1-tele-trouncing-bait-position",
  "ffxiv-phase1-tele-trouncing-death-wipe",
]);
mechanic("dm-confetti", "Confetti", 1, [
  "ffxiv-phase1-confetti-final-position-misplaced",
  "ffxiv-phase1-confetti-group-misplaced",
  "ffxiv-phase1-confetti-holder-misplaced",
  "ffxiv-phase1-confetti-knockback-victim-misplaced",
  "ffxiv-phase1-confetti-lost",
]);
mechanic("dm-wave-cannon", "Wave Cannon", 1, [
  "ffxiv-phase1-wave-cannon-out-of-position",
  "ffxiv-phase1-wave-cannon-tower-missed",
  "ffxiv-phase1-wave-cannon-tower-overlap",
  "ffxiv-phase1-wave-cannon-tower-priority-missed",
]);
mechanic("dm-revolting-ruin", "Revolting Ruin", 1, [
  "ffxiv-phase1-revolting-ruin-non-tank-death",
  "ffxiv-phase1-revolting-ruin-out-of-position",
  "ffxiv-phase1-revolting-ruin-threat-loss",
]);
// Both enrage-check rules are named "Missed Enrage Check"; the labels keep
// them apart.
mechanic("dm-p1-enrage-check", "Enrage check (P1)", 1, [
  "ffxiv-phase1-enrage-check-missed",
]);
phase(1, [
  "ffxiv-phase1-blizzard3-silent-kill",
  "ffxiv-phase1-gravitational-explosion-wipe",
  "ffxiv-phase1-hyperdrive-out-of-position",
  "ffxiv-phase1-jumped-off-arena",
  "ffxiv-phase1-unmitigated-explosion-wipe",
]);

// P2: Forsaken Kefka (forsaken.ts)
mechanic("dm-forsaken-towers", "Forsaken: towers", 2, [
  "ffxiv-forsaken-missed-tower",
  "ffxiv-forsaken-wrong-spot-in-tower",
  "ffxiv-forsaken-wrong-tower-position",
  "ffxiv-forsaken-extra-player-in-tower",
]);
mechanic("dm-forsaken-cones", "Forsaken: cone baits", 2, [
  "ffxiv-forsaken-baited-cone-too-close",
  "ffxiv-forsaken-cone-bait-too-far",
]);
mechanic("dm-forsaken-stack", "Forsaken: stack", 2, [
  "ffxiv-forsaken-stack-misplaced",
  "ffxiv-forsaken-stack-clipped-too-close",
  "ffxiv-forsaken-stack-overlapped-cone-bait",
]);
mechanic("dm-forsaken-enrage-check", "Enrage check (P2)", 2, [
  "ffxiv-forsaken-enrage-check-missed",
]);
phase(2, [
  "ffxiv-forsaken-clone-overlap",
  "ffxiv-forsaken-death-during-forsaken",
]);

// P3: Exdeath and Chaos (limitcut.ts, blackhole.ts, blackhole-strategy.ts,
// exdeath.ts, stompies.ts)
mechanic("dm-limit-cut", "Limit Cut", 3, [
  "ffxiv-limitcut-dash-clipped-other-player",
  "ffxiv-limitcut-dead-during-mechanic",
  "ffxiv-limitcut-pushed-off-arena",
  "ffxiv-limitcut-wrong-dash-position",
]);
mechanic("dm-black-hole", "Black Hole", 3, [
  "ffxiv-blackhole-clipped-by-neighboring-tether",
  "ffxiv-blackhole-crust-before-accretion",
  "ffxiv-blackhole-crust-earthquake-overlap",
  "ffxiv-blackhole-earthquake-during-vulnerability",
  "ffxiv-blackhole-incorrect-direction",
  "ffxiv-blackhole-lost-primordial-crust",
  "ffxiv-blackhole-missed-assigned-tether",
  "ffxiv-blackhole-soaked-incorrect-tether",
  "ffxiv-blackhole-stole-assigned-tether",
  "ffxiv-blackhole-tether-cleaved-party",
]);
mechanic("dm-stompies", "Stompies", 3, [
  "ffxiv-stompies-bait-too-close-to-center",
  "ffxiv-stompies-wrong-tower",
]);
phase(3, [
  "ffxiv-exdeath-shockwave-silent-kill",
  "ffxiv-exdeath-thunder3-wrong-tank",
]);

// P4: Kefka Says (kefka-says.ts) — each instruction is its own mechanic.
phase(4, [
  "ffxiv-kefka-says-acceleration-bomb",
  "ffxiv-kefka-says-death-unresolvable",
  "ffxiv-kefka-says-failed-to-spread",
  "ffxiv-kefka-says-failed-to-stack",
  "ffxiv-kefka-says-flood-wrong-side",
]);

// P5: Ultima Kefka (ultimate-kefka.ts)
mechanic("dm-uk-choice", "Choice", 5, [
  "ffxiv-uk-choice",
  "ffxiv-uk-choice-group",
]);
mechanic("dm-uk-fell-forces", "Fell Forces", 5, [
  "ffxiv-uk-fell-forces-missed",
  "ffxiv-uk-fell-forces-overlap",
  "ffxiv-uk-fell-forces-unshared",
]);
mechanic("dm-uk-flood", "Flood", 5, [
  "ffxiv-uk-flood-group",
  "ffxiv-uk-flood-line",
]);
mechanic("dm-uk-forsaken", "Forsaken (P5)", 5, [
  "ffxiv-uk-forsaken-ground",
  "ffxiv-uk-forsaken-null",
]);
mechanic("dm-uk-orchestra", "Orchestra", 5, [
  "ffxiv-uk-orchestra-diffusion",
  "ffxiv-uk-orchestra-early-flare",
  "ffxiv-uk-orchestra-enmity",
  "ffxiv-uk-orchestra-flare-overlap",
  "ffxiv-uk-orchestra-holy",
]);
mechanic("dm-uk-towers", "Towers (P5)", 5, [
  "ffxiv-uk-tower-missed",
  "ffxiv-uk-tower-vulnerable",
]);
phase(5, [
  "ffxiv-uk-apocalypse",
  "ffxiv-uk-chaotic-flare",
  "ffxiv-uk-collapse",
  "ffxiv-uk-entropy-overlap",
]);

// ── Midnight Falls (lib/mechanics/wow/vs-dr-mqd/midnightfalls.ts) ──────────

mechanic("mf-dusk-crystals", "Dusk Crystals", undefined, [
  "wow-raid-dusk-crystal-unhealed",
  "wow-mf-crystal-holder-hit",
  "wow-mf-early-crystal-drop",
  "wow-mf-accidental-crystal-pickup",
]);
mechanic("mf-radiance", "Radiance", undefined, [
  "wow-mf-radiance",
  "wow-mf-radiance-pulse",
]);

// ── The Venomous Abyss (lib/mechanics/wow/va/) ──────────────────────────────

mechanic("es-blighted-blood", "Blighted Blood", undefined, [
  "wow-es-blighted-blood",
  "wow-es-blighted-blood-pool",
]);
mechanic("es-helical", "Helical Toxins", undefined, [
  "wow-es-helical-collapse",
  "wow-es-helical-overload",
  "wow-es-helical-unresolved",
]);
mechanic("es-protovenom", "Protovenom", undefined, [
  "wow-es-protovenom-eruption",
  "wow-es-protovenom-ticks",
]);
mechanic("ssz-crosswinds", "Crosswinds", undefined, [
  "wow-ssz-crosswinds-blast",
  "wow-ssz-crosswinds-fall",
]);
mechanic("ssz-cysts", "Cysts", undefined, [
  "wow-ssz-cyst-double",
  "wow-ssz-cyst-early",
]);
mechanic("ssz-mutilate", "Mutilate", undefined, [
  "wow-ssz-mutilate-missed",
  "wow-ssz-mutilate-repeat",
]);
mechanic("ca-guillotine", "Guillotine", undefined, [
  "wow-ca-guillotine-execution",
  "wow-ca-guillotine-resoak",
]);
mechanic("tf-feast", "Feast", undefined, [
  "wow-tf-feast-double-bite",
  "wow-tf-feast-raid-bite",
]);
mechanic("tf-globules", "Globules", undefined, [
  "wow-tf-globule-burst",
  "wow-tf-globule-pickup-death",
]);
// One rule id, several names for the same mechanic.
mechanic("ula-eggs", "Eggs", undefined, ["wow-ula-egg-hatch"]);
mechanic("ula-spectral-coils", "Spectral Coils", undefined, ["wow-ula-spectral-coils"]);
mechanic("ula-blight-vein", "Blight Vein", undefined, ["wow-ula-blight-vein"]);
mechanic("le-final-ascension", "Final Ascension", undefined, ["wow-le-final-ascension"]);
mechanic("vash-plague-froth", "Plague Froth", undefined, ["wow-vash-plague-froth"]);
mechanic("ca-venom-eruption", "Venom Eruption", undefined, ["wow-ca-venom-eruption"]);

/**
 * StaticRule key for an error: rule id plus name, so every distinct name a
 * rule produces keeps an exact snapshot.
 */
export function staticRuleKey(ruleId: string, ruleName: string): string {
  return `${ruleId}::${ruleName}`;
}

/** A grouped mechanic's label by its key, or undefined for an ungrouped one. */
export function mechanicLabelForKey(mechanicKey: string): string | undefined {
  for (const entry of Object.values(RULE_META)) {
    if (entry.mechanicKey === mechanicKey && entry.mechanicLabel) return entry.mechanicLabel;
  }
  return undefined;
}

/** The error's mechanic, falling back to the rule itself (see header). */
export function getRuleMeta(ruleId: string, ruleName: string): RuleMeta {
  const entry = RULE_META[ruleId];
  const split = isSplitByName(ruleId);
  return {
    mechanicKey:   entry?.mechanicKey ?? (split ? staticRuleKey(ruleId, ruleName) : ruleId),
    mechanicLabel: entry?.mechanicLabel ?? ruleName,
    phaseHint:     entry?.phaseHint,
  };
}
