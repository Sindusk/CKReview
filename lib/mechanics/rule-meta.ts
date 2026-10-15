// lib/mechanics/rule-meta.ts
//
// Curated mechanic grouping for the Statics analysis views
// (docs/archive/static-player-analysis-plan.md): ruleId → the mechanic it belongs
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
//
// Exposure (docs/archive/exposure-plan.md) says who a mechanic tests, which sets a
// player's chances in the Statics analysis:
// - "everyone" (the default): every player in the pull, at every instance.
// - "targeted": only the player(s) the log names at each instance (a
//   debuff target, a bait, a cast's target), chosen by the game. Also a
//   role-only mechanic, one only that role can fail (a tank swap, the
//   non-tanks' side of a tankbuster): its instances name that role's
//   players (user, 2026-10-11).
// - "assigned": a job the raid lead could give to anyone (the fish
//   carrier, a kick rotation, soakers). Shown in the Strategy dialog, not
//   in the player ranking.
// One scope per mechanic: a mechanic whose rules mix scopes is split into
// two keys ("<X> bait" targeted, "<X> hit" everyone). A targeted or
// assigned mechanic only takes effect where its module reports instances
// with their responsible players (lib/mechanics/occurrences.ts
// ReportedOccurrence); anywhere else it counts as everyone.

export type Exposure = "everyone" | "targeted" | "assigned";

export type RuleMeta = {
  mechanicKey:   string;
  mechanicLabel: string;
  phaseHint?:    number;
  exposure?:     Exposure;
};

/** A registry entry; omitted key/label fall back to the rule's own. */
type RuleMetaEntry = Partial<RuleMeta> & {
  /** An assigned mechanic's job, as the Strategy dialog names it ("Fish carrier"). */
  dutyLabel?: string;
};

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
  // Keeps an exposure() set before it (call order doesn't matter).
  for (const id of ruleIds) RULE_META[id] = { ...RULE_META[id], mechanicKey, mechanicLabel, phaseHint };
}

/** Rules that stay their own mechanic but belong to a known phase. */
function phase(phaseHint: number, ruleIds: string[]): void {
  for (const id of ruleIds) RULE_META[id] = { ...RULE_META[id], phaseHint };
}

/**
 * Who these rules' mechanic tests (see header). Call after the rules'
 * mechanic()/phase() entries; every rule of one mechanic must get the same
 * scope.
 */
function exposure(scope: Exposure, ruleIds: string[], dutyLabel?: string): void {
  for (const id of ruleIds) RULE_META[id] = { ...RULE_META[id], exposure: scope, ...(dutyLabel ? { dutyLabel } : {}) };
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
  "ffxiv-phase1-graven2-puddle-soak-missed",
]);
// Only the spreading role category (random per pull) is tested by these
// (phase1.ts detectGraven2SpreadMisplacedErrors reports the instances).
mechanic("dm-graven-2-spread", "Graven Image 2: spread", 1, [
  "ffxiv-phase1-graven2-puddle-proximity",
  "ffxiv-phase1-graven2-spread-misplaced",
]);
exposure("targeted", ["ffxiv-phase1-graven2-puddle-proximity", "ffxiv-phase1-graven2-spread-misplaced"]);
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
  "ffxiv-phase1-confetti-knockback-victim-misplaced",
  "ffxiv-phase1-confetti-lost",
]);
// The first resolution's two debuff holders (phase1.ts
// detectConfettiHolderMisplacedErrors reports the instances).
mechanic("dm-confetti-holder", "Confetti holder", 1, ["ffxiv-phase1-confetti-holder-misplaced"]);
exposure("targeted", ["ffxiv-phase1-confetti-holder-misplaced"]);
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
// The Stack holder and their tower partner (forsaken.ts reports them).
exposure("targeted", [
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
// Role-only: only the tanks can fail Thunder III (exdeath.ts).
exposure("targeted", ["ffxiv-exdeath-thunder3-wrong-tank"]);

// P4: Kefka Says (kefka-says.ts) — each instruction is its own mechanic.
phase(4, [
  "ffxiv-kefka-says-acceleration-bomb",
  "ffxiv-kefka-says-death-unresolvable",
  "ffxiv-kefka-says-failed-to-spread",
  "ffxiv-kefka-says-failed-to-stack",
  "ffxiv-kefka-says-flood-wrong-side",
]);
// Only the elemental and bomb holders are tested (kefka-says.ts).
exposure("targeted", [
  "ffxiv-kefka-says-failed-to-spread",
  "ffxiv-kefka-says-failed-to-stack",
  "ffxiv-kefka-says-acceleration-bomb",
]);

// P5: Ultima Kefka (ultimate-kefka.ts)
mechanic("dm-uk-choice", "Choice", 5, [
  "ffxiv-uk-choice",
  "ffxiv-uk-choice-group",
]);
// Role-only splits (ultimate-kefka.ts reports the instances): the role
// stacks test the non-tanks, the tank stack the tanks; an overlap can be
// anyone's.
mechanic("dm-uk-fell-forces", "Fell Forces", 5, ["ffxiv-uk-fell-forces-overlap"]);
mechanic("ffxiv-uk-fell-forces-missed", "Fell Forces: role stack", 5, ["ffxiv-uk-fell-forces-missed"]);
mechanic("ffxiv-uk-fell-forces-unshared", "Fell Forces: tank stack", 5, ["ffxiv-uk-fell-forces-unshared"]);
exposure("targeted", ["ffxiv-uk-fell-forces-missed", "ffxiv-uk-fell-forces-unshared"]);
mechanic("dm-uk-flood", "Flood", 5, [
  "ffxiv-uk-flood-group",
  "ffxiv-uk-flood-line",
]);
mechanic("dm-uk-forsaken", "Forsaken (P5)", 5, [
  "ffxiv-uk-forsaken-ground",
  "ffxiv-uk-forsaken-null",
]);
// Role-only splits as for Fell Forces: tank duties, the non-tanks' Holy
// and Diffusion, and the Flare overlap anyone can walk into.
mechanic("dm-uk-orchestra", "Orchestra", 5, ["ffxiv-uk-orchestra-flare-overlap"]);
mechanic("dm-uk-orchestra-tank", "Orchestra: tanks", 5, [
  "ffxiv-uk-orchestra-early-flare",
  "ffxiv-uk-orchestra-enmity",
]);
mechanic("dm-uk-orchestra-party", "Orchestra: Holy and Diffusion", 5, [
  "ffxiv-uk-orchestra-diffusion",
  "ffxiv-uk-orchestra-holy",
]);
exposure("targeted", [
  "ffxiv-uk-orchestra-early-flare", "ffxiv-uk-orchestra-enmity",
  "ffxiv-uk-orchestra-diffusion", "ffxiv-uk-orchestra-holy",
  "ffxiv-uk-chaotic-flare",
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

// The pool tests only its carrier, the undispelled death the healers, so
// they are two mechanics (one exposure each).
mechanic("es-blighted-blood", "Blighted Blood", undefined, ["wow-es-blighted-blood"]);
mechanic("wow-es-blighted-blood-pool", "Blighted Blood pool", undefined, ["wow-es-blighted-blood-pool"]);
exposure("targeted", ["wow-es-blighted-blood-pool"]);
mechanic("es-helical", "Helical Toxins", undefined, [
  "wow-es-helical-collapse",
  "wow-es-helical-overload",
  "wow-es-helical-unresolved",
]);
mechanic("es-protovenom", "Protovenom", undefined, [
  "wow-es-protovenom-eruption",
  "wow-es-protovenom-ticks",
]);
// Protovenom: the marked players (above) vs the unmarked making space
// (entombed-sentinels.ts reports both).
mechanic("wow-es-protovenom-unmarked", "Protovenom: unmarked", undefined, ["wow-es-protovenom-unmarked"]);
exposure("targeted", ["wow-es-protovenom-eruption", "wow-es-protovenom-ticks", "wow-es-protovenom-unmarked"]);
// The knockback tests only the aura holders, the blast everyone else, so
// they are two mechanics (one exposure each).
mechanic("ssz-crosswinds", "Crosswinds", undefined, ["wow-ssz-crosswinds-blast"]);
mechanic("wow-ssz-crosswinds-fall", "Crosswinds knockback", undefined, ["wow-ssz-crosswinds-fall"]);
exposure("targeted", ["wow-ssz-crosswinds-fall"]);
// Red Hot and Deep Blue: tether holders vs everyone else in the dash's path
// (red-hot-deep-blue.ts reports every instance).
mechanic("ffxiv-rhdb-floater", "Flame Floater: path", undefined, ["ffxiv-rhdb-floater"]);
mechanic("ffxiv-rhdb-floater-tether", "Flame Floater: tether", undefined, ["ffxiv-rhdb-floater-tether"]);
mechanic("ffxiv-rhdb-xtreme-wave", "Xtreme Wave: lane", undefined, ["ffxiv-rhdb-xtreme-wave"]);
mechanic("ffxiv-rhdb-xtreme-tether", "Xtreme Wave: tether", undefined, ["ffxiv-rhdb-xtreme-tether"]);
exposure("targeted", ["ffxiv-rhdb-floater", "ffxiv-rhdb-floater-tether", "ffxiv-rhdb-xtreme-wave", "ffxiv-rhdb-xtreme-tether"]);
// The Tyrant: tank and non-tank sides of the busters, the comet baiters,
// the tanks' tether interceptions, the healers' Sharp Taste sides and the
// Fire Resistance Down holders (tyrant.ts reports every instance).
mechanic("ffxiv-tyrant-buster", "Tank busters (non-tanks)", undefined, ["ffxiv-tyrant-buster"]);
mechanic("ffxiv-tyrant-tank-buster", "Raw Steel tank cones", undefined, ["ffxiv-tyrant-tank-buster"]);
mechanic("ffxiv-tyrant-comet-bait", "Comet baiters", undefined, ["ffxiv-tyrant-comet-bait"]);
mechanic("ffxiv-tyrant-fatality-tether", "Foregone Fatality tethers", undefined, ["ffxiv-tyrant-fatality-tether"]);
mechanic("ffxiv-tyrant-sharp-taste-side", "Sharp Taste healer sides", undefined, ["ffxiv-tyrant-sharp-taste-side"]);
mechanic("ffxiv-tyrant-fireball-front", "Fireball front (fire vulnerable)", undefined, ["ffxiv-tyrant-fireball-front"]);
exposure("targeted", [
  "ffxiv-tyrant-buster", "ffxiv-tyrant-tank-buster", "ffxiv-tyrant-comet-bait",
  "ffxiv-tyrant-fatality-tether", "ffxiv-tyrant-sharp-taste-side", "ffxiv-tyrant-fireball-front",
]);
// Lindwurm (M12S P1): the non-tanks' side of Visceral Burst, each Act 2
// Unbreakable pair, and each Act 2 tower's In Line soaker (lindwurm-1.ts
// reports every instance).
mechanic("ffxiv-lw1-buster", "Visceral Burst (non-tanks)", undefined, ["ffxiv-lw1-buster"]);
mechanic("ffxiv-lw1-chain", "Act 2 chains (Unbreakable pair)", undefined, ["ffxiv-lw1-chain"]);
mechanic("ffxiv-lw1-tower", "Act 2 towers (In Line soaker)", undefined, ["ffxiv-lw1-tower"]);
exposure("targeted", ["ffxiv-lw1-buster", "ffxiv-lw1-chain", "ffxiv-lw1-tower"]);
// Lindwurm II (M12S P2): the non-tanks' side of Esoteric Finisher, and the
// solo Blood Mana contact (lindwurm-2.ts reports every instance).
mechanic("ffxiv-lw2-finisher", "Esoteric Finisher (non-tanks)", undefined, ["ffxiv-lw2-finisher"]);
mechanic("ffxiv-lw2-contact", "Blood Mana contact (solo tank)", undefined, ["ffxiv-lw2-contact"]);
exposure("targeted", ["ffxiv-lw2-finisher", "ffxiv-lw2-contact"]);
// Doomtrain (Hell on Rails Extreme): the non-tanks' side of Lightning
// Burst and of the Ghost Train cones, and the non-tanks' Aetherosote
// stacks (doomtrain.ts reports every instance).
mechanic("ffxiv-dt-buster", "Lightning Burst (non-tanks)", undefined, ["ffxiv-dt-buster"]);
mechanic("ffxiv-dt-cone", "Aetherial Ray cones (non-tanks)", undefined, ["ffxiv-dt-cone"]);
mechanic("ffxiv-dt-orb-stack", "Aetherosote stacks", undefined, ["ffxiv-dt-orb-stack"]);
exposure("targeted", ["ffxiv-dt-buster", "ffxiv-dt-cone", "ffxiv-dt-orb-stack"]);
// Necron (Necron's Embrace Extreme): the Blue Shockwave tank swap
// (necron.ts reports both tanks at every pair of cones).
mechanic("ffxiv-necron-blue-swap", "Blue Shockwave swap", undefined, ["ffxiv-necron-blue-swap"]);
exposure("targeted", ["ffxiv-necron-blue-swap"]);
// Zelenia (Recollection Extreme): the tanks taking Specter of the Lost's
// tethers (zelenia.ts reports both tanks at every pair of cones).
mechanic("ffxiv-zelenia-specter", "Specter of the Lost tethers", undefined, ["ffxiv-zelenia-specter"]);
exposure("targeted", ["ffxiv-zelenia-specter"]);
// Enuo (The Unmaking Extreme): the non-tanks' side of Deep Freeze's flares
// (enuo.ts reports every flare pair).
mechanic("ffxiv-enuo-flare", "Deep Freeze flares (non-tanks)", undefined, ["ffxiv-enuo-flare"]);
exposure("targeted", ["ffxiv-enuo-flare"]);
// Queen Eternal (Sphene's Burden Extreme): the Prosecution of War tank swap
// (queen-eternal.ts reports both tanks at every Prosecution).
mechanic("ffxiv-queen-eternal-prosecution", "Prosecution of War swap", undefined, ["ffxiv-queen-eternal-prosecution"]);
exposure("targeted", ["ffxiv-queen-eternal-prosecution"]);
// Futures Rewritten P1: the tanks' Powder Mark Trail swap and survival
// (fatebreaker.ts reports both tanks at every Powder Mark).
mechanic("ffxiv-fb-powder-swap", "Powder Mark swap", 1, ["ffxiv-fb-powder-swap"]);
mechanic("ffxiv-fb-powder-death", "Powder Mark / Burn Mark survival", 1, ["ffxiv-fb-powder-death"]);
exposure("targeted", ["ffxiv-fb-powder-swap", "ffxiv-fb-powder-death"]);
// The Omega Protocol P1: each Program Loop round's towers test that round's
// two In Line players (omega.ts reports both at every round).
mechanic("ffxiv-top1-tower", "Program Loop towers (In Line soakers)", 1, ["ffxiv-top1-tower"]);
exposure("targeted", ["ffxiv-top1-tower"]);
// Futures Rewritten P2: Quadruple Slap tests the tanks; the Diamond Dust
// cone and stone rules test the four Frigid Stone players
// (usurper-of-frost.ts reports both at every instance).
mechanic("ffxiv-uof-slap", "Quadruple Slap", 2, ["ffxiv-uof-slap"]);
mechanic("ffxiv-uof-marked-cone", "Diamond Dust: marked players' cones", 2, ["ffxiv-uof-marked-cone"]);
mechanic("ffxiv-uof-stone", "Diamond Dust: Frigid Stone drops", 2, ["ffxiv-uof-stone"]);
exposure("targeted", ["ffxiv-uof-slap", "ffxiv-uof-marked-cone", "ffxiv-uof-stone"]);
// Futures Rewritten P3: Black Halo and Darkest Dance test the non-tanks
// (oracle-of-darkness.ts reports them at every cast).
mechanic("ffxiv-ood-tank-buster", "Black Halo / Darkest Dance (non-tanks)", 3, ["ffxiv-ood-tank-buster"]);
mechanic("ffxiv-ood-tank", "Black Halo aggro / Darkest Dance bait (tanks)", 3, ["ffxiv-ood-tank"]);
exposure("targeted", ["ffxiv-ood-tank-buster", "ffxiv-ood-tank"]);
// Futures Rewritten P4: Somber Dance tests the non-tanks; Shiva's dual
// autos and Akh Morn's one-boss-per-tank test the tanks
// (enter-the-dragon.ts reports them at every instance).
mechanic("ffxiv-etd-tank-buster", "Somber Dance (non-tanks)", 4, ["ffxiv-etd-tank-buster"]);
mechanic("ffxiv-etd-autos", "Shiva's second auto-attack (tanks)", 4, ["ffxiv-etd-autos"]);
mechanic("ffxiv-etd-akh-morn", "Akh Morn: one boss per tank", 4, ["ffxiv-etd-akh-morn"]);
exposure("targeted", ["ffxiv-etd-tank-buster", "ffxiv-etd-autos", "ffxiv-etd-akh-morn"]);
// Futures Rewritten P5: Pandora's dual autos test the tanks; the wing cleave
// and its distance tether test the non-tanks (pandora.ts reports them at
// every instance).
mechanic("ffxiv-pan-autos", "Pandora's dual auto-attacks (tanks)", 5, ["ffxiv-pan-autos"]);
mechanic("ffxiv-pan-wings", "Wings Dark and Light cleave (non-tanks)", 5, ["ffxiv-pan-wings"]);
mechanic("ffxiv-pan-tether", "Wings Dark and Light tether (non-tanks)", 5, ["ffxiv-pan-tether"]);
mechanic("ffxiv-pan-tank-swap", "Wings Dark and Light tank swap (tanks)", 5, ["ffxiv-pan-tank-swap"]);
exposure("targeted", ["ffxiv-pan-autos", "ffxiv-pan-wings", "ffxiv-pan-tether", "ffxiv-pan-tank-swap"]);
// Vamp Fatale (vamp-fatale.ts reports every instance): each rule scoped to
// the role or group that can fail it.
mechanic("ffxiv-vf-hardcore", "Hardcore (non-tanks)", undefined, ["ffxiv-vf-hardcore"]);
mechanic("ffxiv-vf-hardcore-tanks", "Hardcore (tanks)", undefined, ["ffxiv-vf-hardcore-tanks"]);
mechanic("ffxiv-vf-cell-cone-tank", "Ultrasonic tank cone", undefined, ["ffxiv-vf-cell-cone-tank"]);
exposure("targeted", [
  "ffxiv-vf-hardcore", "ffxiv-vf-hardcore-tanks", "ffxiv-vf-flail-tower",
  "ffxiv-vf-cell-tower", "ffxiv-vf-cell-cone-tank",
]);
// Coiled Altar: your own Gravebound fragments and your own ghost
// (coiled-altar.ts reportOccurrences).
exposure("targeted", ["wow-ca-gravebound-expired", "wow-ca-ghost-caught", "wow-ca-malevolent-resonance"]);
// Stone Breaker: the tank whose set it is (twin-fangs.ts).
exposure("targeted", ["wow-tf-stone-breaker-unsoaked"]);
// Sszorak's Mutilate soak groups: an assigned group duty (sszorak.ts
// reports the soakers; lib/mechanics/assignments.ts finds the groups).
exposure("assigned", ["wow-ssz-mutilate-missed", "wow-ssz-mutilate-repeat"], "Mutilate soak group");
exposure("assigned", ["wow-ca-guillotine-execution", "wow-ca-guillotine-resoak"], "Guillotine soak group");
exposure("assigned", ["wow-nek-pyre-undersoaked"], "Hungering Pyre soak group");
// Possession Barrage: the debuffed tank kites it (nekzali.ts).
exposure("targeted", ["wow-nek-barrage-short"]);
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
// Coils: an assigned mitigation group; Purge: its holders (ulatek.ts).
exposure("assigned", ["wow-ula-spectral-coils"], "Spectral Coils group");
exposure("targeted", ["wow-ula-volatile-purge"]);
mechanic("ula-blight-vein", "Blight Vein", undefined, ["wow-ula-blight-vein"]);
// Grasping Fangs tethers its own players (ulatek.ts detectBlightVein).
exposure("targeted", ["wow-ula-blight-vein"]);
mechanic("le-final-ascension", "Final Ascension", undefined, ["wow-le-final-ascension"]);
// The fish carrier is a raid-lead job; element and shard targets are the
// game's pick (lost-explorers.ts reportOccurrences).
exposure("assigned", ["wow-le-final-ascension"], "Fish carrier");
exposure("targeted", ["wow-le-elemental-explosion", "wow-le-shards-no-swap"]);
mechanic("vash-plague-froth", "Plague Froth", undefined, ["wow-vash-plague-froth"]);
// Froth: carriers overlapping each other vs non-carriers standing near;
// Dripping Fangs: the tanks' swap (vashnik.ts reports all three).
mechanic("wow-vash-froth-carrier-overlap", "Plague Froth: carriers", undefined, ["wow-vash-froth-carrier-overlap"]);
exposure("targeted", ["wow-vash-plague-froth", "wow-vash-froth-carrier-overlap", "wow-vash-fangs-swap"]);
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

/** An assigned mechanic's duty name, falling back to its mechanic label. */
export function mechanicDutyLabel(mechanicKey: string): string {
  for (const [ruleId, entry] of Object.entries(RULE_META)) {
    if ((entry.mechanicKey ?? ruleId) === mechanicKey && entry.dutyLabel) return entry.dutyLabel;
  }
  return mechanicLabelForKey(mechanicKey) ?? mechanicKey;
}

/** A mechanic's exposure by its key; "everyone" when unclassified. */
export function mechanicExposure(mechanicKey: string): Exposure {
  for (const [ruleId, entry] of Object.entries(RULE_META)) {
    if ((entry.mechanicKey ?? ruleId) === mechanicKey && entry.exposure) return entry.exposure;
  }
  return "everyone";
}

/** The error's mechanic, falling back to the rule itself (see header). */
export function getRuleMeta(ruleId: string, ruleName: string): RuleMeta {
  const entry = RULE_META[ruleId];
  const split = isSplitByName(ruleId);
  return {
    mechanicKey:   entry?.mechanicKey ?? (split ? staticRuleKey(ruleId, ruleName) : ruleId),
    mechanicLabel: entry?.mechanicLabel ?? ruleName,
    phaseHint:     entry?.phaseHint,
    exposure:      entry?.exposure ?? "everyone",
  };
}
